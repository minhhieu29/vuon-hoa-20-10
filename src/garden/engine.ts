import { TAU, angDiff, bz, bzd, clamp, easeOutBack, easeOutCubic, pick, rand, type Pt } from '../lib/math';
import { coarse, reduceMotion as reduce } from '../lib/env';
import { load, save } from '../lib/storage';
import { SCALE, Sound } from '../lib/sound';
import { LABEL_A, LABEL_B } from '../config';
import { AUTUMN_COLS, C, FLOWER_COLS, WHITE, type FlowerType } from './palette';
import { LEAF_SH, LEAF_SW, PETAL_SH, PETAL_SW, glow, leafSprite, petalSprite } from './sprites';
import { addLeaf, clearSprites, drawBud, drawHead, headSprite, makeLook, type Look } from './draw';
import { CAPACITY, makePlan, type Spec } from './plan';
import { TextParticles, type Rect } from './text';

export type GardenMode = 'hero' | 'ambient';
export interface GardenStats { count: number; capacity: number }

interface Saved { v: 2; seed: number; list: number[]; over: Record<string, [FlowerType, string, string?]> }
interface Spark { x: number; y: number; vx: number; vy: number; life: number; max: number; c: string; s: number }
interface Fall { x: number; y: number; vx: number; vy: number; r: number; vr: number; fl: number; vf: number; s: number; c: string; life: number }
interface Pollen { x: number; y: number; vy: number; ph: number; amp: number; s: number; c: string; tw: number }
interface Twinkle { x: number; y: number; r: number; ph: number; sp: number }
interface Gust { t0: number; dur: number; o: number; str: number }
interface Shoot { x: number; y: number; vx: number; vy: number; life: number; max: number }
interface Butterfly { x: number; y: number; ang: number; turn: number; sp: number; ph: number; c: string; s: number; mode: 0 | 1 | 2; target: Flower | null; until: number }

/** Chân thân hoa theo lớp (phần chiều cao màn hình): lớp xa đứng cao hơn để có chiều sâu. */
const BASE_Y = [0.885, 0.95, 1] as const;
const STEM_W = [0.9, 1.5, 2.4] as const;
const STEM_COL = ['#1E6B53', '#2CB07E', '#3DDC97'] as const;
/** Bán kính vẽ sprite theo lớp (nhân với hệ số màn hình). */
const SPRITE_R = [10, 17, 30] as const;
/** Mật độ điểm ảnh tối đa theo mức chất lượng 0, 1, 2. */
const DPR_CAP = [1, 1.3, 1.75] as const;
const SAVE_KEY = 'garden';

class Flower {
  readonly spec: Spec;
  readonly look: Look;
  readonly t0: number;
  readonly growDur: number;
  readonly bloomDur: number;
  ox = 0; ov = 0; hover = 0; boop = -1e9;
  /** độ mạnh của cú rung: 1 khi chạm, nhỏ hơn khi rung theo nhạc */
  boopK = 1;
  bloomed = false; sparked = false; baked = false;
  R = 0; bx = 0; by = 0; cx = 0; cy = 0; hx = -1e4; hy = -1e4;
  g = 0; ge = 0; b = 0; s = 0; tang = -Math.PI / 2;

  constructor(spec: Spec, look: Look, t0: number, growDur: number, bloomDur: number) {
    this.spec = spec; this.look = look; this.t0 = t0; this.growDur = growDur; this.bloomDur = bloomDur;
  }
}

/**
 * Khu vườn trên canvas, sống xuyên suốt mọi trang.
 * Hoa tự nở dần theo thời gian cho tới khi kín vườn, không bao giờ bị xoá, và được lưu lại khi tải lại trang.
 * Để mượt: bông đã nở vẽ bằng sprite, lớp xa được "nướng" vào ảnh nền, thân và lá mỗi lớp tô một lần,
 * trang phụ chỉ vẽ 30 khung/giây, máy yếu thì tự hạ chất lượng.
 */
export class GardenEngine {
  private readonly cv: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly bg = document.createElement('canvas');
  private readonly bgx: CanvasRenderingContext2D;
  private W = 0; private H = 0; private D = 1; private sc = 1;
  private q: number = coarse ? 1 : 2;
  private bakeMid = false;
  private costEma = 4; private intEma = 16.7; private slowSince = 0; private warm = 0;
  private mode: GardenMode = 'hero';
  private raf = 0; private last = 0; private running = false; private timer = 0;
  private readonly saved: Saved;
  private readonly plan: Spec[];
  private readonly bloomedSet = new Set<number>();
  private autoPtr = 0;
  private readonly flowers: Flower[] = [];
  private readonly live: Flower[][] = [[], [], []];
  private readonly toBake: Flower[] = [];
  private readonly vis: Flower[] = [];
  private awake = false; private nextBloom = Infinity;
  private readonly listeners = new Set<(s: GardenStats) => void>();
  private sparks: Spark[] = []; private readonly fall: Fall[] = []; private readonly autumn: Fall[] = []; private nextLeaf = 0;
  private musicBloom = 0;
  private readonly offNote: () => void; private pollen: Pollen[] = []; private tw: Twinkle[] = [];
  private bflies: Butterfly[] = []; private shoot: Shoot | null = null; private nextShoot = 0;
  private gust: Gust | null = null; private nextGust = Infinity; private nextDrop = 0;
  private readonly ptr = { x: -9999, y: -9999, until: 0 };
  private nearUx = 0;
  private readonly text = new TextParticles(LABEL_A, LABEL_B);
  private textRect: Rect | null = null;
  private textScroll0 = 0;
  private textAlpha = 0;
  private readonly ro: ResizeObserver;

