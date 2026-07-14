const CATEGORIES = [
  { id: "all", label: "すべて", color: "#1a2433" },
  { id: "excel", label: "Excel", color: "#217346" },
  { id: "word", label: "Word", color: "#2b579a" },
  { id: "powerpoint", label: "PowerPoint", color: "#c43e1c" },
  { id: "outlook", label: "Outlook", color: "#0078d4" },
  { id: "teams", label: "Teams", color: "#6264a7" },
  { id: "copilot", label: "Copilot", color: "#e91e8c" },
  { id: "power-automate", label: "Power Automate", color: "#0066ff" },
  { id: "power-bi", label: "Power BI", color: "#c9a227" },
  { id: "power-apps", label: "Power Apps", color: "#742774" },
  { id: "sharepoint", label: "SharePoint / OneDrive", color: "#038387" },
  { id: "planner", label: "Planner / To Do", color: "#31752f" },
  { id: "forms", label: "Forms / Loop", color: "#008272" },
  { id: "onenote", label: "OneNote", color: "#7719aa" },
  { id: "other", label: "その他", color: "#64748b" },
];

const LEVELS = [
  { id: "all", label: "すべて", short: "全", hint: "全レベル", color: "#1a2433", blurb: "自分のレベルに合う動画から始められます。" },
  { id: "beginner", label: "初心者", short: "初", hint: "入門・基礎", color: "#0f9f6e", blurb: "基礎・入門から安心して学べるおすすめ動画" },
  { id: "intermediate", label: "中級者", short: "中", hint: "時短・活用", color: "#2563eb", blurb: "時短・実務活用で一段レベルアップするおすすめ" },
  { id: "advanced", label: "上級者", short: "上", hint: "応用・攻略", color: "#dc2626", blurb: "応用・自動化・深い使いこなしのおすすめ" },
];

const NEW_MS = 36 * 60 * 60 * 1000;
const FEATURED_COUNT = 8;
const UNKNOWN_INSTRUCTOR = "不明";

const INSTRUCTOR_META = {
  なかけん: { formal: "中田 研介", aliases: ["なかけん", "中田研介", "中田 研介", "Nakata Kensuke", "Nakata", "kensuke", "なかた"] },
  あっきー: { formal: "秋山 望美", aliases: ["あっきー", "秋山望美", "秋山 望美", "Akiyama Nozomi", "Akiyama", "Nozomi", "あきやま"] },
  "おおはら しょうた": { formal: "大原 翔太", aliases: ["おおはら", "おおはらしょうた", "大原翔太", "大原 翔太", "Ohara Shota", "Ohara", "Shota"] },
  とばちゃん: { formal: "鳥羽", aliases: ["とばちゃん", "とば", "鳥羽", "Toba"] },
  はじめ: { formal: "五十川 元", aliases: ["はじめ", "五十川元", "五十川 元", "Isogawa Hajime", "Isogawa", "Hajime", "いそがわ"] },
  りんたろう: { formal: "大垣 凜太郎", aliases: ["りんたろう", "大垣凜太郎", "大垣 凜太郎", "大垣凛太郎", "Ohgaki Rintaro", "Ohgaki", "Rintaro", "おおがき"] },
  よーた: { formal: "神川 陽太", aliases: ["よーた", "ようた", "神川陽太", "神川 陽太", "Kamikawa Yota", "Kamikawa", "Yota", "かみかわ"] },
  "濱津 太一": { formal: "濱津 太一", aliases: ["濱津太一", "濱津 太一", "浜津太一", "浜津 太一", "Hamatsu", "たいち"] },
  "片原 唯伽": { formal: "片原 唯伽", aliases: ["片原唯伽", "片原 唯伽", "Katahara Yuika", "Katahara", "Yuika", "かたはら"] },
  "渡部 壮": { formal: "渡部 壮", aliases: ["渡部壮", "渡部 壮", "Watanabe Sou", "Watanabe", "わたなべ"] },
  "さわだ さき": { formal: "澤田 咲", aliases: ["さわだ", "さわださき", "澤田咲", "澤田 咲", "沢田", "Sawada"] },
  おさ: { formal: "長内 孝平", aliases: ["おさ", "長内孝平", "長内 孝平", "Osanai", "おさない"] },
};

