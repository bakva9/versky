// TF-IDF スコアリングと brightness 正規化
// 仕様: レシピ2（ポエティック極振り）
//   TF  = boolean（tf = 1 if term in doc else 0）
//   IDF = smooth（log((N+1)/(df+1)) + 1）
//   未知語は自然値（df=0 → 最大IDF 相当）

import { idf, loadIdf } from "./idf";

export interface ScoredTerm {
  term: string;
  score: number;
  brightness: number;
}

const MIN_STARS = 3;
const MAX_STARS = 12;
const BRIGHTNESS_MIN = 0.3;
const BRIGHTNESS_MAX = 1.0;

export async function scoreTerms(terms: string[]): Promise<ScoredTerm[]> {
  // 1) 初出順を保持したユニーク化
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const t of terms) {
    if (!seen.has(t)) {
      seen.add(t);
      unique.push(t);
    }
  }
  if (unique.length === 0) return [];

  // 2) IDF テーブル取得
  const table = await loadIdf();

  // 3) score = idf(term)（TF は boolean=1 のため実質 IDF）
  //    初出順を保持しつつ score 降順ソート（同点は初出順を維持 → Array.prototype.sort は stable）
  const scored = unique.map((term, order) => ({
    term,
    score: idf(term, table),
    order,
  }));
  scored.sort((a, b) => b.score - a.score || a.order - b.order);

  // 4) Top-N 切り出し
  const n = Math.max(MIN_STARS, Math.min(scored.length, MAX_STARS));
  const top = scored.slice(0, n);

  // 5) brightness 正規化（max-norm + 下限オフセット）
  const scoreMax = top[0]?.score ?? 1;
  const range = BRIGHTNESS_MAX - BRIGHTNESS_MIN;

  return top.map(({ term, score }) => ({
    term,
    score,
    brightness: BRIGHTNESS_MIN + range * (score / scoreMax),
  }));
}
