// 共起行列（Day 2 位置層の入力）
// ─────────────────────────────
// 仕様:
//   - 窓幅 k=5（単語 i の前後 k 語以内を「共起候補」とする）
//   - 距離重み 1/d（d=1..k、d>k は 0）
//   - 対称行列。対角は 0
//   - 対象は「選出された Top-N 語」のみ。ただし文脈（距離）は content word 列全体で測る

export type CooccurMatrix = number[][];

export interface CooccurResult {
  matrix: CooccurMatrix;
  terms: string[];
}

export function buildCooccur(
  contentSeq: string[],
  selectedTerms: string[],
  windowSize = 5
): CooccurResult {
  const n = selectedTerms.length;
  const termIndex = new Map<string, number>();
  selectedTerms.forEach((t, i) => termIndex.set(t, i));

  const matrix: CooccurMatrix = Array.from({ length: n }, () => new Array(n).fill(0));

  // content sequence 内で「選出語同士」の距離を走査
  // 各位置 i について、i+1..i+windowSize の範囲を見て重み 1/d を加算
  for (let i = 0; i < contentSeq.length; i++) {
    const a = termIndex.get(contentSeq[i]);
    if (a === undefined) continue;
    const jMax = Math.min(contentSeq.length, i + windowSize + 1);
    for (let j = i + 1; j < jMax; j++) {
      const b = termIndex.get(contentSeq[j]);
      if (b === undefined) continue;
      if (a === b) continue; // 同じ語の再出現はスキップ
      const d = j - i;
      const w = 1 / d;
      matrix[a][b] += w;
      matrix[b][a] += w;
    }
  }

  return { matrix, terms: selectedTerms };
}
