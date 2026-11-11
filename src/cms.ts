// Content from the Sanity CMS (project altamira-cms). The site ships with its own copy (i18n.tsx) and photos and
// shows those first; whatever the editors have published in Sanity then replaces them, piece by piece. If Sanity
// can't be reached, the bundled content is simply what stays on screen.
import type { Copy, Lang } from './i18n';

export const SANITY = { projectId: '65z18eah', dataset: 'production', apiVersion: '2025-02-19' };
export const STUDIO_URL = 'https://cms.altamiradelosandes.com';
// the live API (not apicdn): the CDN keeps answers for a minute or more, and editors expect a published change to show right away
const API = `https://${SANITY.projectId}.api.sanity.io/v${SANITY.apiVersion}/data/query/${SANITY.dataset}`;
const CACHE_KEY = 'vf-cms';
// inside the Studio's "Editar sobre la web" the site runs in an iframe: drafts and click-to-edit (see cmsLive.tsx)
export const PREVIEW = typeof window !== 'undefined' && window.self !== window.top;

type Loc = { language: string; value?: string }[] | null;
type CmsWine = {
  _id: string;
  id: string;
  active?: boolean;
  line?: string;
  name: Loc; sub: Loc; gridRegion: Loc; region: Loc; title1: Loc; title2: Loc; closing: Loc;
  paragraphs?: { text: Loc }[] | null;
  ficha?: { label: Loc; value: Loc }[] | null;
  notes?: { label: Loc; text: Loc }[] | null;
  score?: { value?: string; critic?: string; year?: string } | null;
  bottle?: string | null;
  background?: string | null;
  sheets?: { language: string; url?: string }[] | null;
};
type CmsSettings = Partial<Omit<Site, 'subtitle'>> & { subtitle?: Loc };
export type Cms = {
  texts: { key: string; value: Loc }[];
  wines: CmsWine[];
  media: { _id: string; file: string; url?: string | null }[];
  languages: { code: string; title: string; active?: boolean; flag?: string | null }[];
  settings: CmsSettings | null;
};

