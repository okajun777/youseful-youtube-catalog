import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { categorizeVideo } from "./categories.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_PATH = path.join(ROOT, "data", "videos.json");

export const CHANNEL_ID = "UCRpRQ48LGfMpYojZo7Srabg";
const CHANNEL_URL = `https://www.youtube.com/channel/${CHANNEL_ID}`;
const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
const INNERTUBE_URL = "https://www.youtube.com/youtubei/v1/browse?prettyPrint=false";
const MAX_INNERTUBE_PAGES = 25; // 約 30×25 ≒ 750 本まで蓄積

const CLIENT = {
  clientName: "WEB",
  clientVersion: "2.20260101.00.00",
  hl: "ja",
  gl: "JP",
};

function decodeXml(text) {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'");
}

function loadExisting() {
  if (!fs.existsSync(DATA_PATH)) return { videos: [], syncedAt: null };
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  } catch {
    return { videos: [], syncedAt: null };
  }
}

function saveData(data) {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), "utf8");
}

/** YouTube RSS（最新約15本・正確な公開日時） */
async function fetchRssVideos() {
  const res = await fetch(RSS_URL, {
    headers: { "User-Agent": "youseful-catalog/1.0", Accept: "application/atom+xml" },
  });
  if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`);
  const xml = await res.text();
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];
  return entries.map((m) => {
    const block = m[1];
    const pick = (re) => {
      const hit = block.match(re);
      return hit ? decodeXml(hit[1].trim()) : "";
    };
    const videoId = pick(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    return {
      id: videoId,
      title: pick(/<media:title>([^<]*)<\/media:title>/) || pick(/<title>([^<]*)<\/title>/),
      url: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnail: pick(/<media:thumbnail url="([^"]+)"/) || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      description: pick(/<media:description>([\s\S]*?)<\/media:description>/),
      publishedAt: pick(/<published>([^<]+)<\/published>/),
      views: Number(pick(/views="(\d+)"/) || 0) || null,
      duration: null,
      source: "rss",
    };
  }).filter((v) => v.id);
}

function parseRelativeJa(text) {
  if (!text) return null;
  const now = Date.now();
  const m = text.replace(/\s+/g, " ").trim().match(/(\d+)\s*(秒|分|時間|日|週間|か月|ヶ月|カ月|月|年)\s*前/);
  if (!m) {
    if (/ライブ配信|配信中|ストリーミング/.test(text)) return new Date(now).toISOString();
    return null;
  }
  const n = Number(m[1]);
  const unit = m[2];
  const ms =
    unit === "秒" ? n * 1e3 :
    unit === "分" ? n * 6e4 :
    unit === "時間" ? n * 36e5 :
    unit === "日" ? n * 864e5 :
    unit === "週間" ? n * 6048e5 :
    unit === "年" ? n * 31536e6 :
    n * 26298e5; // 月系
  return new Date(now - ms).toISOString();
}

function extractLockup(item) {
  const vm = item?.richItemRenderer?.content?.lockupViewModel;
  if (!vm?.contentId) return null;
  const id = vm.contentId;
  const title = vm.metadata?.lockupMetadataViewModel?.title?.content ?? "";
  const rows = vm.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows ?? [];
  const parts = rows.flatMap((r) => (r.metadataParts ?? []).map((p) => p.text?.content || p.accessibilityLabel || "")).filter(Boolean);
  const relative = parts.find((p) => /前|配信/.test(p)) ?? "";
  const viewsPart = parts.find((p) => /視聴/.test(p)) ?? "";
  const views = Number((viewsPart.match(/([\d,]+)/)?.[1] || "").replace(/,/g, "")) || null;
  const duration =
    vm.contentImage?.thumbnailViewModel?.overlays
      ?.flatMap((o) => o.thumbnailBottomOverlayViewModel?.badges ?? [])
      ?.map((b) => b.thumbnailBadgeViewModel?.text)
      ?.find(Boolean) ?? null;
  const thumb =
    vm.contentImage?.thumbnailViewModel?.image?.sources?.slice(-1)?.[0]?.url ||
    `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

  return {
    id,
    title,
    url: `https://www.youtube.com/watch?v=${id}`,
    thumbnail: thumb.split("?")[0],
    description: "",
    publishedAt: parseRelativeJa(relative),
    publishedLabel: relative || null,
    views,
    duration,
    source: "innertube",
  };
}

