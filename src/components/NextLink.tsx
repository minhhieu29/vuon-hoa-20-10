import type { ReactNode } from 'react';
import type { Route } from '../router';
import { BloomLink } from '../state/nav';

/** Dải "Tiếp theo" ở cuối mỗi trang. */
export function NextLink({ to, children }: { to: Route; children: ReactNode }) {
  return (
    <div className="page-next" data-reveal>
      <span>Tiếp theo</span>
      <BloomLink to={to} className="next-link">
        {children}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
      </BloomLink>
    </div>
  );
}
