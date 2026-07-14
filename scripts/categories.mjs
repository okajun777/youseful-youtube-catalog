/** Microsoft 365 製品カテゴリ（ユースフル記事カテゴリに準拠） */
export const CATEGORIES = [
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

export const LEVELS = [
  { id: "all", label: "すべて", short: "すべて", color: "#0b3d5c", blurb: "" },
  { id: "beginner", label: "初心者", short: "初心者", color: "#0e7c66", blurb: "基礎・入門から安心して学べる動画" },
  { id: "intermediate", label: "中級者", short: "中級者", color: "#c27803", blurb: "時短・実務活用で一段レベルアップ" },
  { id: "advanced", label: "上級者", short: "上級者", color: "#b91c1c", blurb: "応用・自動化・深い使いこなし" },
];

const RULES = [
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
  { id: "planner", patterns: [/\bplanner\b/i, /プランナー/, /microsoft\s*to\s*do/i, /マイクロソフト\s*to\s*do/i] },
  { id: "forms", patterns: [/microsoft\s*forms/i, /マイクロソフト\s*forms/i, /マイクロソフト\s*loop/i] },
  { id: "onenote", patterns: [/onenote/i, /ワンノート/] },
];

const BEGINNER_PATTERNS = [
  /超入門/,
  /初心者/,
  /はじめて/,
  /初めて/,
  /ゼロから/,
  /0から/,
  /基礎から/,
  /基本から/,
  /初級/,
  /入門/,
  /基礎解説/,
  /基本知識/,
  /10分でわかる/,
  /たった\d*動画で/,
  /教科書/,
];

const ADVANCED_PATTERNS = [
  /上級/,
  /応用/,
  /発展/,
  /API/,
  /VBA/,
  /マクロ(?!不要)/,
  /自動化の極み/,
  /徹底攻略/,
  /完全攻略/,
  /プロ向け/,
  /実務のプロ/,
  /高度な/,
  /ディープ/,
];

const INTERMEDIATE_PATTERNS = [
  /中級/,
  /実践/,
  /活用術/,
  /時短/,
  /神ワザ/,
  /便利技/,
  /テクニック/,
  /効率化/,
  /業務改善/,
  /最新活用/,
  /ケーススタディ/,
];

function matchCategory(text) {
  if (!text) return null;
  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(text))) return rule.id;
  }
  return null;
}

/**
 * タイトルから Microsoft 365 製品カテゴリを推定。
 * 説明文は宣伝文言が多く誤分類の元になるため使わない。
 */
export function categorizeVideo(title = "") {
  const bracket = title.match(/【([^】]+)】/);
  if (bracket) {
    const fromTag = matchCategory(bracket[1]);
    if (fromTag) return fromTag;
  }
  return matchCategory(title) || "other";
}

/**
 * タイトルから学習レベルを推定。
 * 明示キーワード優先。曖昧な実務ネタは中級寄り。
 */
export function rankLevel(title = "") {
  const t = title || "";
  const hasBeginner = BEGINNER_PATTERNS.some((p) => p.test(t));
  const hasAdvanced = ADVANCED_PATTERNS.some((p) => p.test(t));
  const hasIntermediate = INTERMEDIATE_PATTERNS.some((p) => p.test(t));

  if (hasAdvanced && !hasBeginner) return "advanced";
  if (hasBeginner && !hasAdvanced) return "beginner";
  if (hasAdvanced && hasBeginner) return "intermediate";
  if (hasIntermediate) return "intermediate";

  const cat = categorizeVideo(t);
  if (cat !== "other") return "intermediate";
  return "beginner";
}

/** ランク別おすすめ用スコア（高いほど推したい） */
export function recommendScore(video, level = "all") {
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

export function categoryLabel(id) {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function levelLabel(id) {
  return LEVELS.find((l) => l.id === id)?.label ?? id;
}