  constructor(cv: HTMLCanvasElement) {
    this.cv = cv;
    const ctx = cv.getContext('2d'), bgx = this.bg.getContext('2d');
    if (!ctx || !bgx) throw new Error('Canvas 2D không khả dụng');
    this.ctx = ctx; this.bgx = bgx;
    const s = load<Saved | null>(SAVE_KEY, null);
    this.saved = s && s.v === 2 && Number.isFinite(s.seed) && Array.isArray(s.list)
      ? { v: 2, seed: s.seed, list: s.list.filter(i => Number.isInteger(i) && i >= 0 && i < CAPACITY), over: s.over ?? {} }
      : { v: 2, seed: Math.floor(Math.random() * 2 ** 31), list: [], over: {} };
    this.plan = makePlan(this.saved.seed);
    const now = performance.now();
    for (const i of this.saved.list) if (!this.bloomedSet.has(i)) this.spawn(i, now, true);
    this.ro = new ResizeObserver(() => this.resize(false));
    this.ro.observe(cv);
    cv.addEventListener('pointermove', this.onMove);
    cv.addEventListener('pointerdown', this.onDown);
    cv.addEventListener('pointerleave', this.onLeave);
    cv.addEventListener('click', this.onClick);
    document.addEventListener('visibilitychange', this.onVis);
    this.offNote = Sound.onNote(this.onNote);
    void document.fonts?.ready.then(() => { if (this.textRect) this.text.build(this.textRect, this.W, this.H, this.awake); });
    this.resize(true);
  }

