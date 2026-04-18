import { useEffect, useRef } from "react";

export interface Star {
  id: number;
  x: number;        // 0.0–1.0
  y: number;        // 0.0–1.0
  brightness: number; // 0.0–1.0
  label: string;
  color?: string;   // 省略時は白系（#FFFFFF）
}

export interface StarEdge {
  u: number;
  v: number;
}

interface Props {
  stars: Star[];
  edges: StarEdge[];
  width?: number;
  height?: number;
}

// アニメーションのタイムライン（ms）
const STAR_FADE_DURATION = 800;
const STAR_STAGGER = 50;     // 明度順に 50ms ずつずらす
const EDGE_FADE_START = 800; // 星が出揃ってから
const EDGE_FADE_DURATION = 600;
const EDGE_STAGGER = 80;

// 瞬きパラメータ
const TWINKLE_AMPLITUDE = 0.15; // ±15% で明度を揺らす

interface StarPhase {
  phase: number;
  speed: number;
  fadeOrder: number; // brightness 降順のインデックス
}

export function ConstellationCanvas({ stars, edges, width = 640, height = 480 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const phasesRef = useRef<StarPhase[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 各星の瞬き phase と fade 順序を初期化
    const fadeOrder = stars
      .map((s, i) => ({ i, b: s.brightness }))
      .sort((a, b) => b.b - a.b)
      .reduce<number[]>((acc, item, order) => {
        acc[item.i] = order;
        return acc;
      }, []);
    phasesRef.current = stars.map((_, i) => ({
      phase: Math.random() * Math.PI * 2,
      speed: 1.5 + Math.random() * 1.5, // rad/sec
      fadeOrder: fadeOrder[i] ?? 0,
    }));

    startTimeRef.current = performance.now();

    const loop = (now: number) => {
      const elapsed = now - startTimeRef.current;
      drawConstellation(ctx, stars, edges, width, height, elapsed, phasesRef.current);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [stars, edges, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ borderRadius: "12px", display: "block", maxWidth: "100%", height: "auto" }}
    />
  );
}

// ─────────────────────────────────────────
// 描画
// ─────────────────────────────────────────

function drawConstellation(
  ctx: CanvasRenderingContext2D,
  stars: Star[],
  edges: StarEdge[],
  w: number,
  h: number,
  elapsed: number,
  phases: StarPhase[]
) {
  ctx.clearRect(0, 0, w, h);

  // 背景: 夜空グラデーション
  drawBackground(ctx, w, h);

  if (stars.length === 0) {
    drawPlaceholder(ctx, w, h);
    return;
  }

  // 結線（フェードイン対応）
  drawEdges(ctx, stars, edges, w, h, elapsed);

  // 星（瞬き + フェードイン対応）
  drawStars(ctx, stars, w, h, elapsed, phases);

  // ラベル（星と同期）
  drawLabels(ctx, stars, w, h, elapsed, phases);
}

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
  grad.addColorStop(0, "#0d1b2a");
  grad.addColorStop(0.5, "#0a1220");
  grad.addColorStop(1, "#060c14");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // 背景の微小な星屑（静的）
  drawStardust(ctx, w, h);
}

function drawStardust(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const count = 80;
  for (let i = 0; i < count; i++) {
    const x = pseudoRand(i * 3 + 1) * w;
    const y = pseudoRand(i * 3 + 2) * h;
    const r = pseudoRand(i * 3 + 3) * 0.8 + 0.2;
    const alpha = pseudoRand(i * 7 + 5) * 0.4 + 0.1;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fill();
  }
}

function pseudoRand(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function drawEdges(
  ctx: CanvasRenderingContext2D,
  stars: Star[],
  edges: StarEdge[],
  w: number,
  h: number,
  elapsed: number
) {
  edges.forEach((edge, i) => {
    const a = stars[edge.u];
    const b = stars[edge.v];
    if (!a || !b) return;

    const fadeStart = EDGE_FADE_START + i * EDGE_STAGGER;
    const fadeAlpha = clamp01((elapsed - fadeStart) / EDGE_FADE_DURATION);
    if (fadeAlpha <= 0) return;

    const ax = a.x * w;
    const ay = a.y * h;
    const bx = b.x * w;
    const by = b.y * h;

    ctx.save();
    ctx.globalAlpha = fadeAlpha;
    ctx.shadowColor = "rgba(160, 200, 255, 0.6)";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.strokeStyle = "rgba(180, 210, 255, 0.35)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  });
}

function drawStars(
  ctx: CanvasRenderingContext2D,
  stars: Star[],
  w: number,
  h: number,
  elapsed: number,
  phases: StarPhase[]
) {
  const tSec = elapsed / 1000;

  stars.forEach((star, i) => {
    const phase = phases[i];
    const fadeStart = phase ? phase.fadeOrder * STAR_STAGGER : 0;
    const fadeAlpha = clamp01((elapsed - fadeStart) / STAR_FADE_DURATION);
    if (fadeAlpha <= 0) return;

    // 瞬き: brightness を ±15% で揺らす
    const twinkle = phase
      ? 1 + TWINKLE_AMPLITUDE * Math.sin(tSec * phase.speed + phase.phase)
      : 1;
    const effBrightness = clamp01(star.brightness * twinkle);

    const x = star.x * w;
    const y = star.y * h;
    const radius = 3 + effBrightness * 7;
    const color = star.color ?? "#FFFFFF";
    const glowColor = toRgba(color, 0.9);
    const fillColor = toRgba(color, 0.5 + effBrightness * 0.5);

    // 外側グロウ
    ctx.save();
    ctx.globalAlpha = fadeAlpha;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 20 + effBrightness * 20;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.restore();

    // 中心のコア
    ctx.save();
    ctx.globalAlpha = fadeAlpha;
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();
  });
}

function toRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawLabels(
  ctx: CanvasRenderingContext2D,
  stars: Star[],
  w: number,
  h: number,
  elapsed: number,
  phases: StarPhase[]
) {
  ctx.font = "11px 'Hiragino Sans', 'Noto Sans JP', sans-serif";
  ctx.textAlign = "center";

  stars.forEach((star, i) => {
    const phase = phases[i];
    const fadeStart = phase ? phase.fadeOrder * STAR_STAGGER : 0;
    const fadeAlpha = clamp01((elapsed - fadeStart) / STAR_FADE_DURATION);
    if (fadeAlpha <= 0) return;

    const x = star.x * w;
    const y = star.y * h;
    const radius = 3 + star.brightness * 7;

    const labelY = y + radius + 14;
    const alpha = (0.5 + star.brightness * 0.4) * fadeAlpha;

    ctx.save();
    ctx.fillStyle = `rgba(180, 210, 255, ${alpha})`;
    ctx.fillText(star.label, x, labelY > h - 4 ? y - radius - 5 : labelY);
    ctx.restore();
  });
}

function drawPlaceholder(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(180, 210, 255, 0.3)";
  ctx.font = "14px sans-serif";
  ctx.fillText("言葉を入れると、星座が生まれる", w / 2, h / 2);
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

// ─────────────────────────────────────────
// PNG 書き出し
// ─────────────────────────────────────────

export function saveCanvasAsPng(canvas: HTMLCanvasElement) {
  const url = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.download = `versky-${Date.now()}.png`;
  link.href = url;
  link.click();
}
