import { useEffect, useState } from 'react';

// Bottles per row on Our Wines, matching the sm / lg breakpoints: all six in one row on desktop.
export function useGridCols() {
  const get = () => (typeof window === 'undefined' ? 6 : window.matchMedia('(min-width: 1024px)').matches ? 6 : window.matchMedia('(min-width: 640px)').matches ? 3 : 2);
  const [cols, setCols] = useState(get);
  useEffect(() => {
    const onResize = () => setCols(get());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return cols;
}

// Scroll reveal hook
export function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: '0px 0px -40px 0px' }
    );
    const watch = () => document.querySelectorAll<Element>('.reveal:not(.visible)').forEach((el) => io.observe(el));
    const timer = setTimeout(watch, 80);
    // blocks that appear later (language switch, a section the CMS turns on) must fade in too, not stay invisible
    const mo = new MutationObserver(watch);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      clearTimeout(timer);
      mo.disconnect();
      io.disconnect();
    };
  }, []);
}

// Theme (light / dark)
export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof document !== 'undefined') {
      const t = document.documentElement.getAttribute('data-theme');
      if (t === 'dark' || t === 'light') return t;
    }
    return 'light';
  });
  const toggle = () =>
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try {
        localStorage.setItem('vf-theme', next);
      } catch (e) {}
      return next;
    });
  return { theme, toggle };
}

export function useMedia(query: string) {
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}