  /* ---------- điều khiển từ React ---------- */
  start(): void { this.running = true; this.last = performance.now(); this.kick(); this.scheduleReduced(); }
  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.raf); this.raf = 0; clearTimeout(this.timer);
    this.ro.disconnect();
    this.cv.removeEventListener('pointermove', this.onMove);
    this.cv.removeEventListener('pointerdown', this.onDown);
    this.cv.removeEventListener('pointerleave', this.onLeave);
    this.cv.removeEventListener('click', this.onClick);
    document.removeEventListener('visibilitychange', this.onVis);
    this.offNote();
  }
  get stats(): GardenStats { return { count: this.flowers.length, capacity: CAPACITY }; }
  onChange(cb: (s: GardenStats) => void): () => void { this.listeners.add(cb); cb(this.stats); return () => { this.listeners.delete(cb); }; }

  /** Mở quà: hoa bắt đầu tự nở, chữ hạt sáng bung ra từ nụ hoa. */
  wake(origin?: Pt): void {
    if (this.awake) return;
    this.awake = true;
    const now = performance.now();
    this.nextBloom = now + (this.flowers.length < 14 ? 500 : 1400);
    this.nextGust = now + 7000; this.nextDrop = now + 2500; this.nextShoot = now + 3500; this.nextLeaf = now + 4000;
    this.text.mode = 0; this.text.nextMorph = now + 3800;
    if (origin) { this.text.burst(origin.x, origin.y); this.emitSparks(origin.x, origin.y, WHITE, 22); this.emitSparks(origin.x, origin.y, C.pink, 14); }
    else this.text.scatter();
    this.kick(); this.scheduleReduced();
  }
  /** Xem lại từ đầu: hoa vẫn giữ nguyên, chỉ tạm dừng nở và ẩn chữ cho tới khi mở quà lần nữa. */
  sleep(): void { this.awake = false; this.nextBloom = Infinity; this.textAlpha = 0; clearTimeout(this.timer); this.kick(); }

  setMode(mode: GardenMode): void {
    if (mode === this.mode) return;
    const prev = this.mode;
    this.mode = mode;
    this.ptr.until = 0;
    if (mode === 'hero' && prev === 'ambient' && this.awake) { this.text.scatter(); this.text.nextMorph = performance.now() + 5000; }
    this.kick();
  }

  /** Vị trí khung chữ hạt sáng (toạ độ màn hình), null khi rời trang vườn. */
  setTextRect(r: Rect | null): void {
    this.textRect = r;
    this.textScroll0 = window.scrollY;
    if (r && this.W) this.text.build(r, this.W, this.H, this.awake && this.mode === 'hero');
    this.kick();
  }

  /** Nở ngay vài bông màu riêng ở hàng gần (khi mở một lời chúc hay gói bó hoa). */
  bloomSpecial(items: { color: string; type?: FlowerType; center?: string }[]): void {
    const now = performance.now();
    items.forEach((it, k) => {
      const i = this.freeSlot(true);
      if (i < 0) return;
      this.saved.over[i] = [it.type ?? this.plan[i].type, it.color, it.center];
      this.spawn(i, now + k * 260, false);
    });
    this.persist(); this.emit(); this.kick();
  }

  /* ---------- trồng hoa ---------- */
  private freeSlot(prefer: boolean): number {
    if (prefer) {
      for (const L of [2, 1]) for (const sp of this.plan) if (sp.layer === L && !this.bloomedSet.has(sp.i)) return sp.i;
    }
    while (this.autoPtr < CAPACITY && this.bloomedSet.has(this.autoPtr)) this.autoPtr++;
    return this.autoPtr < CAPACITY ? this.autoPtr : -1;
  }

  private spawn(i: number, now: number, restored: boolean): Flower {
    const ov = this.saved.over[i];
    const sp: Spec = ov ? { ...this.plan[i], type: ov[0], color: ov[1] } : this.plan[i];
    const L = sp.layer;
    let grow = 0, bloom = 0, t0 = now;
    if (!reduce) {
      if (restored) { grow = rand(380, 560); bloom = rand(350, 500); t0 = now + rand(0, 1400); }
      else if (L === 2) { grow = rand(1100, 1700) * (0.6 + Math.min(sp.hf, 0.6)); bloom = sp.type === 4 ? rand(1500, 2000) : rand(1000, 1500); }
      else if (L === 1) { grow = rand(900, 1300); bloom = rand(900, 1200); }
      else { grow = rand(700, 1000); bloom = rand(700, 900); }
    }
    const fl = new Flower(sp, makeLook(sp.type, sp.color, sp.variant, L, ov?.[2]), t0, grow, bloom);
    this.flowers.push(fl);
    this.bloomedSet.add(i);
    if (!restored) this.saved.list.push(i);
    if (restored && (L === 0 || (L === 1 && this.bakeMid))) {
      fl.baked = true; fl.bloomed = true; fl.sparked = true;
      if (this.W) this.bake(fl);
    } else {
      const arr = this.live[L];
      let j = 0;
      while (j < arr.length && arr[j].spec.hf >= sp.hf) j++;
      arr.splice(j, 0, fl);
    }
    return fl;
  }

  private bloomNext(now: number): void {
    const i = this.freeSlot(false);
    if (i < 0) return;
    this.spawn(i, now, false);
    this.persist(); this.emit();
  }

  private persist(): void { save(SAVE_KEY, this.saved); }
  private emit(): void { const s = this.stats; this.listeners.forEach(cb => cb(s)); }

  /* ---------- kích thước, chất lượng ---------- */
  private resize(force: boolean): void {
    const w = this.cv.clientWidth, h = this.cv.clientHeight;
    if (!w || !h) return;
    const D = Math.min(window.devicePixelRatio || 1, DPR_CAP[this.q]);
    if (!force && w === this.W && h === this.H && D === this.D) return;
    this.W = w; this.H = h; this.D = D;
    this.cv.width = Math.round(w * D); this.cv.height = Math.round(h * D);
    this.sc = clamp(Math.min(w, h) / 560, 0.78, 1.4);
    clearSprites();
    this.buildBg();
    const pn = Math.round(clamp((w * h) / 30000, 10, this.q ? 40 : 18));
    const cols = [C.sun, '#FFC2DA', WHITE, C.pink, C.lilac];
    this.pollen = Array.from({ length: pn }, (_, i) => ({ x: Math.random() * w, y: rand(h * 0.25, h), vy: -rand(0.12, 0.42), ph: rand(0, TAU), amp: rand(0.2, 0.6), s: rand(0.8, 2.1), c: cols[i % cols.length], tw: rand(0.0015, 0.004) }));
    const tn = Math.round(clamp((w * h) / 40000, 4, this.q ? 30 : 12));
    this.tw = Array.from({ length: tn }, () => ({ x: Math.random() * w, y: Math.random() * h * 0.7, r: rand(3, 7), ph: rand(0, TAU), sp: rand(0.0015, 0.004) }));
    const bn = w < 600 ? 2 : 4, bcols = [C.pink, C.lilac, C.sun, C.peach], now = performance.now();
    this.bflies = Array.from({ length: bn }, (_, i): Butterfly => ({ x: rand(0.1, 0.9) * w, y: rand(0.55, 0.85) * h, ang: rand(0, TAU), turn: 0, sp: rand(0.7, 1.2), ph: rand(0, 1000), c: bcols[i % bcols.length], s: rand(7, 10), mode: 0, target: null, until: now + rand(4000, 9000) + i * 2500 }));
    if (this.textRect) this.text.build(this.textRect, w, h, this.awake);
    this.kick();
  }

  private setQuality(q: number): void {
    this.q = clamp(q, 0, 2);
    if (this.q === 0 && !this.bakeMid) {
      this.bakeMid = true;
      for (const fl of this.live[1]) if (fl.bloomed) this.toBake.push(fl);
    }
    this.resize(true);
  }

  private perf(now: number, cost: number, interval: number): void {
    if (this.mode !== 'hero' || reduce) return;
    if (now < this.warm) return;
    this.costEma = this.costEma * 0.94 + cost * 0.06;
    this.intEma = this.intEma * 0.94 + Math.min(interval, 100) * 0.06;
    if (this.q > 0 && (this.costEma > 10 || this.intEma > 25)) {
      if (!this.slowSince) this.slowSince = now;
      else if (now - this.slowSince > 2000) { this.setQuality(this.q - 1); this.slowSince = 0; this.warm = now + 1500; }
    } else this.slowSince = 0;
  }

  /** Ảnh nền vẽ một lần: sao trời và các bông ở lớp xa đã nở. */
  private buildBg(): void {
    const g = this.bgx, D = this.D, W = this.W, H = this.H;
    this.bg.width = this.cv.width; this.bg.height = this.cv.height;
    g.setTransform(D, 0, 0, D, 0, 0);
    const n = Math.round((W * H) / 2200);
    for (let i = 0; i < n; i++) {
      const x = Math.random() * W, y = Math.random() * H * 0.9;
      const r = Math.random() < 0.08 ? rand(0.9, 1.5) : rand(0.3, 0.9);
      g.globalAlpha = rand(0.2, 0.8) * (1 - (y / H) * 0.5);
      g.fillStyle = Math.random() < 0.25 ? (Math.random() < 0.6 ? C.lilac : '#FFC2DA') : WHITE;
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    for (const fl of this.flowers) if (fl.baked) this.bake(fl);
  }

  private bake(fl: Flower): void {
    const g = this.bgx, D = this.D, L = fl.spec.layer;
    this.geom(fl, 0, 0, false);
    g.setTransform(D, 0, 0, D, 0, 0);
    g.lineCap = 'round';
    g.beginPath(); g.moveTo(fl.bx, fl.by); g.quadraticCurveTo(fl.cx, fl.cy, fl.hx, fl.hy);
    g.strokeStyle = STEM_COL[L]; g.lineWidth = STEM_W[L] * this.sc; g.stroke();
    g.beginPath(); this.leaves(g, fl); g.fillStyle = fl.look.leaf; g.fill();
    this.head(g, fl, 0);
    g.setTransform(D, 0, 0, D, 0, 0);
    fl.baked = true;
  }

  /* ---------- hình học từng bông ---------- */
  private geom(fl: Flower, now: number, f: number, live: boolean): void {
    const sp = fl.spec, L = sp.layer, W = this.W, H = this.H;
    const R = (fl.R = sp.size * this.sc);
    const len = sp.hf * H;
    const bx = sp.fx * W, by = L === 2 ? H + 8 : BASE_Y[L] * H;
    let s = 0;
    if (live && !reduce && L > 0) {
      s = Math.sin(now * sp.sw + sp.ph);
      if (f > 0) {
        /* gió và con trỏ đẩy đầu hoa nghiêng đi, rồi bật lại như lò xo */
        let target = this.gustAt(sp.fx, now) * (L === 2 ? 8 + len * 0.08 : 3 + len * 0.05);
        if (L === 2 && this.mode === 'hero') {
          const k = this.ptrNear(fl.hx, fl.hy, 95 + R, now);
          if (k) target += this.nearUx * k * (16 + R * 0.7);
          fl.hover += (k - fl.hover) * Math.min(1, 0.12 * f);
        }
        fl.ov += (target - fl.ox) * 0.08 * f; fl.ov *= Math.pow(0.82, f); fl.ox += fl.ov * f;
      }
    }
    fl.s = s;
    const amp = L === 2 ? 3 + len * 0.022 : 1.2 + len * 0.012;
    const hx = bx + sp.lean * len * 0.45 + s * amp + fl.ox;
    const hy = by - len + Math.abs(fl.ox) * 0.15;
    fl.bx = bx; fl.by = by; fl.hx = hx; fl.hy = hy;
    fl.cx = bx + (hx - bx) * 0.35 + sp.curve * len * 0.22; fl.cy = by - len * 0.55;
    if (live) {
      const e = now - fl.t0;
      fl.g = fl.growDur ? clamp(e / fl.growDur, 0, 1) : 1;
      fl.ge = easeOutCubic(fl.g);
      fl.b = fl.g < 1 ? 0 : fl.bloomDur ? clamp((e - fl.growDur) / fl.bloomDur, 0, 1) : 1;
    } else { fl.g = fl.ge = fl.b = 1; }
    fl.tang = Math.atan2(bzd(by, fl.cy, hy, fl.ge), bzd(bx, fl.cx, hx, fl.ge));
  }

  private leaves(ctx: CanvasRenderingContext2D, fl: Flower): void {
    const lav = fl.spec.type === 4;
    for (const lf of fl.spec.leaves) {
      if (fl.ge <= lf.at) continue;
      const k = clamp((fl.ge - lf.at) / 0.22, 0, 1);
      const x = bz(fl.bx, fl.cx, fl.hx, lf.at), y = bz(fl.by, fl.cy, fl.hy, lf.at);
      const ang = Math.atan2(bzd(fl.by, fl.cy, fl.hy, lf.at), bzd(fl.bx, fl.cx, fl.hx, lf.at)) + lf.side * (lav ? 0.55 : 0.95) + fl.s * 0.05;
      addLeaf(ctx, x, y, ang, fl.R * (lav ? 1.7 : 1.3) * lf.s * easeOutBack(k), lav ? 0.16 : 0.36);
    }
  }

  /** Đầu hoa: nụ khi đang mọc, vẽ từng cánh khi đang nở, sprite khi đã nở xong. */
  private head(ctx: CanvasRenderingContext2D, fl: Flower, now: number): void {
    const lk = fl.look, R = fl.R, D = this.D, L = fl.spec.layer;
    if (fl.g < 1) {
      if (lk.type !== 4) {
        ctx.setTransform(D, 0, 0, D, 0, 0);
        drawBud(ctx, bz(fl.bx, fl.cx, fl.hx, fl.ge), bz(fl.by, fl.cy, fl.hy, fl.ge), fl.tang, R * (0.14 + 0.3 * clamp((fl.g - 0.5) / 0.5, 0, 1)), lk.c, lk.leaf);
      }
      return;
    }
    if (!fl.sparked) { fl.sparked = true; if (L > 0) this.emitSparks(fl.hx, fl.hy, fl.spec.color, L === 2 ? 9 : 4); }
    const bt = (now - fl.boop) / 560, bp = bt >= 0 && bt < 1 ? Math.sin(bt * Math.PI) * (1 - bt) * fl.boopK : 0;
    const k = (reduce || L < 2 ? 1 : 1 + 0.03 * Math.sin(now * 0.0021 + fl.spec.ph * 2)) * (1 + bp * 0.45);
    const rot = lk.type >= 3
      ? fl.tang + Math.PI / 2 + bp * 0.35 * Math.sin(bt * TAU * 2)
      : fl.spec.rot + fl.s * 0.1 + fl.ox * 0.008 - (1 - easeOutCubic(fl.b)) * 0.9 + bp * 0.7;
    if (fl.b < 1) {
      ctx.setTransform(D, 0, 0, D, 0, 0);
      ctx.save(); ctx.translate(fl.hx, fl.hy); ctx.rotate(rot); ctx.scale(k, k);
      drawHead(ctx, lk, R, fl.b);
      ctx.restore();
      return;
    }
    fl.bloomed = true;
    const spr = headSprite(lk, SPRITE_R[L] * this.sc, D);
    const kk = (k * R) / spr.R, c = Math.cos(rot) * kk * D, s = Math.sin(rot) * kk * D;
    ctx.setTransform(c, s, -s, c, fl.hx * D, fl.hy * D);
    ctx.drawImage(spr.cv, -spr.ax, -spr.ay, spr.w, spr.h);
  }

  /* ---------- vẽ mỗi khung hình ---------- */
  private drawLayer(L: 0 | 1 | 2, now: number, f: number): void {
    const arr = this.live[L]; if (!arr.length) return;
    const ctx = this.ctx, D = this.D, vis = this.vis;
    vis.length = 0;
    for (const fl of arr) { if (now < fl.t0) continue; this.geom(fl, now, f, true); vis.push(fl); }
    if (!vis.length) return;
    if (L === 2 && this.q > 0) {
      ctx.globalCompositeOperation = 'lighter';
      for (const fl of vis) {
        if (fl.g < 1) continue;
        const bt = (now - fl.boop) / 560, bp = bt >= 0 && bt < 1 ? Math.sin(bt * Math.PI) * (1 - bt) * fl.boopK : 0;
        ctx.globalAlpha = clamp((0.45 + fl.hover * 0.35 + bp * 0.5) * easeOutCubic(fl.b), 0, 1);
        const gs = fl.R * 5 * (1 + fl.hover * 0.15);
        ctx.drawImage(glow(fl.spec.color), fl.hx - gs / 2, fl.hy - gs / 2, gs, gs);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    ctx.beginPath();
    for (const fl of vis) {
      const ge = fl.ge;
      ctx.moveTo(fl.bx, fl.by);
      ctx.quadraticCurveTo(fl.bx + (fl.cx - fl.bx) * ge, fl.by + (fl.cy - fl.by) * ge, bz(fl.bx, fl.cx, fl.hx, ge), bz(fl.by, fl.cy, fl.hy, ge));
    }
    ctx.lineCap = 'round';
    if (L === 2 && this.q > 0) {
      ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(61,220,151,.16)'; ctx.lineWidth = STEM_W[2] * this.sc * 3.2; ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.strokeStyle = STEM_COL[L]; ctx.lineWidth = STEM_W[L] * this.sc; ctx.stroke();
    ctx.beginPath();
    for (const fl of vis) this.leaves(ctx, fl);
    ctx.fillStyle = vis[0].look.leaf; ctx.fill();
    for (const fl of vis) {
      this.head(ctx, fl, now);
      if (fl.b >= 1 && (L === 0 || (L === 1 && this.bakeMid))) this.toBake.push(fl);
    }
    ctx.setTransform(D, 0, 0, D, 0, 0);
  }

  private render(now: number, f: number): void {
    const ctx = this.ctx, D = this.D;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, this.cv.width, this.cv.height);
    ctx.drawImage(this.bg, 0, 0);
    ctx.setTransform(D, 0, 0, D, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    for (const t of this.tw) {
      ctx.globalAlpha = 0.2 + 0.6 * (0.5 + 0.5 * Math.sin(now * t.sp + t.ph));
      ctx.drawImage(glow(WHITE), t.x - t.r, t.y - t.r, t.r * 2, t.r * 2);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    this.stepShoot(now, f);
    this.drawLayer(0, now, f);
    this.drawLayer(1, now, f);
    this.drawLayer(2, now, f);
    this.stepFall(now, f);
    this.stepAutumn(now, f);
    if (this.awake) this.stepButterflies(now, f);
    this.stepPollen(now, f);
    if (this.textAlpha > 0.01) {
      /* chữ gắn với trang: nếu trang cuộn thì dời theo, không phải dựng lại */
      const dy = this.textDy();
      this.text.step(now, f, this.ptr.x, this.ptr.y - dy, now < this.ptr.until);
      if (dy) ctx.translate(0, dy);
      this.text.draw(ctx, this.textAlpha, f);
      if (dy) ctx.setTransform(D, 0, 0, D, 0, 0);
    }
    this.stepSparks(f);
    if (this.toBake.length) {
      for (const fl of this.toBake) {
        const arr = this.live[fl.spec.layer], j = arr.indexOf(fl);
        if (j >= 0) arr.splice(j, 1);
        this.bake(fl);
      }
      this.toBake.length = 0;
    }
  }

  private update(now: number): void {
    /* có nhạc thì từ bông thứ 14 trở đi, hoa nở theo giai điệu (onNote); không nhạc thì nở theo đồng hồ */
    if (this.awake && now >= this.nextBloom && (this.flowers.length < 14 || !Sound.playing)) {
      this.bloomNext(now);
      this.nextBloom = this.flowers.length >= CAPACITY ? Infinity : now + (this.flowers.length < 14 ? rand(160, 260) : rand(1500, 2600));
    }
    if (!reduce && this.awake) {
      if (this.gust && now > this.gust.t0 + this.gust.dur) { this.gust = null; this.nextGust = now + rand(8000, 15000); }
      else if (!this.gust && now > this.nextGust) { const o = Math.random() < 0.5 ? 0 : 1; this.gust = { t0: now, dur: rand(2200, 3000), o, str: rand(0.7, 1) }; }
    }
    const showText = this.awake && this.mode === 'hero' && this.text.ready;
    this.textAlpha = reduce ? (showText ? 1 : 0) : clamp(this.textAlpha + (showText ? 0.05 : -0.08), 0, 1);
    if (showText && !reduce && now > this.text.nextMorph) this.text.toggle(now, false);
  }

  private readonly frame = (): void => {
    this.raf = 0;
    if (!this.running || document.hidden) return;
    const now = performance.now();
    const dt = now - this.last;
    /* trang phụ: vườn mờ phía sau, 30 khung/giây là đủ */
    if (!reduce && this.mode === 'ambient' && dt < 31) { this.raf = requestAnimationFrame(this.frame); return; }
    const f = clamp(dt / 16.667, 0, 2.5) || 1;
    this.last = now;
    if (this.W) {
      this.update(now);
      const t0 = performance.now();
      this.render(now, f);
      this.perf(now, performance.now() - t0, dt);
    }
    if (!reduce) this.raf = requestAnimationFrame(this.frame);
  };

  private kick(): void {
    if (this.raf || !this.running || document.hidden) return;
    if (!this.last) this.last = performance.now();
    if (!this.warm) this.warm = performance.now() + 3000;
    this.raf = requestAnimationFrame(this.frame);
  }

  /** Chế độ giảm chuyển động: không có vòng vẽ liên tục, hẹn giờ nở từng bông rồi vẽ lại một lần. */
  private scheduleReduced(): void {
    if (!reduce || !this.running) return;
    clearTimeout(this.timer);
    if (!this.awake || this.nextBloom === Infinity) return;
    this.timer = window.setTimeout(() => { this.kick(); this.timer = window.setTimeout(() => this.scheduleReduced(), 30); }, Math.max(0, this.nextBloom - performance.now()));
  }

  private readonly onVis = (): void => { if (!document.hidden) { this.last = performance.now(); this.kick(); } };

  /**
   * Mỗi nốt giai điệu: bông ở hàng gần ứng với cao độ (nốt trầm bên trái, nốt cao bên phải) khẽ rung và lấp lánh,
   * như khu vườn đang chơi bản nhạc; cứ vài nốt thì nở thêm một bông.
   */
  private readonly onNote = (m: number): void => {
    if (!this.awake || !this.running || document.hidden || !this.W) return;
    const now = performance.now();
    if (this.flowers.length >= 14 && this.flowers.length < CAPACITY && now >= this.musicBloom) {
      this.bloomNext(now);
      this.musicBloom = now + rand(1300, 2200);
    }
    if (!reduce) {
      const x = clamp((m - 72) / 16, 0, 1) * this.W;
      let hit: Flower | null = null, best = Infinity;
      for (const fl of this.live[2]) { if (!fl.bloomed) continue; const d = Math.abs(fl.hx - x); if (d < best) { best = d; hit = fl; } }
      if (hit && now - hit.boop > 600) {
        hit.boop = now; hit.boopK = 0.35;
        this.emitSparks(hit.hx, hit.hy, hit.spec.color, this.mode === 'hero' ? 4 : 2);
      }
    }
    this.kick();
  };

  /* ---------- chạm, con trỏ ---------- */
  private setPtr(e: PointerEvent, hold: number): void {
    const r = this.cv.getBoundingClientRect();
    this.ptr.x = e.clientX - r.left; this.ptr.y = e.clientY - r.top;
    this.ptr.until = performance.now() + hold;
  }
  private readonly onMove = (e: PointerEvent): void => this.setPtr(e, e.pointerType === 'mouse' ? 1e9 : 350);
  private readonly onDown = (e: PointerEvent): void => this.setPtr(e, 550);
  private readonly onLeave = (): void => { this.ptr.until = 0; this.ptr.x = this.ptr.y = -9999; };
  private readonly onClick = (e: MouseEvent): void => {
    if (!this.awake || this.mode !== 'hero') return;
    const r = this.cv.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top, now = performance.now();
    if (this.text.ready && this.text.hit(x, y - this.textDy())) { this.text.toggle(now, true); Sound.sparkle(); this.kick(); return; }
    let hit: Flower | null = null, best = Infinity;
    for (const L of [2, 1]) for (const fl of this.live[L]) {
      if (!fl.bloomed) continue;
      const d = Math.hypot(fl.hx - x, (fl.spec.type === 4 ? fl.hy + fl.R * 1.3 : fl.hy) - y);
      if (d < fl.R * 1.2 + 8 && d < best) { best = d; hit = fl; }
    }
    const note = SCALE[Math.min(SCALE.length - 1, Math.floor((x / this.W) * SCALE.length))];
    if (hit) {
      hit.boop = now; hit.boopK = 1;
      this.emitSparks(hit.hx, hit.hy, hit.spec.color, 12);
      for (let i = 0; i < 3; i++) this.dropPetal(hit);
      Sound.pluck(note + 12);
    } else {
      /* chạm chỗ trống: lấp lánh và một làn gió lan ra hai bên */
      this.emitSparks(x, y, pick(FLOWER_COLS), 12);
      if (!reduce) this.gust = { t0: now, dur: 2000, o: x / this.W, str: 0.85 };
      Sound.pluck(note);
    }
    this.kick();
  };
  private textDy(): number { return this.textRect ? this.textScroll0 - window.scrollY : 0; }
  private ptrNear(x: number, y: number, RR: number, now: number): number {
    if (now > this.ptr.until) return 0;
    const dx = x - this.ptr.x, dy = y - this.ptr.y, d2 = dx * dx + dy * dy;
    if (d2 > RR * RR) return 0;
    const d = Math.sqrt(d2) || 1;
    this.nearUx = dx / d;
    return 1 - d / RR;
  }
  private gustAt(x01: number, now: number): number {
    const g = this.gust; if (!g) return 0;
    const d = x01 - g.o, p = (now - g.t0) / g.dur - Math.abs(d) * 0.5;
    return p > 0 && p < 0.5 ? Math.sin(p * TAU) * g.str * (d >= 0 ? 1 : -1) : 0;
  }

  /* ---------- lấp lánh, cánh rơi, phấn hoa, sao băng, bướm ---------- */
  private emitSparks(x: number, y: number, c: string, n: number): void {
    if (reduce) return;
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), sp = rand(0.5, 2.6);
      this.sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.5, life: 0, max: rand(36, 70), c, s: rand(1.2, 2.6) });
    }
    if (this.sparks.length > 300) this.sparks.splice(0, this.sparks.length - 300);
  }
  private stepSparks(f: number): void {
    const sp = this.sparks; if (!sp.length) return;
    const ctx = this.ctx, fr = Math.pow(0.97, f);
    ctx.globalCompositeOperation = 'lighter';
    let n = 0;
    for (const p of sp) {
      p.life += f;
      if (p.life >= p.max) continue;
      p.x += p.vx * f; p.y += p.vy * f; p.vy += 0.025 * f; p.vx *= fr;
      ctx.globalAlpha = 1 - p.life / p.max;
      const g = p.s * 8; ctx.drawImage(glow(p.c), p.x - g / 2, p.y - g / 2, g, g);
      sp[n++] = p;
    }
    sp.length = n;
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  private dropPetal(fl: Flower): void {
    if (reduce || this.fall.length > 30) return;
    const R = fl.R || 10;
    this.fall.push({ x: fl.hx + rand(-R, R) * 0.5, y: fl.hy + rand(-R, R) * 0.3, vx: rand(-0.4, 0.4), vy: rand(0.1, 0.5), r: rand(0, TAU), vr: rand(-0.06, 0.06), fl: rand(0, TAU), vf: rand(0.05, 0.1), s: R * rand(0.55, 0.75), c: fl.spec.color, life: 0 });
  }
  private stepFall(now: number, f: number): void {
    if (reduce) return;
    if (this.awake && now > this.nextDrop) {
      const pool = this.live[2].length ? this.live[2] : this.live[1];
      const fl = pool.length ? pick(pool) : null;
      if (fl && fl.bloomed && fl.spec.type !== 4) this.dropPetal(fl);
      this.nextDrop = now + (this.gust ? rand(140, 320) : rand(1100, 2400));
    }
    if (!this.fall.length) return;
    const ctx = this.ctx, D = this.D, W = this.W, H = this.H;
    let n = 0;
    for (const p of this.fall) {
      p.life += f;
      const w = this.gustAt(clamp(p.x / W, 0, 1), now);
      p.vx += (w * 2.6 + 0.12 - p.vx) * 0.03 * f;
      p.vy += (0.6 - p.vy) * 0.02 * f;
      p.fl += p.vf * f; p.r += p.vr * f;
      p.x += (p.vx + Math.sin(p.fl) * 0.45) * f; p.y += p.vy * f;
      if (p.y > H + 14 || p.x < -24 || p.x > W + 24) continue;
      ctx.globalAlpha = Math.min(1, p.life / 14) * clamp((H + 14 - p.y) / 60, 0, 1) * 0.9;
      const c = Math.cos(p.r) * D, s = Math.sin(p.r) * D, k = 0.35 + 0.65 * Math.abs(Math.cos(p.fl));
      ctx.setTransform(c, s, -s * k, c * k, p.x * D, p.y * D);
      ctx.drawImage(petalSprite(p.c), -p.s / 2, (-p.s * PETAL_SH) / PETAL_SW / 2, p.s, (p.s * PETAL_SH) / PETAL_SW);
      this.fall[n++] = p;
    }
    this.fall.length = n;
    ctx.setTransform(D, 0, 0, D, 0, 0); ctx.globalAlpha = 1;
  }
  /** Lá vàng mùa thu thỉnh thoảng bay ngang vườn, theo gió. */
  private stepAutumn(now: number, f: number): void {
    if (reduce || !this.awake) return;
    if (now > this.nextLeaf && this.autumn.length < 5) {
      this.autumn.push({ x: rand(-0.05, 0.9) * this.W, y: -20, vx: rand(0.15, 0.6), vy: rand(0.45, 0.8), r: rand(0, TAU), vr: rand(-0.03, 0.03), fl: rand(0, TAU), vf: rand(0.025, 0.05), s: rand(11, 17) * this.sc, c: pick(AUTUMN_COLS), life: 0 });
      this.nextLeaf = now + rand(3500, 7500);
    }
    if (!this.autumn.length) return;
    const ctx = this.ctx, D = this.D, W = this.W, H = this.H;
    let n = 0;
    for (const p of this.autumn) {
      p.life += f;
      const w = this.gustAt(clamp(p.x / W, 0, 1), now);
      p.vx += (w * 3 + 0.3 - p.vx) * 0.02 * f;
      p.fl += p.vf * f; p.r += (p.vr + Math.sin(p.fl) * 0.012) * f;
      p.x += (p.vx + Math.sin(p.fl) * 0.9) * f; p.y += (p.vy + Math.cos(p.fl * 2) * 0.25) * f;
      if (p.y > H + 20 || p.x > W + 30 || p.x < -30) continue;
      ctx.globalAlpha = Math.min(1, p.life / 30) * 0.85;
      const c = Math.cos(p.r) * D, s = Math.sin(p.r) * D, k = 0.3 + 0.7 * Math.abs(Math.cos(p.fl));
      ctx.setTransform(c, s, -s * k, c * k, p.x * D, p.y * D);
      ctx.drawImage(leafSprite(p.c), -p.s / 2, (-p.s * LEAF_SH) / LEAF_SW / 2, p.s, (p.s * LEAF_SH) / LEAF_SW);
      this.autumn[n++] = p;
    }
    this.autumn.length = n;
    ctx.setTransform(D, 0, 0, D, 0, 0); ctx.globalAlpha = 1;
  }
  private stepPollen(now: number, f: number): void {
    const ctx = this.ctx, W = this.W, H = this.H;
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.pollen) {
      if (!reduce) {
        p.y += p.vy * f; p.x += (Math.sin(now * 0.0009 + p.ph) * p.amp * 0.4 + this.gustAt(clamp(p.x / W, 0, 1), now) * 1.6) * f;
        if (p.y < -12) { p.y = H + 12; p.x = Math.random() * W; }
        if (p.x < -12) p.x = W + 12; else if (p.x > W + 12) p.x = -12;
      }
      ctx.globalAlpha = 0.3 + 0.35 * (0.5 + 0.5 * Math.sin(now * p.tw + p.ph));
      const g = p.s * 9; ctx.drawImage(glow(p.c), p.x - g / 2, p.y - g / 2, g, g);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  private stepShoot(now: number, f: number): void {
    if (reduce || !this.awake) return;
    const ctx = this.ctx;
    if (!this.shoot && now > this.nextShoot) {
      const dir = Math.random() < 0.5 ? -1 : 1;
      this.shoot = { x: dir < 0 ? rand(this.W * 0.45, this.W) : rand(0, this.W * 0.55), y: rand(10, this.H * 0.3), vx: dir * rand(7, 11), vy: rand(2.2, 3.6), life: 0, max: 55 };
    }
    const sh = this.shoot; if (!sh) return;
    sh.life += f; sh.x += sh.vx * f; sh.y += sh.vy * f;
    const a = Math.max(0, Math.sin((Math.PI * sh.life) / sh.max));
    const tx = sh.x - sh.vx * 14, ty = sh.y - sh.vy * 14;
    const g = ctx.createLinearGradient(sh.x, sh.y, tx, ty);
    g.addColorStop(0, `rgba(255,255,255,${0.9 * a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = g; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sh.x, sh.y); ctx.lineTo(tx, ty); ctx.stroke();
    if (sh.life >= sh.max) { this.shoot = null; this.nextShoot = now + rand(5000, 10000); }
  }
  private stepButterflies(now: number, f: number): void {
    const ctx = this.ctx, W = this.W, H = this.H, D = this.D;
    const active = now < this.ptr.until && this.mode === 'hero';
    for (const b of this.bflies) {
      let flee = false;
      if (active) { const dx = b.x - this.ptr.x, dy = b.y - this.ptr.y; flee = dx * dx + dy * dy < 120 * 120; }
      if (!reduce) {
        if (b.target && (flee || b.target.baked)) {
          if (flee) b.ang = Math.atan2(b.y - this.ptr.y, b.x - this.ptr.x);
          b.target = null; b.mode = 0; b.until = now + rand(5000, 10000);
        }
        if (b.mode === 0 && now > b.until) {
          const cand = [...this.live[2], ...this.live[1]].filter(fl => fl.bloomed && fl.spec.type !== 4 && fl.hy > H * 0.35 && !this.bflies.some(o => o.target === fl));
          if (cand.length) { b.target = pick(cand); b.mode = 1; b.until = now + 7000; } else b.until = now + 3000;
        }
        if (b.mode === 1 && b.target) {
          const tx = b.target.hx, ty = b.target.hy - b.target.R * 0.15;
          const dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy);
          b.ang += angDiff(Math.atan2(dy, dx), b.ang) * Math.min(1, 0.12 * f);
          const sp = Math.min(b.sp * 1.5, d * 0.08 + 0.3);
          b.x += Math.cos(b.ang) * sp * f; b.y += Math.sin(b.ang) * sp * f + Math.sin(now * 0.006 + b.ph) * 0.2 * f;
          if (d < 4) { b.mode = 2; b.until = now + rand(2500, 5500); }
          else if (now > b.until) { b.mode = 0; b.target = null; b.until = now + rand(4000, 8000); }
        } else if (b.mode === 2 && b.target) {
          b.x = b.target.hx; b.y = b.target.hy - b.target.R * 0.15;
          if (now > b.until) { b.mode = 0; b.target = null; b.ang = -Math.PI / 2 + rand(-0.8, 0.8); b.until = now + rand(6000, 12000); }
        } else {
          b.turn += rand(-0.05, 0.05) * f; b.turn *= Math.pow(0.95, f); b.ang += b.turn * f;
          const minY = H * 0.4, maxY = H * 0.92;
          let tx: number | null = null, ty = 0, sp = b.sp;
          if (b.x < W * 0.04 || b.x > W * 0.96 || b.y < minY || b.y > maxY) { tx = clamp(b.x, W * 0.12, W * 0.88); ty = clamp(b.y, minY + 30, maxY - 30); }
          if (flee) { tx = b.x + (b.x - this.ptr.x); ty = b.y + (b.y - this.ptr.y); sp *= 2.4; }
          if (tx !== null) b.ang += angDiff(Math.atan2(ty - b.y, tx - b.x), b.ang) * 0.08 * f;
          b.x += Math.cos(b.ang) * sp * f; b.y += Math.sin(b.ang) * sp * f + Math.sin(now * 0.005 + b.ph) * 0.35 * f;
        }
      }
      const s = b.s * this.sc, resting = b.mode === 2;
      const flap = reduce ? 0.8 : resting ? 0.55 + 0.42 * Math.abs(Math.sin(now * 0.0035 + b.ph)) : 0.25 + 0.75 * Math.abs(Math.sin(now * 0.016 + b.ph));
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35;
      const gs = s * 6; ctx.drawImage(glow(b.c), b.x - gs / 2, b.y - gs / 2, gs, gs);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      const rot = resting ? 0 : Math.cos(b.ang) * 0.35, cr = Math.cos(rot) * D, sr = Math.sin(rot) * D;
      for (const side of [-1, 1]) {
        ctx.setTransform(cr * side * flap, sr * side * flap, -sr, cr, b.x * D, b.y * D);
        ctx.globalAlpha = 0.92; ctx.fillStyle = b.c;
        ctx.beginPath(); ctx.ellipse(s * 0.62, -s * 0.32, s * 0.68, s * 0.5, -0.5, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(s * 0.48, s * 0.38, s * 0.44, s * 0.34, 0.45, 0, TAU); ctx.fill();
        ctx.globalAlpha = 0.5; ctx.fillStyle = WHITE;
        ctx.beginPath(); ctx.arc(s * 0.72, -s * 0.38, s * 0.16, 0, TAU); ctx.fill();
      }
      ctx.setTransform(cr, sr, -sr, cr, b.x * D, b.y * D);
      ctx.globalAlpha = 1; ctx.fillStyle = '#FFF1F6';
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.1, s * 0.5, 0, 0, TAU); ctx.fill();
      ctx.setTransform(D, 0, 0, D, 0, 0);
    }
  }
}
