// After `vite build`: one HTML file per page with its own title, description, canonical, social tags, structured data
// and a readable text copy of the page, so search engines and AI crawlers that don't run JavaScript still see the content.
// Also writes sitemap.xml and llms.txt from the same copy, so they never drift from the site.
// React replaces the text copy inside #root as soon as the app starts.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { en } from '../src/i18n/en.ts';

const ORIGIN = 'https://altamiradelosandes.com';
const NAME = 'Altamira de los Andes';
const IMAGE = `${ORIGIN}/og-image.jpg`;
const EMAIL = 'inquiries@altamiradelosandes.com';
const PHONES = ['+54 261 4299962', '+1 305 988 5992'];
const DIST = 'dist';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const plain = (s: string) => s.replace(/[\u200B-\u200D\uFEFF*_]/g, '').replace(/\s+/g, ' ').trim();
const cut = (s: string, n = 158) => (s.length <= n ? s : s.slice(0, s.lastIndexOf(' ', n - 1)) + '…');

const org = {
  '@type': 'Winery',
  '@id': `${ORIGIN}/#winery`,
  name: NAME,
  url: `${ORIGIN}/`,
  logo: `${ORIGIN}/favicon.svg`,
  image: IMAGE,
  description: plain(en.home.heroSubtitle),
  email: EMAIL,
  telephone: PHONES,
  address: { '@type': 'PostalAddress', streetAddress: 'Av. Colón 241', postalCode: '5500', addressLocality: 'Mendoza', addressCountry: 'AR' },
  areaServed: 'Worldwide',
  knowsAbout: ['Malbec', 'Cabernet Franc', 'Uco Valley', 'Altamira', 'Vista Flores', 'La Consulta', 'High-altitude viticulture'],
};

type Page = { path: string; title: string; description: string; h1: string; body: string[]; ld: object[] };

const wines = en.wineCatalog.map((w) => {
  const name = plain(`${w.title1} ${w.title2}`);
  const text = [w.lead, ...w.paras, w.closing].map(plain).filter(Boolean);
  const facts = w.ficha.map((f) => `${plain(f.label)}: ${plain(f.value)}`);
  const notes = w.notes.map((n) => `${plain(n.label)}: ${plain(n.text)}`);
  return { id: w.id, name, region: plain(w.region), text, facts, notes, score: w.score };
});

const crumbs = (items: [string, string][]) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: ORIGIN + path })),
});

const pages: Page[] = [
  {
    path: '/',
    title: `${NAME} · Boutique wines from the Uco Valley, Mendoza`,
    description: cut(plain(`${en.home.heroSubtitle} ${en.footer.tagline1} ${en.footer.tagline2}`)),
    h1: NAME,
    body: [en.home.heroSubtitle, en.home.estateTitle1, en.vinedos.intro1].map(plain),
    ld: [org, { '@type': 'WebSite', '@id': `${ORIGIN}/#website`, url: `${ORIGIN}/`, name: NAME, publisher: { '@id': `${ORIGIN}/#winery` }, inLanguage: ['en', 'es', 'pt'] }],
  },
  {
    path: '/vinedos',
    title: `${plain(en.nav.vinedos)} · Three high-altitude vineyards in the Uco Valley · ${NAME}`,
    description: cut(plain(en.vinedos.intro1)),
    h1: plain(en.vinedos.introTitle),
    body: [en.vinedos.intro1].map(plain),
    ld: [crumbs([['Home', '/'], [plain(en.nav.vinedos), '/vinedos']])],
  },
  {
    path: '/vinos',
    title: `${plain(en.nav.vinos)} · Malbec, Cabernet Franc and blends · ${NAME}`,
    description: cut(plain(en.vinos.heroPara)),
    h1: plain(en.vinos.heroTitle),
    body: [plain(en.vinos.heroPara), ...wines.map((w) => `${w.name} (${w.region}): ${w.text[0] ?? ''}`)],
    ld: [
      crumbs([['Home', '/'], [plain(en.nav.vinos), '/vinos']]),
      { '@type': 'ItemList', itemListElement: wines.map((w, i) => ({ '@type': 'ListItem', position: i + 1, name: w.name, url: `${ORIGIN}/wine/${w.id}` })) },
    ],
  },
  ...wines.map((w) => ({
    path: `/wine/${w.id}`,
    title: `${w.name} · ${w.region.toLowerCase().replace(/(^|[ ·])\p{L}/gu, (c) => c.toUpperCase())} wine · ${NAME}`,
    description: cut(w.text.join(' ')),
    h1: w.name,
    body: [...w.text, ...w.facts, ...w.notes, ...(w.score ? [`${w.score.value} points · ${w.score.critic}`] : [])],
    ld: [
      crumbs([['Home', '/'], [plain(en.nav.vinos), '/vinos'], [w.name, `/wine/${w.id}`]]),
      {
        '@type': 'Product',
        name: w.name,
        category: 'Wine',
        description: w.text.join(' '),
        brand: { '@type': 'Brand', name: NAME },
        manufacturer: { '@id': `${ORIGIN}/#winery` },
        countryOfOrigin: 'AR',
        additionalProperty: w.facts.map((f) => ({ '@type': 'PropertyValue', name: f.split(': ')[0], value: f.split(': ').slice(1).join(': ') })),
      },
    ],
  })),
  {
    path: '/contacto',
    title: `${plain(en.contacto.title)} · ${NAME}`,
    description: cut(plain(`${en.contacto.intro1} ${en.contacto.intro2} ${EMAIL}`)),
    h1: plain(en.contacto.title),
    body: [plain(en.contacto.intro1), plain(en.contacto.intro2), `Commercial office: Av. Colón 241, (5500) Mendoza, Argentina`, `Email: ${EMAIL}`, `Phone: ${PHONES.join(' · ')}`],
    ld: [crumbs([['Home', '/'], [plain(en.contacto.title), '/contacto']]), { '@type': 'ContactPage', about: { '@id': `${ORIGIN}/#winery` } }],
  },
  {
    path: '/privacidad',
    title: `${plain(en.legal.title)} · ${NAME}`,
    description: cut(plain(en.legal.intro)),
    h1: plain(en.legal.title),
    body: [plain(en.legal.intro)],
    ld: [],
  },
];

