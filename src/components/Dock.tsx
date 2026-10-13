import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ROUTES, TITLES, type Route } from '../router';
import { BloomLink, useNav } from '../state/nav';
import { useProgress } from '../state/progress';
import { reachable } from '../state/steps';

const ICONS: Record<Route, ReactNode> = {
  vuon: <><path d="M12 21v-8" /><path d="M12 13c-3.3 0-5.5-2.4-5.5-5.8V4l2.8 1.9L12 3l2.7 2.9L17.5 4v3.2c0 3.4-2.2 5.8-5.5 5.8z" /><path d="M12 18c-1.7-1.8-3.8-2.4-5.6-2.1" /></>,
  'loi-chuc': <><path d="M11 3.5 12.9 8l4.6 1.6-4.6 1.6L11 15.7l-1.9-4.5-4.6-1.6L9.1 8z" /><path d="m18 14.5.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" /></>,
  'bo-hoa': <><circle cx="8.3" cy="7.2" r="2.6" /><circle cx="15.7" cy="7.2" r="2.6" /><circle cx="12" cy="4.6" r="2.6" /><path d="M6.4 10.6h11.2L13.6 21h-3.2z" /></>,
  thiep: <><rect x="3" y="5.5" width="18" height="13" rx="2" /><path d="m3.5 7 8.5 6 8.5-6" /></>,
};
const SHORT: Record<Route, string> = { vuon: TITLES.vuon, 'bo-hoa': TITLES['bo-hoa'], 'loi-chuc': TITLES['loi-chuc'], thiep: 'Thiệp' };
/** Lời nhắc khi bấm vào trang chưa tới lượt. */
const WAIT: Partial<Record<Route, string>> = { 'loi-chuc': 'Chọn đủ hoa trước đã nhé', thiep: 'Mở hết lời chúc trước đã nhé' };

/**
 * Thanh điều hướng dưới đáy, viên sáng trượt tới trang đang chọn.
 * Trang chưa tới lượt thì mờ đi và không bấm được (bấm vào thì rung nhẹ), để không ai bỏ qua mất bước nào.
 */
export function Dock({ inert }: { inert: boolean }) {
  const { navRoute } = useNav();
  const { state } = useProgress();
  const [nudge, setNudge] = useState<Route | null>(null);
  const refs = useRef<Partial<Record<Route, HTMLAnchorElement | null>>>({});
  const [ind, setInd] = useState<{ x: number; w: number } | null>(null);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const place = () => {
      const a = refs.current[navRoute];
      if (a && a.offsetWidth) setInd({ x: a.offsetLeft, w: a.offsetWidth });
    };
    place();
    window.addEventListener('resize', place);
    void document.fonts?.ready.then(place);
    return () => window.removeEventListener('resize', place);
  }, [navRoute]);

  /* lần đầu đặt viên sáng không trượt, từ lần sau mới trượt */
  useEffect(() => {
    if (!ind || ready) return;
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, [ind, ready]);

  return (
    <nav className={`dock${ready ? ' ready' : ''}`} aria-label="Các trang" inert={inert}>
      <span className="ind" aria-hidden="true" style={ind ? { transform: `translateX(${ind.x}px)`, width: ind.w } : { opacity: 0 }} />
      {ROUTES.map(r => {
        const locked = !reachable(r, state);
        return (
          <BloomLink
            key={r}
            to={r}
            ref={el => { refs.current[r] = el; }}
            className={`${locked ? 'locked' : ''}${nudge === r ? ' nudge' : ''}` || undefined}
            aria-current={navRoute === r ? 'page' : undefined}
            aria-disabled={locked || undefined}
            title={locked ? WAIT[r] : undefined}
            onClick={e => { if (locked) { e.preventDefault(); setNudge(null); requestAnimationFrame(() => setNudge(r)); } }}
            onAnimationEnd={() => setNudge(null)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[r]}</svg>
            {SHORT[r]}
          </BloomLink>
        );
      })}
    </nav>
  );
}
