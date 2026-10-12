import { rgba } from '../lib/math';
import { addLeaf, petal } from './draw';

const glows = new Map<string, HTMLCanvasElement>();

/** Quầng sáng tròn vẽ sẵn (dùng cho đom đóm, phấn hoa, quầng quanh hoa). */
export function glow(c: string): HTMLCanvasElement {
  let s = glows.get(c);
  if (s) return s;
  s = document.createElement('canvas'); s.width = s.height = 128;
  const g = s.getContext('2d');
  if (g) {
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, rgba(c, 0.95)); grd.addColorStop(0.22, rgba(c, 0.38)); grd.addColorStop(1, rgba(c, 0));
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  }
  glows.set(c, s);
  return s;
}

const petals = new Map<string, HTMLCanvasElement>();
/** Kích thước sprite cánh hoa rơi: dài 40, rộng 22 (px ảnh), tâm ở giữa. */
export const PETAL_SW = 40, PETAL_SH = 22;

/** Cánh hoa vẽ sẵn, nằm ngang, dùng cho cánh rơi và mưa cánh hoa. */
export function petalSprite(c: string): HTMLCanvasElement {
  let s = petals.get(c);
  if (s) return s;
  s = document.createElement('canvas'); s.width = PETAL_SW; s.height = PETAL_SH;
  const g = s.getContext('2d');
  if (g) {
    g.translate(PETAL_SW / 2, PETAL_SH / 2);
    g.beginPath(); petal(g, Math.PI / 2, PETAL_SW - 4, (PETAL_SH - 4) * 0.62, -(PETAL_SW - 4) / 2);
    g.fillStyle = c; g.fill();
    g.beginPath(); petal(g, Math.PI / 2, PETAL_SW * 0.5, PETAL_SH * 0.18, -(PETAL_SW - 4) / 2 + 3);
    g.fillStyle = 'rgba(255,255,255,.28)'; g.fill();
  }
  petals.set(c, s);
  return s;
}

const leafs = new Map<string, HTMLCanvasElement>();
/** Kích thước sprite lá thu: dài 36, rộng 18 (px ảnh), tâm ở giữa. */
export const LEAF_SW = 36, LEAF_SH = 18;

/** Lá vàng mùa thu vẽ sẵn, nằm ngang, có gân giữa. */
export function leafSprite(c: string): HTMLCanvasElement {
  let s = leafs.get(c);
  if (s) return s;
  s = document.createElement('canvas'); s.width = LEAF_SW; s.height = LEAF_SH;
  const g = s.getContext('2d');
  if (g) {
    g.beginPath(); addLeaf(g, 2, LEAF_SH / 2, 0, LEAF_SW - 4, 0.42);
    g.fillStyle = c; g.fill();
    g.beginPath(); g.moveTo(3, LEAF_SH / 2); g.lineTo(LEAF_SW - 7, LEAF_SH / 2);
    g.strokeStyle = 'rgba(110,55,20,.35)'; g.lineWidth = 1; g.stroke();
  }
  leafs.set(c, s);
  return s;
}
