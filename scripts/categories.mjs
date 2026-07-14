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
  // タイトル先頭の【製品名】を最優先
  const bracket = title.match(/【([^】]+)】/);
  if (bracket) {
    const fromTag = matchCategory(bracket[1]);
    if (fromTag) return fromTag;
  }

  return matchCategory(title) || "other";
}

export function categoryLabel(id) {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}
