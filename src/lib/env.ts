const mq = (q: string): boolean => typeof matchMedia !== 'undefined' && matchMedia(q).matches;

/** Người dùng bật "giảm chuyển động" trong hệ điều hành. */
export const reduceMotion = mq('(prefers-reduced-motion: reduce)');
/** Màn hình cảm ứng (điện thoại, máy tính bảng). */
export const coarse = mq('(pointer: coarse)');
