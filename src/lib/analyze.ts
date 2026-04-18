import type { IpadicFeatures } from "kuromoji";
import type { Star, StarEdge } from "../components/ConstellationCanvas";
import { tokenize } from "./tokenize";
import { scoreTerms } from "./tfidf";
import { buildCooccur } from "./cooccur";
import { radialInit } from "./layout";
import { runForceDirected } from "./force";
import { kruskalMST } from "./mst";
import { generateMyth } from "./myth";

export interface ConstellationResult {
  stars: Star[];
  edges: StarEdge[];
  myth: string;
}

// 3層の数理モデル（進行中）
// 1) 形態素解析: tokenize（済）→ 品詞フィルタ（済）→ basic_form 正規化（済）
// 2) 明るさ層: TF-IDF → brightness  ← Day 1（本人実装: tfidf.ts / idf.ts）
// 3) 位置層: 共起行列 → Force-directed → x, y  ← Day 2（本人実装）
// 4) 結線層: Kruskal MST + Union-Find → edges  ← Day 3（本人実装）
// 5) 神話テキスト: 詩的トーン生成
export async function analyze(text: string): Promise<ConstellationResult> {
  const t0 = performance.now();
  const rawTokens = await tokenize(text);
  console.log(`[versky] tokenize: ${(performance.now() - t0).toFixed(0)}ms, ${rawTokens.length} tokens`);

  const content = filterContentWords(rawTokens);
  console.log("[versky] content words:", content.map((w) => `${w.label}(${w.pos_detail})`).join(" "));

  // Day 1: TF-IDF スコアで Top-N 選出 + brightness 算出
  const scored = await scoreTerms(content.map((w) => w.label));
  console.log(
    "[versky] scored:",
    scored.map((s) => `${s.term}(${s.score.toFixed(2)}→${s.brightness.toFixed(2)})`).join(" ")
  );

  // 選出された term を content の初出と突き合わせて色・品詞情報を保持
  const termToWord = new Map<string, ContentWord>();
  for (const w of content) if (!termToWord.has(w.label)) termToWord.set(w.label, w);

  // Day 2: 共起行列 → 初期配置 → Force-directed で位置確定
  const selectedTerms = scored.map((s) => s.term);
  const contentSeq = content.map((w) => w.label);
  const { matrix } = buildCooccur(contentSeq, selectedTerms, 5);
  const initial = radialInit(scored.map((s) => s.brightness));
  const positions = runForceDirected(initial, matrix);
  console.log(
    "[versky] positions:",
    positions.map((p, i) => `${selectedTerms[i]}(${p.x.toFixed(2)},${p.y.toFixed(2)})`).join(" ")
  );

  const stars: Star[] = scored.map((s, i) => {
    const w = termToWord.get(s.term);
    return {
      id: i,
      x: positions[i].x,
      y: positions[i].y,
      brightness: s.brightness,
      label: s.term,
      color: w?.color,
    };
  });

  // Day 3: Kruskal MST（辺重み = 1/共起強度、同値は語順距離 tiebreak）
  const edges: StarEdge[] = kruskalMST(selectedTerms, matrix, contentSeq);
  console.log(
    "[versky] MST edges:",
    edges.map((e) => `${selectedTerms[e.u]}-${selectedTerms[e.v]}`).join(" ")
  );

  // Day 4: 神話テキスト生成（案C+D ハイブリッド）
  const termPos = selectedTerms.map((t) => termToWord.get(t)?.pos ?? "名詞");
  const myth = generateMyth({ terms: selectedTerms, pos: termPos });
  console.log("[versky] myth:", myth);

  return { stars, edges, myth };
}

// ─────────────────────────────────────────
// 品詞フィルタ + 正規化 + 色付け（周辺実装枠）
// ─────────────────────────────────────────

interface ContentWord {
  label: string;
  color: string;
  pos: string;
  pos_detail: string;
}

const INCLUDE_POS = new Set(["名詞", "動詞", "形容詞", "副詞"]);
const EXCLUDE_DETAIL = new Set(["非自立", "接尾", "数", "代名詞"]);

const COLOR_DEFAULT = "#FFFFFF";
const COLOR_PERSON = "#FFD27F";
const COLOR_PLACE = "#9FB8FF";
const COLOR_OTHER_PROPER = "#B6FFCB";

function filterContentWords(tokens: IpadicFeatures[]): ContentWord[] {
  return tokens
    .filter((t) => INCLUDE_POS.has(t.pos) && !EXCLUDE_DETAIL.has(t.pos_detail_1))
    .map((t) => ({
      label: normalizeLabel(t),
      color: colorFromToken(t),
      pos: t.pos,
      pos_detail: t.pos_detail_1,
    }));
}

function normalizeLabel(t: IpadicFeatures): string {
  // 動詞・形容詞は原形に寄せる（「帰ろ」→「帰る」）。basic_form が "*" の場合は surface_form
  if (t.pos === "動詞" || t.pos === "形容詞") {
    return t.basic_form !== "*" ? t.basic_form : t.surface_form;
  }
  return t.surface_form;
}

function colorFromToken(t: IpadicFeatures): string {
  if (t.pos !== "名詞" || t.pos_detail_1 !== "固有名詞") return COLOR_DEFAULT;
  if (t.pos_detail_2 === "人名") return COLOR_PERSON;
  if (t.pos_detail_2 === "地域") return COLOR_PLACE;
  return COLOR_OTHER_PROPER;
}
