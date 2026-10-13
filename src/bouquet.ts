import { TAU, rand } from './lib/math';
import { C } from './garden/palette';
import type { MiniKind } from './garden/mini';
import { WISHES } from './config';

export type FlowerKey = 'rose' | 'lotus' | 'sunflower' | 'daisy' | 'lavender' | 'baby';

export interface FlowerInfo {
  key: FlowerKey;
  name: string;
  meaning: string;
  /** khung nhìn SVG cho biểu tượng trên nút chọn */
  vb: string;
  /** nốt nhạc khi thêm vào bó */
  note: number;
  color: string;
  /** kiểu hoa tương ứng trong vườn nhỏ trên thiệp */
  mini: MiniKind;
  svg: string;
}

const ring = (n: number, f: (i: number) => string) => Array.from({ length: n }, (_, i) => f(i)).join('');

const SVG: Record<FlowerKey, string> = {
  rose: '<circle r="22" fill="#C42E66"/>' +
    ring(6, i => `<ellipse cy="-13" rx="11" ry="14" transform="rotate(${i * 60 + 10})" fill="#E2457F"/>`) +
    ring(5, i => `<ellipse cy="-8" rx="9" ry="10" transform="rotate(${i * 72 + 36})" fill="#FF5FA2"/>`) +
    '<circle r="9" fill="#FF7DB5"/><path d="M-1 1c2-4 7-3 7 2s-5 7-9 5-6-6-3-10 7-5 11-3" fill="none" stroke="#C42E66" stroke-width="2" stroke-linecap="round"/><circle cx="-5" cy="-6" r="2.2" fill="#fff" fill-opacity=".5"/>',
  sunflower: ring(16, i => `<ellipse cy="-17" rx="4.4" ry="10" transform="rotate(${i * 22.5})" fill="#F5B82E"/>`) +
    ring(16, i => `<ellipse cy="-15" rx="4" ry="9" transform="rotate(${i * 22.5 + 11.25})" fill="#FFD36E"/>`) +
    '<circle r="11" fill="#5E3519"/><circle r="7.5" fill="#7A4622"/>' +
    ring(8, i => `<circle cx="${(Math.cos((i * TAU) / 8) * 4.6).toFixed(1)}" cy="${(Math.sin((i * TAU) / 8) * 4.6).toFixed(1)}" r="1.1" fill="#A8723A"/>`),
  lotus: '<path d="M0 8C-8 2-20-4-24-14c9-1 18 4 24 22z" fill="#E86A9A"/><path d="M0 8C8 2 20-4 24-14c-9-1-18 4-24 22z" fill="#E86A9A"/>' +
    '<path d="M0 8C-10 0-14-14-10-26c6 6 10 18 10 34z" fill="#FF8FB8"/><path d="M0 8C10 0 14-14 10-26c-6 6-10 18-10 34z" fill="#FF8FB8"/>' +
    '<ellipse cy="-15" rx="6.5" ry="2.4" fill="#F5C542"/><path d="M0 8C-7 0-7-18 0-30 7-18 7 0 0 8z" fill="#FFD3E4"/><path d="M0 -12C-3-17-3-24 0-30 3-24 3-17 0-12z" fill="#FF9EC2"/>' +
    '<path d="M-1.5 4c-1.5-8-1.5-17 1-25" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.4" stroke-linecap="round"/>',
  daisy: ring(14, i => `<ellipse cy="-13" rx="3.8" ry="10.5" transform="rotate(${((i * 360) / 14).toFixed(1)})" fill="#FFF7FB" stroke="#EBD3E2" stroke-width=".6"/>`) +
    '<circle r="7" fill="#FFD36E"/><circle r="4" fill="#FFB648"/>',
  lavender: '<path d="M0 6V-40" stroke="#3DDC97" stroke-width="2" stroke-linecap="round"/>' + ring(9, j => {
    const y = -j * 4.8, s = 5.6 - j * 0.34, y2 = y - 2.2;
    return `<ellipse cx="-2.8" cy="${y.toFixed(1)}" rx="${(s * 0.56).toFixed(1)}" ry="${s.toFixed(1)}" transform="rotate(-30 -2.8 ${y.toFixed(1)})" fill="${j % 2 ? '#B48CFF' : '#9F78F0'}"/>` +
      `<ellipse cx="2.8" cy="${y2.toFixed(1)}" rx="${(s * 0.56).toFixed(1)}" ry="${s.toFixed(1)}" transform="rotate(30 2.8 ${y2.toFixed(1)})" fill="${j % 2 ? '#C69CFF' : '#B48CFF'}"/>`;
  }) + '<ellipse cy="-44" rx="2.6" ry="4.6" fill="#D9B8FF"/>',
  baby: (() => {
    const pts = [[-14, -10], [-6, -18], [4, -21], [13, -12], [-19, 1], [19, -1], [-8, -5], [8, -6], [0, -11], [-12, -21], [12, -23], [0, -27], [-3, 0], [5, 2]];
    return '<g fill="none" stroke="#9BE3C2" stroke-width="1">' + pts.map(([x, y]) => `<path d="M0 10Q${(x * 0.3).toFixed(1)} ${((y + 10) * 0.4).toFixed(1)} ${x} ${y}"/>`).join('') + '</g>' +
      pts.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 3 ? 3 : 3.6}" fill="#FFFFFF" stroke="#F0DDF0" stroke-width=".6"/>`).join('');
  })(),
};

