import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { reduceMotion } from '../lib/env';
import { useNav } from '../state/nav';

interface Props { id: string; labelledBy: string; className?: string; children: ReactNode }

/**
 * Khung một trang. Các phần tử có data-reveal hiện dần theo thứ tự ngay khi trang mở ra;
 * phần nằm dưới màn hình thì đợi cuộn tới mới hiện.
 * Dùng thuộc tính data-shown (React không quản lý) để không đụng tới className của phần tử.
 */
export function Page({ id, labelledBy, className, children }: Props) {
  const ref = useRef<HTMLElement>(null);
  const { opened, revealBase } = useNav();

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const els = [...root.querySelectorAll<HTMLElement>('[data-reveal]')];
    els.forEach(el => { el.style.transitionDelay = '0s'; el.removeAttribute('data-shown'); });
    if (!opened) return;
    if (reduceMotion) { els.forEach(el => el.setAttribute('data-shown', '')); return; }
    void root.offsetHeight;
    const io = new IntersectionObserver(es => es.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target as HTMLElement;
      el.style.transitionDelay = '0s'; el.setAttribute('data-shown', ''); io.unobserve(el);
    }), { threshold: 0.12 });
    const vh = innerHeight;
    let i = 0;
    for (const el of els) {
      if (el.getBoundingClientRect().top < vh * 0.92) { el.style.transitionDelay = `${(revealBase + i++ * 0.07).toFixed(2)}s`; el.setAttribute('data-shown', ''); }
      else io.observe(el);
    }
    return () => io.disconnect();
    /* chỉ chạy lại khi mở quà; mỗi lần đổi trang là một Page mới */
  }, [opened, revealBase]);

  return (
    <section ref={ref} id={`p-${id}`} className={`page ${className ?? ''}`} aria-labelledby={labelledBy}>
      {children}
    </section>
  );
}
