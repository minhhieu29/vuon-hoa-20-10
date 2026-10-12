import { useEffect, useState } from 'react';
import { TO } from '../config';
import { BloomLink, useNav } from '../state/nav';

export function TopBar({ inert }: { inert: boolean }) {
  const { route } = useNav();
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    if (route === 'vuon') return;
    let raf = 0;
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; setSolid(window.scrollY > 8); }); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, [route]);

  return (
    <header className={`topbar${solid && route !== 'vuon' ? ' solid' : ''}`} inert={inert}>
      <BloomLink to="vuon" className="sig-mini">{TO}</BloomLink>
    </header>
  );
}
