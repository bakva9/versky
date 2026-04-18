// 初期配置（FR 開始前の座標生成）
// ─────────────────────────────
// 仕様: brightness 放射
//   - brightness 最大の語を中心 (0.5, 0.5) に
//   - 残りは brightness 降順で同心円状に配置
//   - 1リング最大 6 個。溢れたら外側リングへ
//   - リング半径 r_k = BASE_R + (k-1) * RING_STEP

export interface Node2D {
  index: number;
  x: number;
  y: number;
  brightness: number;
}

const CENTER_X = 0.5;
const CENTER_Y = 0.5;
const BASE_R = 0.15;
const RING_STEP = 0.15;
const MAX_PER_RING = 6;

export function radialInit(brightnesses: number[]): Node2D[] {
  const n = brightnesses.length;
  if (n === 0) return [];

  // brightness 降順で並べ替え（元 index を保持）
  const order = brightnesses
    .map((b, i) => ({ i, b }))
    .sort((a, b) => b.b - a.b);

  const nodes: Node2D[] = new Array(n);

  // 0 番目（最大）は中心へ
  nodes[order[0].i] = {
    index: order[0].i,
    x: CENTER_X,
    y: CENTER_Y,
    brightness: order[0].b,
  };

  // 残りをリング配置
  let placed = 1;
  let ring = 1;
  while (placed < n) {
    const remaining = n - placed;
    const countInRing = Math.min(MAX_PER_RING, remaining);
    const r = BASE_R + (ring - 1) * RING_STEP;
    // リング内角度は等間隔。位相を ring 番号でずらして見た目を散らす
    const phaseOffset = (ring * Math.PI) / MAX_PER_RING;

    for (let k = 0; k < countInRing; k++) {
      const theta = phaseOffset + (2 * Math.PI * k) / countInRing;
      const { i, b } = order[placed];
      nodes[i] = {
        index: i,
        x: CENTER_X + r * Math.cos(theta),
        y: CENTER_Y + r * Math.sin(theta),
        brightness: b,
      };
      placed++;
    }
    ring++;
  }

  return nodes;
}
