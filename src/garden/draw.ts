import { TAU, clamp, easeOutBack, easeOutCubic, mix } from '../lib/math';
import { C, HAZE, WHITE, type FlowerType } from './palette';

/** Màu sắc và hình dáng của một bông hoa (đã pha mờ theo lớp xa/gần). */
export interface Look {
  key: string;
  type: FlowerType;
  c: string;
  c2: string;
  c3: string;
  cd: string;
  cc: string;
  leaf: string;
  n: number;
}

/** Mức pha mờ theo lớp: 0 xa, 1 giữa, 2 gần. */
export const LAYER_DIM = [0.42, 0.2, 0] as const;

export function makeLook(type: FlowerType, color: string, variant: number, layer: number, center?: string): Look {
  const d = LAYER_DIM[layer] ?? 0;
  const dim = (h: string) => (d ? mix(h, HAZE, d) : h);
  const isWhite = color === C.white;
  const n = type === 0 ? (variant ? 14 : 17) : type === 1 ? (variant ? 5 : 6) : 6;
  const cc = center ?? (color === C.sun ? C.peach : C.sun);
  return {
    key: `${type}|${color}|${cc}|${n}|${layer}`,
    type,
    c: dim(color),
    c2: dim(isWhite ? '#FFC2DA' : mix(color, WHITE, 0.5)),
    c3: dim(isWhite ? '#FFE3EE' : mix(color, WHITE, 0.25)),
    cd: dim(isWhite ? '#F2C9DC' : mix(color, '#2A1B3D', 0.25)),
    cc: dim(cc),
    leaf: dim('#2BC48A'),
    n,
  };
}

/** Một cánh hoa hướng ra ngoài theo góc a (thêm vào path hiện tại). */
export function petal(ctx: CanvasRenderingContext2D | Path2D, a: number, L: number, w: number, r0: number): void {
  const ca = Math.cos(a), sa = Math.sin(a);
  const X = (x: number, y: number) => x * ca - y * sa, Y = (x: number, y: number) => x * sa + y * ca;
  const y0 = -r0, y1 = -(r0 + L * 0.18), y2 = -(r0 + L * 0.92), y3 = -(r0 + L);
  ctx.moveTo(X(0, y0), Y(0, y0));
  ctx.bezierCurveTo(X(w, y1), Y(w, y1), X(w, y2), Y(w, y2), X(0, y3), Y(0, y3));
  ctx.bezierCurveTo(X(-w, y2), Y(-w, y2), X(-w, y1), Y(-w, y1), X(0, y0), Y(0, y0));
}

/** Thêm một chiếc lá vào path hiện tại (để tô cả lớp lá một lần). */
export function addLeaf(ctx: CanvasRenderingContext2D, x: number, y: number, ang: number, L: number, wk: number): void {
  if (L <= 0.5) return;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const P = (lx: number, ly: number): [number, number] => [x + lx * ca - ly * sa, y + lx * sa + ly * ca];
  const [ax, ay] = P(L * 0.5, -L * wk), [tx, ty] = P(L, 0), [bx, by] = P(L * 0.5, L * wk);
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(ax, ay, tx, ty);
  ctx.quadraticCurveTo(bx, by, x, y);
}

/** Nụ hoa ở ngọn khi thân đang mọc. */
export function drawBud(ctx: CanvasRenderingContext2D, x: number, y: number, ang: number, s: number, c: string, leaf: string): void {
  if (s < 0.6) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang + Math.PI / 2);
  ctx.beginPath(); ctx.moveTo(0, s * 0.45);
  ctx.bezierCurveTo(s * 0.8, s * 0.1, s * 0.45, -s * 0.85, 0, -s * 1.25);
  ctx.bezierCurveTo(-s * 0.45, -s * 0.85, -s * 0.8, s * 0.1, 0, s * 0.45);
  ctx.fillStyle = c; ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, s * 0.55); ctx.quadraticCurveTo(s * 0.85, s * 0.2, s * 0.42, -s * 0.5); ctx.quadraticCurveTo(s * 0.22, s * 0.1, 0, s * 0.55);
  ctx.moveTo(0, s * 0.55); ctx.quadraticCurveTo(-s * 0.85, s * 0.2, -s * 0.42, -s * 0.5); ctx.quadraticCurveTo(-s * 0.22, s * 0.1, 0, s * 0.55);
  ctx.fillStyle = leaf; ctx.fill();
  ctx.restore();
}