const INSTRUCTOR_COLORS = [
  "#0f766e",
  "#b45309",
  "#7c3aed",
  "#0369a1",
  "#be185d",
  "#4d7c0f",
  "#c2410c",
  "#4338ca",
  "#a16207",
];

const BEGINNER_RE = /超入門|初心者|はじめて|初めて|ゼロから|0から|基礎から|基本から|初級|入門|基礎解説|基本知識|10分でわかる|教科書/;
const ADVANCED_RE = /上級|応用|発展|API|VBA|マクロ(?!不要)|徹底攻略|完全攻略|プロ向け|高度な/;
const INTERMEDIATE_RE = /中級|実践|活用術|時短|神ワザ|便利技|テクニック|効率化|業務改善|最新活用/;

const state = {
  videos: [],
  syncedAt: null,
  category: "all",
  level: "all",
  instructor: "all",
  query: "",
  sort: "recommend",
  hasApi: false,
};

const els = {
  categories: document.getElementById("categories"),
  instructors: document.getElementById("instructorSelect"),
  levels: document.getElementById("levels"),
  levelPanel: document.getElementById("levelPanel"),
  levelToggle: document.getElementById("levelToggle"),
  levelToggleMeta: document.getElementById("levelToggleMeta"),
  levelBlurb: document.getElementById("levelBlurb"),
  grid: document.getElementById("videoGrid"),
  empty: document.getElementById("empty"),
  meta: document.getElementById("resultMeta"),
  syncStatus: document.getElementById("syncStatus"),
  search: document.getElementById("search"),
  sort: document.getElementById("sort"),
  btnSync: document.getElementById("btnSync"),
};

const PRODUCT_RULES = [
  { id: "power-automate", patterns: [/power\s*automate/i, /パワーオートメイト/i, /パワー\s*オート/i] },
  { id: "power-bi", patterns: [/power\s*bi/i, /パワー\s*bi/i, /パワーbi/i] },
  { id: "power-apps", patterns: [/power\s*apps?/i, /パワーアプリ/i] },
  { id: "copilot", patterns: [/copilot/i, /コパイロット/] },
  { id: "teams", patterns: [/\bteams\b/i, /チームズ/] },
  { id: "excel", patterns: [/\bexcel\b/i, /エクセル/] },
  { id: "powerpoint", patterns: [/power\s*point/i, /パワーポイント/, /\bpptx?\b/i] },
  { id: "outlook", patterns: [/outlook/i, /アウトルック/] },
  { id: "word", patterns: [/\bword\b/i, /(?<!パス)ワード(?!プ)/] },
  { id: "sharepoint", patterns: [/share\s*point/i, /onedrive/i, /ワンドライブ/i, /シェアポイント/] },
  { id: "planner", patterns: [/\bplanner\b/i, /プランナー/, /microsoft\s*to\s*do/i] },
  { id: "forms", patterns: [/microsoft\s*forms/i, /マイクロソフト\s*forms/i, /マイクロソフト\s*loop/i] },
  { id: "onenote", patterns: [/onenote/i, /ワンノート/] },
];

function detectCategories(title = "") {
  const hits = [];
  for (const rule of PRODUCT_RULES) {
    if (rule.patterns.some((p) => p.test(title))) hits.push(rule.id);
  }
  if (!hits.length) return ["other"];

  const ordered = [...hits].sort((a, b) => {
    const ia = PRODUCT_RULES.find((r) => r.id === a).patterns
      .map((p) => title.match(p)?.index ?? 1e9)
      .reduce((m, n) => Math.min(m, n), 1e9);
    const ib = PRODUCT_RULES.find((r) => r.id === b).patterns
      .map((p) => title.match(p)?.index ?? 1e9)
      .reduce((m, n) => Math.min(m, n), 1e9);
    return ia - ib;
  });

  const bracket = title.match(/【([^】]+)】/);
  if (bracket) {
    const tagHits = [];
    for (const rule of PRODUCT_RULES) {
      if (rule.patterns.some((p) => p.test(bracket[1]))) tagHits.push(rule.id);
    }
    if (tagHits[0]) return [tagHits[0], ...ordered.filter((id) => id !== tagHits[0])];
  }
  return ordered;
}

