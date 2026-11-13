import { editAttr } from '@/cms';

export const A = `${import.meta.env.BASE_URL}assets`;

// Themed replacements for stock images that didn't reference wine/vineyards
export const IMG = {
  vinedosHero:
    'https://images.unsplash.com/photo-1665254369274-4b459f3ce48c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920',
  vinexpo:
    'https://images.unsplash.com/photo-1641830879467-e22004141bcb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  prowein:
    'https://images.unsplash.com/photo-1690986535140-dc095e75b726?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  vendimia:
    'https://images.unsplash.com/photo-1472352327492-9765783b74e1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  catas:
    'https://images.unsplash.com/photo-1610065333275-b3e5c63fc872?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  vinedoAltamira:
    'https://images.unsplash.com/photo-1502285254372-2cb4d1b0993b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  vinedoVistaFlores:
    'https://images.unsplash.com/photo-1632990957844-fe2635be13e9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  vinedoLaConsulta:
    'https://images.unsplash.com/photo-1542384517060-2b41144f12a4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  vinedoMapa:
    'https://images.unsplash.com/photo-1660311967571-3a12801f7ae4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1600',
};

// Language-neutral scaffolding (images / flags) — text comes from the i18n copy.
export const HOME_NEWS_IMGS = [`${A}/5e611.png`, `${A}/28b42.png`];

// Award badges: the images and the wine each one links to; the critic and note texts are in the copy (home.awardsList).
export const HOME_AWARDS: { img: string; wineId?: string }[] = [
  { img: `${A}/d7200.png`, wineId: 'dama' },
  { img: `${A}/5b74e.png`, wineId: 'reserva-malbec' },
  { img: `${A}/fb3eb.png`, wineId: 'vav-malbec' },
  { img: `${A}/36671.png`, wineId: 'tres-fincas' },
  { img: `${A}/b1740.png` },
  { img: `${A}/226c0.png` },
];

export const VINEDOS_IMGS = [`${A}/altamira-home-sq.jpg`, `${A}/laconsulta-home-sq.jpg`, `${A}/estate-home.jpg`];

export const NOVEDADES_ARTICLE_IMGS = [IMG.prowein, IMG.vendimia, IMG.catas];

// Wine catalog scaffolding (bottle image / filter tag / blend flag) keyed by id.
export type WineLine = 'RESERVA' | 'VAV' | 'DAMA' | 'NAVIGATO';

const WINE_META: Record<string, { img: string; tag: 'ALTAMIRA' | 'VAV'; line: WineLine }> = {
  dama: { img: `${A}/5c918.webp`, tag: 'ALTAMIRA', line: 'DAMA' },
  navigato: { img: `${A}/navigato.webp`, tag: 'ALTAMIRA', line: 'NAVIGATO' },
  'reserva-malbec': { img: `${A}/reserva-malbec.webp`, tag: 'ALTAMIRA', line: 'RESERVA' },
  'reserva-cf': { img: `${A}/reserva-cf.webp`, tag: 'ALTAMIRA', line: 'RESERVA' },
  'vav-malbec': { img: `${A}/4600e.webp`, tag: 'VAV', line: 'VAV' },
  'tres-fincas': { img: `${A}/73703.webp`, tag: 'VAV', line: 'VAV' },
};

// wines added in the CMS have no bundled entry: their line comes from the CMS
export function wineMeta(w: { id: string; line?: string }) {
  const line = (w.line ?? WINE_META[w.id]?.line ?? 'RESERVA') as WineLine;
  return { img: WINE_META[w.id]?.img ?? '', tag: line === 'VAV' ? ('VAV' as const) : ('ALTAMIRA' as const), line };
}

export function bottle(w: { id: string; docId?: string; bottle?: string }) {
  return { src: w.bottle ?? wineMeta(w).img, ...editAttr(w.docId, 'wine', 'bottle') };
}
