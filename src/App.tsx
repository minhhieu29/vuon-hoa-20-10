import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { flushSync } from 'react-dom';
import { GardenLayer } from './components/GardenLayer';
import { Intro } from './components/Intro';
import { TopBar } from './components/TopBar';
import { Dock } from './components/Dock';
import { confetti } from './fx/confetti';
import { veil } from './fx/veil';
import type { GardenEngine } from './garden/engine';
import { Sound } from './lib/sound';
import type { Pt } from './lib/math';
import { ROUTES, TITLES, hrefOf, parseHash, type Route } from './router';
import { NavCtx, type NavApi } from './state/nav';
import { ProgressProvider, useProgress } from './state/progress';
import GardenPage from './pages/GardenPage';
import WishesPage from './pages/WishesPage';
import BouquetPage from './pages/BouquetPage';
import CardPage from './pages/CardPage';

const PAGES: Record<Route, ComponentType> = { vuon: GardenPage, 'loi-chuc': WishesPage, 'bo-hoa': BouquetPage, thiep: CardPage };

function navOrigin(to: Route): Pt {
  const a = document.querySelector<HTMLElement>(`.dock a[href="${hrefOf(to)}"]`);
  const r = a?.getBoundingClientRect();
  return r && r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: innerWidth / 2, y: innerHeight / 2 };
}
function focusHeading() {
  document.querySelector<HTMLElement>('main [data-h]')?.focus({ preventScroll: true });
}

function Shell() {
  const { dispatch } = useProgress();
  const [route, setRoute] = useState<Route>(() => parseHash());
  const [navRoute, setNavRoute] = useState<Route>(route);
  const [opened, setOpened] = useState(false);
  const [introOn, setIntroOn] = useState(true);
  const [introFocus, setIntroFocus] = useState(false);
  const [revealBase, setRevealBase] = useState(0.75);
  const [garden, setGarden] = useState<GardenEngine | null>(null);

  /* giá trị mới nhất cho các hàm gọi bất đồng bộ (chuyển trang, phím tắt) */
  const live = useRef({ route, opened, busy: false, queued: null as Route | null, garden: null as GardenEngine | null });
  useEffect(() => { live.current.route = route; live.current.opened = opened; live.current.garden = garden; }, [route, opened, garden]);

  /** Chuyển trang: hoa nở phủ màn hình → đổi trang khi bị che → hoa mở ra để lộ trang mới. */
  const go = useCallback(function go(to: Route, origin?: Pt) {
    const L = live.current;
    if (!L.opened) return;
    if (L.busy) { L.queued = to; return; }
    if (to === L.route) return;
    /* đi bằng nút Back/Forward thì địa chỉ đã đúng trang: không đẩy thêm mục lịch sử */
    if (parseHash() !== to) history.pushState(null, '', hrefOf(to));
    else if (location.hash && location.hash !== hrefOf(to)) history.replaceState(null, '', hrefOf(to));
    L.busy = true;
    setNavRoute(to);
    Sound.swish();
    void (async () => {
      try {
        await veil.cover(origin ?? navOrigin(to), TITLES[to], ROUTES.indexOf(to), ROUTES.length);
        window.scrollTo(0, 0);
        flushSync(() => { setRevealBase(0.3); setRoute(to); });
        L.route = to;
        focusHeading();
        await veil.reveal();
      } finally {
        L.busy = false;
      }
      const q = L.queued; L.queued = null;
      if (q && q !== L.route) go(q);
    })();
  }, []);

  const openGift = useCallback((origin: Pt | null, music: boolean) => {
    const L = live.current;
    if (L.opened) return;
    L.opened = true;
    setOpened(true);
    try { if (music) { Sound.start(); Sound.chime(); } else Sound.stop(); } catch { /* không có âm thanh vẫn chạy tiếp */ }
    L.garden?.wake(L.route === 'vuon' && origin ? origin : undefined);
    window.setTimeout(() => { setIntroOn(false); if (!L.busy) focusHeading(); }, 1500);
  }, []);

  const restart = useCallback(() => {
    const L = live.current;
    if (L.busy) return;
    dispatch({ type: 'reset' });
    L.garden?.sleep();
    history.replaceState(null, '', location.pathname + location.search);
    window.scrollTo(0, 0);
    flushSync(() => { setRoute('vuon'); setNavRoute('vuon'); setRevealBase(0.75); setIntroOn(true); setIntroFocus(true); setOpened(false); });
    L.route = 'vuon'; L.opened = false;
  }, [dispatch]);

  /* nút Back/Forward hoặc sửa địa chỉ */
  useEffect(() => {
    const onHistory = () => {
      const r = parseHash(), L = live.current;
      if (L.opened) go(r);
      else if (r !== L.route) { setRoute(r); setNavRoute(r); L.route = r; }
    };
    window.addEventListener('popstate', onHistory);
    window.addEventListener('hashchange', onHistory);
    if (location.hash && location.hash !== hrefOf(parseHash())) history.replaceState(null, '', hrefOf(parseHash()));
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    return () => { window.removeEventListener('popstate', onHistory); window.removeEventListener('hashchange', onHistory); };
  }, [go]);

  /* phím ← → và vuốt ngang để sang trang */
  useEffect(() => {
    const step = (d: number) => {
      const i = ROUTES.indexOf(live.current.route) + d;
      if (i >= 0 && i < ROUTES.length) go(ROUTES[i], navOrigin(ROUTES[i]));
    };
    const onKey = (e: KeyboardEvent) => {
      if (!live.current.opened || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if ((e.target as HTMLElement | null)?.closest?.('input, textarea, select, [contenteditable]')) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); step(e.key === 'ArrowRight' ? 1 : -1); }
    };
    let x0 = 0, y0 = 0, t0 = 0, ok = false;
    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      ok = e.touches.length === 1 && t.clientX > 24 && t.clientX < innerWidth - 24 && !(e.target as HTMLElement).closest?.('.bq-stage');
      x0 = t.clientX; y0 = t.clientY; t0 = performance.now();
    };
    const onEnd = (e: TouchEvent) => {
      if (!ok || !live.current.opened) return;
      ok = false;
      const t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0;
      if (performance.now() - t0 > 700 || Math.abs(dx) < 80 || Math.abs(dx) < Math.abs(dy) * 2) return;
      step(dx < 0 ? 1 : -1);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchend', onEnd);
    };
  }, [go]);

  useEffect(() => { document.title = `${TITLES[route]} · Vườn Hoa 20.10`; }, [route]);
  useEffect(() => { document.documentElement.classList.toggle('lock', !opened); }, [opened]);
  useEffect(() => {
    const onVis = () => { if (document.hidden) Sound.suspend(); else Sound.resume(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const api = useMemo<NavApi>(() => ({ route, navRoute, opened, revealBase, garden, go, restart }), [route, navRoute, opened, revealBase, garden, go, restart]);
  const PageView = PAGES[route];

  return (
    <NavCtx.Provider value={api}>
      <GardenLayer mode={route === 'vuon' ? 'hero' : 'ambient'} onReady={setGarden} />
      <TopBar inert={!opened} />
      <main id="main" inert={!opened}>
        <PageView key={route} />
      </main>
      <Dock inert={!opened} />
      {introOn && <Intro hiding={opened} focusOnShow={introFocus} onOpen={openGift} />}
      <canvas className="veil" aria-hidden="true" ref={el => { veil.attach(el); }} />
      <canvas className="confetti" aria-hidden="true" ref={el => { confetti.attach(el); }} />
    </NavCtx.Provider>
  );
}

export default function App() {
  return (
    <ProgressProvider>
      <Shell />
    </ProgressProvider>
  );
}