function videoCategories(video) {
  if (Array.isArray(video.categories) && video.categories.length) return video.categories;
  return detectCategories(video.title || "");
}

function detectLevel(title = "") {
  const t = title;
  const hasBeginner = BEGINNER_RE.test(t);
  const hasAdvanced = ADVANCED_RE.test(t);
  const hasIntermediate = INTERMEDIATE_RE.test(t);
  if (hasAdvanced && !hasBeginner) return "advanced";
  if (hasBeginner && !hasAdvanced) return "beginner";
  if (hasAdvanced && hasBeginner) return "intermediate";
  if (hasIntermediate) return "intermediate";
  if (/excel|エクセル|teams|outlook|copilot|word|powerpoint|パワー|sharepoint|onedrive|planner|forms|onenote/i.test(t)) {
    return "intermediate";
  }
  return "beginner";
}

function instructorColor(label = "") {
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) >>> 0;
  return INSTRUCTOR_COLORS[h % INSTRUCTOR_COLORS.length];
}

function videoInstructors(video) {
  if (Array.isArray(video.instructors) && video.instructors.length) return video.instructors;
  return [];
}

function instructorDisplayName(label = "") {
  const meta = INSTRUCTOR_META[label];
  if (meta?.formal && meta.formal !== label) return `${label}（${meta.formal}）`;
  return label;
}

function instructorHaystack(video) {
  if (video.instructorSearch) return String(video.instructorSearch);
  const parts = [];
  for (const label of videoInstructors(video)) {
    parts.push(label);
    const meta = INSTRUCTOR_META[label];
    if (meta) {
      if (meta.formal) parts.push(meta.formal);
      parts.push(...(meta.aliases || []));
    }
  }
  return parts.join(" ");
}

function normalizeSearch(s = "") {
  return String(s).toLowerCase().replace(/\s+/g, "");
}

function scoreVideo(video, level) {
  if (typeof video.recommendScore === "number" && level === video.level) {
    // 同期時スコアをベースに、選択レベル用の微調整のみ
  }
  const views = Number(video.views) || 0;
  const viewScore = Math.log10(views + 10) * 12;
  const ageDays = video.publishedAt
    ? Math.max(0, (Date.now() - Date.parse(video.publishedAt)) / 864e5)
    : 900;
  const freshScore = Math.max(0, 18 - ageDays / 30);
  const title = video.title || "";
  let keywordBoost = 0;
  if (level === "beginner" && /超入門|初心者|入門|基礎|教科書/.test(title)) keywordBoost += 10;
  if (level === "intermediate" && /時短|活用|神ワザ|便利|実践|テクニック/.test(title)) keywordBoost += 10;
  if (level === "advanced" && /応用|上級|API|VBA|徹底攻略|完全攻略/.test(title)) keywordBoost += 10;
  if (video.category && video.category !== "other") keywordBoost += 3;
  return viewScore + freshScore + keywordBoost;
}

function withLevels(videos) {
  return videos.map((v) => {
    const level = v.level || detectLevel(v.title);
    const categories = detectCategories(v.title || "");
    const instructors = videoInstructors(v);
    return {
      ...v,
      level,
      categories,
      category: categories[0] || "other",
      instructors,
      _score: scoreVideo({ ...v, level, category: categories[0], categories }, level),
    };
  });
}

function isNew(video) {
  if (!video.publishedAt) return false;
  const t = Date.parse(video.publishedAt);
  if (Number.isNaN(t)) return false;
  return Date.now() - t < NEW_MS;
}

function catMeta(id) {
  return CATEGORIES.find((c) => c.id === id) || CATEGORIES.at(-1);
}

