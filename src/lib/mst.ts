// 最小全域木（Kruskal + Union-Find）
// ─────────────────────────────
// 仕様:
//   - 辺重み: 1 / 共起強度 w_cooc （主キー）
//   - 同値 tiebreak: 語順距離 |i - j|（小さい順で優先）
//   - 共起 0 のペアは Infinity（必要なら採用されるが最後）
//   - 完全グラフ（n*(n-1)/2 本の辺）から n-1 本を選ぶ

import type { StarEdge } from "../components/ConstellationCanvas";
import type { CooccurMatrix } from "./cooccur";

interface Edge {
  u: number;
  v: number;
  weight: number;    // 1 / w_cooc
  orderDist: number; // tiebreak 用の語順距離
}

export function kruskalMST(
  selectedTerms: string[],
  cooccur: CooccurMatrix,
  contentSeq: string[]
): StarEdge[] {
  const n = selectedTerms.length;
  if (n <= 1) return [];

  // 各 term の初出位置（語順 tiebreak 用）
  const firstPos = new Map<string, number>();
  for (let p = 0; p < contentSeq.length; p++) {
    const term = contentSeq[p];
    if (!firstPos.has(term)) firstPos.set(term, p);
  }
  const termPos = selectedTerms.map((t) => firstPos.get(t) ?? Number.MAX_SAFE_INTEGER);

  // 完全グラフの辺を生成
  const edges: Edge[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const w = cooccur[i][j];
      const weight = w > 0 ? 1 / w : Infinity;
      const orderDist = Math.abs(termPos[i] - termPos[j]);
      edges.push({ u: i, v: j, weight, orderDist });
    }
  }

  // 重み昇順、同値は orderDist 昇順でソート
  edges.sort((a, b) => (a.weight - b.weight) || (a.orderDist - b.orderDist));

  const uf = new UnionFind(n);
  const mst: StarEdge[] = [];
  for (const e of edges) {
    if (uf.union(e.u, e.v)) {
      mst.push({ u: e.u, v: e.v });
      if (mst.length === n - 1) break;
    }
  }
  return mst;
}

class UnionFind {
  private parent: number[];
  private rank: number[];

  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = new Array(n).fill(0);
  }

  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]); // 経路圧縮
    }
    return this.parent[x];
  }

  union(x: number, y: number): boolean {
    const rx = this.find(x);
    const ry = this.find(y);
    if (rx === ry) return false; // 既に同じ成分 → 閉路になるので不採用
    if (this.rank[rx] < this.rank[ry]) {
      this.parent[rx] = ry;
    } else if (this.rank[rx] > this.rank[ry]) {
      this.parent[ry] = rx;
    } else {
      this.parent[ry] = rx;
      this.rank[rx]++;
    }
    return true;
  }
}
