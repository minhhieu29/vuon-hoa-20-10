/** Bốn trang của món quà, đi theo thứ tự này (phím ← →, vuốt ngang). */
export type Route = 'vuon' | 'loi-chuc' | 'bo-hoa' | 'thiep';
export const ROUTES: readonly Route[] = ['vuon', 'loi-chuc', 'bo-hoa', 'thiep'];
export const TITLES: Record<Route, string> = { vuon: 'Vườn hoa', 'loi-chuc': 'Lời chúc', 'bo-hoa': 'Bó hoa', thiep: 'Tấm thiệp' };

/** Địa chỉ dạng #/loi-chuc: chạy được trên mọi hosting tĩnh, không cần cấu hình chuyển hướng. */
export function parseHash(hash: string = location.hash): Route {
  let h = hash.replace(/^#\/?/, '');
  try { h = decodeURIComponent(h); } catch { /* để nguyên */ }
  h = h.toLowerCase().replace(/\/$/, '');
  return (ROUTES as readonly string[]).includes(h) ? (h as Route) : 'vuon';
}
export const hrefOf = (r: Route): string => (r === 'vuon' ? '#/' : `#/${r}`);
