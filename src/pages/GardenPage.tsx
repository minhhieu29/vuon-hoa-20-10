import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { COPY, DATE_TEXT, say } from '../config';
import { BQ_SIZE } from '../bouquet';
import { CAPACITY } from '../garden/plan';
import { Page } from '../components/Page';
import { BloomLink, useNav } from '../state/nav';
import { useProgress } from '../state/progress';
import { frontier } from '../state/steps';

export default function GardenPage() {
  const { garden } = useNav();
  const { state } = useProgress();
  /* nút chính dẫn tới bước đang làm dở */
  const next = frontier(state);
  const cta = next === 'thiep' ? (state.letterOpen ? 'Xem lá thư' : 'Mở lá thư')
    : next === 'loi-chuc' ? 'Xem lời chúc'
    : state.bouquet.length ? 'Tiếp tục chọn hoa' : `Chọn ${say(BQ_SIZE)} bông hoa`;
  const slotRef = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(() => (garden?.stats.count ?? 0) >= CAPACITY);

  useEffect(() => garden?.onChange(s => setFull(s.count >= s.capacity)), [garden]);

  /* báo cho khu vườn biết khung chữ hạt sáng nằm ở đâu */
  useLayoutEffect(() => {
    const el = slotRef.current;
    if (!el || !garden) return;
    const update = () => { const r = el.getBoundingClientRect(); garden.setTextRect({ x: r.left, y: r.top, w: r.width, h: r.height }); };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { ro.disconnect(); garden.setTextRect(null); };
  }, [garden]);

  return (
    <Page id="vuon" labelledBy="heroTitle" className="hero">
      <div className="hero-inner">
        <p className="eyebrow" data-reveal>Ngày Phụ nữ Việt Nam · {DATE_TEXT}</p>
        <div ref={slotRef} className="slot" aria-hidden="true" />
        <h1 id="heroTitle" className="title" tabIndex={-1} data-h data-reveal>
          Một khu vườn nở để <span className="name">cảm ơn {COPY.addr}</span>
        </h1>
        <p className="lede" data-reveal>{full ? COPY.heroFull : COPY.heroLead}</p>
        <div className="chips" data-reveal>
          <BloomLink to={next} className="chip go">
            {cta}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
          </BloomLink>
        </div>
      </div>
    </Page>
  );
}