const L = '{language, value}';
// `$pages`: the site's visitors get everything in one request; inside the Studio the preview asks only for the page on
// screen (plus the menu and footer), because the Studio can't follow a live query that touches ~350 documents.
export const ALL_PAGES = ['home', 'vinos', 'wineDetail', 'vinedos', 'novedades', 'galeria', 'contacto', 'legal', 'nav', 'a11y', 'gate', 'footer'];
const PAGE_OF_HASH: Record<string, string[]> = {
  '': ['home'], home: ['home'], vinos: ['vinos'], wine: ['wineDetail', 'vinos'], vinedos: ['vinedos'], novedades: ['novedades'], galeria: ['galeria'], contacto: ['contacto'], privacidad: ['legal'],
};
export const pagesFor = (hash: string) => [...(PAGE_OF_HASH[hash.replace(/^#\/?/, '').split('/')[0]] ?? ['home']), 'nav', 'a11y', 'footer'];
export const CMS_QUERY = `{
  "texts": *[_type == "uiText" && page in $pages]{key, "value": value[]${L}},
  "wines": *[_type == "wine" && defined(slug.current)] | order(order asc){
    _id, "id": slug.current, active, line,
    "name": name[]${L}, "sub": sub[]${L}, "gridRegion": gridRegion[]${L}, "region": region[]${L},
    "title1": title1[]${L}, "title2": title2[]${L}, "closing": closing[]${L},
    "paragraphs": paragraphs[]{"text": text[]${L}},
    "ficha": ficha[]{"label": label[]${L}, "value": value[]${L}},
    "notes": notes[]{"label": label[]${L}, "text": text[]${L}},
    score,
    "bottle": bottle.asset->url, "background": background.asset->url,
    "sheets": technicalSheet[]{language, "url": value.asset->url}
  },
  "media": *[_type == "siteMedia" && page in $pages]{_id, file, "url": image.asset->url},
  "languages": *[_type == "language" && defined(code)] | order(order asc){code, title, active, "flag": flag.asset->url},
  "settings": *[_type == "siteSettings"][0]{
    "name": siteName, "logo": headerLogo.asset->url, "subtitle": headerSubtitle[]${L}, "favicon": favicon.asset->url,
    "heroVideo": heroVideo.asset->url, "heroPoster": heroPoster.asset->url,
    office, phones, email, "socials": socials[]{label, url},
    showAgeGate, showHome, showVineyards, showWines, showGallery, showNews, showContact,
    showEstate, showHomePhoto, showHomeVineyards, showQuote, showAwards, showMap
  }
}`;

export type Site = {
  name: string;
  logo?: string | null;
  subtitle: string;
  favicon?: string | null;
  heroVideo?: string | null;
  heroPoster?: string | null;
  office: string;
  phones: string[];
  email: string;
  socials: { label: string; url?: string | null }[];
  showAgeGate: boolean; showHome: boolean; showVineyards: boolean; showWines: boolean; showGallery: boolean; showNews: boolean; showContact: boolean;
  showEstate: boolean; showHomePhoto: boolean; showHomeVineyards: boolean; showQuote: boolean; showAwards: boolean; showMap: boolean;
};

const DEFAULT_SITE: Site = {
  name: 'Altamira de los Andes',
  subtitle: 'UCO VALLEY · MENDOZA',
  office: 'Av. Colón 241\n(5500) Mendoza, Argentina',
  phones: ['Argentina +54 261 4299962', 'USA +1 305 988 5992'],
  email: 'inquiries@altamiradelosandes.com',
  socials: [{ label: 'IG' }, { label: 'FB' }, { label: 'LI' }],
  showAgeGate: true, showHome: true, showVineyards: true, showWines: true, showGallery: false, showNews: false, showContact: true,
  showEstate: true, showHomePhoto: true, showHomeVineyards: true, showQuote: true, showAwards: false, showMap: true,
};

export function cachedCms(): Cms | null {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null');
    return c?.media && c.texts && c.wines ? c : null; // ignore a cache saved by an older version of the site
  } catch {
    return null;
  }
}

export async function fetchCms(): Promise<Cms | null> {
  try {
    const res = await fetch(`${API}?query=${encodeURIComponent(CMS_QUERY)}&$pages=${encodeURIComponent(JSON.stringify(ALL_PAGES))}`);
    if (!res.ok) return null;
    const { result } = (await res.json()) as { result: Cms };
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(result));
    } catch {}
    return result;
  } catch {
    return null;
  }
}

const pick = (loc: Loc | undefined, lang: Lang) => loc?.find((v) => v.language === lang)?.value;
// Sanity's own image CDN: right format and size instead of the original file
const photo = (url?: string | null) => (url ? `${url}?auto=format&fit=max&w=2400&q=85` : undefined);
// in the Studio, text carries invisible markers for click-to-edit; remove them wherever the string is measured or used as a link
export const clean = (s: string) => s.replace(/[​-‍﻿]/g, '');

// click-to-edit target for things that aren't text (photos, video); nothing outside the Studio
export function editAttr(id: string | undefined, type: string, path: string): Record<string, string> {
  if (!PREVIEW || !id) return {};
  const doc = id.replace(/^drafts\./, '');
  return { 'data-sanity': `id=${doc};type=${type};path=${path};base=${encodeURIComponent(STUDIO_URL)}` };
}

// photos by file name; filled from the CMS just before the components that read it render
let media = new Map<string, { _id: string; url?: string }>();

/** `src` for a site photo: the editors' one if there is one, else the bundled file (`key` names photos not in /assets). */
export function md(path: string, key?: string) {
  const m = media.get(key ?? path.split('/assets/')[1]);
  return { src: m?.url ?? path, ...editAttr(m?._id, 'siteMedia', 'image') };
}

// set one value inside a nested object/array without mutating it (only the path is copied); unknown paths are ignored
function setIn(node: any, path: string[], value: string): any {
  const [key, ...rest] = path;
  if (node == null || !(key in node)) return node;
  const copy = Array.isArray(node) ? [...node] : { ...node };
  copy[key] = rest.length ? setIn(node[key], rest, value) : value;
  return copy;
}

function mergeWine(w: any, c: CmsWine, lang: Lang) {
  const s = (loc: Loc, fallback: string) => pick(loc, lang) ?? fallback;
  return {
    ...w,
    id: c.id,
    docId: c._id,
    line: c.line,
    bottle: photo(c.bottle),
    background: photo(c.background),
    sheet: c.sheets?.find((v) => v.language === lang)?.url ?? undefined,
    name: s(c.name, w.name), sub: s(c.sub, w.sub), gridRegion: s(c.gridRegion, w.gridRegion), region: s(c.region, w.region),
    title1: s(c.title1, w.title1), title2: s(c.title2, w.title2), closing: s(c.closing, w.closing),
    paras: c.paragraphs?.length ? c.paragraphs.map((p, i) => pick(p.text, lang) ?? w.paras[i] ?? '') : w.paras,
    ficha: c.ficha?.length ? c.ficha.map((r, i) => ({ label: s(r.label, w.ficha[i]?.label ?? ''), value: s(r.value, w.ficha[i]?.value ?? '') })) : w.ficha,
    notes: c.notes?.length ? c.notes.map((r, i) => ({ label: s(r.label, w.notes[i]?.label ?? ''), text: s(r.text, w.notes[i]?.text ?? '') })) : w.notes,
    score: c.score === undefined ? w.score : c.score,
  };
}
const EMPTY_WINE = { name: '', sub: '', gridRegion: '', region: '', title1: '', title2: '', tagline: '', lead: '', paras: [], closing: '', score: null, ficha: [], notes: [] };

export function applyCms(base: Copy, cms: Cms | null, lang: Lang): Copy {
  if (!cms) return base;
  media = new Map(cms.media.map((m) => [m.file, { _id: m._id, url: photo(m.url) }]));
  let out: any = base;
  for (const { key, value } of cms.texts) {
    const v = pick(value, lang);
    if (v !== undefined) out = setIn(out, key.split('.'), v);
  }
  // CMS order and visibility; wines created in the Studio are added
  const bundled = new Map<string, any>(out.wineCatalog.map((w: any) => [w.id, w]));
  const known = new Set(cms.wines.map((w) => w.id));
  out = {
    ...out,
    wineCatalog: [
      ...cms.wines.filter((c) => c.active !== false).map((c) => mergeWine(bundled.get(c.id) ?? EMPTY_WINE, c, lang)),
      ...out.wineCatalog.filter((w: any) => !known.has(w.id)),
    ],
  };
  return out as Copy;
}

export function siteFrom(cms: Cms | null, lang: Lang): Site {
  const { subtitle, ...rest } = cms?.settings ?? {};
  const set = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== null && v !== undefined));
  return {
    ...DEFAULT_SITE,
    ...set,
    subtitle: pick(subtitle, lang) ?? DEFAULT_SITE.subtitle,
    heroVideo: rest.heroVideo ?? undefined,
    heroPoster: photo(rest.heroPoster),
    logo: photo(rest.logo),
    favicon: photo(rest.favicon),
  };
}
