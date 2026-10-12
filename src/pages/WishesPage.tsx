import type { CSSProperties } from 'react';
import { COPY, WISHES } from '../config';
import { confetti } from '../fx/confetti';
import { SCALE, Sound } from '../lib/sound';
import { Page } from '../components/Page';
import { NextLink } from '../components/NextLink';
import { BloomLink, useNav } from '../state/nav';
import { useProgress } from '../state/progress';

const BUD = (
  <svg viewBox="0 0 64 64" aria-hidden="true">
    <path d="M32 63V37" fill="none" stroke="#3DDC97" strokeWidth="3" strokeLinecap="round" />
    <path d="M32 54c-8 0-13-5-14-11 7 0 12 4 14 11z" fill="#2BC48A" />
    <path d="M32 9c11 8 14 21 0 29C18 30 21 17 32 9z" fill="currentColor" />
    <path d="M32 9c5 9 5 20 0 29" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth="2" />
    <path d="M32 40c-6-1-10-5-11-9 5 2 8 4 11 5 3-1 6-3 11-5-1 4-5 8-11 9z" fill="#2BC48A" />
  </svg>
);
const PETAL = 'M0-3C10-7 12-21 0-30-12-21-10-7 0-3Z';
const INNER = 'M0-3C6-6 7-14 0-20-7-14-6-6 0-3Z';

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

export default function WishesPage() {
  const { state, dispatch } = useProgress();
  const { garden } = useNav();
  const opened = state.wishes.filter(Boolean).length;
  const all = opened === WISHES.length;

  const open = (i: number, el: HTMLElement) => {
    if (state.wishes[i]) return;
    dispatch({ type: 'openWish', i });
    Sound.pluck(SCALE[(i * 2) % SCALE.length]);
    const r = el.getBoundingClientRect();
    confetti.burst(r.left + r.width / 2, r.top + r.height / 2, 16, WISHES[i].color);
    /* mỗi lời chúc mở ra là hai bông cùng màu nở thêm trong vườn */
    garden?.bloomSpecial([{ color: WISHES[i].color, center: WISHES[i].center }, { color: WISHES[i].color, center: WISHES[i].center }]);
    if (opened + 1 === WISHES.length) setTimeout(() => { confetti.rain(); Sound.chime(); }, 450);
  };

  return (
    <Page id="loi-chuc" labelledBy="h-loi-chuc" className="section">
      <div className="wrap">
        <div className="sec-head" data-reveal>
          <div className="copy">
            <p className="kicker">Sáu nụ hoa, sáu lời chúc</p>
            <h2 id="h-loi-chuc" className="h" tabIndex={-1} data-h>Hái một nụ, nhận một lời chúc</h2>
            <p className="sub">Mỗi nụ hoa cất một lời chúc dành cho {COPY.you}. Mở nụ nào cũng được, mở bao nhiêu tùy {COPY.you}; nụ nào mở ra, khu vườn nở thêm hoa màu ấy.</p>
          </div>
        </div>
        <div className="wish-grid">
          {WISHES.map((w, i) => {
            const isOpen = state.wishes[i];
            return (
              <button
                key={i}
                type="button"
                className={`wish-card${isOpen ? ' open' : ''}`}
                aria-expanded={isOpen}
                style={{ '--c': w.color, ...(w.center ? { '--cc': w.center } : {}) } as CSSProperties}
                onClick={e => open(i, e.currentTarget)}
                data-reveal
              >
                <span className="wc-inner">
                  <span className="face front" aria-hidden={isOpen}>
                    <span className="bud-ico">{BUD}</span>
                    <span className="tap"><span className="sr">Nụ hoa số {i + 1}. </span>Chạm để mở</span>
                  </span>
                  <span className="face back" aria-hidden={!isOpen}>
                    <Bloom />
                    <span className="wc-title">{w.title}</span>
                    <span className="wc-text">{w.text}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        {all && (
          <div className="all-done">
            <p>Cả sáu nụ đã nở. Mong năm tới đối xử thật dịu dàng với {COPY.you}.</p>
            <BloomLink to="bo-hoa" className="btn-primary">Chọn hoa cho mình</BloomLink>
          </div>
        )}
        <NextLink to="bo-hoa">Chọn hoa cho mình</NextLink>
      </div>
    </Page>
  );
}
