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
const POLL_MS = 60 * 1000;
const FEATURED_COUNT = 8;

const BEGINNER_RE = /超入門|初心者|はじめて|初めて|ゼロから|0から|基礎から|基本から|初級|入門|基礎解説|基本知識|10分でわかる|教科書/;
const ADVANCED_RE = /上級|応用|発展|API|VBA|マクロ(?!不要)|徹底攻略|完全攻略|プロ向け|高度な/;
const INTERMEDIATE_RE = /中級|実践|活用術|時短|神ワザ|便利技|テクニック|効率化|業務改善|最新活用/;

const state = {
  videos: [],
  syncedAt: null,
  category: "all",
  level: "all",
  query: "",
  sort: "recommend",
  hasApi: false,
};

const els = {
  categories: document.getElementById("categories"),
  levels: document.getElementById("levels"),
  levelBlurb: document.getElementById("levelBlurb"),
  grid: document.getElementById("videoGrid"),
  empty: document.getElementById("empty"),
  meta: document.getElementById("resultMeta"),
  syncStatus: document.getElementById("syncStatus"),
  search: document.getElementById("search"),
  sort: document.getElementById("sort"),
  btnSync: document.getElementById("btnSync"),
};

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
    return { ...v, level, _score: scoreVideo({ ...v, level }, level) };
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
    counts[v.category] = (counts[v.category] || 0) + 1;
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
  els.levelBlurb.textContent = levelMeta(state.level).blurb;
}

function renderCategories() {
  const base = state.level === "all" ? state.videos : state.videos.filter((v) => v.level === state.level);
  const counts = countsByCategory(base);
  const visible = CATEGORIES.filter((c) => c.id === "all" || counts[c.id] > 0);
  els.categories.innerHTML = visible
    .map((c) => {
      const active = state.category === c.id ? "active" : "";
      return `<button type="button" class="cat-btn ${active}" data-id="${c.id}">
        <span class="cat-btn-label">${c.label}</span>
        <span class="cat-btn-count">${counts[c.id] || 0}</span>
      </button>`;
    })
    .join("");
}

function filteredVideos() {
  const q = state.query.trim().toLowerCase();
  let list = state.videos.filter((v) => {
    if (state.level !== "all" && v.level !== state.level) return false;
    if (state.category !== "all" && v.category !== state.category) return false;
    if (!q) return true;
    return (v.title || "").toLowerCase().includes(q);
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
      const cat = catMeta(v.category);
      const lvMeta = levelMeta(v.level);
      const neu = isNew(v);
      const views = formatViews(v.views);
      const metaBits = [formatDate(v.publishedAt), views].filter(Boolean).join(" · ");
      const pick = featured && i < FEATURED_COUNT;
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
              <span class="cat-chip" style="--chip:${cat.color}">${escapeHtml(cat.label)}</span>
              <span class="level-chip" style="--chip:${lvMeta.color}" title="${escapeHtml(lvMeta.label)}">${escapeHtml(lvMeta.short || lvMeta.label)}</span>
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
  setInterval(() => {
    loadVideos().catch(() => {});
  }, POLL_MS);
}

boot();
