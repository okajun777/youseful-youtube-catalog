const CATEGORIES = [
  { id: "all", label: "すべて", color: "#0b3d5c" },
  { id: "excel", label: "Excel", color: "#217346" },
  { id: "word", label: "Word", color: "#2b579a" },
  { id: "powerpoint", label: "PowerPoint", color: "#c43e1c" },
  { id: "outlook", label: "Outlook", color: "#0078d4" },
  { id: "teams", label: "Teams", color: "#6264a7" },
  { id: "copilot", label: "Copilot", color: "#0d9488" },
  { id: "power-automate", label: "Power Automate", color: "#0066ff" },
  { id: "power-bi", label: "Power BI", color: "#f2c811" },
  { id: "power-apps", label: "Power Apps", color: "#742774" },
  { id: "sharepoint", label: "SharePoint / OneDrive", color: "#038387" },
  { id: "planner", label: "Planner / To Do", color: "#31752f" },
  { id: "forms", label: "Forms / Loop", color: "#008272" },
  { id: "onenote", label: "OneNote", color: "#7719aa" },
  { id: "other", label: "その他", color: "#64748b" },
];

const DAY_MS = 24 * 60 * 60 * 1000;
const POLL_MS = 60 * 1000;

const state = {
  videos: [],
  syncedAt: null,
  category: "all",
  query: "",
  sort: "new",
};

const els = {
  categories: document.getElementById("categories"),
  grid: document.getElementById("videoGrid"),
  empty: document.getElementById("empty"),
  meta: document.getElementById("resultMeta"),
  syncStatus: document.getElementById("syncStatus"),
  search: document.getElementById("search"),
  sort: document.getElementById("sort"),
  btnSync: document.getElementById("btnSync"),
};

function isNew(video) {
  if (!video.publishedAt) return false;
  const t = Date.parse(video.publishedAt);
  if (Number.isNaN(t)) return false;
  return Date.now() - t < DAY_MS;
}

function catMeta(id) {
  return CATEGORIES.find((c) => c.id === id) || CATEGORIES.at(-1);
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

function renderCategories() {
  const counts = countsByCategory(state.videos);
  const visible = CATEGORIES.filter((c) => c.id === "all" || counts[c.id] > 0);
  els.categories.innerHTML = visible
    .map((c) => {
      const active = state.category === c.id ? "active" : "";
      return `<button type="button" class="cat-btn ${active}" data-id="${c.id}" style="--cat:${c.color}">
        ${c.label}<span class="count">${counts[c.id] || 0}</span>
      </button>`;
    })
    .join("");
}

function filteredVideos() {
  const q = state.query.trim().toLowerCase();
  let list = state.videos.filter((v) => {
    if (state.category !== "all" && v.category !== state.category) return false;
    if (!q) return true;
    return (v.title || "").toLowerCase().includes(q);
  });

  list = [...list].sort((a, b) => {
    if (state.sort === "title") return (a.title || "").localeCompare(b.title || "", "ja");
    if (state.sort === "views") return (b.views || 0) - (a.views || 0);
    const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return state.sort === "old" ? ta - tb : tb - ta;
  });

  return list;
}

function renderVideos() {
  const list = filteredVideos();
  const newCount = list.filter(isNew).length;
  els.meta.textContent = `${list.length} 本表示` + (newCount ? ` ／ 最新 ${newCount} 本` : "");
  els.empty.hidden = list.length > 0;

  els.grid.innerHTML = list
    .map((v, i) => {
      const cat = catMeta(v.category);
      const neu = isNew(v);
      const views = formatViews(v.views);
      const metaBits = [formatDate(v.publishedAt), views].filter(Boolean).join(" · ");
      return `
        <a class="video-card" href="${v.url}" target="_blank" rel="noopener" style="animation-delay:${Math.min(i, 12) * 0.03}s">
          <div class="thumb-wrap">
            <img src="${v.thumbnail}" alt="" loading="lazy" width="480" height="270" />
            ${neu ? `<span class="badge-new">最新</span>` : ""}
            ${v.duration ? `<span class="duration">${v.duration}</span>` : ""}
          </div>
          <div class="card-body">
            <span class="cat-chip" style="--cat:${cat.color}">${cat.label}</span>
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
  renderCategories();
  renderVideos();
  els.syncStatus.textContent = formatSynced(state.syncedAt);
}

async function loadVideos() {
  const res = await fetch(`/api/videos?t=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("動画データの取得に失敗しました");
  const data = await res.json();
  const prevIds = new Set(state.videos.map((v) => v.id));
  state.videos = data.videos || [];
  state.syncedAt = data.syncedAt;
  renderAll();

  if (prevIds.size) {
    const newcomers = state.videos.filter((v) => !prevIds.has(v.id));
    if (newcomers.length) {
      els.syncStatus.textContent = `新規 ${newcomers.length} 本を取り込みました · ${formatSynced(state.syncedAt)}`;
    }
  }
}

async function manualSync() {
  els.btnSync.disabled = true;
  els.syncStatus.textContent = "取り込み中…";
  try {
    const res = await fetch("/api/sync", { method: "POST" });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "同期失敗");
    await loadVideos();
    els.syncStatus.textContent =
      (data.newCount ? `新規 ${data.newCount} 本 · ` : "更新なし · ") + formatSynced(data.syncedAt);
  } catch (err) {
    els.syncStatus.textContent = `取り込み失敗: ${err.message}`;
  } finally {
    els.btnSync.disabled = false;
  }
}

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
    els.syncStatus.textContent = "初回同期を待機しています…";
    // サーバー起動直後はデータ未生成のことがある
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
