import { useEffect, useRef, type CSSProperties } from 'react';
import { COPY, WISHES, say } from '../config';
import { FLOWER, type BouquetItem } from '../bouquet';
import { confetti } from '../fx/confetti';
import { coarse, reduceMotion } from '../lib/env';
import { SCALE, Sound } from '../lib/sound';
import { Page } from '../components/Page';
import { cap } from '../recipient';
import { BloomLink, useNav } from '../state/nav';
import { useProgress } from '../state/progress';

const PETAL = 'M0-3C10-7 12-21 0-30-12-21-10-7 0-3Z';
const INNER = 'M0-3C6-6 7-14 0-20-7-14-6-6 0-3Z';
/** Các bông tự lật lần lượt: bông đầu đợi trang hiện xong, sau đó cứ một nhịp lại thêm một bông. */
const FIRST = reduceMotion ? 600 : 1700;
const STEP = reduceMotion ? 900 : 1500;
/** Thẻ đang nằm trong màn hình (chừa thanh điều hướng dưới đáy): bông khuất thì đợi cuộn tới mới mở, để không lỡ hiệu ứng. */
function inView(el: HTMLElement): boolean {
  if (!el.hasAttribute('data-shown')) return false;
  const r = el.getBoundingClientRect();
  return r.height > 0 && Math.min(r.bottom, innerHeight - 90) - Math.max(r.top, 0) >= r.height * 0.6;
}
const ARROW = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>;

/** Bông hoa ở mặt sau thẻ: cánh mở lần lượt khi thẻ lật (CSS). */
function Bloom() {
  return (
    <svg className="bloom" viewBox="-32 -32 64 64" aria-hidden="true">
      {[0, 1, 2, 3, 4].map(i => <g key={i} transform={`rotate(${i * 72})`}><path className="pt" style={{ '--i': i } as CSSProperties} d={PETAL} /></g>)}
      {[0, 1, 2, 3, 4].map(i => <g key={i} transform={`rotate(${36 + i * 72})`}><path className="pt2" style={{ '--i': i } as CSSProperties} d={INNER} /></g>)}
      <circle className="core" r="7" />
      <circle cx="-2.4" cy="-2.4" r="2.2" fill="#fff" fillOpacity=".55" />
    </svg>
  );
}

