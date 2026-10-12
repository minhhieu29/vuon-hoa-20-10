import { TAU, clamp, rand, shuffle } from '../lib/math';
import { reduceMotion as reduce, coarse } from '../lib/env';
import { TEXT_COLS, WHITE } from './palette';
import { glow } from './sprites';

const FONT = '"Playfair Display Variable", "Be Vietnam Pro", Georgia, serif';

interface P { x: number; y: number; vx: number; vy: number; a: [number, number]; b: [number, number]; s: number; w: number; d: number }
interface Box { x0: number; y0: number; x1: number; y1: number }
export interface Rect { x: number; y: number; w: number; h: number }

function sample(label: string, ow: number, oh: number): Uint8ClampedArray {
  const off = document.createElement('canvas'); off.width = ow; off.height = oh;
  const o = off.getContext('2d', { willReadFrequently: true });
  if (!o) return new Uint8ClampedArray(ow * oh * 4);
  const setFont = (px: number) => { o.font = `900 ${px}px ${FONT}`; };
  setFont(100);
  const m0 = o.measureText(label);
  const h0 = (m0.actualBoundingBoxAscent || 72) + (m0.actualBoundingBoxDescent || 0) || 72;
  const fs = Math.min((ow * 0.94) / (m0.width || 1) * 100, (oh * 0.9) / h0 * 100);
  setFont(fs);
  o.textAlign = 'center'; o.textBaseline = 'alphabetic'; o.fillStyle = WHITE;
  const m = o.measureText(label);
  const asc = m.actualBoundingBoxAscent || fs * 0.72, desc = m.actualBoundingBoxDescent || 0;
  o.fillText(label, ow / 2, oh / 2 + (asc - desc) / 2);
  return o.getImageData(0, 0, ow, oh).data;
}

/** Chữ bằng hạt sáng: "20/10" đổi qua lại với "Cảm ơn" (hoặc tên người nhận), hạt né con trỏ và xoáy khi đổi chữ. */
export class TextParticles {
  parts: P[] = [];
  private buckets: P[][] = TEXT_COLS.map(() => []);
  private box: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private hits: [Box, Box] = [{ x0: 0, y0: 0, x1: 0, y1: 0 }, { x0: 0, y0: 0, x1: 0, y1: 0 }];
  private glints = Array.from({ length: 6 }, () => ({ i: 0, t: 1, max: 0 }));
  mode = 0;
  nextMorph = Infinity;
  private readonly labelA: string;
  private readonly labelB: string;

  constructor(labelA: string, labelB: string) {
    this.labelA = labelA;
    this.labelB = labelB;
  }

  get ready(): boolean { return this.parts.length > 0; }

  build(r: Rect, W: number, H: number, awake: boolean): void {
    if (r.w < 10 || r.h < 10) return;
    this.box = r;
    const ow = Math.ceil(r.w), oh = Math.ceil(r.h);
    const dA = sample(this.labelA, ow, oh), dB = sample(this.labelB, ow, oh);
    let filled = 0;
    for (let y = 0; y < oh; y += 2) for (let x = 0; x < ow; x += 2) if (Math.max(dA[(y * ow + x) * 4 + 3], dB[(y * ow + x) * 4 + 3]) > 128) filled++;
    const maxP = Math.round(clamp((W * H) / 420, 1200, 2200));
    const step = Math.max(3, Math.ceil(Math.sqrt((filled * 4) / maxP)));
    const grid = (d: Uint8ClampedArray, box: Box) => {
      const pts: [number, number, number][] = [], h0 = step >> 1;
      box.x0 = Infinity; box.y0 = Infinity; box.x1 = -Infinity; box.y1 = -Infinity;
      for (let y = h0; y < oh; y += step) for (let x = h0; x < ow; x += step) {
        if (d[(y * ow + x) * 4 + 3] > 128) {
          const px = r.x + x, py = r.y + y; pts.push([px, py, x / ow]);
          if (px < box.x0) box.x0 = px; if (px > box.x1) box.x1 = px; if (py < box.y0) box.y0 = py; if (py > box.y1) box.y1 = py;
        }
      }
      return shuffle(pts);
    };
    const A = grid(dA, this.hits[0]), B = grid(dB, this.hits[1]);
    const N = Math.max(A.length, B.length);
    if (!N) return;
    while (this.parts.length < N) {
      const p: P = { x: rand(0, W), y: rand(0, H), vx: 0, vy: 0, a: [0, 0], b: [0, 0], s: 2, w: rand(0, TAU), d: 0 };
      if (awake && !reduce) { p.x = r.x + r.w / 2; p.y = r.y + r.h / 2; const a = rand(0, TAU), sp = rand(4, 14); p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; p.d = rand(10, 28); }
      this.parts.push(p);
    }
    this.parts.length = N;
    const size = clamp(step * 0.6, 1.3, 3.4);
    this.buckets = TEXT_COLS.map(() => []);
    for (let i = 0; i < N; i++) {
      const p = this.parts[i];
      const qa = A.length ? A[i % A.length] : [r.x + r.w / 2, r.y + r.h / 2, 0.5];
      const qb = B.length ? B[i % B.length] : qa;
      const ja = i >= A.length ? 0.9 : 0, jb = i >= B.length ? 0.9 : 0;
      p.a = [qa[0] + rand(-ja, ja), qa[1] + rand(-ja, ja)];
      p.b = [qb[0] + rand(-jb, jb), qb[1] + rand(-jb, jb)];
      p.s = size * rand(0.8, 1.15);
      const t = clamp(qa[2] + rand(-0.12, 0.12), 0, 0.999);
      this.buckets[Math.random() < 0.1 ? 3 : t < 0.34 ? 0 : t < 0.67 ? 1 : 2].push(p);
      if (reduce) this.snap(p);
    }
  }

