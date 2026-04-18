// Force-directed（Fruchterman-Reingold）
// ─────────────────────────────
// 仕様:
//   - 正規化座標系 [0, 1] × [0, 1]（area = 1）
//   - 反復回数 100、冷却は線形
//   - 最適距離 k = C * sqrt(area / n)、C = 1
//   - 斥力 F_rep = k^2 / d（全ペア）
//   - 引力 F_att = w * d^2 / k（辺でつながったペア、w は共起重み）
//   - 最小距離 MIN_DIST = 0.05（ゼロ除算防止 + 重なり緩和）
//   - 境界: 矩形クランプ、余白 MARGIN = 0.05
//   - 初期温度 t0 = 0.1（1 反復で動ける最大距離）

import type { Node2D } from "./layout";
import type { CooccurMatrix } from "./cooccur";

const ITERATIONS = 100;
const AREA = 1.0;
const C = 1.0;
const MIN_DIST = 0.05;
const MARGIN = 0.05;
const T0 = 0.1;

export interface ForceResult {
  x: number;
  y: number;
}

export function runForceDirected(
  nodes: Node2D[],
  cooccur: CooccurMatrix
): ForceResult[] {
  const n = nodes.length;
  if (n === 0) return [];
  if (n === 1) return [{ x: nodes[0].x, y: nodes[0].y }];

  const k = C * Math.sqrt(AREA / n);
  const positions = nodes.map((node) => ({ x: node.x, y: node.y }));
  const disp = new Array(n).fill(null).map(() => ({ x: 0, y: 0 }));

  for (let iter = 0; iter < ITERATIONS; iter++) {
    // 変位をリセット
    for (let i = 0; i < n; i++) {
      disp[i].x = 0;
      disp[i].y = 0;
    }

    // 斥力: 全ペア
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = positions[i].x - positions[j].x;
        const dy = positions[i].y - positions[j].y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), MIN_DIST);
        const force = (k * k) / dist;
        const ux = dx / dist;
        const uy = dy / dist;
        disp[i].x += ux * force;
        disp[i].y += uy * force;
        disp[j].x -= ux * force;
        disp[j].y -= uy * force;
      }
    }

    // 引力: 共起のあるペアのみ（行列の上三角を走査、w > 0 なら引力）
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const w = cooccur[i][j];
        if (w <= 0) continue;
        const dx = positions[i].x - positions[j].x;
        const dy = positions[i].y - positions[j].y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), MIN_DIST);
        const force = (w * dist * dist) / k;
        const ux = dx / dist;
        const uy = dy / dist;
        // 引力は距離を縮める方向（斥力と逆符号）
        disp[i].x -= ux * force;
        disp[i].y -= uy * force;
        disp[j].x += ux * force;
        disp[j].y += uy * force;
      }
    }

    // 線形冷却
    const t = T0 * (1 - iter / ITERATIONS);

    // 位置更新 + クランプ
    for (let i = 0; i < n; i++) {
      const d = disp[i];
      const mag = Math.sqrt(d.x * d.x + d.y * d.y);
      if (mag > 0) {
        const step = Math.min(mag, t);
        positions[i].x += (d.x / mag) * step;
        positions[i].y += (d.y / mag) * step;
      }
      // 矩形クランプ（余白込み）
      positions[i].x = clamp(positions[i].x, MARGIN, 1 - MARGIN);
      positions[i].y = clamp(positions[i].y, MARGIN, 1 - MARGIN);
    }
  }

  return positions;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
