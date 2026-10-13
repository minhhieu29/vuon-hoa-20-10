import { createContext, useContext, useEffect, useMemo, useReducer, type Dispatch, type ReactNode } from 'react';
import { WISHES } from '../config';
import { BQ_SIZE, FLOWER, type BouquetItem } from '../bouquet';
import { load, save } from '../lib/storage';

/** Những gì người xem đã làm: lưu lại để tải lại trang không mất. */
export interface Progress {
  bouquet: BouquetItem[];
  wrapped: boolean;
  /** id các bông trong bó đã mở lời chúc */
  opened: number[];
  letterOpen: boolean;
  nextId: number;
}

export type ProgressAction =
  | { type: 'openWish'; id: number }
  | { type: 'addFlower'; item: BouquetItem }
  | { type: 'removeFlower'; id: number }
  | { type: 'wrap' }
  | { type: 'openLetter' };

/* đổi tên khóa khi đổi cấu trúc: dữ liệu của bản cũ (sáu nụ cố định) không còn khớp */
const KEY = 'progress-v2';

const fresh = (): Progress => ({ bouquet: [], wrapped: false, opened: [], letterOpen: false, nextId: 1 });

const validItem = (it: unknown): it is BouquetItem => {
  const o = it as BouquetItem | null;
  return !!o && typeof o.id === 'number' && typeof o.k === 'string' && o.k in FLOWER && Number.isInteger(o.w) && o.w >= 0 && o.w < WISHES[o.k].length
    && [o.hx, o.hy, o.ex, o.qx, o.qy, o.rot, o.sd].every(Number.isFinite);
};

function init(): Progress {
  const f = fresh();
  const s = load<Partial<Progress> | null>(KEY, null);
  if (!s || typeof s !== 'object') return f;
  const bouquet = Array.isArray(s.bouquet) ? s.bouquet.filter(validItem).slice(0, BQ_SIZE) : [];
  const wrapped = Boolean(s.wrapped) && bouquet.length === BQ_SIZE;
  const ids = new Set(bouquet.map(it => it.id));
  return {
    bouquet,
    wrapped,
    opened: wrapped && Array.isArray(s.opened) ? s.opened.filter(id => ids.has(id)) : [],
    letterOpen: Boolean(s.letterOpen),
    nextId: bouquet.reduce((m, it) => Math.max(m, it.id), 0) + 1,
  };
}

function reducer(s: Progress, a: ProgressAction): Progress {
  switch (a.type) {
    case 'openWish':
      return !s.wrapped || s.opened.includes(a.id) ? s : { ...s, opened: [...s.opened, a.id] };
    case 'addFlower':
      return s.wrapped || s.bouquet.length >= BQ_SIZE ? s : { ...s, bouquet: [...s.bouquet, a.item], nextId: Math.max(s.nextId, a.item.id + 1) };
    case 'removeFlower':
      return s.wrapped ? s : { ...s, bouquet: s.bouquet.filter(it => it.id !== a.id) };
    case 'wrap':
      return s.bouquet.length < BQ_SIZE ? s : { ...s, wrapped: true };
    case 'openLetter':
      return s.letterOpen ? s : { ...s, letterOpen: true };
  }
}

const Ctx = createContext<{ state: Progress; dispatch: Dispatch<ProgressAction> } | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, init);
  useEffect(() => { save(KEY, state); }, [state]);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProgress() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useProgress cần nằm trong ProgressProvider');
  return v;
}
