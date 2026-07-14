/** 講師名の正規化・抽出（概要欄の講師プロフィールから） */

export const INSTRUCTORS = [
  {
    label: "なかけん",
    formal: "中田 研介",
    aliases: ["なかけん", "中田研介", "中田 研介", "Nakata Kensuke", "Nakata", "kensuke", "なかた"],
    patterns: [/^なかけん/, /中田\s*研介/, /Nakata\s*Kensuke/i],
  },
  {
    label: "あっきー",
    formal: "秋山 望美",
    aliases: ["あっきー", "あっきー", "秋山望美", "秋山 望美", "Akiyama Nozomi", "Akiyama", "Nozomi", "あきやま"],
    patterns: [/^あっきー/, /秋山\s*望美/, /Akiyama\s*Nozomi/i],
  },
  {
    label: "おおはら しょうた",
    formal: "大原 翔太",
    aliases: ["おおはら", "おおはらしょうた", "大原翔太", "大原 翔太", "Ohara Shota", "Ohara", "Shota"],
    patterns: [/おお?はら/, /大原\s*翔太/, /Ohara\s*Shota/i],
  },
  {
    label: "とばちゃん",
    formal: "鳥羽",
    aliases: ["とばちゃん", "とば", "鳥羽", "Toba"],
    patterns: [/^とばちゃん/, /鳥羽/],
  },
  {
    label: "はじめ",
    formal: "五十川 元",
    aliases: ["はじめ", "五十川元", "五十川 元", "Isogawa Hajime", "Isogawa", "Hajime", "いそがわ"],
    patterns: [/^はじめ/, /五十川/, /Isogawa\s*Hajime/i],
  },
  {
    label: "りんたろう",
    formal: "大垣 凜太郎",
    aliases: ["りんたろう", "大垣凜太郎", "大垣 凜太郎", "大垣凛太郎", "Ohgaki Rintaro", "Ohgaki", "Rintaro", "おおがき"],
    patterns: [/^りんたろう/, /大垣\s*凜?太郎/, /大垣凜太郎/, /Ohgaki\s*Rintaro/i],
  },
  {
    label: "よーた",
    formal: "神川 陽太",
    aliases: ["よーた", "ようた", "神川陽太", "神川 陽太", "Kamikawa Yota", "Kamikawa", "Yota", "かみかわ"],
    patterns: [/^よーた/, /^ようた/, /神川\s*陽太/, /Kamikawa\s*Yota/i],
  },
  {
    label: "濱津 太一",
    formal: "濱津 太一",
    aliases: ["濱津太一", "濱津 太一", "浜津太一", "浜津 太一", "Hamatsu", "たいち"],
    patterns: [/濱津/, /浜津/],
  },
  {
    label: "片原 唯伽",
    formal: "片原 唯伽",
    aliases: ["片原唯伽", "片原 唯伽", "Katahara Yuika", "Katahara", "Yuika", "かたはら"],
    patterns: [/片原/],
  },
  {
    label: "渡部 壮",
    formal: "渡部 壮",
    aliases: ["渡部壮", "渡部 壮", "Watanabe Sou", "Watanabe", "わたなべ"],
    patterns: [/渡部\s*壮/, /Watanabe\s*Sou/i],
  },
  {
    label: "さわだ さき",
    formal: "澤田 咲",
    aliases: ["さわだ", "さわださき", "澤田咲", "澤田 咲", "沢田", "Sawada"],
    patterns: [/さわだ/, /澤田/, /沢田/],
  },
  {
    label: "おさ",
    formal: "長内 孝平",
    aliases: ["おさ", "長内孝平", "長内 孝平", "Osanai", "おさない"],
    patterns: [/^おさ/, /長内/, /Osanai/i],
  },
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

export function instructorMeta(label = "") {
  return INSTRUCTORS.find((i) => i.label === label) || null;
}

export function instructorSearchText(labels = []) {
  const parts = [];
  for (const label of labels) {
    parts.push(label);
    const meta = instructorMeta(label);
    if (meta) {
      if (meta.formal) parts.push(meta.formal);
      parts.push(...(meta.aliases || []));
    }
  }
  return [...new Set(parts.map((p) => String(p).trim()).filter(Boolean))].join(" ");
}

export function instructorOptionLabel(label = "") {
  const meta = instructorMeta(label);
  if (meta?.formal && meta.formal !== label) return `${label}（${meta.formal}）`;
  return label;
}

export function canonicalInstructor(raw = "") {
  const name = nicknameFromLine(raw) || stripDecor(raw);
  if (!name) return "";
  for (const alias of INSTRUCTORS) {
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
