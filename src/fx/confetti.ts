import { TAU, clamp, pick, rand } from '../lib/math';
import { reduceMotion as reduce } from '../lib/env';
import { C } from '../garden/palette';
import { PETAL_SH, PETAL_SW, petalSprite } from '../garden/sprites';

interface Piece { x: number; y: number; vx: number; vy: number; g: number; drag: number; r: number; vr: number; fl: number; vf: number; s: number; c: string; life: number; max: number }

/** Màu cánh rơi: dịu, không sặc sỡ kiểu pháo giấy. */
const SOFT = ['#FFC2DA', '#FFE3EE', '#FFF4F8', '#F7D9A8', '#E3CCFF', '#FFB3CF'];

/**
 * Cánh hoa bay trên một canvas phủ toàn màn hình, chỉ chạy khi có cánh đang bay.
 * Cố ý chậm và thưa: cảm giác cánh hoa rơi trong gió, không phải pháo giấy ăn mừng thành tích.
 */
class Confetti {
  private cv: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private parts: Piece[] = [];
  private raf = 0; private last = 0; private W = 0; private H = 0; private D = 1;

  attach(cv: HTMLCanvasElement | null): void { this.cv = cv; this.ctx = cv ? cv.getContext('2d') : null; this.W = 0; }

  private size(): void {
    const cv = this.cv; if (!cv) return;
    const w = innerWidth, h = innerHeight, d = Math.min(devicePixelRatio || 1, 1.5);
    if (w === this.W && h === this.H && d === this.D) return;
    this.W = w; this.H = h; this.D = d;
    cv.width = Math.round(w * d); cv.height = Math.round(h * d);
  }
  private push(p: Partial<Piece> & Pick<Piece, 'x' | 'y' | 'vx' | 'vy'>): void {
    this.parts.push({ g: 0.01, drag: 0, r: rand(0, TAU), vr: rand(-0.06, 0.06), fl: rand(0, TAU), vf: rand(0.04, 0.1), s: rand(9, 16), c: pick(SOFT), life: 0, max: 0, ...p });
  }
  /** Vài cánh hoa lững lờ rơi từ trên xuống. */
  rain(): void {
    if (reduce || !this.cv) return;
    this.size();
    const n = this.W < 600 ? 24 : 38;
    for (let i = 0; i < n; i++) this.push({ x: rand(0, this.W), y: rand(-this.H * 0.9, -10), vx: rand(-0.4, 0.4), vy: rand(0.6, 1.3), g: 0.002, c: SOFT[i % SOFT.length] });
    this.start();
  }
  /** Vài cánh hoa bay lên nhẹ từ một điểm rồi rơi xuống (khi mở nụ, thêm hoa vào bó). */
  burst(x: number, y: number, n: number, col?: string): void {
    if (reduce || !this.cv) return;
    this.size();
    for (let i = 0, m = Math.ceil(n * 0.5); i < m; i++) {
      const a = rand(-Math.PI * 0.8, -Math.PI * 0.2), sp = rand(1.4, 3.2);
      this.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.035, drag: 0.985, s: rand(8, 13), c: i % 2 ? (col ?? C.pink) : pick(SOFT) });
    }
    this.start();
  }
  /** Cánh hoa văng ra mọi hướng rồi mờ dần (lúc mở trang mới). */
  radial(x: number, y: number, n: number): void {
    if (reduce || !this.cv) return;
    this.size();
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), sp = rand(5, 13);
      this.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.05, drag: 0.955, vr: rand(-0.2, 0.2), s: rand(9, 16), max: rand(60, 100) });
    }
    this.start();
  }
  private start(): void { if (!this.raf) { this.last = performance.now(); this.raf = requestAnimationFrame(this.frame); } }
  private readonly frame = (): void => {
    const ctx = this.ctx;
    if (!ctx) { this.raf = 0; return; }
    const now = performance.now(), f = clamp((now - this.last) / 16.667, 0, 2.5) || 1;
    this.last = now;
    this.size();
    const D = this.D;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.W * D, this.H * D);
    let n = 0;
    for (const p of this.parts) {
      p.life += f;
      if (p.y > this.H + 24 || (p.max && p.life > p.max) || p.x < -60 || p.x > this.W + 60) continue;
      if (p.drag) { const dr = Math.pow(p.drag, f); p.vx *= dr; p.vy *= dr; } else p.vx *= Math.pow(0.99, f);
      p.vy = Math.min(p.vy + p.g * f, 4.2);
      p.x += (p.vx + Math.sin(p.fl) * 0.5) * f; p.y += p.vy * f; p.r += p.vr * f; p.fl += p.vf * f;
      ctx.globalAlpha = p.max ? Math.min(1, 1.6 * (1 - p.life / p.max)) : 1;
      const c = Math.cos(p.r) * D, s = Math.sin(p.r) * D, k = Math.cos(p.fl);
      ctx.setTransform(c, s, -s * k, c * k, p.x * D, p.y * D);
      const h = (p.s * PETAL_SH) / PETAL_SW;
      ctx.drawImage(petalSprite(p.c), -p.s / 2, -h / 2, p.s, h);
      this.parts[n++] = p;
    }
    this.parts.length = n;
    ctx.globalAlpha = 1;
    if (n) this.raf = requestAnimationFrame(this.frame);
    else { this.raf = 0; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, this.W * D, this.H * D); }
  };
}

export const confetti = new Confetti();
