import { TAU, bz, bzd, clamp, easeOutBack, easeOutCubic, rand, shuffle } from '../lib/math';
import { reduceMotion as reduce } from '../lib/env';
import { C, FLOWER_COLS, LOTUS_COLS, TYPE_BAG, WHITE, type FlowerType } from './palette';
import { glow } from './sprites';
import { addLeaf, drawBud, drawHead, makeLook, type Look } from './draw';

export interface MiniKind { type: FlowerType; color: string; center?: string; size?: number }
interface MF { fx: number; hf: number; R: number; look: Look; color: string; t0: number; grow: number; bloom: number; ph: number; lean: number; curve: number; rot: number; side: number }

/** Vườn nhỏ trên tấm thiệp: mọc đúng những loài hoa người xem đã gói, chạy 30 khung/giây và chỉ khi đang hiện trên màn hình. */
export class MiniGarden {
  private readonly cv: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly stars = document.createElement('canvas');
  private W = 0; private H = 0; private D = 1; private sc = 1;
  private fl: MF[] = [];
  private raf = 0; private last = 0; private visible = true; private alive = true;
  private readonly io: IntersectionObserver;
  private readonly ro: ResizeObserver;

  constructor(cv: HTMLCanvasElement, kinds: MiniKind[] | null) {
    this.cv = cv;
    const ctx = cv.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D không khả dụng');
    this.ctx = ctx;
    this.seed(kinds);
    this.io = new IntersectionObserver(es => { this.visible = es.some(e => e.isIntersecting); this.kick(); });
    this.io.observe(cv);
    this.ro = new ResizeObserver(() => { this.resize(); this.kick(); });
    this.ro.observe(cv);
    this.resize();
    this.kick();
  }

  destroy(): void { this.alive = false; cancelAnimationFrame(this.raf); this.io.disconnect(); this.ro.disconnect(); }

  private seed(kinds: MiniKind[] | null): void {
    const list = kinds && kinds.length ? shuffle([...kinds]) : null;
    const n = list ? clamp(list.length, 5, 9) : 7;
    const now = performance.now();
    this.fl = [];
    for (let i = 0; i < n; i++) {
      const fx = (i + 0.5 + rand(-0.22, 0.22)) / n, edge = Math.abs(fx - 0.5) * 2;
      const k: MiniKind = list ? list[i % list.length] : (() => { const type = TYPE_BAG[Math.floor(Math.random() * TYPE_BAG.length)]; return { type, color: type === 4 ? C.lilac : type === 5 ? LOTUS_COLS[i % LOTUS_COLS.length] : FLOWER_COLS[(i * 4 + 2) % FLOWER_COLS.length] }; })();
      this.fl.push({
        fx, hf: 0.38 + 0.34 * (1 - edge) * rand(0.85, 1.08),
        R: (k.size ?? rand(15, 21)) * (n > 7 ? 0.88 : 1),
        look: makeLook(k.type, k.color, i % 2, 2, k.center), color: k.color,
        t0: reduce ? now : now + 150 + i * 150 + rand(0, 200), grow: reduce ? 0 : rand(900, 1300), bloom: reduce ? 0 : rand(900, 1300),
        ph: rand(0, TAU), lean: rand(-0.15, 0.15), curve: rand(-0.4, 0.4) * (k.type === 4 ? 0.3 : 1), rot: rand(0, TAU), side: Math.random() < 0.5 ? -1 : 1,
      });
    }
    this.fl.sort((a, b) => b.hf - a.hf);
  }

