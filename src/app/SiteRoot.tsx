import { useEffect, useRef, useState } from 'react';
import { PREVIEW, clean } from '@/cms';
import { AgeGate } from '@/components/AgeGate';
import { Footer, FooterBar } from '@/components/Footer';
import { Header } from '@/components/Header';
import { useLang, useSite, useT } from '@/i18n';
import { currentRoute, pathFor, visiblePage, type Page } from '@/lib/routing';
import { Contacto } from '@/pages/Contacto';
import { Galeria } from '@/pages/Galeria';
import { Home } from '@/pages/Home';
import { Novedades } from '@/pages/Novedades';
import { Privacidad } from '@/pages/Privacidad';
import { Vinedos } from '@/pages/Vinedos';
import { Vinos } from '@/pages/Vinos';
import { WineDetail } from '@/pages/WineDetail';

export function SiteRoot() {
  const initial = currentRoute();
  const [wanted, setPage] = useState<Page>(initial.page);
  const site = useSite();
  // a page switched off in the CMS shows the first one still on
  const page = visiblePage(wanted, site);
  const [activeWine, setActiveWine] = useState(initial.wineId || 'dama');
  const [inquiry, setInquiry] = useState<string | null>(null);
  const [entered, setEntered] = useState(() => {
    try {
      return localStorage.getItem('vf-age-ok') === '1';
    } catch (e) {
      return false;
    }
  });

  // an old "#/vinos" link opens the page and the address bar shows the plain "/vinos"
  useEffect(() => {
    if (window.location.hash.startsWith('#/')) window.history.replaceState(null, '', pathFor(initial.page, initial.wineId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Browser back/forward (and refresh / deep links) via history.
  useEffect(() => {
    const onPop = () => {
      const s = currentRoute();
      setPage(s.page);
      if (s.wineId) setActiveWine(s.wineId);
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const t = useT();
  const { lang } = useLang();
  const gateOpen = !entered && site.showAgeGate && !PREVIEW;
  // tab title per page, in the visitor's language
  useEffect(() => {
    const wine = t.wineCatalog.find((w) => w.id === activeWine);
    const names: Partial<Record<Page, string>> = { ...t.nav, 'wine-detail': wine ? clean(`${wine.title1} ${wine.title2}`).trim() : t.nav.vinos, privacidad: t.footer.privacy };
    const name = page === 'home' ? '' : names[page] ?? '';
    document.title = name ? `${name} · ${clean(site.name)}` : clean(site.name);
    document.querySelector('link[rel=canonical]')?.setAttribute('href', `https://altamiradelosandes.com${pathFor(page, activeWine) === '/' ? '/' : pathFor(page, activeWine)}`);
  }, [page, activeWine, t, site.name, lang]);
  // after a page change, keyboard and screen-reader users start at the new page's content, not on the old menu item
  const moved = useRef(false);
  useEffect(() => {
    if (!moved.current) return;
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [page, activeWine]);

  const enter = () => {
    try {
      localStorage.setItem('vf-age-ok', '1');
    } catch (e) {}
    setEntered(true);
    setTimeout(() => document.getElementById('main')?.focus({ preventScroll: true }), 0); // keyboard users continue on the page
  };

  function navigate(p: Page, wineId?: string, anchor?: string) {
    moved.current = true;
    if (p === 'contacto') setInquiry(wineId ?? null);
    else if (wineId) setActiveWine(wineId);
    setPage(p);
    const url = pathFor(p, p === 'contacto' ? undefined : wineId);
    if (typeof window !== 'undefined' && window.location.pathname !== url) {
      window.history.pushState({ p, wineId }, '', url);
    }
    if (anchor) {
      // wait for the new page to render, then glide to the section
      window.scrollTo({ top: 0, behavior: 'instant' });
      setTimeout(() => {
        const el = document.getElementById(anchor);
        if (!el) return;
        const top = el.getBoundingClientRect().top + window.scrollY - 72;
        window.scrollTo({ top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
        // smooth scrolling can stall (background tab, reduced motion): make sure we land
        setTimeout(() => {
          if (Math.abs(window.scrollY - top) > 40) window.scrollTo({ top, behavior: 'instant' });
        }, 1100);
      }, 120);
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' }); // the new page starts at its top (no glide over it)
    }
  }

  const showFullFooter = page !== 'contacto' && page !== 'vinos' && page !== 'novedades' && page !== 'vinedos' && page !== 'galeria' && page !== 'privacidad';

  return (
    <div className="min-h-screen w-full bg-surface">
      {gateOpen && <AgeGate onEnter={enter} />}
      {/* while the age notice is up, the page behind it can't be reached with Tab or a screen reader */}
      <div inert={gateOpen}>
        <a
          href="#main"
          onClick={(e) => {
            e.preventDefault(); // the address bar holds the page, not an anchor
            document.getElementById('main')?.focus();
          }}
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:bg-panel focus:px-4 focus:py-3 focus:text-[13px] focus:text-on-dark"
        >
          {t.a11y.skip}
        </a>
        <Header page={page} onNav={navigate} />
        <main id="main" tabIndex={-1} style={{ outline: 'none' }}>
          {page === 'home' && <Home onNav={navigate} />}
          {page === 'vinos' && <Vinos onNav={navigate} />}
          {page === 'vinedos' && <Vinedos />}
          {page === 'galeria' && <Galeria />}
          {page === 'novedades' && <Novedades />}
          {page === 'contacto' && <Contacto onNav={navigate} inquiryWineId={inquiry} />}
          {page === 'privacidad' && <Privacidad />}
          {page === 'wine-detail' && <WineDetail onNav={navigate} wineId={activeWine} />}
        </main>
        {page === 'home' || showFullFooter ? <Footer onNav={navigate} /> : <FooterBar onNav={navigate} />}
      </div>
    </div>
  );
}
