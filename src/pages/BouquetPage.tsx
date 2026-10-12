import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { BOUQUET, BQ_MAX, BQ_MIN, FLOWER, TIE, placeFlower, type BouquetItem, type FlowerKey } from '../bouquet';
import { confetti } from '../fx/confetti';
import { bz, bzd } from '../lib/math';
import { coarse, reduceMotion } from '../lib/env';
import { shareGift } from '../lib/share';
import { Sound } from '../lib/sound';
import { Page } from '../components/Page';
import { NextLink } from '../components/NextLink';
import { BloomLink, useNav } from '../state/nav';
import { COPY } from '../config';
import { useProgress } from '../state/progress';

/** Mấy cành lá bạch đàn làm nền cho bó hoa (tính một lần). */
function greensMarkup(): string {
  const br = [[150, 300, 74, 206], [252, 300, 328, 204], [184, 280, 166, 122], [218, 282, 240, 132]];
  let html = '';
  for (const [qx, qy, x2, y2] of br) {
    html += `<path d="M${TIE[0]} ${TIE[1]}Q${qx} ${qy} ${x2} ${y2}" fill="none" stroke="#2FB57E" stroke-width="2.2" stroke-linecap="round"/>`;
    for (let i = 0; i < 7; i++) {
      const t = 0.32 + i * 0.11, sd = i % 2 ? 1 : -1;
      const x = bz(TIE[0], qx, x2, t), y = bz(TIE[1], qy, y2, t);
      const a = Math.atan2(bzd(TIE[1], qy, y2, t), bzd(TIE[0], qx, x2, t)) + sd * 0.9;
      const lx = x + Math.cos(a) * 7, ly = y + Math.sin(a) * 7;
      html += `<ellipse cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" rx="9" ry="5.6" transform="rotate(${((a * 180) / Math.PI).toFixed(1)} ${lx.toFixed(1)} ${ly.toFixed(1)})" fill="${i % 2 ? '#2BC48A' : '#45D9A0'}" opacity=".92"/>`;
    }
  }
  return html;
}

