export const C = {
  pink: '#FF5FA2',
  peach: '#FF8A80',
  sun: '#FFD36E',
  lilac: '#C69CFF',
  mint: '#6EF0C8',
  sky: '#8FD3FF',
  white: '#FFF4F8',
} as const;

export const WHITE = '#FFFFFF';
export const NIGHT = '#0B0820';
/** Màu lẫn vào hoa ở xa cho có chiều sâu. */
export const HAZE = '#140C2E';

export const FLOWER_COLS: readonly string[] = [C.pink, C.peach, C.sun, C.lilac, C.white, C.pink, C.lilac, C.peach, C.sky];
export const LAV_COLS: readonly string[] = [C.lilac, '#B48CFF', '#D9B8FF'];
export const TEXT_COLS: readonly string[] = [C.pink, C.peach, C.sun, C.lilac];

/** Kiểu hoa: 0 cúc nhiều cánh, 1 hoa 5-6 cánh, 2 hoa nhiều lớp, 3 tulip, 4 oải hương, 5 sen. */
export type FlowerType = 0 | 1 | 2 | 3 | 4 | 5;
/** Cúc họa mi (cúc trắng) và sen nhiều hơn một chút: hoa của mùa thu và của Việt Nam. */
export const TYPE_BAG: readonly FlowerType[] = [0, 0, 0, 1, 1, 2, 2, 3, 4, 5, 5];
export const LOTUS_COLS: readonly string[] = ['#FF8FB8', '#FFB3CF', '#FFF4F8'];
/** Lá vàng mùa thu bay ngang vườn. */
export const AUTUMN_COLS: readonly string[] = ['#E8B04B', '#D98C3A', '#F2C46D', '#C9773A'];
