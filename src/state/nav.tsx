import { createContext, useContext, type AnchorHTMLAttributes, type MouseEvent, type ReactNode, type Ref } from 'react';
import type { GardenEngine } from '../garden/engine';
import type { Pt } from '../lib/math';
import { hrefOf, type Route } from '../router';

export interface NavApi {
  /** trang đang hiển thị */
  route: Route;
  /** trang đang tới (thanh điều hướng đổi ngay khi bấm, trước khi màn chuyển trang mở ra) */
  navRoute: Route;
  opened: boolean;
  /** độ trễ (giây) trước khi nội dung trang bắt đầu hiện dần */
  revealBase: number;
  garden: GardenEngine | null;
  go: (to: Route, origin?: Pt) => void;
}

export const NavCtx = createContext<NavApi | null>(null);

export function useNav(): NavApi {
  const v = useContext(NavCtx);
  if (!v) throw new Error('useNav cần nằm trong NavCtx');
  return v;
}

/** Điểm bắt đầu của bông hoa chuyển trang: chỗ bấm chuột, hoặc giữa nút nếu dùng bàn phím. */
export function originOf(e: MouseEvent<HTMLElement>): Pt {
  if (e.detail && (e.clientX || e.clientY)) return { x: e.clientX, y: e.clientY };
  const r = e.currentTarget.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { to: Route; children: ReactNode; ref?: Ref<HTMLAnchorElement> };

/** Liên kết giữa các trang: chạy hiệu ứng hoa nở thay vì nhảy trang ngay. */
export function BloomLink({ to, children, onClick, ref, ...rest }: LinkProps) {
  const { go } = useNav();
  return (
    <a
      {...rest}
      ref={ref}
      href={hrefOf(to)}
      onClick={e => {
        onClick?.(e);
        if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        go(to, originOf(e));
      }}
    >
      {children}
    </a>
  );
}