function levelMeta(id) {
  return LEVELS.find((l) => l.id === id) || LEVELS[0];
}

function formatDate(iso) {
  if (!iso) return "日時不明";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "日時不明";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function formatViews(n) {
  if (n == null) return "";
  return `${new Intl.NumberFormat("ja-JP").format(n)}回視聴`;
}

function formatSynced(iso) {
  if (!iso) return "未同期";
  return `最終取込: ${formatDate(iso)}`;
}

function countsByCategory(videos) {
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c.id, 0]));
  counts.all = videos.length;
  for (const v of videos) {
    const cats = videoCategories(v);
    const unique = new Set(cats.length ? cats : ["other"]);
    for (const id of unique) {
      counts[id] = (counts[id] || 0) + 1;
    }
  }
  return counts;
}

function countsByInstructor(videos) {
  const counts = { all: videos.length, [UNKNOWN_INSTRUCTOR]: 0 };
  for (const v of videos) {
    const list = videoInstructors(v);
    if (!list.length) {
      counts[UNKNOWN_INSTRUCTOR] += 1;
      continue;
    }
    for (const name of new Set(list)) {
      counts[name] = (counts[name] || 0) + 1;
    }
  }
  return counts;
}

function countsByLevel(videos) {
  const counts = { all: videos.length, beginner: 0, intermediate: 0, advanced: 0 };
  for (const v of videos) {
    if (counts[v.level] != null) counts[v.level] += 1;
  }
  return counts;
}

function renderLevels() {
  const counts = countsByLevel(state.videos);
  els.levels.innerHTML = LEVELS.map((l, i) => {
    const active = state.level === l.id ? "active" : "";
    const count = counts[l.id] ?? 0;
    const num = String(i + 1).padStart(2, "0");
    return `<button type="button" class="level-btn ${active}" data-level="${l.id}" style="--lv:${l.color}">
      <span class="level-btn-index">${num}</span>
      <span class="level-btn-body">
        <span class="level-btn-label"><span class="level-dot" style="--lv:${l.color}"></span>${l.label}</span>
        <span class="level-btn-hint">${l.hint}</span>
      </span>
      <span class="level-btn-count"><strong>${count}</strong><small>本</small></span>
    </button>`;
  }).join("");
  const lv = levelMeta(state.level);
  els.levelBlurb.textContent = lv.blurb;
  if (els.levelToggleMeta) {
    els.levelToggleMeta.textContent = state.level === "all" ? "" : lv.label;
  }
}

const LEVEL_COLLAPSE_KEY = "youseful-level-collapsed";

function applyLevelCollapse(collapsed) {
  if (!els.levelPanel || !els.levelToggle) return;
  els.levelPanel.classList.toggle("is-collapsed", collapsed);
  els.levelToggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
}

