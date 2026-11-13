// Page model and addresses. The site is a single-page app with plain paths: "/", "/vinos", "/wine/dama"…
// Old links that still carry a "#/" ("/#/vinos") are understood too and rewritten to the plain form.
import type { Site } from '@/cms';

export type Page = 'home' | 'vinos' | 'vinedos' | 'galeria' | 'novedades' | 'contacto' | 'wine-detail' | 'privacidad';
export type Nav = (p: Page, wineId?: string, anchor?: string) => void;
export type Route = { page: Page; wineId?: string };

const PAGES: Page[] = ['home', 'vinos', 'vinedos', 'galeria', 'novedades', 'contacto', 'wine-detail', 'privacidad'];
const FALLBACK_ORDER: Page[] = ['home', 'vinos', 'vinedos', 'contacto', 'privacidad'];

/** Which route an address means. Pure, so it can be tested without a browser. */
export function parseRoute(pathname: string, hash = ''): Route {
  let h = pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  if (!h) h = hash.replace(/^#\/?/, '').toLowerCase(); // an old "#/vinos" link
  if (!h || h === 'home') return { page: 'home' };
  if (h.startsWith('wine/')) return { page: 'wine-detail', wineId: h.slice(5) || 'dama' };
  return PAGES.includes(h as Page) && h !== 'wine-detail' ? { page: h as Page } : { page: 'home' };
}

/** The route of the address bar right now. */
export const currentRoute = (): Route => (typeof window === 'undefined' ? { page: 'home' } : parseRoute(window.location.pathname, window.location.hash));

/** The address of a page. */
export function pathFor(p: Page, wineId?: string): string {
  if (p === 'home') return '/';
  if (p === 'wine-detail') return '/wine/' + (wineId || 'dama');
  return '/' + p;
}

/** Pages the editors can switch off in the CMS (the privacy policy always stays reachable). */
export function pageOn(p: Page, site: Site) {
  const on: Partial<Record<Page, boolean>> = {
    home: site.showHome, vinedos: site.showVineyards, vinos: site.showWines, 'wine-detail': site.showWines,
    galeria: site.showGallery, novedades: site.showNews, contacto: site.showContact,
  };
  return on[p] ?? true;
}

/** A page switched off in the CMS shows the first one still on. */
export const visiblePage = (wanted: Page, site: Site): Page => (pageOn(wanted, site) ? wanted : FALLBACK_ORDER.find((p) => pageOn(p, site))!);
