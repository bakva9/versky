// 神話テキスト生成（Day 4: 案C + 案D ハイブリッド）
// ─────────────────────────────
// 仕様:
//   - 案D（入力特徴でテンプレ切替）: 語数・主役品詞で骨組みを選ぶ
//   - 案C（装飾辞書でランダム穴埋め）: 詩的形容詞・動詞・副詞・接続句から抽出
//   - 選出語は必ず登場。主役 = TF-IDF 最上位
//   - 同じ入力でも再実行で出力が変わる（装飾のランダム抽出）

export interface MythInput {
  /** TF-IDF スコア順の選出語 */
  terms: string[];
  /** terms と同じ順序の品詞（"名詞" | "動詞" | "形容詞" | "副詞"） */
  pos: string[];
}

// ─────────────────────────────
// 装飾辞書（案C）
// ─────────────────────────────

const ADJ = [
  "仄白い", "薄明の", "かすかな", "透きとおる", "揺らぐ", "冷えた",
  "仄暗い", "淡い", "静謐な", "微かな", "夜更けの", "ほのかな",
  "澄んだ", "青い", "凍える", "遠い",
];

const VERB = [
  "宿る", "息づく", "揺らぐ", "編む", "残る", "沈む",
  "立ち上がる", "ひらく", "溶ける", "紡ぐ", "結ぶ", "漂う",
];

const VERB_PAST = [
  "宿った", "息づいた", "揺らいだ", "編まれた", "沈んだ",
  "ひらいた", "紡がれた", "結ばれた", "漂った", "残った",
];

const ADV = [
  "ひそやかに", "静かに", "遠く", "そっと", "かすかに",
  "しずしずと", "あわく", "ゆるやかに", "ひとしきり",
];

const CONNECTOR = [
  "のあいだに", "のあわいに", "の境界に", "の奥に",
  "と重なって", "に寄りそい", "に触れて",
];

// ─────────────────────────────
// テンプレ（案D）
// ─────────────────────────────
//   slot 参照: {主役} {関連A} {関連B} {関連C} {関連D}
//              {adj1} {adj2} {verb} {verb_past} {adv} {connector}
//   Feature で選択される
// ─────────────────────────────

interface Template {
  id: string;
  minTerms: number;
  maxTerms: number;
  /** 動詞・形容詞主役で好むテンプレはフラグで選択強化 */
  preferredPos?: string[];
  text: string;
}

const TEMPLATES: Template[] = [
  // 小規模（2-3語）
  {
    id: "small-noun",
    minTerms: 2,
    maxTerms: 3,
    preferredPos: ["名詞"],
    text: "{adj1}{主役}が{関連A}{connector}{verb}。{関連B}だけが{adv}{verb_past}。",
  },
  {
    id: "small-verb",
    minTerms: 2,
    maxTerms: 3,
    preferredPos: ["動詞", "形容詞"],
    text: "{主役}という気配が{adj1}{関連A}を呼び、{関連B}を{verb}。",
  },

  // 中規模（4-6語）
  {
    id: "medium-a",
    minTerms: 4,
    maxTerms: 6,
    preferredPos: ["名詞"],
    text: "{adj1}{主役}は{関連A}と{関連B}{connector}立ち、{関連C}は{adv}消えた。{関連D}だけが夜に{verb_past}。",
  },
  {
    id: "medium-b",
    minTerms: 4,
    maxTerms: 6,
    text: "{主役}を中心に、{関連A}と{関連B}が{adv}{verb}。{adj1}{関連C}が{関連D}を{verb_past}。",
  },
  {
    id: "medium-verb",
    minTerms: 4,
    maxTerms: 6,
    preferredPos: ["動詞", "形容詞"],
    text: "{主役}という動きが{adj1}{関連A}を引き寄せ、{関連B}と{関連C}を{verb}。{関連D}だけが{adv}残された。",
  },

  // 大規模（7語以上）
  {
    id: "large-a",
    minTerms: 7,
    maxTerms: 999,
    text: "{adj1}{主役}は{関連A}を纏い、{関連B}{connector}立つ。{adv}{関連C}が{verb}、{関連D}と{関連E}だけが夜の果てに{verb_past}。",
  },
  {
    id: "large-b",
    minTerms: 7,
    maxTerms: 999,
    text: "{主役}の周りに{adj1}{関連A}と{adj2}{関連B}が集い、{関連C}は{adv}ほどけた。{関連D}が{verb}、{関連E}は{verb_past}。",
  },
];

// ─────────────────────────────
// 公開API
// ─────────────────────────────

export function generateMyth(input: MythInput, rng: () => number = Math.random): string {
  const { terms, pos } = input;
  if (terms.length === 0) {
    return "夜の端に一筋の光が差し、名もなき星がひとつ生まれた。";
  }
  if (terms.length === 1) {
    const adj = pick(ADJ, rng);
    const verbPast = pick(VERB_PAST, rng);
    return `${adj}${terms[0]}が、ただひとつ${verbPast}。`;
  }

  const mainPos = pos[0] ?? "名詞";
  const tpl = selectTemplate(terms.length, mainPos, rng);
  return fillTemplate(tpl.text, terms, rng);
}

// ─────────────────────────────
// 内部ヘルパ
// ─────────────────────────────

function selectTemplate(n: number, mainPos: string, rng: () => number): Template {
  const inRange = TEMPLATES.filter((t) => n >= t.minTerms && n <= t.maxTerms);
  const preferred = inRange.filter((t) => t.preferredPos?.includes(mainPos));
  const pool = preferred.length > 0 ? preferred : inRange;
  if (pool.length === 0) return TEMPLATES[0]; // fallback
  return pool[Math.floor(rng() * pool.length)];
}

function fillTemplate(text: string, terms: string[], rng: () => number): string {
  const relLabels = ["A", "B", "C", "D", "E"];
  const replacements: Record<string, string> = {
    "{主役}": terms[0],
    "{adj1}": pick(ADJ, rng),
    "{adj2}": pick(ADJ, rng),
    "{verb}": pick(VERB, rng),
    "{verb_past}": pick(VERB_PAST, rng),
    "{adv}": pick(ADV, rng),
    "{connector}": pick(CONNECTOR, rng),
  };
  // 関連語: terms[1..] を順に充てる。足りない slot は空文字で消す
  for (let i = 0; i < relLabels.length; i++) {
    const key = `{関連${relLabels[i]}}`;
    replacements[key] = terms[i + 1] ?? "";
  }

  let out = text;
  for (const [k, v] of Object.entries(replacements)) {
    out = out.split(k).join(v);
  }
  // 残った空 slot 周辺を整える（「と、」「、だけが」等の残渣を軽く掃除）
  out = out
    .replace(/と$/gm, "")
    .replace(/、、+/g, "、")
    .replace(/と。/g, "。")
    .replace(/、$/gm, "。");
  return out;
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}