  private resize(): void {
    const w = this.cv.clientWidth, h = this.cv.clientHeight;
    if (!w || !h) return;
    const D = Math.min(devicePixelRatio || 1, 2);
    if (w === this.W && h === this.H && D === this.D) return;
    this.W = w; this.H = h; this.D = D;
    this.cv.width = Math.round(w * D); this.cv.height = Math.round(h * D);
    this.sc = clamp(Math.min(w, h * 1.8) / 420, 0.7, 1.1);
    this.stars.width = this.cv.width; this.stars.height = this.cv.height;
    const g = this.stars.getContext('2d');
    if (g) {
      g.setTransform(D, 0, 0, D, 0, 0);
      for (let i = 0, n = Math.round((w * h) / 1400); i < n; i++) {
        g.globalAlpha = rand(0.2, 0.8); g.fillStyle = Math.random() < 0.25 ? C.lilac : WHITE;
        g.beginPath(); g.arc(Math.random() * w, Math.random() * h * 0.85, rand(0.3, 1.1), 0, TAU); g.fill();
      }
    }
  }

  private kick(): void { if (!this.raf && this.alive && this.visible) { this.last = 0; this.raf = requestAnimationFrame(this.frame); } }

  private readonly frame = (): void => {
    this.raf = 0;
    if (!this.alive || !this.visible || !this.W) return;
    const now = performance.now();
    if (!reduce && now - this.last < 31) { this.raf = requestAnimationFrame(this.frame); return; }
    this.last = now;
    this.draw(now);
    const growing = this.fl.some(f => now < f.t0 + f.grow + f.bloom);
    if (!reduce || growing) this.raf = requestAnimationFrame(this.frame);
  };

  private draw(now: number): void {
    const ctx = this.ctx, D = this.D, W = this.W, H = this.H;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, this.cv.width, this.cv.height);
    ctx.drawImage(this.stars, 0, 0);
    ctx.setTransform(D, 0, 0, D, 0, 0);
    for (const f of this.fl) {
      const e = now - f.t0; if (e < 0) continue;
      const R = f.R * this.sc, len = f.hf * H, bx = f.fx * W, by = H + 8;
      const s = reduce ? 0 : Math.sin(now * 0.0011 + f.ph);
      const hx = bx + f.lean * len * 0.45 + s * (2 + len * 0.02), hy = H - len;
      const cx = bx + (hx - bx) * 0.35 + f.curve * len * 0.22, cy = by - len * 0.55;
      const g = f.grow ? clamp(e / f.grow, 0, 1) : 1, ge = easeOutCubic(g);
      const b = g < 1 ? 0 : f.bloom ? clamp((e - f.grow) / f.bloom, 0, 1) : 1;
      ctx.beginPath(); ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + (cx - bx) * ge, by + (cy - by) * ge, bz(bx, cx, hx, ge), bz(by, cy, hy, ge));
      ctx.lineCap = 'round'; ctx.strokeStyle = '#3DDC97'; ctx.lineWidth = Math.max(1.6, R * 0.1); ctx.stroke();
      ctx.beginPath();
      for (const [at, side, k] of [[0.34, f.side, 1], [0.58, -f.side, 0.8]] as const) {
        if (ge <= at) continue;
        const ang = Math.atan2(bzd(by, cy, hy, at), bzd(bx, cx, hx, at)) + side * 0.95;
        addLeaf(ctx, bz(bx, cx, hx, at), bz(by, cy, hy, at), ang, R * 1.3 * k * easeOutBack(clamp((ge - at) / 0.22, 0, 1)), 0.36);
      }
      ctx.fillStyle = '#22BF85'; ctx.fill();
      const tang = Math.atan2(bzd(by, cy, hy, ge), bzd(bx, cx, hx, ge));
      if (g < 1) { if (f.look.type !== 4) drawBud(ctx, bz(bx, cx, hx, ge), bz(by, cy, hy, ge), tang, R * (0.14 + 0.3 * clamp((g - 0.5) / 0.5, 0, 1)), f.look.c, f.look.leaf); continue; }
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 * easeOutCubic(b);
      const gs = R * 4.6; ctx.drawImage(glow(f.color), hx - gs / 2, hy - gs / 2, gs, gs);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.save(); ctx.translate(hx, hy);
      ctx.rotate(f.look.type >= 3 ? tang + Math.PI / 2 : f.rot + s * 0.1 - (1 - easeOutCubic(b)) * 0.9);
      drawHead(ctx, f.look, R, b);
      ctx.restore();
    }
  }
}