/**
 * Vẽ đầu hoa tại gốc toạ độ, hướng "lên" là -y. b là độ nở từ 0 đến 1:
 * cúc mở từng cánh quanh vòng, hoa nhiều lớp mở từ ngoài vào, tulip hé dần, oải hương bung nụ từ dưới lên,
 * sen xoè cánh ra hai bên.
 */
export function drawHead(ctx: CanvasRenderingContext2D, lk: Look, R: number, b: number): void {
  if (lk.type === 3) { drawTulip(ctx, lk, R, b); return; }
  if (lk.type === 5) { drawLotus(ctx, lk, R, b); return; }
  if (lk.type === 4) { drawSpike(ctx, lk, R, b); return; }
  const be = easeOutCubic(b);
  const sep = 1 - be * 0.55;
  ctx.beginPath(); for (let i = 0; i < 5; i++) petal(ctx, i * TAU / 5 + 0.3, R * 0.62 * sep, R * 0.2 * sep, R * 0.05);
  ctx.fillStyle = lk.leaf; ctx.fill();
  const grd = ctx.createRadialGradient(0, 0, R * 0.08, 0, 0, R * 1.05);
  grd.addColorStop(0, lk.c2); grd.addColorStop(1, lk.c);
  if (lk.type === 0) {
    ctx.beginPath();
    for (let i = 0; i < lk.n; i++) {
      const p = clamp((b - (i / lk.n) * 0.5) / 0.5, 0, 1); if (p <= 0) continue;
      petal(ctx, i * TAU / lk.n, R * 0.95 * easeOutBack(p), R * 0.17 * Math.min(1, p * 1.4), R * 0.1);
    }
    ctx.fillStyle = grd; ctx.fill();
    const cr = R * 0.3 * easeOutBack(clamp(b * 1.6, 0, 1));
    ctx.beginPath(); ctx.arc(0, 0, Math.max(0, cr), 0, TAU); ctx.fillStyle = lk.cc; ctx.fill();
    if (cr > 3) {
      ctx.beginPath();
      for (let i = 0; i < 7; i++) { const a = i * TAU / 7 + 0.4, x = Math.cos(a) * cr * 0.55, y = Math.sin(a) * cr * 0.55; ctx.moveTo(x + cr * 0.11, y); ctx.arc(x, y, cr * 0.11, 0, TAU); }
      ctx.fillStyle = 'rgba(122,70,34,.32)'; ctx.fill();
    }
  } else if (lk.type === 1) {
    ctx.beginPath();
    for (let i = 0; i < lk.n; i++) {
      const p = clamp((b - i / lk.n * 0.35) / 0.65, 0, 1); if (p <= 0) continue;
      petal(ctx, i * TAU / lk.n, R * easeOutBack(p), R * 0.6 * easeOutCubic(p), 0);
    }
    ctx.fillStyle = grd; ctx.fill();
    ctx.beginPath(); for (let i = 0; i < lk.n; i++) petal(ctx, (i + 0.5) * TAU / lk.n, R * 0.55 * be, R * 0.36 * be, 0);
    ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fill();
    const sb = easeOutBack(clamp((b - 0.45) / 0.55, 0, 1));
    if (sb > 0) {
      const sr = R * 0.3 * sb;
      ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + 0.5; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * sr, Math.sin(a) * sr); }
      ctx.strokeStyle = 'rgba(255,240,200,.7)'; ctx.lineWidth = Math.max(0.8, R * 0.03); ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + 0.5, x = Math.cos(a) * sr, y = Math.sin(a) * sr; ctx.moveTo(x + R * 0.055, y); ctx.arc(x, y, R * 0.055, 0, TAU); }
      ctx.fillStyle = lk.cc; ctx.fill();
    }
    ctx.beginPath(); ctx.arc(0, 0, R * 0.14 * be, 0, TAU); ctx.fillStyle = lk.cc; ctx.fill();
  } else {
    for (let j = 0; j < 3; j++) {
      const kb = clamp(b * 1.35 - j * 0.18, 0, 1); if (kb <= 0) continue;
      const L = R * (1 - j * 0.28) * Math.max(0.2, easeOutBack(kb)), n = 6 - j;
      ctx.beginPath(); for (let i = 0; i < n; i++) petal(ctx, i * TAU / n + j * 0.55 + (1 - kb) * 0.7, L, L * 0.7, 0);
      ctx.fillStyle = j === 0 ? grd : j === 1 ? lk.c3 : lk.c2; ctx.fill();
    }
    ctx.beginPath(); ctx.arc(0, 0, R * 0.1 * be, 0, TAU); ctx.fillStyle = lk.cc; ctx.fill();
  }
  ctx.beginPath(); ctx.arc(-R * 0.08, -R * 0.08, R * 0.07 * be, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fill();
}

