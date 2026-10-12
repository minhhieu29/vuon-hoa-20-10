import { TAU, clamp, easeInOutCubic, easeOutCubic, rand, type Pt } from '../lib/math';
import { reduceMotion as reduce, coarse } from '../lib/env';
import { petal } from '../garden/draw';
import { C, NIGHT } from '../garden/palette';
import { confetti } from './confetti';

interface State { o: Pt & { rot: number }; D: number; bg: CanvasGradient; title: string; index: number; total: number }

/**
 * Màn chuyển trang: một bông hoa nhiều lớp nở từ chỗ bấm phủ kín màn hình, hiện tên trang,
 * rồi mở ra bằng một ô cửa hình bông hoa viền hồng vàng để lộ trang mới.
 */
class Veil {
  private cv: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private W = 0; private H = 0;
  private st: State | null = null;

  attach(cv: HTMLCanvasElement | null): void { this.cv = cv; this.ctx = cv ? cv.getContext('2d') : null; }

  private size(): void {
    const cv = this.cv, ctx = this.ctx; if (!cv || !ctx) return;
    this.W = innerWidth; this.H = innerHeight;
    const d = Math.min(devicePixelRatio || 1, 1.5);
    cv.width = Math.max(1, Math.round(this.W * d)); cv.height = Math.max(1, Math.round(this.H * d));
    ctx.setTransform(d, 0, 0, d, 0, 0);
  }
  private far(x: number, y: number): number {
    const { W, H } = this;
    return Math.max(Math.hypot(x, y), Math.hypot(W - x, y), Math.hypot(x, H - y), Math.hypot(W - x, H - y));
  }
  private tween(dur: number, fn: (t: number) => void): Promise<void> {
    return new Promise(res => {
      if (document.hidden) { fn(1); res(); return; }
      const t0 = performance.now();
      const step = () => { const t = clamp((performance.now() - t0) / dur, 0, 1); fn(t); if (t < 1) requestAnimationFrame(step); else res(); };
      requestAnimationFrame(step);
    });
  }
  private flower(x: number, y: number, L: number, wk: number, n: number, rot: number, col: string): void {
    const ctx = this.ctx; if (!ctx || L < 1) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.beginPath(); for (let i = 0; i < n; i++) petal(ctx, (i * TAU) / n, L, L * wk, 0);
    ctx.fillStyle = col; ctx.fill(); ctx.restore();
  }
  private disk(x: number, y: number, r: number, col: string | CanvasGradient): void {
    const ctx = this.ctx; if (!ctx || r < 0.5) return;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = col; ctx.fill();
  }
  private fill(): void { const ctx = this.ctx, st = this.st; if (ctx && st) { ctx.fillStyle = st.bg; ctx.fillRect(0, 0, this.W, this.H); } }
  private label(a: number): void {
    const ctx = this.ctx, st = this.st; if (!ctx || !st || a <= 0.01) return;
    const cx = this.W / 2, cy = this.H / 2;
    ctx.save(); ctx.globalAlpha = a;
    ctx.translate(cx, cy - 52); ctx.rotate(performance.now() * 0.0016);
    ctx.beginPath(); for (let k = 0; k < 6; k++) petal(ctx, (k * TAU) / 6, 16, 7, 2);
    ctx.fillStyle = C.pink; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fillStyle = C.sun; ctx.fill();
    ctx.restore();
    ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '600 12px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = C.pink;
    ctx.fillText(`0${st.index + 1}  ·  0${st.total}`, cx, cy - 10);
    ctx.font = '700 46px "Dancing Script", cursive'; ctx.fillStyle = C.sun;
    ctx.fillText(st.title, cx, cy + 30);
    ctx.restore();
  }

  async cover(origin: Pt, title: string, index: number, total: number): Promise<void> {
    const cv = this.cv, ctx = this.ctx; if (!cv || !ctx) return;
    this.size();
    const D = this.far(origin.x, origin.y);
    const bg = ctx.createRadialGradient(origin.x, origin.y, 0, origin.x, origin.y, D * 1.05);
    bg.addColorStop(0, '#22144A'); bg.addColorStop(1, NIGHT);
    this.st = { o: { x: origin.x, y: origin.y, rot: rand(0, TAU) }, D, bg, title, index, total };
    cv.classList.add('on');
    const W = this.W, H = this.H;
    if (reduce) {
      await this.tween(180, t => { ctx.clearRect(0, 0, W, H); ctx.globalAlpha = t; this.fill(); ctx.globalAlpha = 1; this.label(t); });
      return;
    }
    await this.tween(620, t => {
      const e = easeInOutCubic(t), o = origin, sp = this.st ? this.st.o.rot + e * 1.3 : 0;
      ctx.clearRect(0, 0, W, H);
      this.flower(o.x, o.y, e * D * 1.5, 0.46, 6, sp, C.pink);
      this.flower(o.x, o.y, e * D * 1.25, 0.44, 6, sp + TAU / 12 + e * 0.5, C.lilac);
      this.flower(o.x, o.y, e * D * 1.02, 0.42, 6, sp - e * 0.4, '#3B1F70');
      this.disk(o.x, o.y, Math.pow(e, 1.6) * D * 1.04, bg);
      this.disk(o.x, o.y, 10 * (1 - e), C.sun);
    });
    await this.tween(220, t => { ctx.clearRect(0, 0, W, H); this.fill(); this.label(easeOutCubic(t)); });
  }

  async reveal(): Promise<void> {
    const cv = this.cv, ctx = this.ctx; if (!cv || !ctx || !this.st) return;
    const W = this.W, H = this.H;
    if (reduce) {
      await this.tween(240, t => { ctx.clearRect(0, 0, W, H); ctx.globalAlpha = 1 - t; this.fill(); ctx.globalAlpha = 1; this.label(1 - t); });
      this.end(); return;
    }
    const cx = W / 2, cy = H / 2, D = this.far(cx, cy), rot = rand(0, TAU);
    confetti.radial(cx, cy, coarse ? 20 : 30);
    await this.tween(820, t => {
      const e = easeInOutCubic(t), L = e * D * 1.55, rc = Math.pow(e, 1.7) * D * 1.05, sp = rot - e * 1.1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, W, H);
      this.fill();
      this.label(1 - clamp(t * 2.4, 0, 1));
      this.flower(cx, cy, L + 12, 0.4, 8, sp, C.pink); this.disk(cx, cy, rc + 9, C.pink);
      this.flower(cx, cy, L + 4, 0.4, 8, sp, C.sun); this.disk(cx, cy, rc + 3, C.sun);
      ctx.globalCompositeOperation = 'destination-out';
      this.flower(cx, cy, L, 0.4, 8, sp, '#000'); this.disk(cx, cy, rc, '#000');
      ctx.globalCompositeOperation = 'source-over';
    });
    this.end();
  }

  private end(): void {
    const ctx = this.ctx;
    if (ctx) { ctx.globalCompositeOperation = 'source-over'; ctx.clearRect(0, 0, this.W, this.H); }
    this.cv?.classList.remove('on');
    this.st = null;
  }
}

export const veil = new Veil();
