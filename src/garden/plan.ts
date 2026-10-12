import { clamp, mulberry32, pick, shuffle } from '../lib/math';
import { C, FLOWER_COLS, LAV_COLS, LOTUS_COLS, TYPE_BAG, type FlowerType } from './palette';

/** Số bông tối đa mỗi lớp: xa, giữa, gần. Vườn "kín" khi đủ cả ba. */
export const LAYER_CAP = [64, 36, 20] as const;
export const CAPACITY = LAYER_CAP[0] + LAYER_CAP[1] + LAYER_CAP[2];

export interface LeafSpec { at: number; side: number; s: number }
export interface Spec {
  i: number;
  layer: 0 | 1 | 2;
  fx: number;
  hf: number;
  type: FlowerType;
  color: string;
  variant: number;
  size: number;
  lean: number;
  curve: number;
  rot: number;
  ph: number;
  sw: number;
  leaves: LeafSpec[];
}

/**
 * Quy hoạch cả khu vườn từ một hạt giống: vị trí, chiều cao, loài, màu của từng bông và thứ tự nở.
 * Chỉ cần lưu hạt giống và số bông đã nở là dựng lại đúng khu vườn cũ sau khi tải lại trang.
 */
export function makePlan(seed: number): Spec[] {
  const rnd = mulberry32(seed);
  const r = (a: number, b: number) => a + rnd() * (b - a);
  const layers: Spec[][] = [[], [], []];
  for (const L of [0, 1, 2] as const) {
    const n = LAYER_CAP[L];
    const xs = shuffle(Array.from({ length: n }, (_, i) => clamp((i + 0.5 + r(-0.42, 0.42)) / n, 0.012, 0.988)), rnd);
    for (const fx of xs) {
      const edge = Math.abs(fx - 0.5) * 2;
      /* hoa gần thấp ở giữa, cao dần ra hai bên để không che chữ */
      const hf = L === 2 ? 0.12 + 0.2 * Math.pow(edge, 1.15) * r(0.8, 1.05) + r(0, 0.04)
        : L === 1 ? r(0.05, 0.11) + 0.08 * edge * r(0.4, 1)
        : r(0.025, 0.075);
      const type = pick(TYPE_BAG, rnd);
      const side = rnd() < 0.5 ? -1 : 1;
      layers[L].push({
        i: 0,
        layer: L,
        fx,
        hf,
        type,
        color: type === 4 ? pick(LAV_COLS, rnd) : type === 5 ? pick(LOTUS_COLS, rnd) : type === 0 && rnd() < 0.45 ? C.white : pick(FLOWER_COLS, rnd),
        variant: rnd() < 0.5 ? 0 : 1,
        size: L === 2 ? r(18, 30) : L === 1 ? r(11, 17) : r(6, 10),
        lean: r(-0.18, 0.18),
        curve: r(-0.5, 0.5) * (type === 4 ? 0.35 : 1),
        rot: r(0, Math.PI * 2),
        ph: r(0, Math.PI * 2),
        sw: r(0.0007, 0.0013),
        leaves: L === 0
          ? [{ at: r(0.3, 0.5), side, s: 0.8 }]
          : type === 4
            ? [{ at: r(0.16, 0.24), side, s: 1 }, { at: r(0.3, 0.4), side: -side, s: 0.8 }]
            : [{ at: r(0.28, 0.42), side, s: r(0.75, 1) }, { at: r(0.5, 0.66), side: -side, s: r(0.6, 0.9) }],
      });
    }
  }
  /* 14 bông đầu ở lớp gần và giữa cho đẹp ngay, sau đó lớp nào còn vơi nhất thì nở ở lớp đó */
  const order: Spec[] = [];
  const used = [0, 0, 0];
  for (let k = 0; k < 14; k++) { const L = k % 7 < 3 ? 2 : 1; order.push(layers[L][used[L]++]); }
  while (order.length < CAPACITY) {
    let best = -1, bestFill = Infinity;
    for (let L = 0; L < 3; L++) {
      if (used[L] >= LAYER_CAP[L]) continue;
      const fill = used[L] / LAYER_CAP[L] + rnd() * 0.04;
      if (fill < bestFill) { bestFill = fill; best = L; }
    }
    order.push(layers[best][used[best]++]);
  }
  order.forEach((s, i) => { s.i = i; });
  return order;
}