const nav = `<nav><a href="/">${esc(NAME)}</a> · <a href="/vinedos">${esc(en.nav.vinedos)}</a> · <a href="/vinos">${esc(en.nav.vinos)}</a> · ${wines.map((w) => `<a href="/wine/${w.id}">${esc(w.name)}</a>`).join(' · ')} · <a href="/contacto">${esc(en.nav.contacto)}</a></nav>`;
// visually hidden like Tailwind's sr-only: readable by crawlers and screen readers, no flash before the app paints
const SR = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0';

const shell = readFileSync(`${DIST}/index.html`, 'utf8')
  .replace(/<title>[\s\S]*?<\/title>/, '')
  .replace(/\s*<link rel="canonical"[^>]*>/, '')
  .replace(/\s*<meta (?:name|property)="(?:description|og:title|og:description|og:url|og:image|og:type|twitter:card|twitter:image)"[^>]*>/g, '');
if (!shell.includes('<div id="root"></div>')) throw new Error('prerender: <div id="root"></div> not found in dist/index.html');

for (const p of pages) {
  const url = ORIGIN + p.path;
  const ld = p.ld.length ? `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': p.ld }).replace(/</g, '\\u003c')}</script>` : '';
  const head = [
    `<title>${esc(p.title)}</title>`,
    `<meta name="description" content="${esc(p.description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="${p.path.startsWith('/wine/') ? 'product' : 'website'}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:title" content="${esc(p.title)}" />`,
    `<meta property="og:description" content="${esc(p.description)}" />`,
    `<meta property="og:image" content="${IMAGE}" />`,
    `<meta property="og:locale" content="en_US" /><meta property="og:locale:alternate" content="es_AR" /><meta property="og:locale:alternate" content="pt_BR" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:image" content="${IMAGE}" />`,
    ld,
  ].join('\n    ');
  const body = `<div id="root"><div style="${SR}"><header>${nav}</header><main><h1>${esc(p.h1)}</h1>${p.body.map((t) => `<p>${esc(t)}</p>`).join('')}</main></div></div>`;
  const html = shell.replace('</head>', `    ${head}\n  </head>`).replace('<div id="root"></div>', body);
  const file = p.path === '/' ? `${DIST}/index.html` : `${DIST}${p.path}.html`;
  mkdirSync(file.slice(0, file.lastIndexOf('/')), { recursive: true });
  writeFileSync(file, html);
}

const today = new Date().toISOString().slice(0, 10);
writeFileSync(
  `${DIST}/sitemap.xml`,
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((p) => `  <url><loc>${ORIGIN}${p.path}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`,
);

// llms.txt (llmstxt.org): a plain summary AI assistants can read and cite
writeFileSync(
  `${DIST}/llms.txt`,
  [
    `# ${NAME}`,
    '',
    `> ${plain(en.home.heroSubtitle)} ${plain(en.footer.tagline1)} ${plain(en.footer.tagline2)}`,
    '',
    plain(en.vinedos.intro1),
    '',
    '## Wines',
    '',
    ...wines.map((w) => `- [${w.name}](${ORIGIN}/wine/${w.id}): ${w.region}. ${w.facts.join('; ')}.${w.score ? ` ${w.score.value} points, ${w.score.critic}.` : ''} ${w.text[0] ?? ''}`),
    '',
    '## Pages',
    '',
    ...pages.filter((p) => !p.path.startsWith('/wine/')).map((p) => `- [${p.h1}](${ORIGIN}${p.path}): ${p.description}`),
    '',
    '## Contact',
    '',
    `- Commercial office: Av. Colón 241, (5500) Mendoza, Argentina`,
    `- Email: ${EMAIL}`,
    `- Phone: ${PHONES.join(', ')}`,
    `- The site is available in English, Spanish and Portuguese.`,
    '',
  ].join('\n'),
);

console.log(`prerender: ${pages.length} pages, sitemap.xml, llms.txt`);