function drawTulip(ctx: CanvasRenderingContext2D, lk: Look, R: number, b: number): void {
  const be = easeOutBack(b), op = easeOutCubic(b);
  const sp = 0.05 + 0.2 * op;
  const L = R * 1.5 * (0.45 + 0.55 * be), w = R * 0.6 * (0.7 + 0.3 * op), r0 = -R * 0.35;
  ctx.beginPath(); petal(ctx, 0, L * 0.97, w * 0.95, r0); ctx.fillStyle = lk.cd; ctx.fill();
  const g = ctx.createLinearGradient(0, R * 0.35, 0, -R * 1.15);
  g.addColorStop(0, lk.c); g.addColorStop(1, lk.c2);
  ctx.beginPath(); petal(ctx, -sp, L, w, r0); petal(ctx, sp, L, w, r0); ctx.fillStyle = g; ctx.fill();
  ctx.beginPath(); petal(ctx, 0, L * 0.86, w * 0.6, r0); ctx.globalAlpha = 0.9; ctx.fillStyle = lk.c3; ctx.fill(); ctx.globalAlpha = 1;
  ctx.beginPath(); ctx.moveTo(-R * 0.07, R * 0.15); ctx.quadraticCurveTo(-R * 0.18, -R * 0.4, -R * 0.05, R * 0.35 - L * 0.78);
  ctx.strokeStyle = 'rgba(255,255,255,.38)'; ctx.lineWidth = Math.max(1, R * 0.06); ctx.lineCap = 'round'; ctx.stroke();
}

/** Bông sen nhìn ngang: ba lớp cánh nhọn mọc từ đài, xoè dần ra; nở hẳn thì lộ gương sen vàng. */
function drawLotus(ctx: CanvasRenderingContext2D, lk: Look, R: number, b: number): void {
  const be = easeOutBack(b), op = easeOutCubic(b);
  const spread = 0.3 + 0.7 * op, k = 0.55 + 0.45 * be;
  ctx.save(); ctx.translate(0, R * 0.35);
  const fill = (base: string, tip: string, L: number) => {
    const g = ctx.createLinearGradient(0, 0, 0, -L);
    g.addColorStop(0, base); g.addColorStop(1, tip);
    return g;
  };
  ctx.beginPath(); for (const a of [-1.05, -0.55, 0.55, 1.05]) petal(ctx, a * spread, R * 1.25 * k, R * 0.42 * k, 0);
  ctx.fillStyle = fill(lk.cd, lk.c, R * 1.25); ctx.fill();
  ctx.beginPath(); for (const a of [-0.28, 0.28]) petal(ctx, a * spread, R * 1.4 * k, R * 0.45 * k, 0);
  ctx.fillStyle = fill(lk.c3, lk.c, R * 1.4); ctx.fill();
  if (op > 0.5) {
    ctx.globalAlpha = (op - 0.5) * 2;
    ctx.beginPath(); ctx.ellipse(0, -R * 0.78, R * 0.3, R * 0.12, 0, 0, TAU); ctx.fillStyle = '#F5C542'; ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.beginPath(); petal(ctx, 0, R * 1.25 * k, R * 0.4 * k, 0);
  ctx.fillStyle = fill(lk.c2, lk.c, R * 1.25); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, -R * 0.12); ctx.quadraticCurveTo(-R * 0.08, -R * 0.6 * k, 0, -R * 1.05 * k);
  ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = Math.max(0.8, R * 0.05); ctx.lineCap = 'round'; ctx.stroke();
  ctx.restore();
}