/** Sáu loài hoa để gói bó: đổi tên hay ý nghĩa ở đây. Có sen và cúc họa mi (hoa của mùa thu Hà Nội) cho gần gũi. */
export const BOUQUET: FlowerInfo[] = [
  { key: 'rose', name: 'Hoa hồng', meaning: 'lòng biết ơn', vb: '-28 -28 56 56', note: 72, color: C.pink, mini: { type: 2, color: C.pink }, svg: SVG.rose },
  { key: 'lotus', name: 'Hoa sen', meaning: 'thanh khiết, bền bỉ vươn lên', vb: '-27 -33 54 46', note: 76, color: '#FF8FB8', mini: { type: 5, color: '#FF8FB8' }, svg: SVG.lotus },
  { key: 'sunflower', name: 'Hướng dương', meaning: 'luôn hướng về phía ánh sáng', vb: '-28 -28 56 56', note: 79, color: C.sun, mini: { type: 0, color: C.sun, center: '#7A4622' }, svg: SVG.sunflower },
  { key: 'daisy', name: 'Cúc họa mi', meaning: 'trong trẻo như thu Hà Nội', vb: '-25 -25 50 50', note: 81, color: C.white, mini: { type: 0, color: C.white }, svg: SVG.daisy },
  { key: 'lavender', name: 'Oải hương', meaning: 'bình yên, thư thái', vb: '-29 -51 58 58', note: 84, color: C.lilac, mini: { type: 4, color: C.lilac }, svg: SVG.lavender },
  { key: 'baby', name: 'Hoa baby', meaning: 'những điều nhỏ xinh', vb: '-24 -32 48 44', note: 88, color: C.white, mini: { type: 1, color: C.white, size: 11 }, svg: SVG.baby },
];
export const FLOWER: Record<FlowerKey, FlowerInfo> = Object.fromEntries(BOUQUET.map(f => [f.key, f])) as Record<FlowerKey, FlowerInfo>;

/** Số bông của một bó: chọn đủ thì bó tự gói lại và chuyển sang trang lời chúc (mỗi bông mang một lời). */
export const BQ_SIZE = 6;
/** Nút buộc bó hoa trong toạ độ SVG 400×500. */
export const TIE = [200, 404] as const;
const SLOTS: readonly (readonly [number, number])[] = [[200, 166], [140, 194], [260, 194], [200, 226], [94, 228], [306, 228], [148, 256], [252, 256], [200, 122]];

/** w: lời chúc thứ mấy trong mười lời của loài hoa này (WISHES trong src/config.ts). */
export interface BouquetItem { id: number; k: FlowerKey; w: number; slot: number; hx: number; hy: number; ex: number; qx: number; qy: number; rot: number; sd: number }

/** Rút một lời chúc của loài k mà bó hoa chưa có, để hai bông cùng loài không trùng lời. */
function pickWish(k: FlowerKey, items: BouquetItem[]): number {
  const used = new Set(items.filter(it => it.k === k).map(it => it.w));
  const free = WISHES[k].map((_, i) => i).filter(i => !used.has(i));
  const pool = free.length ? free : WISHES[k].map((_, i) => i);
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Đặt một bông vào chỗ trống đầu tiên trong bó: tính sẵn vị trí đầu hoa, đường cong thân, góc nghiêng và lời chúc nó mang theo. */
export function placeFlower(k: FlowerKey, items: BouquetItem[], id: number): BouquetItem | null {
  const used = new Set(items.map(it => it.slot));
  let slot = 0;
  while (slot < SLOTS.length && used.has(slot)) slot++;
  if (slot >= SLOTS.length) return null;
  const [sx, sy] = SLOTS[slot];
  const hx = sx + rand(-6, 6), hy = sy + rand(-5, 5);
  const qx = TIE[0] + (hx - TIE[0]) * 0.42, qy = (TIE[1] + hy) / 2 + 12;
  const dirA = (Math.atan2(hy - qy, hx - qx) * 180) / Math.PI + 90;
  const rot = k === 'lotus' || k === 'lavender' || k === 'baby' ? dirA * 0.85 : rand(-30, 30);
  return { id, k, w: pickWish(k, items), slot, hx, hy, ex: TIE[0] + (hx - TIE[0]) * 0.18 + rand(-3, 3), qx, qy, rot, sd: -rand(0, 5) };
}