  private snap(p: P): void { const t = this.mode ? p.b : p.a; p.x = t[0]; p.y = t[1]; p.vx = p.vy = 0; p.d = 0; }

  burst(x: number, y: number): void {
    for (const p of this.parts) {
      if (reduce) { this.snap(p); continue; }
      p.x = x + rand(-4, 4); p.y = y + rand(-4, 4);
      const a = rand(0, TAU), sp = rand(3, 16);
      p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; p.d = rand(12, 32);
    }
  }

  /** Thả hạt bay tung ra rồi tự ghép lại chữ (khi quay về trang vườn). */
  scatter(): void {
    if (reduce) return;
    for (const p of this.parts) { const a = rand(0, TAU), sp = rand(2, 9); p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; p.d = rand(6, 18); }
  }

  toggle(now: number, manual: boolean): void {
    this.mode ^= 1;
    if (reduce) { for (const p of this.parts) this.snap(p); }
    else {
      const cx = this.box.x + this.box.w / 2, cy = this.box.y + this.box.h / 2;
      for (const p of this.parts) {
        if (p.d > 0) continue;
        const dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy) || 1, sw = rand(2, 6);
        p.vx += (-dy / d) * sw + rand(-1, 1); p.vy += (dx / d) * sw + rand(-1, 1);
      }
    }
    this.nextMorph = now + (manual ? 9000 : 7000);
  }

  hit(x: number, y: number): boolean {
    const b = this.hits[this.mode];
    return x > b.x0 - 14 && x < b.x1 + 14 && y > b.y0 - 14 && y < b.y1 + 14;
  }

  step(now: number, f: number, px: number, py: number, active: boolean): void {
    if (reduce) return;
    const R = coarse ? 70 : 100, R2 = R * R;
    const damp = Math.pow(0.84, f), fly = Math.pow(0.94, f), br = now * 0.0016;
    for (const p of this.parts) {
      if (p.d > 0) { p.d -= f; p.x += p.vx * f; p.y += p.vy * f; p.vx *= fly; p.vy *= fly; continue; }
      const t = this.mode ? p.b : p.a;
      let ax = (t[0] + Math.sin(br + p.w) * 0.6 - p.x) * 0.05;
      let ay = (t[1] + Math.cos(br * 1.3 + p.w) * 0.6 - p.y) * 0.05;
      if (active) {
        const dx = p.x - px, dy = p.y - py, d2 = dx * dx + dy * dy;
        if (d2 < R2) { const d = Math.sqrt(d2) || 1, k = (1 - d / R) * 3.4; ax += (dx / d) * k; ay += (dy / d) * k; }
      }
      p.vx = (p.vx + ax * f) * damp; p.vy = (p.vy + ay * f) * damp;
      p.x += p.vx * f; p.y += p.vy * f;
    }
  }

  draw(ctx: CanvasRenderingContext2D, alpha: number, f: number): void {
    if (alpha <= 0.01 || !this.parts.length) return;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * 0.15;
    const b = this.box;
    ctx.drawImage(glow('#FF5FA2'), b.x + b.w * 0.05, b.y - b.h * 0.25, b.w * 0.9, b.h * 1.5);
    ctx.globalAlpha = alpha;
    for (let c = 0; c < TEXT_COLS.length; c++) {
      const bk = this.buckets[c]; if (!bk.length) continue;
      ctx.fillStyle = TEXT_COLS[c]; ctx.beginPath();
      for (const p of bk) ctx.rect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
      ctx.fill();
    }
    if (!reduce) {
      for (const gl of this.glints) {
        if (gl.t >= gl.max) { gl.i = Math.floor(Math.random() * this.parts.length); gl.t = 0; gl.max = rand(25, 60); }
        gl.t += f;
        const p = this.parts[gl.i]; if (!p) continue;
        ctx.globalAlpha = alpha * 0.85 * Math.max(0, Math.sin((Math.PI * gl.t) / gl.max));
        const g = p.s * 7; ctx.drawImage(glow(WHITE), p.x - g / 2, p.y - g / 2, g, g);
      }
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
}