/** Bông oải hương: chùm nụ nằm dọc phần ngọn thân, từ gốc toạ độ (ngọn) xuống dưới. */
function drawSpike(ctx: CanvasRenderingContext2D, lk: Look, R: number, b: number): void {
  const K = 11;
  for (let j = 0; j < K; j++) {
    const p = clamp((b - (j / K) * 0.6) / 0.4, 0, 1); if (p <= 0) continue;
    const y = 2.6 * R * (1 - j / (K - 1));
    const sz = R * 0.24 * (1 - (j / K) * 0.45) * easeOutBack(p);
    if (sz < 0.3) continue;
    if (j === K - 1) { ctx.beginPath(); ctx.ellipse(0, y - sz * 0.3, sz * 0.45, sz * 0.9, 0, 0, TAU); ctx.fillStyle = lk.c2; ctx.fill(); continue; }
    for (let sd = -1; sd <= 1; sd += 2) {
      ctx.beginPath(); ctx.ellipse(sd * sz * 0.55, y, sz * 0.5, sz, sd * 0.45, 0, TAU);
      ctx.fillStyle = (j + (sd > 0 ? 1 : 0)) % 3 === 0 ? lk.cd : j % 2 ? lk.c : lk.c2; ctx.fill();
    }
  }
}

/** Khung bao của đầu hoa (toạ độ cục bộ) để cắt sprite vừa khít. */
export function headBox(type: FlowerType, R: number): [number, number, number, number] {
  if (type === 3) return [-R, -1.3 * R, R, 0.55 * R];
  if (type === 4) return [-0.6 * R, -0.7 * R, 0.6 * R, 2.95 * R];
  if (type === 5) return [-1.45 * R, -1.3 * R, 1.45 * R, 0.65 * R];
  return [-1.2 * R, -1.2 * R, 1.2 * R, 1.2 * R];
}

export interface HeadSprite { cv: HTMLCanvasElement; ax: number; ay: number; w: number; h: number; R: number }
const sprites = new Map<string, HeadSprite>();

/**
 * Ảnh vẽ sẵn của bông đã nở xong. Mỗi khung hình chỉ cần drawImage thay vì vẽ lại từng cánh:
 * đây là chỗ giảm lag nhiều nhất khi vườn đầy hoa.
 */
export function headSprite(lk: Look, R: number, res: number): HeadSprite {
  const key = `${lk.key}|${R.toFixed(1)}|${res}`;
  let s = sprites.get(key);
  if (s) return s;
  const [x0, y0, x1, y1] = headBox(lk.type, R);
  const cv = document.createElement('canvas');
  cv.width = Math.ceil((x1 - x0) * res) + 2; cv.height = Math.ceil((y1 - y0) * res) + 2;
  const g = cv.getContext('2d');
  if (g) { g.setTransform(res, 0, 0, res, -x0 * res + 1, -y0 * res + 1); drawHead(g, lk, R, 1); }
  s = { cv, ax: -x0 + 1 / res, ay: -y0 + 1 / res, w: cv.width / res, h: cv.height / res, R };
  sprites.set(key, s);
  return s;
}
export function clearSprites(): void { sprites.clear(); }