function initLevelCollapse() {
  if (!els.levelToggle) return;
  let collapsed = false;
  try {
    collapsed = localStorage.getItem(LEVEL_COLLAPSE_KEY) === "1";
  } catch {
    /* ignore */
  }
  applyLevelCollapse(collapsed);
  els.levelToggle.addEventListener("click", () => {
    const next = !els.levelPanel.classList.contains("is-collapsed");
    applyLevelCollapse(next);
    try {
      localStorage.setItem(LEVEL_COLLAPSE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  });
}

function renderCategories() {
  const base = state.level === "all" ? state.videos : state.videos.filter((v) => v.level === state.level);
  const counts = countsByCategory(base);
  const visible = CATEGORIES.filter((c) => c.id === "all" || counts[c.id] > 0);
  els.categories.innerHTML = visible
    .map((c) => {
      const active = state.category === c.id ? "active" : "";
      return `<button type="button" class="cat-btn ${active}" data-id="${c.id}" style="--cat:${c.color}">
        <span class="cat-btn-label">${c.label}</span>
        <span class="cat-btn-count">${counts[c.id] || 0}</span>
      </button>`;
    })
    .join("");
}

function renderInstructors() {
  let base = state.videos;
  if (state.level !== "all") base = base.filter((v) => v.level === state.level);
  if (state.category !== "all") {
    base = base.filter((v) => videoCategories(v).includes(state.category));
  }
  const counts = countsByInstructor(base);
  const names = Object.keys(counts)
    .filter((k) => k !== "all" && k !== UNKNOWN_INSTRUCTOR && counts[k] > 0)
    .sort((a, b) => counts[b] - counts[a] || a.localeCompare(b, "ja"));

  const items = [
    { id: "all", label: `すべて（${counts.all}）` },
    ...names.map((name) => ({
      id: name,
      label: `${instructorDisplayName(name)}（${counts[name]}）`,
    })),
  ];
  if (counts[UNKNOWN_INSTRUCTOR] > 0) {
    items.push({
      id: UNKNOWN_INSTRUCTOR,
      label: `${UNKNOWN_INSTRUCTOR}（${counts[UNKNOWN_INSTRUCTOR]}）`,
    });
  }

  if (state.instructor !== "all" && !items.some((i) => i.id === state.instructor)) {
    state.instructor = "all";
  }

  els.instructors.innerHTML = items
    .map(
      (item) =>
        `<option value="${escapeHtml(item.id)}"${state.instructor === item.id ? " selected" : ""}>${escapeHtml(item.label)}</option>`
    )
    .join("");
}

function filteredVideos() {
  const q = state.query.trim().toLowerCase();
  const qPacked = normalizeSearch(state.query);
  let list = state.videos.filter((v) => {
    if (state.level !== "all" && v.level !== state.level) return false;
    if (state.category !== "all" && !videoCategories(v).includes(state.category)) return false;
    const instructors = videoInstructors(v);
    if (state.instructor === UNKNOWN_INSTRUCTOR) {
      if (instructors.length) return false;
    } else if (state.instructor !== "all") {
      if (!instructors.includes(state.instructor)) return false;
    }
    if (!q) return true;
    const hay = `${v.title || ""} ${instructorHaystack(v)}`.toLowerCase();
    if (hay.includes(q)) return true;
    // スペース有無を無視（「中田研介」「中田 研介」両対応）
    return normalizeSearch(hay).includes(qPacked);
  });

  const levelForScore = state.level === "all" ? "intermediate" : state.level;
  list = [...list].sort((a, b) => {
    if (state.sort === "title") return (a.title || "").localeCompare(b.title || "", "ja");
    if (state.sort === "views") return (b.views || 0) - (a.views || 0);
    if (state.sort === "recommend") {
      return scoreVideo(b, levelForScore) - scoreVideo(a, levelForScore);
    }
    const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return state.sort === "old" ? ta - tb : tb - ta;
  });

  return list;
}

function renderVideos() {
  const list = filteredVideos();
  const newCount = list.filter(isNew).length;
  const lv = levelMeta(state.level);
  const featured = state.level !== "all" && state.sort === "recommend";
  const prefix = featured ? `${lv.label}へのおすすめ ` : "";
  els.meta.textContent =
    `${prefix}${list.length} 本表示` + (newCount ? ` ／ 最新 ${newCount} 本` : "");
  els.empty.hidden = list.length > 0;

  els.grid.innerHTML = list
    .map((v, i) => {
      const cats = videoCategories(v).map((id) => catMeta(id));
      const lvMeta = levelMeta(v.level);
      const neu = isNew(v);
      const views = formatViews(v.views);
      const metaBits = [formatDate(v.publishedAt), views].filter(Boolean).join(" · ");
      const instructors = videoInstructors(v);
      const instructorChips = instructors
        .map(
          (name) =>
            `<span class="instructor-chip" style="--chip:${instructorColor(name)}" title="${escapeHtml(instructorDisplayName(name))}">${escapeHtml(name)}</span>`
        )
        .join("");
      const pick = featured && i < FEATURED_COUNT;
      const catChips = cats
        .map((cat) => `<span class="cat-chip" style="--chip:${cat.color}">${escapeHtml(cat.label)}</span>`)
        .join("");
      return `
        <a class="video-card ${pick ? "is-pick" : ""}" href="${v.url}" target="_blank" rel="noopener" style="animation-delay:${Math.min(i, 12) * 0.03}s">
          <div class="thumb-wrap">
            <img src="${v.thumbnail}" alt="" loading="lazy" width="480" height="270" />
            ${neu ? `<span class="badge-new">最新</span>` : ""}
            ${pick ? `<span class="badge-pick">おすすめ</span>` : ""}
            ${v.duration ? `<span class="duration">${v.duration}</span>` : ""}
          </div>
          <div class="card-body">
            <div class="chip-row">
              ${catChips}
              <span class="level-chip" style="--chip:${lvMeta.color}" title="${escapeHtml(lvMeta.label)}">${escapeHtml(lvMeta.short || lvMeta.label)}</span>
              ${instructorChips}
            </div>
            <h2 class="card-title">${escapeHtml(v.title)}</h2>
            <p class="card-meta">${escapeHtml(metaBits)}</p>
          </div>
        </a>`;
    })
    .join("");
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderAll() {
  renderLevels();
  renderCategories();
  renderInstructors();
  renderVideos();
  els.syncStatus.textContent = formatSynced(state.syncedAt);
}

async function fetchVideosPayload() {
  const urls = [`api/videos?t=${Date.now()}`, `data/videos.json?t=${Date.now()}`];
  let lastError = null;
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        lastError = new Error(`${url}: ${res.status}`);
        continue;
      }
      if (url.startsWith("api/")) state.hasApi = true;
      return res.json();
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("動画データの取得に失敗しました");
}

async function loadVideos() {
  const data = await fetchVideosPayload();
  const prevIds = new Set(state.videos.map((v) => v.id));
  state.videos = withLevels(data.videos || []);
  state.syncedAt = data.syncedAt;
  renderAll();

  if (state.hasApi) {
    els.btnSync.textContent = "今すぐ取り込み";
    els.btnSync.title = "YouTubeから今すぐ同期";
  }

  if (prevIds.size) {
    const newcomers = state.videos.filter((v) => !prevIds.has(v.id));
    if (newcomers.length) {
      els.syncStatus.textContent = `新規 ${newcomers.length} 本を取り込みました · ${formatSynced(state.syncedAt)}`;
    }
  }
}

async function manualSync() {
  els.btnSync.disabled = true;
  els.syncStatus.textContent = state.hasApi ? "取り込み中…" : "再読み込み中…";
  try {
    if (state.hasApi) {
      const res = await fetch("api/sync", { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "同期失敗");
      await loadVideos();
      els.syncStatus.textContent =
        (data.newCount ? `新規 ${data.newCount} 本 · ` : "更新なし · ") + formatSynced(data.syncedAt);
    } else {
      await loadVideos();
      els.syncStatus.textContent = `再読み込み完了 · ${formatSynced(state.syncedAt)}`;
    }
  } catch (err) {
    els.syncStatus.textContent = `失敗: ${err.message}`;
  } finally {
    els.btnSync.disabled = false;
  }
}

els.levels.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-level]");
  if (!btn) return;
  state.level = btn.dataset.level;
  if (state.level !== "all") state.sort = "recommend";
  els.sort.value = state.sort;
  renderAll();
});

els.categories.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-id]");
  if (!btn) return;
  state.category = btn.dataset.id;
  renderAll();
});

els.instructors.addEventListener("change", () => {
  state.instructor = els.instructors.value;
  renderVideos();
});

els.search.addEventListener("input", () => {
  state.query = els.search.value;
  renderVideos();
});

els.sort.addEventListener("change", () => {
  state.sort = els.sort.value;
  renderVideos();
});

els.btnSync.addEventListener("click", manualSync);

async function boot() {
  initLevelCollapse();
  try {
    await loadVideos();
  } catch {
    els.syncStatus.textContent = "データ読み込み待機中…";
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      try {
        await loadVideos();
        break;
      } catch {
        /* retry */
      }
    }
  }
}

boot();