/** Mỗi bông trong bó hoa vừa gói là một thẻ, tự lật dần ra lời chúc bông đó mang theo (chạm vào thì mở ngay). */
export default function WishesPage() {
  const { state, dispatch } = useProgress();
  const { garden, opened: giftOpen } = useNav();
  const doneRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const items = state.wrapped ? state.bouquet : [];
  const opened = new Set(state.opened);
  const n = items.length;
  const left = items.filter(it => !opened.has(it.id)).length;
  const all = n > 0 && left === 0;

  const open = (it: BouquetItem, i: number, el: HTMLElement) => {
    if (opened.has(it.id)) return;
    const f = FLOWER[it.k];
    dispatch({ type: 'openWish', id: it.id });
    Sound.pluck(SCALE[(i * 2) % SCALE.length]);
    const r = el.getBoundingClientRect();
    confetti.burst(r.left + r.width / 2, r.top + r.height / 2, 16, f.color);
    /* mỗi lời chúc mở ra là hai bông cùng loài nở thêm trong vườn */
    const mini = { color: f.mini.color, type: f.mini.type, center: f.mini.center };
    garden?.bloomSpecial([mini, mini]);
    if (left === 1) {
      timers.current.push(window.setTimeout(() => { confetti.rain(); Sound.chime(); }, 450));
      /* nút sang lá thư hiện dưới lưới thẻ: kéo lên cho thấy, chừa chỗ cho thanh điều hướng */
      timers.current.push(window.setTimeout(() => {
        const b = doneRef.current?.getBoundingClientRect();
        const limit = innerHeight - 100;
        if (b && b.bottom > limit) window.scrollBy({ top: b.bottom - limit, behavior: reduceMotion ? 'auto' : 'smooth' });
      }, 1200));
    }
  };

  /* tự mở bông kế tiếp đang thấy trên màn hình; chưa thấy bông nào thì đợi người xem cuộn tới */
  useEffect(() => {
    if (!giftOpen || !left) return;
    let id = 0;
    const tick = () => {
      const cards = [...(gridRef.current?.querySelectorAll<HTMLElement>('.wish-card') ?? [])];
      const i = document.hidden ? -1 : items.findIndex((it, k) => !opened.has(it.id) && cards[k] && inView(cards[k]));
      if (i >= 0) open(items[i], i, cards[i]);
      else id = window.setTimeout(tick, 400);
    };
    id = window.setTimeout(tick, left === n ? FIRST : STEP);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hẹn lại sau mỗi bông mở (tự mở hay người xem chạm)
  }, [giftOpen, state.opened.length, n]);

  if (!n) {
    return (
      <Page id="loi-chuc" labelledBy="h-loi-chuc" className="section">
        <div className="wrap wish-empty">
          <h2 id="h-loi-chuc" className="h" tabIndex={-1} data-h data-reveal>Lời chúc nằm trong từng bông hoa</h2>
          <p className="sub" data-reveal>Chọn hoa cho mình trước đã, mỗi bông sẽ mang theo một lời chúc.</p>
          <div data-reveal><BloomLink to="bo-hoa" className="btn-primary">Chọn hoa {ARROW}</BloomLink></div>
        </div>
      </Page>
    );
  }

  return (
    <Page id="loi-chuc" labelledBy="h-loi-chuc" className="section">
      <div className="wrap">
        <div className="sec-head" data-reveal>
          <div className="copy">
            <p className="kicker">{cap(say(n))} bông hoa, {say(n)} lời chúc</p>
            <h2 id="h-loi-chuc" className="h" tabIndex={-1} data-h>Mỗi bông một lời chúc</h2>
            <p className="sub">Đây là những bông {COPY.you} vừa chọn. Từng bông sẽ lần lượt mở ra, mỗi bông một lời chúc; muốn đọc trước thì {coarse ? 'chạm' : 'bấm'} vào bông đó. Bông nào mở, khu vườn lại nở thêm hoa cùng loài.</p>
          </div>
        </div>
        <div ref={gridRef} className="wish-grid">
          {items.map((it, i) => {
            const f = FLOWER[it.k], isOpen = opened.has(it.id);
            return (
              <button
                key={it.id}
                type="button"
                className={`wish-card${isOpen ? ' open' : ''}`}
                aria-expanded={isOpen}
                style={{ '--c': f.color, ...(f.mini.center ? { '--cc': f.mini.center } : {}) } as CSSProperties}
                onClick={e => open(it, i, e.currentTarget)}
                data-reveal
              >
                <span className="wc-inner">
                  <span className="face front" aria-hidden={isOpen}>
                    <span className="bud-ico"><svg viewBox={f.vb} aria-hidden="true" dangerouslySetInnerHTML={{ __html: f.svg }} /></span>
                    <span className="wc-name">{f.name}</span>
                    <span className="tap"><span className="sr">Bông thứ {i + 1}. </span>{coarse ? 'Chạm' : 'Bấm'} để mở</span>
                  </span>
                  <span className="face back" aria-hidden={!isOpen}>
                    <Bloom />
                    <span className="wc-title">{f.name}</span>
                    <span className="wc-text">{WISHES[it.k][it.w].split(' ').map((w, k) => <span key={k} className="w" style={{ '--k': k } as CSSProperties}>{w} </span>)}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        {all ? (
          <div ref={doneRef} className="wish-done">
            <p>Cả {say(n)} bông đã nở. Còn một lá thư nhỏ đang đợi {COPY.you}.</p>
            <BloomLink to="thiep" className="btn-primary">Mở lá thư {ARROW}</BloomLink>
          </div>
        ) : (
          <p className="wish-left" aria-live="polite">{left === n ? 'Các bông đang lần lượt mở…' : `Còn ${say(left)} bông chưa mở.`}</p>
        )}
      </div>
    </Page>
  );
}
