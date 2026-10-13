/** Bốn trang của món quà, đi theo thứ tự này (phím ← →, vuốt ngang): chọn hoa trước, mỗi bông mang một lời chúc, cuối cùng là lá thư. */
export type Route = 'vuon' | 'bo-hoa' | 'loi-chuc' | 'thiep';
export const ROUTES: readonly Route[] = ['vuon', 'bo-hoa', 'loi-chuc', 'thiep'];
export const TITLES: Record<Route, string> = { vuon: 'Vườn hoa', 'bo-hoa': 'Bó hoa', 'loi-chuc': 'Lời chúc', thiep: 'Tấm thiệp' };

/** Địa chỉ dạng #/loi-chuc: chạy được trên mọi hosting tĩnh, không cần cấu hình chuyển hướng. */
export function parseHash(hash: string = location.hash): Route {
  let h = hash.replace(/^#\/?/, '');
  try { h = decodeURIComponent(h); } catch { /* để nguyên */ }
  h = h.toLowerCase().replace(/\/$/, '');
  return (ROUTES as readonly string[]).includes(h) ? (h as Route) : 'vuon';
}
export const hrefOf = (r: Route): string => (r === 'vuon' ? '#/' : `#/${r}`);
