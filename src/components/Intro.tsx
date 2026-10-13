import { useEffect, useRef } from 'react';
import { COPY, TO } from '../config';
import type { Pt } from '../lib/math';

interface Props { hiding: boolean; onOpen: (origin: Pt | null, music: boolean) => void }

/** Màn mở quà: một nụ hoa, bấm vào thì nụ nở ra và khu vườn hiện lên. Có lựa chọn mở không nhạc (đang ở chỗ đông người). */
export function Intro({ hiding, onOpen }: Props) {
  const budRef = useRef<HTMLDivElement>(null);

  const open = (music = true) => {
    const r = budRef.current?.getBoundingClientRect();
    onOpen(r && r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null, music);
  };

  /* nhấn Enter ở đâu cũng mở quà */
  useEffect(() => {
    if (hiding) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || (document.activeElement as HTMLElement | null)?.closest('button')) return;
      e.preventDefault();
      const r = budRef.current?.getBoundingClientRect();
      onOpen(r && r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null, true);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [hiding, onOpen]);

  return (
    <div id="intro" className={hiding ? 'hide' : ''} role="dialog" aria-modal="true" aria-labelledby="gateTitle" aria-hidden={hiding || undefined}>
      <div className="gate">
        <div ref={budRef} className="bud" aria-hidden="true" onClick={() => open()}>
          <svg viewBox="0 0 100 100">
            <path d="M50 99C48 84 52 74 50 63" fill="none" stroke="#3DDC97" strokeWidth="4" strokeLinecap="round" />
            <path d="M50 82c-10 0-18-6-20-14 10 0 17 5 20 14z" fill="#2BC48A" />
            <path d="M50 87c10 0 18-6 20-14-10 0-17 5-20 14z" fill="#3DDC97" />
            <circle className="bud-core" cx="50" cy="38" r="9" fill="#FFD36E" />
            <g className="bp bp-c"><path d="M50 17c9 12 10 30 0 46-10-16-9-34 0-46z" fill="#FF8FC0" /></g>
            <g className="bp bp-l"><path d="M50 63C29 52 30 29 46 16c-3 17-1 33 4 47z" fill="#FF5FA2" /></g>
            <g className="bp bp-r"><path d="M50 63C71 52 70 29 54 16c3 17 1 33-4 47z" fill="#FF5FA2" /></g>
            <path d="M50 65c-9-2-14-7-16-13 7 3 12 5 16 6 4-1 9-3 16-6-2 6-7 11-16 13z" fill="#2BC48A" />
          </svg>
        </div>
        {TO && <p className="to-name">{TO}</p>}
        <h2 id="gateTitle">{COPY.gate}</h2>
        <button className="btn-primary" type="button" onClick={() => open()}>Mở quà</button>
        <p className="note">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></svg>
          Có nhạc nhẹ đi kèm
          <span aria-hidden="true">·</span>
          <button className="quiet" type="button" onClick={() => open(false)}>Mở trong im lặng</button>
        </p>
      </div>
    </div>
  );
}