function getContinuationToken(contents) {
  const cont = contents?.find((c) => c.continuationItemRenderer);
  return (
    cont?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token ||
    cont?.continuationItemRenderer?.continuationEndpoint?.commandExecutorCommand?.commands
      ?.find((c) => c.continuationCommand)?.continuationCommand?.token ||
    null
  );
}

async function innertubeBrowse(body) {
  const res = await fetch(INNERTUBE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Innertube failed: ${res.status}`);
  return res.json();
}

/** チャンネル「動画」タブをページング取得 */
async function fetchChannelVideos() {
  const videos = [];
  let data = await innertubeBrowse({
    context: { client: CLIENT },
    browseId: CHANNEL_ID,
    params: "EgZ2aWRlb3PyBgQKAjoA",
  });

  for (let page = 0; page < MAX_INNERTUBE_PAGES; page++) {
    let contents = [];
    if (page === 0) {
      const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs ?? [];
      const selected =
        tabs.find((t) => t.tabRenderer?.selected) ||
        tabs.find((t) => /動画|Videos/i.test(t.tabRenderer?.title || "")) ||
        tabs[1];
      contents = selected?.tabRenderer?.content?.richGridRenderer?.contents ?? [];
    } else {
      const actions =
        data?.onResponseReceivedActions ||
        data?.onResponseReceivedEndpoints ||
        [];
      for (const action of actions) {
        const items =
          action?.appendContinuationItemsAction?.continuationItems ||
          action?.reloadContinuationItemsCommand?.continuationItems ||
          [];
        contents.push(...items);
      }
    }

    for (const item of contents) {
      const v = extractLockup(item);
      if (v) videos.push(v);
    }

    const token = getContinuationToken(contents);
    if (!token) break;

    data = await innertubeBrowse({
      context: { client: CLIENT },
      continuation: token,
    });
  }

  return videos;
}

function mergeVideos(existing, incoming) {
  const map = new Map();
  for (const v of existing) map.set(v.id, { ...v });

  for (const v of incoming) {
    const prev = map.get(v.id) || {};
    const publishedAt =
      (v.source === "rss" && v.publishedAt) ||
      (prev.source === "rss" && prev.publishedAt) ||
      v.publishedAt ||
      prev.publishedAt ||
      null;

    map.set(v.id, {
      ...prev,
      ...v,
      publishedAt,
      description: v.description || prev.description || "",
      views: v.views ?? prev.views ?? null,
      duration: v.duration || prev.duration || null,
      // RSS の正確な日時を優先するため source も保持
      source: v.source === "rss" || prev.source === "rss" ? "rss" : v.source || prev.source,
      category: categorizeVideo(v.title || prev.title),
      firstSeenAt: prev.firstSeenAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return [...map.values()]
    .map((v) => ({
      ...v,
      category: categorizeVideo(v.title),
    }))
    .sort((a, b) => {
      const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
      const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
      return tb - ta;
    });
}

export async function syncVideos({ full = false } = {}) {
  const existing = loadExisting();
  const previousIds = new Set((existing.videos || []).map((v) => v.id));

  const rss = await fetchRssVideos();
  let channel = [];
  if (full || (existing.videos || []).length < 40) {
    try {
      channel = await fetchChannelVideos();
    } catch (err) {
      console.warn("チャンネル一括取得に失敗（RSSのみ継続）:", err.message);
    }
  }

  const merged = mergeVideos(existing.videos || [], [...channel, ...rss]);
  const newVideos = merged.filter((v) => !previousIds.has(v.id));

  const payload = {
    channel: {
      id: CHANNEL_ID,
      name: "ユースフル / 実務変革のプロ",
      url: CHANNEL_URL,
      handle: "@youseful",
    },
    syncedAt: new Date().toISOString(),
    videoCount: merged.length,
    newCount: newVideos.length,
    videos: merged,
  };

  saveData(payload);
  return { ...payload, newVideos };
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  const full = process.argv.includes("--full");
  syncVideos({ full: true })
    .then((r) => {
      console.log(`同期完了: ${r.videoCount} 本（新規 ${r.newCount}） @ ${r.syncedAt}`);
      if (r.newVideos?.length) {
        for (const v of r.newVideos.slice(0, 10)) {
          console.log(`  + [${v.category}] ${v.title}`);
        }
      }
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
