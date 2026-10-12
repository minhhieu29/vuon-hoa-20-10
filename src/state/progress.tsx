import { createContext, useContext, useEffect, useMemo, useReducer, type Dispatch, type ReactNode } from 'react';
import { WISHES } from '../config';
import { BQ_MAX, BQ_MIN, FLOWER, type BouquetItem } from '../bouquet';
import { load, save } from '../lib/storage';

/** Những gì người xem đã làm: lưu lại để tải lại trang không mất. */
export interface Progress {
  wishes: boolean[];
  bouquet: BouquetItem[];
  wrapped: boolean;
  letterOpen: boolean;
  nextId: number;
}

export type ProgressAction =
  | { type: 'openWish'; i: number }
  | { type: 'addFlower'; item: BouquetItem }
  | { type: 'removeFlower'; id: number }
  | { type: 'wrap' }
  | { type: 'unwrap' }
  | { type: 'openLetter' }
  | { type: 'reset' };

const fresh = (): Progress => ({ wishes: WISHES.map(() => false), bouquet: [], wrapped: false, letterOpen: false, nextId: 1 });

const validItem = (it: unknown): it is BouquetItem => {
  const o = it as BouquetItem | null;
  return !!o && typeof o.id === 'number' && typeof o.k === 'string' && o.k in FLOWER && [o.hx, o.hy, o.ex, o.qx, o.qy, o.rot, o.sd].every(Number.isFinite);
};

function init(): Progress {
  const f = fresh();
  const s = load<Partial<Progress> | null>('progress', null);
  if (!s || typeof s !== 'object') return f;
  const bouquet = Array.isArray(s.bouquet) ? s.bouquet.filter(validItem).slice(0, BQ_MAX) : [];
  return {
    wishes: f.wishes.map((_, i) => Boolean(s.wishes?.[i])),
    bouquet,
    wrapped: Boolean(s.wrapped) && bouquet.length >= BQ_MIN,
    letterOpen: Boolean(s.letterOpen),
    nextId: bouquet.reduce((m, it) => Math.max(m, it.id), 0) + 1,
  };
}

function reducer(s: Progress, a: ProgressAction): Progress {
  switch (a.type) {
    case 'openWish':
      return s.wishes[a.i] ? s : { ...s, wishes: s.wishes.map((v, i) => v || i === a.i) };
    case 'addFlower':
      return s.wrapped || s.bouquet.length >= BQ_MAX ? s : { ...s, bouquet: [...s.bouquet, a.item], nextId: Math.max(s.nextId, a.item.id + 1) };
    case 'removeFlower':
      return s.wrapped ? s : { ...s, bouquet: s.bouquet.filter(it => it.id !== a.id) };
    case 'wrap':
      return s.bouquet.length < BQ_MIN ? s : { ...s, wrapped: true };
    case 'unwrap':
      return { ...s, wrapped: false, bouquet: [] };
    case 'openLetter':
      return s.letterOpen ? s : { ...s, letterOpen: true };
    case 'reset':
      return { ...fresh(), nextId: s.nextId };
  }
}

const Ctx = createContext<{ state: Progress; dispatch: Dispatch<ProgressAction> } | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, init);
  useEffect(() => { save('progress', state); }, [state]);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProgress() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useProgress cần nằm trong ProgressProvider');
  return v;
}
