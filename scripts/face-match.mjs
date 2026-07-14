/**
 * 既知講師のサムネ（人物が写っている写真）を参照し、
 * 不明動画のサムネと照合して講師を推定する。
 *
 * 本物の顔認証エンジンではなく、人物寄りクロップ + CLIP 類似度。
 * 使い方: node scripts/face-match.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline, RawImage, env } from "@xenova/transformers";
import { instructorSearchText } from "./instructors.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_PATH = path.join(ROOT, "public", "data", "videos.json");
const CACHE_PATH = path.join(ROOT, "data", "person-embeddings.json");

const MIN_SAMPLES = 3;
const MAX_REFS = 14;
const MAX_TARGETS = Number(process.env.FACE_MATCH_LIMIT || 800);
const SCORE_MIN = Number(process.env.FACE_MATCH_MIN || 0.82);
const MARGIN_MIN = Number(process.env.FACE_MATCH_MARGIN || 0.008);

env.allowLocalModels = false;
env.useBrowserCache = false;

function thumbUrl(id) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

function l2norm(vec) {
  let s = 0;
  for (let i = 0; i < vec.length; i++) s += vec[i] * vec[i];
  s = Math.sqrt(s) || 1;
  return Float32Array.from(vec, (x) => x / s);
}

function cosine(a, b) {
  let dot = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) dot += a[i] * b[i];
  return dot;
}

function meanVectors(vectors) {
  if (!vectors.length) return null;
  const out = new Float32Array(vectors[0].length);
  for (const v of vectors) {
    for (let i = 0; i < out.length; i++) out[i] += v[i];
  }
  for (let i = 0; i < out.length; i++) out[i] /= vectors.length;
  return l2norm(out);
}

function loadCache() {
  if (!fs.existsSync(CACHE_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
  } catch {
    return {};
  }
}

function saveCache(cache) {
  fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
  const serializable = {};
  for (const [id, vec] of Object.entries(cache)) serializable[id] = Array.from(vec);
  fs.writeFileSync(CACHE_PATH, JSON.stringify(serializable));
}

function pickRefs(ids, n) {
  return [...ids].sort(() => Math.random() - 0.5).slice(0, n);
}

/** 講師が写りやすい左右の領域を切り出す（×2） */
async function personCrops(image) {
  const w = image.width;
  const h = image.height;
  const y0 = Math.floor(h * 0.12);
  const y1 = Math.floor(h * 0.9);
  // RawImage.crop は async で [x_min, y_min, x_max, y_max]
  const right = await image.crop([Math.floor(w * 0.38), y0, w, y1]);
  const left = await image.crop([0, y0, Math.floor(w * 0.55), y1]);
  return [right, left];
}

async function embedThumb(clipper, videoId, cache) {
  if (cache[videoId]) return Float32Array.from(cache[videoId]);
  try {
    const image = await RawImage.read(thumbUrl(videoId));
    const crops = await personCrops(image);
    const vecs = [];
    for (const crop of crops) {
      const result = await clipper(crop, { pooling: "mean", normalize: true });
      const data = result?.data || result;
      vecs.push(l2norm(Array.from(data)));
    }
    const vec = meanVectors(vecs);
    cache[videoId] = vec;
    return vec;
  } catch (err) {
    console.warn(`  失敗 ${videoId}: ${err.message}`);
    return null;
  }
}

async function main() {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  for (const v of data.videos) {
    if (v.instructorInferred) {
      v.instructors = [];
      v.instructorSearch = "";
      delete v.instructorInferred;
      delete v.instructorScore;
    }
  }

  const cache = loadCache();
  console.log("CLIP モデル準備中…");
  const clipper = await pipeline("image-feature-extraction", "Xenova/clip-vit-base-patch32");

  const byInstructor = new Map();
  const unknowns = [];
  for (const v of data.videos) {
    const list = v.instructors || [];
    if (!list.length) {
      unknowns.push(v);
      continue;
    }
    if (list.length === 1) {
      const name = list[0];
      if (!byInstructor.has(name)) byInstructor.set(name, []);
      byInstructor.get(name).push(v.id);
    }
  }

  console.log(`参照講師候補: ${byInstructor.size} / 推定対象: ${unknowns.length}`);

  const centroids = new Map();
  const refPool = new Map(); // name -> vectors[] for kNN

  for (const [name, ids] of byInstructor) {
    if (ids.length < MIN_SAMPLES) {
      console.log(`  skip ${name} (サンプル ${ids.length})`);
      continue;
    }
    const refs = pickRefs(ids, MAX_REFS);
    console.log(`  参照 ${name}: ${refs.length} 枚`);
    const vecs = [];
    for (const id of refs) {
      const vec = await embedThumb(clipper, id, cache);
      if (vec) vecs.push(vec);
    }
    const mean = meanVectors(vecs);
    if (mean) {
      centroids.set(name, mean);
      refPool.set(name, vecs);
    }
    saveCache(cache);
  }
  console.log(`重心: ${centroids.size} 講師`);
  if (!centroids.size) process.exit(1);

  const names = [...centroids.keys()];
  let assigned = 0;
  const targets = unknowns.slice(0, MAX_TARGETS);

  for (let i = 0; i < targets.length; i++) {
    const v = targets[i];
    if ((i + 1) % 40 === 0 || i === 0) {
      console.log(`推定中 ${i + 1}/${targets.length}… (付与 ${assigned})`);
      saveCache(cache);
    }
    const vec = await embedThumb(clipper, v.id, cache);
    if (!vec) continue;

    // 講師ごと: 重心スコアと最近傍スコアの平均
    const scores = names.map((name) => {
      const center = cosine(vec, centroids.get(name));
      const refs = refPool.get(name) || [];
      let bestRef = -1;
      for (const r of refs) bestRef = Math.max(bestRef, cosine(vec, r));
      return { name, score: center * 0.45 + bestRef * 0.55 };
    }).sort((a, b) => b.score - a.score);

    const best = scores[0];
    const second = scores[1];
    const margin = best && second ? best.score - second.score : best?.score || 0;

    if (best && best.score >= SCORE_MIN && margin >= MARGIN_MIN) {
      v.instructors = [best.name];
      v.instructorSearch = instructorSearchText(v.instructors);
      v.instructorInferred = true;
      v.instructorScore = Math.round(best.score * 1000) / 1000;
      assigned += 1;
    }
  }

  saveCache(cache);
  fs.writeFileSync(DATA_PATH, JSON.stringify(data));
  console.log(`完了: 推定付与 ${assigned}/${targets.length}`);
  const tally = new Map();
  let remaining = 0;
  for (const v of data.videos) {
    if (!(v.instructors || []).length) remaining += 1;
    if (!v.instructorInferred) continue;
    const n = v.instructors?.[0] || "?";
    tally.set(n, (tally.get(n) || 0) + 1);
  }
  console.log([...tally.entries()].sort((a, b) => b[1] - a[1]).map(([n, c]) => `${c}\t${n}`).join("\n"));
  console.log(`不明のまま: ${remaining}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
