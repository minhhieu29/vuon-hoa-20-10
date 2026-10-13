import { ROUTES, type Route } from '../router';
import type { Progress } from './progress';

/** Đi lần lượt, không nhảy cóc: có bó hoa mới tới lời chúc, mở hết lời chúc mới tới lá thư. */
export function reachable(r: Route, s: Progress): boolean {
  if (r === 'loi-chuc') return s.wrapped;
  if (r === 'thiep') return s.wrapped && s.bouquet.every(it => s.opened.includes(it.id));
  return true;
}

/** Trang xa nhất đã mở khóa. */
export const frontier = (s: Progress): Route => [...ROUTES].reverse().find(r => reachable(r, s)) ?? 'vuon';
