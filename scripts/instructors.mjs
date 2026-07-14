/** 講師名の正規化・抽出（概要欄の講師プロフィールから） */

const ALIASES = [
  { label: "なかけん", patterns: [/^なかけん/, /中田\s*研介/, /Nakata\s*Kensuke/i] },
  { label: "あっきー", patterns: [/^あっきー/, /秋山\s*望美/, /Akiyama\s*Nozomi/i] },
  { label: "おおはら しょうた", patterns: [/おお?はら/, /大原\s*翔太/, /Ohara\s*Shota/i] },
  { label: "とばちゃん", patterns: [/^とばちゃん/, /鳥羽/] },
  { label: "はじめ", patterns: [/^はじめ/, /五十川/, /Isogawa\s*Hajime/i] },
  { label: "りんたろう", patterns: [/^りんたろう/, /大垣\s*凜?太郎/, /大垣凜太郎/, /Ohgaki\s*Rintaro/i] },
  { label: "よーた", patterns: [/^よーた/, /^ようた/, /神川\s*陽太/, /Kamikawa\s*Yota/i] },
  { label: "濱津 太一", patterns: [/濱津/, /浜津/] },
  { label: "片原 唯伽", patterns: [/片原/] },
  { label: "渡部 壮", patterns: [/渡部\s*壮/, /Watanabe\s*Sou/i] },
  { label: "さわだ さき", patterns: [/さわだ/, /澤田/] },
  { label: "おさ", patterns: [/^おさ/, /長内/, /Osanai/i] },
];

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

function stripDecor(line = "") {
  return String(line)
    .replace(/^[「『"'\s◇◆●■□◎○▲△☆★＊*・🔥]+/, "")
    .replace(/[」』"']+$/g, "")
    .replace(/[　\s]+/g, " ")
    .trim();
}

function nicknameFromLine(line = "") {
  let cleaned = stripDecor(line);
  if (!cleaned || cleaned.startsWith("http") || cleaned.startsWith("▼") || cleaned.startsWith("#")) {
    return "";
  }
  // 「おさ🍎 …：長内孝平」のような装飾付き行
  const afterColon = cleaned.match(/[：:]\s*([^\s」』]{2,20})\s*$/)?.[1];
  if (afterColon && /長内|おさ/.test(cleaned)) cleaned = afterColon;

  const beforeParen = cleaned.match(/^([^（(〜~]+)/)?.[1]?.trim() || cleaned;
  const name = beforeParen
    .replace(/\s*[-–—].*$/, "")
    .replace(/[🍎🎈🎉✨🔥]+/g, "")
    .trim();
  if (!name || name.length > 24) return "";
  if (/プロフィール|ユースフル|株式会社|Youseful/.test(name)) return "";
  return name;
}

export function canonicalInstructor(raw = "") {
  const name = nicknameFromLine(raw) || stripDecor(raw);
  if (!name) return "";
  for (const alias of ALIASES) {
    if (alias.patterns.some((p) => p.test(name) || p.test(raw))) return alias.label;
  }
  return name;
}

/**
 * 概要欄から講師名配列を抽出。複数プロフィール対応。
 * プロフィール見出しがある場合のみ抽出（誤検知防止）。
 */
export function extractInstructors(description = "") {
  const text = description || "";
  if (!text.trim() || !/講師プロフィール/.test(text)) return [];

  const found = [];
  const seen = new Set();
  const push = (raw) => {
    const label = canonicalInstructor(raw);
    if (!label || seen.has(label)) return;
    seen.add(label);
    found.push(label);
  };

  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (!/講師プロフィール/.test(lines[i])) continue;
    let j = i + 1;
    while (j < lines.length && !lines[j].trim()) j++;
    if (j < lines.length) push(lines[j]);
  }

  return found;
}

export function instructorColor(label = "") {
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) >>> 0;
  return INSTRUCTOR_COLORS[h % INSTRUCTOR_COLORS.length];
}

export const UNKNOWN_INSTRUCTOR = { id: "unknown", label: "不明" };