export default function BouquetPage() {
  const { state, dispatch } = useProgress();
  const { garden } = useNav();
  const greens = useMemo(() => greensMarkup(), []);
  const [leaving, setLeaving] = useState<ReadonlySet<number>>(new Set());
  const [note, setNote] = useState<ReactNode>('Mỗi loài hoa mang một ý nghĩa riêng.');
  const [shareNote, setShareNote] = useState('');
  const stageRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };

  const { wrapped } = state;
  const items = state.bouquet;
  const active = items.filter(it => !leaving.has(it.id));
  const n = active.length;
  const sorted = useMemo(() => [...items].sort((a, b) => a.hy - b.hy), [items]);

  const add = (k: FlowerKey) => {
    if (wrapped || n >= BQ_MAX) return;
    const item = placeFlower(k, active, state.nextId);
    if (!item) return;
    dispatch({ type: 'addFlower', item });
    Sound.pluck(FLOWER[k].note);
    setNote(<>Vừa thêm <b>{FLOWER[k].name}</b>: {FLOWER[k].meaning}.</>);
    later(() => {
      const el = stageRef.current?.querySelector(`[data-id="${item.id}"]`);
      if (!el) return;
      const r = el.getBoundingClientRect();
      confetti.burst(r.left + r.width / 2, r.top + r.height / 2, 8, FLOWER[k].color);
    }, 560);
  };

  const remove = (it: BouquetItem) => {
    if (wrapped || leaving.has(it.id)) return;
    setLeaving(s => new Set(s).add(it.id));
    Sound.pluck(67);
    setNote(<>Đã bỏ <b>{FLOWER[it.k].name}</b> ra khỏi bó.</>);
    later(() => {
      dispatch({ type: 'removeFlower', id: it.id });
      setLeaving(s => { const m = new Set(s); m.delete(it.id); return m; });
    }, reduceMotion ? 0 : 360);
  };

  const wrap = () => {
    if (wrapped || n < BQ_MIN) return;
    dispatch({ type: 'wrap' });
    Sound.chime();
    setNote('');
    /* bó hoa gói xong thì vườn nở thêm vài bông đúng loài đã chọn */
    garden?.bloomSpecial(active.slice(0, 4).map(it => ({ color: FLOWER[it.k].mini.color, type: FLOWER[it.k].mini.type, center: FLOWER[it.k].mini.center })));
    later(() => {
      const r = stageRef.current?.getBoundingClientRect();
      if (r) confetti.burst(r.left + r.width / 2, r.top + (r.height * TIE[1]) / 500, 26);
    }, 650);
  };

  const again = () => { dispatch({ type: 'unwrap' }); setNote('Mỗi loài hoa mang một ý nghĩa riêng.'); };

  const full = !wrapped && n >= BQ_MAX;
  const label = n ? `Bó hoa ${n} bông: ${active.map(it => FLOWER[it.k].name).join(', ')}` : 'Bó hoa đang trống';

  return (
    <Page id="bo-hoa" labelledBy="h-bo-hoa" className="section">
      <div className="wrap">
        <div className="sec-head" data-reveal>
          <div className="copy">
            <p className="kicker">Món quà cho chính mình</p>
            <h2 id="h-bo-hoa" className="h" tabIndex={-1} data-h>Chọn hoa cho mình</h2>
            <p className="sub">Hôm nay {COPY.you} không cần chiều lòng ai. Chọn những loài hoa {COPY.you} thích, một bông hay cả bó đều được, rồi gói lại cho riêng mình.</p>
          </div>
        </div>
        <div className="bq">
          <div ref={stageRef} className={`bq-stage${n ? ' has' : ''}${wrapped ? ' wrapped' : ''}`} data-reveal>
            <svg viewBox="0 0 400 500" role="img" aria-label={label}>
              <g className="bq-all">
                <g className="bq-paper-back">
                  <path d="M200 412 40 178C84 132 146 114 200 122 254 114 316 132 360 178Z" fill="#CDB8F2" />
                  <path d="M200 412 80 166C126 142 166 136 200 140 234 136 274 142 320 166Z" fill="#DDCEF8" />
                </g>
                <g className="bq-greens" dangerouslySetInnerHTML={{ __html: greens }} />
                <g>
                  {items.map(it => (
                    <path key={it.id} className={`bq-stem${leaving.has(it.id) ? ' bye' : ''}`} pathLength={1}
                      d={`M${it.ex.toFixed(1)} 486L${TIE[0]} ${TIE[1]}Q${it.qx.toFixed(1)} ${it.qy.toFixed(1)} ${it.hx.toFixed(1)} ${it.hy.toFixed(1)}`} />
                  ))}
                </g>
                <g>
                  {sorted.map(it => (
                    <g key={it.id} data-id={it.id} className={`bq-head${leaving.has(it.id) ? ' bye' : ''}`}
                      transform={`translate(${it.hx.toFixed(1)} ${it.hy.toFixed(1)}) rotate(${it.rot.toFixed(1)}) scale(1.32)`}
                      onClick={() => remove(it)}>
                      <g className="bq-pop">
                        <g className="bq-sway" style={{ '--sd': `${it.sd.toFixed(2)}s` } as CSSProperties} dangerouslySetInnerHTML={{ __html: FLOWER[it.k].svg }} />
                      </g>
                    </g>
                  ))}
                </g>
                <g className="bq-paper-front">
                  <path d="M96 276Q200 318 304 276L232 404 246 478H154L168 404Z" fill="#E6DAFB" />
                  <path d="M96 276Q148 300 200 306V404H168Z" fill="#F4EEFF" />
                  <path d="M304 276Q252 300 200 306V404H232Z" fill="#D3C1F5" />
                  <path d="M96 276Q200 318 304 276" fill="none" stroke="#FFFFFF" strokeOpacity=".75" strokeWidth="2" />
                </g>
                <g className="bq-twine"><rect x="184" y="396" width="32" height="15" rx="5" fill="#D8B48A" /><path d="M187 403.5h26" stroke="#B88E62" strokeWidth="1.5" /></g>
                <g className="bq-ribbon">
                  <rect x="163" y="395" width="74" height="18" rx="7" fill="#FF5FA2" />
                  <path d="M196 410 178 452 189 447 193 458 203 412Z" fill="#C9346F" />
                  <path d="M204 410 222 452 211 447 207 458 197 412Z" fill="#D93A73" />
                  <path d="M200 404C176 378 146 384 152 404 157 420 182 415 200 404Z" fill="#E2457F" />
                  <path d="M200 404C224 378 254 384 248 404 243 420 218 415 200 404Z" fill="#E2457F" />
                  <path d="M190 398c-9-8-21-10-27-5M210 398c9-8 21-10 27-5" fill="none" stroke="#FF8FC0" strokeWidth="2.4" strokeLinecap="round" />
                  <circle cx="200" cy="404" r="8.5" fill="#FF7DB5" />
                </g>
              </g>
            </svg>
            <p className="bq-hint">{n ? `${coarse ? 'Chạm' : 'Bấm'} vào một bông trong bó để bỏ ra.` : 'Bó hoa đang trống, chọn một bông bên cạnh nhé.'}</p>
          </div>
          <div className="bq-panel">
            <div className="bq-palette" role="group" aria-label="Các loài hoa" data-reveal>
              {BOUQUET.map(f => (
                <button key={f.key} className="bq-pick" type="button" disabled={wrapped || n >= BQ_MAX} onClick={() => add(f.key)}>
                  <svg viewBox={f.vb} aria-hidden="true" dangerouslySetInnerHTML={{ __html: f.svg }} />
                  <b>{f.name}</b>
                  <small>{f.meaning}</small>
                </button>
              ))}
            </div>
            <p className="bq-note" aria-live="polite">{full ? 'Bó hoa đã đầy tay rồi.' : note}</p>
            {wrapped ? (
              <div className="bq-done">
                <p>Bó hoa này là của {COPY.you}. Những loài {COPY.you} chọn sẽ mọc trên tấm thiệp cuối.</p>
                <div className="bq-actions">
                  <BloomLink to="thiep" className="btn-primary">Đọc thư</BloomLink>
                  <button className="btn-ghost" type="button" onClick={() => { void shareGift().then(setShareNote); }}>Gửi tặng một người phụ nữ khác</button>
                  <button className="btn-quiet" type="button" onClick={again}>Gói bó khác</button>
                </div>
                {shareNote && <p className="share-note" aria-live="polite">{shareNote}</p>}
              </div>
            ) : (
              <div className="bq-actions">
                <button className="btn-primary" type="button" disabled={n < BQ_MIN} onClick={wrap}>Gói bó hoa</button>
                <button className="btn-ghost" type="button" disabled={!n} onClick={() => { const last = active[active.length - 1]; if (last) remove(last); }}>Bỏ bông vừa thêm</button>
              </div>
            )}
          </div>
        </div>
        <NextLink to="thiep">Lá thư cuối</NextLink>
      </div>
    </Page>
  );
}
