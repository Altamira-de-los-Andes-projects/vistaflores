import { useState, useEffect, useRef } from 'react';
import { LangProvider, useLang, useSite, useT, type Lang } from './i18n';
import { clean, editAttr, md, PREVIEW, type Site } from './cms';
import { ARG_REST, ARG_MENDOZA, ARG_UCO, CHILE } from './mapdata';
import { UCO_RIVER } from './ucomap';
import { FINCAS_IMG, FINCAS_PT } from './ucofincas';

type Page = 'home' | 'vinos' | 'vinedos' | 'galeria' | 'novedades' | 'contacto' | 'wine-detail' | 'privacidad';
type Nav = (p: Page, wineId?: string, anchor?: string) => void;

const A = `${import.meta.env.BASE_URL}assets`;

// Themed replacements for stock images that didn't reference wine/vineyards
const IMG = {
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
const HOME_NEWS_IMGS = [`${A}/5e611.png`, `${A}/28b42.png`];
// Award badges: the images and the wine each one links to; the critic and note texts are in the copy (home.awardsList).
const HOME_AWARDS: { img: string; wineId?: string }[] = [
  { img: `${A}/d7200.png`, wineId: 'dama' },
  { img: `${A}/5b74e.png`, wineId: 'reserva-malbec' },
  { img: `${A}/fb3eb.png`, wineId: 'vav-malbec' },
  { img: `${A}/36671.png`, wineId: 'tres-fincas' },
  { img: `${A}/b1740.png` },
  { img: `${A}/226c0.png` },
];
const VINEDOS_IMGS = [`${A}/altamira-home-sq.jpg`, `${A}/laconsulta-home-sq.jpg`, `${A}/estate-home.jpg`];
const NOVEDADES_ARTICLE_IMGS = [IMG.prowein, IMG.vendimia, IMG.catas];

// Wine catalog scaffolding (bottle image / filter tag / blend flag) keyed by id.
type WineLine = 'RESERVA' | 'VAV' | 'DAMA' | 'NAVIGATO';
const WINE_META: Record<string, { img: string; tag: 'ALTAMIRA' | 'VAV'; line: WineLine }> = {
  dama: { img: `${A}/5c918.png`, tag: 'ALTAMIRA', line: 'DAMA' },
  navigato: { img: `${A}/navigato.png`, tag: 'ALTAMIRA', line: 'NAVIGATO' },
  'reserva-malbec': { img: `${A}/reserva-malbec.png`, tag: 'ALTAMIRA', line: 'RESERVA' },
  'reserva-cf': { img: `${A}/reserva-cf.png`, tag: 'ALTAMIRA', line: 'RESERVA' },
  'vav-malbec': { img: `${A}/4600e.png`, tag: 'VAV', line: 'VAV' },
  'tres-fincas': { img: `${A}/73703.png`, tag: 'VAV', line: 'VAV' },
};

// wines added in the CMS have no bundled entry: their line comes from the CMS
function wineMeta(w: { id: string; line?: string }) {
  const line = (w.line ?? WINE_META[w.id]?.line ?? 'RESERVA') as WineLine;
  return { img: WINE_META[w.id]?.img ?? '', tag: line === 'VAV' ? ('VAV' as const) : ('ALTAMIRA' as const), line };
}
function bottle(w: { id: string; docId?: string; bottle?: string }) {
  return { src: w.bottle ?? wineMeta(w).img, ...editAttr(w.docId, 'wine', 'bottle') };
}

// Bottles per row on Our Wines, matching the sm / lg breakpoints: all six in one row on desktop.
function useGridCols() {
  const get = () => (typeof window === 'undefined' ? 6 : window.matchMedia('(min-width: 1024px)').matches ? 6 : window.matchMedia('(min-width: 640px)').matches ? 3 : 2);
  const [cols, setCols] = useState(get);
  useEffect(() => {
    const onResize = () => setCols(get());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return cols;
}

// ─── Scroll reveal hook ───────────────────────────────────────────────────────
function useReveal() {
  useEffect(() => {
    let io: IntersectionObserver | null = null;

    const timer = setTimeout(() => {
      const els = document.querySelectorAll<Element>('.reveal:not(.visible)');
      if (!els.length) return;

      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add('visible');
              io?.unobserve(e.target);
            }
          });
        },
        { threshold: 0.05, rootMargin: '0px 0px -40px 0px' }
      );

      els.forEach((el) => io!.observe(el));
    }, 80);

    return () => {
      clearTimeout(timer);
      io?.disconnect();
    };
  }, []);
}

// ─── Theme (light / dark) ─────────────────────────────────────────────────────
function useTheme() {
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

const SunIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <circle cx="12" cy="12" r="4.1" />
    <path d="M12 2.4v2.2M12 19.4v2.2M2.4 12h2.2M19.4 12h2.2M5.05 5.05l1.55 1.55M17.4 17.4l1.55 1.55M18.95 5.05L17.4 6.6M6.6 17.4l-1.55 1.55" />
  </svg>
);
const MoonIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 14.6A8 8 0 0 1 9.4 4 6.6 6.6 0 1 0 20 14.6z" />
  </svg>
);
const MenuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);
const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

// ─── Signature motif: altitude / topographic contour lines ────────────────────
// Generated smooth elevation curves — the quiet visual thread unique to the
// estate (1.077 m s.n.m.). Uses currentColor so it adapts to light/dark.
function Contours({
  className = '',
  lines = 9,
  seed = 1,
  opacity = 0.5,
}: {
  className?: string;
  lines?: number;
  seed?: number;
  opacity?: number;
}) {
  const W = 1440;
  const H = 560;
  const paths: string[] = [];
  for (let i = 0; i < lines; i++) {
    const base = H * 0.16 + (i / (lines - 1)) * H * 0.72;
    const amp = 54 + i * 11;
    const pts: string[] = [];
    for (let x = 0; x <= W; x += 16) {
      const t = x / W;
      const y =
        base -
        amp * Math.exp(-Math.pow((t - 0.46) * 3.1, 2)) -
        amp * 0.4 * Math.exp(-Math.pow((t - 0.82) * 5.5, 2)) +
        9 * Math.sin(t * 5.5 + i * 0.7 + seed);
      pts.push(`${x},${y.toFixed(1)}`);
    }
    paths.push('M' + pts.join(' L'));
  }
  return (
    <svg
      className={className}
      viewBox={`0 0 ${W} ${H}`}
      fill="none"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      style={{ opacity }}
    >
      {paths.map((d, i) => (
        <path key={i} d={d} stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}

// ─── Age gate — sober, branded first impression ───────────────────────────────
function AgeGate({ onEnter }: { onEnter: () => void }) {
  const t = useT();
  const site = useSite();
  const [leaving, setLeaving] = useState(false);
  const enter = () => {
    setLeaving(true);
    setTimeout(onEnter, 600);
  };
  return (
    <div
      className={`gate ${leaving ? 'gate--leaving' : ''} fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-panel px-6 text-on-dark`}
    >
      <img
        {...md(`${A}/gate-mountain.png`)}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 size-full object-cover kenburns"
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(180deg, rgba(15,13,11,0.64) 0%, rgba(15,13,11,0.40) 42%, rgba(15,13,11,0.78) 100%)',
        }}
      />
      <div className="relative flex max-w-[560px] flex-col items-center gap-8 text-center">
        <div className="flex flex-col items-center leading-none">
          <span className="font-['Cormorant_Garamond:Regular'] text-[clamp(26px,5.4vw,44px)] tracking-[0.1em] leading-[1.08]">
            {site.name.toUpperCase()}
          </span>
          <span className="mt-4 font-['IBM_Plex_Mono:Medium'] text-[10px] tracking-[0.5em] text-on-dark/70">
            {site.subtitle}
          </span>
        </div>
        <span className="h-px w-14 bg-on-dark/30" />
        <p className="font-['Cormorant_Garamond:Light_Italic'] text-[clamp(20px,2.6vw,30px)] italic leading-[1.4] text-on-dark/90">
          {t.gate.line1}
          <br />
          {t.gate.line2}
        </p>
        <p
          className="max-w-[380px] font-['Archivo:Light'] text-[13px] leading-[1.7] text-on-dark/60"
          style={{ fontVariationSettings: '"wdth" 100' }}
        >
          {t.gate.confirm}
        </p>
        <button
          onClick={enter}
          className="mt-1 border border-on-dark/45 px-11 py-4 font-['Archivo:Regular'] text-[11px] uppercase tracking-[2px] text-on-dark transition-colors hover:bg-on-dark hover:text-panel"
          style={{ fontVariationSettings: '"wdth" 100' }}
        >
          {t.gate.enter}
        </button>
        {t.gate.warning && (
          <p className="mt-1 font-['IBM_Plex_Mono:Regular'] text-[9px] tracking-[1.5px] text-on-dark/45">
            {t.gate.warning}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Editorial "breath" — a centered statement with air around it ─────────────
function Breath({ label, pre, em, post }: { label: string; pre: string; em: string; post: string }) {
  useReveal();
  return (
    <section className="relative overflow-hidden bg-surface px-5 sm:px-8 lg:px-12 py-[clamp(96px,15vh,180px)]">
      {/* faint mountain backdrop so "the place" feels grounded, not empty */}
      <img
        {...md(`${A}/place-bg.jpg`)}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 size-full object-cover object-[50%_42%] opacity-[0.5] dark:opacity-[0.42]"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-surface via-surface/[0.72] to-surface dark:from-surface dark:via-surface/[0.68] dark:to-surface" />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-ink">
        <Contours className="h-full w-full" lines={9} seed={5} opacity={0.08} />
      </div>
      <div className="reveal relative mx-auto flex max-w-[880px] flex-col items-center gap-8 text-center [text-shadow:0_1px_18px_var(--surface)]">
        <span className="flex items-center gap-3 font-['IBM_Plex_Mono:Medium'] text-[9px] tracking-[2.4px] text-accent">
          <span className="h-px w-8 bg-accent/60" />
          {label}
          <span className="h-px w-8 bg-accent/60" />
        </span>
        <p className="font-['Cormorant_Garamond:Light_Italic'] text-[clamp(27px,3.5vw,46px)] italic leading-[1.3] text-ink">
          {pre}
          <em className="text-accent">{em}</em>
          {post}
        </p>
      </div>
    </section>
  );
}

// ─── Shared header ────────────────────────────────────────────────────────────
// Language flags as inline SVG (emoji flags don't render on Windows). EN uses the UK flag to
// match the copy's British spelling.
function Flag({ code, src, className = '' }: { code: Lang; src?: string | null; className?: string }) {
  const base = `block h-[12px] w-[18px] shrink-0 rounded-[2px] ring-1 ring-black/15 ${className}`;
  if (src) return <img src={src} alt="" className={`${base} object-cover`} />;
  if (!['es', 'en', 'pt'].includes(code)) return null;
  if (code === 'es')
    return (
      <svg viewBox="0 0 18 12" className={base} aria-hidden="true">
        <rect width="18" height="12" fill="#AA151B" />
        <rect y="3" width="18" height="6" fill="#F1BF00" />
      </svg>
    );
  if (code === 'pt')
    return (
      <svg viewBox="0 0 20 14" className={base} aria-hidden="true">
        <rect width="20" height="14" fill="#009C3B" />
        <path d="M10 1.4 18.2 7 10 12.6 1.8 7Z" fill="#FFDF00" />
        <circle cx="10" cy="7" r="3.4" fill="#002776" />
      </svg>
    );
  return (
    <svg viewBox="0 0 60 30" className={base} preserveAspectRatio="none" aria-hidden="true">
      <rect width="60" height="30" fill="#012169" />
      <path d="M0 0 60 30M60 0 0 30" stroke="#fff" strokeWidth="6" />
      <path d="M0 0 60 30M60 0 0 30" stroke="#C8102E" strokeWidth="2.4" />
      <path d="M30 0v30M0 15h60" stroke="#fff" strokeWidth="10" />
      <path d="M30 0v30M0 15h60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  );
}

function Header({ page, onNav }: { page: Page; onNav: Nav }) {
  const isHome = page === 'home';
  const { theme, toggle } = useTheme();
  const { lang, setLang, langs } = useLang();
  const site = useSite();
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const go = (p: Page) => {
    setMenuOpen(false);
    onNav(p);
  };
  const navItems: [Page, string][] = [
    ['home', t.nav.home],
    ['vinedos', t.nav.vinedos],
    ['vinos', t.nav.vinos],
    ['galeria', t.nav.galeria],
    ['novedades', t.nav.novedades],
    ['contacto', t.nav.contacto],
  ].filter(([p]) => pageOn(p as Page, site)) as [Page, string][];
  return (
    <header
      className={`z-50 flex items-center justify-between px-5 sm:px-8 lg:px-12 py-5 ${
        isHome
          ? 'absolute top-0 left-0 right-0 bg-gradient-to-b from-[rgba(20,18,15,0.55)] via-[rgba(20,18,15,0.18)] to-transparent'
          : 'sticky top-0 bg-surface border-b border-ink/[0.09]'
      }`}
    >
      <button
        onClick={() => onNav('home')}
        aria-label={clean(site.name)}
        className={`group flex flex-col items-start shrink-0 leading-none ${isHome ? 'text-white' : 'text-ink'}`}
      >
        {site.logo ? (
          <img src={site.logo} {...editAttr('siteSettings', 'siteSettings', 'headerLogo')} alt={clean(site.name)} className="h-[34px] w-auto max-w-[220px] object-contain lg:h-[42px]" />
        ) : (
          <>
            <span className="font-['Cormorant_Garamond:Regular'] text-[15px] sm:text-[18px] lg:text-[22px] leading-[1] tracking-[0.09em] lg:tracking-[0.12em] whitespace-nowrap">
              {site.name.toUpperCase()}
            </span>
            <span
              className={`font-['IBM_Plex_Mono:Medium'] text-[8px] tracking-[0.44em] mt-[7px] pl-px transition-opacity group-hover:opacity-100 ${
                isHome ? 'text-white/70' : 'text-ink/[0.55]'
              }`}
            >
              {site.subtitle}
            </span>
          </>
        )}
      </button>

      <nav className="hidden lg:flex gap-[30px] items-center">
        {navItems.map(([p, label]) => {
          const active = page === p || (page === 'wine-detail' && p === 'vinos');
          return (
            <button
              key={p}
              onClick={() => onNav(p)}
              className={`font-['Archivo:Regular'] text-[11.5px] pb-[3px] transition-opacity ${
                active
                  ? isHome
                    ? 'text-white border-b border-white'
                    : 'text-ink border-b border-ink'
                  : isHome
                  ? 'text-white/80 hover:text-white'
                  : 'text-ink/[0.75] hover:text-ink'
              }`}
              style={{ fontVariationSettings: '"wdth" 100' }}
            >
              {label}
            </button>
          );
        })}
      </nav>

      <div className="flex items-center gap-3 sm:gap-4">
        <div className="hidden lg:flex gap-0.5 items-center">
          {langs.map(({ code, flag }, i) => {
            const activeLang = code === lang;
            return (
              <span key={code} className="flex items-center">
                {i > 0 && (
                  <span className={`w-px h-[11px] ${isHome ? 'bg-white/50' : 'bg-ink/[0.2]'}`} />
                )}
                <button
                  onClick={() => setLang(code as Lang)}
                  aria-current={activeLang ? 'true' : undefined}
                  aria-label={t.a11y.langOf.replace('{lang}', code.toUpperCase())}
                  className={`flex items-center gap-[7px] font-['IBM_Plex_Mono:Medium'] text-[10px] tracking-[1px] px-[9px] py-[7px] transition-opacity ${
                    activeLang
                      ? isHome
                        ? 'text-white'
                        : 'text-ink'
                      : isHome
                      ? 'text-white/50 hover:text-white/80'
                      : 'text-ink/[0.4] hover:text-ink/[0.7]'
                  }`}
                >
                  <Flag code={code} src={flag} className={activeLang ? '' : 'opacity-60'} />
                  {code.toUpperCase()}
                </button>
              </span>
            );
          })}
        </div>

        <span className={`hidden lg:block w-px h-[16px] ${isHome ? 'bg-white/30' : 'bg-ink/[0.15]'}`} />

        <button
          onClick={toggle}
          aria-label={theme === 'dark' ? t.a11y.toLight : t.a11y.toDark}
          title={theme === 'dark' ? t.a11y.light : t.a11y.dark}
          className={`grid place-items-center size-[34px] rounded-full border transition-colors ${
            isHome
              ? 'border-white/30 text-white hover:border-white/70'
              : 'border-ink/[0.2] text-ink hover:border-ink/[0.5]'
          }`}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>

        <button
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? t.a11y.closeMenu : t.a11y.openMenu}
          aria-expanded={menuOpen}
          className={`lg:hidden grid place-items-center size-[34px] ${isHome ? 'text-white' : 'text-ink'}`}
        >
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      {menuOpen && (
        <div className="lg:hidden absolute top-full left-0 right-0 bg-surface border-t border-b border-ink/[0.1] shadow-[0_24px_48px_-24px_rgba(0,0,0,0.45)] px-5 sm:px-8 pt-2 pb-5 flex flex-col">
          {navItems.map(([p, label]) => {
            const active = page === p || (page === 'wine-detail' && p === 'vinos');
            return (
              <button
                key={p}
                onClick={() => go(p)}
                className={`text-left font-['Cormorant_Garamond:Regular'] text-[24px] py-3 border-b border-ink/[0.08] transition-colors ${
                  active ? 'text-ink' : 'text-ink/[0.65]'
                }`}
              >
                {label}
              </button>
            );
          })}
          <div className="flex gap-1.5 items-center pt-4">
            {langs.map(({ code, flag }) => (
              <button
                key={code}
                onClick={() => setLang(code as Lang)}
                aria-current={code === lang ? 'true' : undefined}
                aria-label={t.a11y.langOf.replace('{lang}', code.toUpperCase())}
                className={`flex items-center gap-2 font-['IBM_Plex_Mono:Medium'] text-[11px] tracking-[1px] px-3 py-2 rounded transition-colors ${
                  code === lang ? 'text-ink border border-ink/[0.3]' : 'text-ink/[0.45] border border-transparent'
                }`}
              >
                <Flag code={code} src={flag} className={code === lang ? '' : 'opacity-60'} />
                {code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer({ onNav }: { onNav: Nav }) {
  const t = useT();
  const site = useSite();
  return (
    <footer className="bg-accent-solid">
      <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr] gap-[50px] px-5 sm:px-8 lg:px-12 pt-20 pb-10">
        <div className="flex flex-col gap-[19px]">
          <div className="flex flex-col items-start leading-none text-on-dark">
            <span className="font-['Cormorant_Garamond:Regular'] text-[26px] sm:text-[30px] lg:whitespace-nowrap lg:text-[clamp(20px,2.1vw,30px)] leading-[1.05] tracking-[0.06em]">
              {site.name.toUpperCase()}
            </span>
            <span className="font-['IBM_Plex_Mono:Medium'] text-[9px] tracking-[0.42em] mt-[10px] pl-px text-on-dark/[0.7]">
              {site.subtitle}
            </span>
          </div>
          <p
            className="font-['Archivo:Light'] text-[12.5px] text-on-dark/[0.7] leading-[23px]"
            style={{ fontVariationSettings: '"wdth" 100' }}
          >
            {t.footer.tagline1}
            <br />
            {t.footer.tagline2}
          </p>
        </div>

        <div className="flex flex-col gap-[25px]">
          <div className="flex flex-col gap-[9px]">
            <p className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.36px] text-on-dark/[0.55]">
              {t.footer.officeLabel}
            </p>
            <p
              className="whitespace-pre-line font-['Archivo:Light'] text-[13.5px] text-on-dark leading-[24.3px]"
              style={{ fontVariationSettings: '"wdth" 100' }}
            >
              {site.office}
            </p>
          </div>
          <div className="flex flex-col gap-[9px]">
            <p className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.36px] text-on-dark/[0.55]">
              {t.footer.phoneLabel}
            </p>
            <p
              className="font-['Archivo:Light'] text-[12px] sm:text-[13.5px] text-on-dark leading-[21px] sm:leading-[24.3px]"
              style={{ fontVariationSettings: '"wdth" 100' }}
            >
              {site.phones.map((p) => (
                <span key={p} className="block whitespace-nowrap">{p}</span>
              ))}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-[25px]">
          <div className="flex flex-col gap-[14px]">
            <p className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.36px] text-on-dark/[0.55]">
              {t.footer.contactLabel}
            </p>
            <button
              onClick={() => onNav('contacto')}
              className="border-b border-on-dark/[0.35] pb-[5px] font-['Archivo:Light'] text-[13.5px] text-on-dark text-left leading-[24.3px] hover:border-white/60 transition-colors self-start"
              style={{ fontVariationSettings: '"wdth" 100' }}
            >
              {site.email}
            </button>
          </div>
          <div className="flex flex-col gap-[10px]">
            <p className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.36px] text-on-dark/[0.55]">
              {t.footer.followLabel}
            </p>
            <div className="flex gap-[10px]">
              {site.socials.map((s) => {
                const cls = 'border border-on-dark/[0.35] flex items-center justify-center size-[34px] cursor-pointer hover:border-white/60 transition-colors';
                const label = <span className="font-['IBM_Plex_Mono:Medium'] text-[7px] text-on-dark/[0.6]">{s.label}</span>;
                return s.url ? (
                  <a key={s.label} href={s.url} target="_blank" rel="noopener" aria-label={clean(s.label)} className={cls}>{label}</a>
                ) : (
                  <div key={s.label} className={cls}>{label}</div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-on-dark/[0.2] flex flex-col gap-y-1 gap-x-8 md:flex-row md:items-center md:justify-between md:gap-x-16 px-5 sm:px-8 lg:px-12 pt-[23px] pb-[34px]">
        <span className="whitespace-nowrap font-['IBM_Plex_Mono:Regular'] text-[6px] md:text-[9.5px] text-on-dark/[0.6] tracking-[0.25px] md:tracking-[1.33px]">
          {t.footer.copyright}
        </span>
        <span className="flex items-center gap-3 whitespace-nowrap font-['IBM_Plex_Mono:Regular'] text-[6px] md:text-[9.5px] text-on-dark/[0.6] tracking-[0.25px] md:tracking-[1.33px]">
          <button onClick={() => onNav('privacidad')} className="uppercase underline-offset-4 hover:text-on-dark hover:underline">
            {t.footer.privacy}
          </button>
          {t.footer.warning && <span>{t.footer.warning}</span>}
        </span>
      </div>
    </footer>
  );
}

// ─── Square pair ──────────────────────────────────────────────────────────────
// Photo + text, each exactly half the page width and as tall as it is wide (stacked on mobile).
// Alternate `imgRight` down the page so the squares meet only at their corners.
function SquareSplit({
  img,
  alt,
  imgClass = 'object-center',
  imgRight = false,
  dark = false,
  media,
  children,
}: {
  img?: string;
  media?: React.ReactNode;
  alt: string;
  imgClass?: string;
  imgRight?: boolean;
  dark?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`[container-type:inline-size] ${dark ? 'border-t border-ink/[0.14]' : ''}`}>
      <div className="grid grid-cols-1 lg:grid-cols-2 lg:grid-rows-[minmax(50cqw,auto)]">
        <div className={`group relative aspect-square overflow-hidden lg:aspect-auto ${imgRight ? 'lg:order-2' : ''}`}>
          {media ?? (
            <img
              {...md(img ?? '')}
              alt={alt}
              className={`absolute inset-0 size-full object-cover ${imgClass} transition-transform duration-700 group-hover:scale-105`}
            />
          )}
        </div>
        <div className={`reveal flex flex-col justify-center gap-6 px-6 py-14 sm:px-10 lg:px-[clamp(32px,5vw,88px)] lg:py-16 ${imgRight ? 'lg:order-1' : ''}`}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Gallery ──────────────────────────────────────────────────────────────────
// A horizontal film-strip of the estate: every photo the same height, its own width,
// with a gap between them (so no two share a hard edge) and scroll-snap. Drag on desktop,
// swipe on touch. The whole strip is one focusable scroll region with arrow-key support.
// Each tile's aspect ratio (width / height) so the strip lays out before the lazy images load.
const GALLERY = [0.75, 1.5, 0.817, 1.334, 0.68, 0.75, 1.059, 0.75, 1.334, 0.68, 1.5, 0.75].map((ar, i) => ({
  src: `${A}/gallery-${String(i + 1).padStart(2, '0')}.jpg`,
  ar,
}));

function Gallery({ showHeading = true }: { showHeading?: boolean }) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const [bar, setBar] = useState({ width: 1, left: 0 });

  const updateBar = () => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const width = Math.min(1, el.clientWidth / el.scrollWidth);
    const left = max > 0 ? (el.scrollLeft / max) * (1 - width) : 0;
    setBar({ width, left });
  };
  useEffect(() => {
    updateBar();
    window.addEventListener('resize', updateBar);
    return () => window.removeEventListener('resize', updateBar);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType === 'touch') return; // let touch use native momentum scroll
    drag.current = { x: e.clientX, left: el.scrollLeft, moved: false };
    el.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || !drag.current) return;
    const dx = e.clientX - drag.current.x;
    if (Math.abs(dx) > 4) drag.current.moved = true;
    el.scrollLeft = drag.current.left - dx;
  };
  const endDrag = (e: React.PointerEvent) => {
    const el = ref.current;
    if (el && drag.current) el.releasePointerCapture(e.pointerId);
    drag.current = null;
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    const el = ref.current;
    if (!el) return;
    if (e.key === 'ArrowRight') { el.scrollBy({ left: el.clientWidth * 0.8, behavior: 'smooth' }); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { el.scrollBy({ left: -el.clientWidth * 0.8, behavior: 'smooth' }); e.preventDefault(); }
  };

  return (
    <section className="bg-surface pt-16 lg:pt-[110px] pb-14 lg:pb-[90px]">
      {showHeading && (
        <div className="flex flex-col gap-[18px] px-5 sm:px-8 lg:px-12 reveal">
          <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[2.28px] text-ink/[0.5]">{t.home.galleryEyebrow}</p>
          <h2 className="font-['Cormorant_Garamond:Light'] text-[28px] sm:text-[34px] lg:text-[40px] text-ink leading-[1.14]">{t.home.galleryTitle}</h2>
        </div>
      )}
      <div
        ref={ref}
        role="group"
        aria-label={t.home.galleryTitle}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        onScroll={updateBar}
        className={`${showHeading ? 'mt-9' : 'mt-2 lg:mt-6'} flex gap-3 sm:gap-4 overflow-x-auto scroll-px-5 sm:scroll-px-8 lg:scroll-px-12 px-5 sm:px-8 lg:px-12 snap-x snap-mandatory cursor-grab active:cursor-grabbing outline-none overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`}
      >
        {GALLERY.map((g, i) => (
          <figure
            key={g.src}
            style={{ aspectRatio: g.ar }}
            className="relative m-0 h-[68vw] max-h-[560px] min-h-[320px] shrink-0 snap-start overflow-hidden bg-surface-2"
          >
            <img
              {...md(g.src)}
              alt={`${t.home.galleryTitle} - ${i + 1}`}
              loading="lazy"
              decoding="async"
              draggable={false}
              className="absolute inset-0 size-full select-none object-cover"
            />
          </figure>
        ))}
      </div>
      {/* short, centred progress bar instead of the full-width native scrollbar */}
      <div className="mx-auto mt-7 h-px w-[160px] sm:w-[200px] bg-ink/[0.16]" aria-hidden="true">
        <div
          className="h-full bg-ink/[0.55] transition-[width,margin] duration-150"
          style={{ width: `${bar.width * 100}%`, marginLeft: `${bar.left * 100}%` }}
        />
      </div>
    </section>
  );
}

function Galeria() {
  useReveal();
  const t = useT();
  return (
    <div className="bg-surface w-full">
      <section className="border-b border-ink/[0.12] px-5 sm:px-8 lg:px-12 pt-20 pb-12 lg:pt-24 lg:pb-16">
        <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[2.28px] text-ink/[0.5] reveal">{t.nav.galeria}</p>
        <h1 className="mt-5 max-w-[760px] font-['Cormorant_Garamond:Light'] text-[clamp(42px,6vw,76px)] leading-[1.02] text-ink reveal reveal-d1">
          {t.home.galleryTitle}
        </h1>
      </section>
      <Gallery showHeading={false} />
    </div>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
function Home({ onNav }: { onNav: Nav }) {
  useReveal();
  const t = useT();
  const site = useSite();
  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return (
    <div className="bg-surface w-full">
      {/* HERO — vineyard film (Valle de Uco) with a poster fallback */}
      <section className="relative h-screen min-h-[695px] overflow-hidden bg-surface-3">
        <div className="absolute inset-0">
          {reduceMotion ? (
            <img
              src={site.heroPoster ?? `${A}/hero-andes.jpg`}
              {...editAttr('siteSettings', 'siteSettings', 'heroPoster')}
              alt={t.home.heroEyebrow}
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <video
              className="absolute inset-0 size-full object-cover hero-fade"
              autoPlay
              muted
              loop
              playsInline
              poster={site.heroPoster ?? `${A}/hero-andes.jpg`}
              key={site.heroVideo ?? 'bundled'}
              {...editAttr('siteSettings', 'siteSettings', 'heroVideo')}
            >
              <source src={site.heroVideo ?? `${A}/hero-andes.mp4`} type="video/mp4" />
            </video>
          )}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(180deg, rgba(20,18,15,0.56) 0%, rgba(20,18,15,0.18) 26%, rgba(20,18,15,0.44) 62%, rgba(20,18,15,0.82) 100%)',
            }}
          />
        </div>
        <div className="absolute bottom-[103px] left-5 sm:left-8 lg:left-12 max-w-[760px]">
          <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[2.28px] text-white/80 hero-line-1">
            {t.home.heroEyebrow}
          </p>
          <div className="mt-5">
            <h1 className="font-['Cormorant_Garamond:Regular'] text-[clamp(52px,11vw,116px)] text-on-dark leading-[0.92] tracking-[0.02em] hero-line-2">
              {t.home.heroTitle1}
            </h1>
            <p className="font-['Cormorant_Garamond:Light'] text-[clamp(19px,3.3vw,34px)] text-on-dark/90 leading-[1.1] tracking-[0.34em] mt-2 hero-line-3">
              {t.home.heroTitle2}
            </p>
          </div>
          <p
            className="font-['Archivo:Light'] text-[15px] text-on-dark/[0.82] mt-6 mb-8 leading-[25.5px] hero-line-4 max-w-[450px]"
            style={{ fontVariationSettings: '"wdth" 100' }}
          >
            {t.home.heroSubtitle}
          </p>
          <button
            onClick={() => onNav('vinedos')}
            className="border border-on-dark/[0.6] px-[33px] py-[16px] font-['Archivo:Regular'] text-[11px] tracking-[1.32px] uppercase text-on-dark hover:border-white transition-colors hero-line-4"
            style={{ fontVariationSettings: '"wdth" 100' }}
          >
            {t.home.heroCta}
          </button>
        </div>
      </section>

      {site.showEstate && (<>
      {/* "Unique wines" — text-only pause between the hero and the vineyards (no photo, no wines) */}
      <section className="bg-surface px-5 sm:px-8 lg:px-12 pt-20 pb-14 lg:pt-[130px] lg:pb-[80px] dark:bg-panel">
        <div className="mx-auto flex max-w-[820px] flex-col items-center gap-7 text-center reveal">
          <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[2.28px] text-ink/[0.5]">{t.home.estateEyebrow}</p>
          <h2 className="font-['Cormorant_Garamond:Regular'] text-[clamp(26px,2.7vw,40px)] text-ink leading-[1.28] text-balance">
            {t.home.estateTitle1}
            {t.home.estateTitle2 && (
              <>
                <br />
                {t.home.estateTitle2}
              </>
            )}
          </h2>
          <span className="h-px w-14 bg-ink/[0.25]" aria-hidden="true" />
        </div>
      </section>
      </>)}

      {site.showHomePhoto && (<>
      {/* the vineyards and the Andes behind them, filling the pause above (hard edges, no fade) */}
      <img
        {...md(`${A}/vineyard-autumn-andes.jpg`)}
        alt={t.home.vineyardsPhotoAlt}
        loading="lazy"
        decoding="async"
        className="block h-[clamp(240px,46vw,620px)] w-full object-cover object-[50%_40%]"
      />
      </>)}

      {site.showHomeVineyards && (<>
      {/* Vineyards dark section */}
      <section className="bg-surface dark:bg-panel">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-[60px] justify-center px-5 sm:px-8 lg:px-12 pt-16 lg:pt-[100px] pb-16">
          <div className="flex flex-col gap-[21px] max-w-[562px]">
            <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[2.28px] text-ink/[0.5] reveal">
              {t.home.vyEyebrow}
            </p>
            <h2 className="font-['Cormorant_Garamond:Light'] text-[clamp(28px,3.5vw,44px)] text-ink leading-[1.12] reveal reveal-d1">
              {t.home.vyTitle1} {t.home.vyTitle2}
            </h2>
          </div>
          <div className="flex max-w-[520px] flex-col items-start gap-5 reveal reveal-d2">
            {t.home.vyParas.map((para) => (
              <p
                key={para}
                className="font-['Archivo:Light'] text-[17px] text-ink/[0.78] leading-[1.75]"
                style={{ fontVariationSettings: '"wdth" 100' }}
              >
                {para}
              </p>
            ))}
            {/* the three vineyards are described only on the Vineyards page; Home just points there */}
            <button
              onClick={() => onNav('vinedos', undefined, 'mapa')}
              className="mt-3 border border-ink/[0.45] px-[29px] py-[14px] font-['Archivo:Regular'] text-[10.5px] tracking-[1.26px] uppercase text-ink hover:border-ink/60 dark:hover:border-white/70 transition-colors"
              style={{ fontVariationSettings: '"wdth" 100' }}
            >
              {t.home.vyBtn}
            </button>
          </div>
        </div>

      </section>
      </>)}

      {site.showQuote && (<>
      {/* Quote section */}
      <section className="relative h-[480px] overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0">
          <img {...md(`${A}/quote-bg.jpg`)} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-[rgba(20,18,15,0.6)]" />
        </div>
        <div className="relative text-center px-6 sm:px-12 lg:px-16 max-w-[1080px] reveal">
          {/* balanced wrap: on wide screens the quote sets in three even lines, no lone last word */}
          <p className="font-['Cormorant_Garamond:Light_Italic'] italic text-[clamp(28px,3.4vw,42px)] text-on-dark leading-[1.25] text-balance">
            {t.home.quote}
          </p>
          <p className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.7px] text-on-dark/[0.7] mt-5">
            {t.home.quoteSub}
          </p>
        </div>
      </section>
      </>)}

      {/* Gallery — a horizontal film-strip of the estate, spaced so no two photos share a hard edge */}
      {/* AWARDS */}
      {site.showAwards && <section className="px-5 sm:px-8 lg:px-12 pt-16 lg:pt-[110px] pb-10">
        <div className="flex flex-col gap-[23px] items-center text-center mb-[27px] reveal">
          <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[2.28px] text-ink/[0.5]">{t.home.awardsEyebrow}</p>
          <h2 className="font-['Cormorant_Garamond:Light'] text-[28px] sm:text-[34px] lg:text-[40px] text-ink leading-[1.14] lg:leading-[45.6px]">{t.home.awardsTitle}</h2>
        </div>
        <div className="mx-auto grid max-w-[1180px] grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
          {HOME_AWARDS.map((a, i) => {
            const wine = a.wineId ? t.wineCatalog.find((w) => w.id === a.wineId) : undefined;
            const info = t.home.awardsList[i] ?? { critic: '', note: '' };
            const inner = (
              <>
                <span className="flex size-[124px] items-center justify-center rounded-full border border-ink/[0.16] transition-colors group-hover:border-ink/[0.4] lg:size-[clamp(112px,10vw,150px)]">
                  <img {...md(a.img)} alt={`${info.critic}${wine ? ' — ' + wine.name : ''}`} className="size-[80px] object-contain lg:size-[clamp(72px,6.6vw,100px)]" />
                </span>
                <span className="mt-4 font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.4px] uppercase text-ink/[0.5]">{info.critic}</span>
                <span className="mt-1 font-['Cormorant_Garamond:Regular'] text-[16px] leading-[1.25] text-ink">
                  {wine ? (
                    <>
                      {wine.name} <span className="font-['Cormorant_Garamond:Italic'] italic">{wine.sub}</span>
                    </>
                  ) : (
                    <span className="text-ink/[0.6]">{info.note}</span>
                  )}
                </span>
              </>
            );
            return wine ? (
              <button key={i} onClick={() => onNav('wine-detail', wine.id)} className={`group flex flex-col items-center text-center reveal reveal-d${(i % 6) + 1}`}>
                {inner}
              </button>
            ) : (
              <div key={i} className={`group flex flex-col items-center text-center reveal reveal-d${(i % 6) + 1}`}>
                {inner}
              </div>
            );
          })}
        </div>
      </section>}

      {/* News section */}
      {site.showNews && (
      <section className="bg-surface-2 border-t border-ink/[0.1] px-5 sm:px-8 lg:px-12 pt-16 lg:pt-[101px] pb-16 lg:pb-[100px] mt-16">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div className="flex flex-col gap-[18px]">
            <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[2.28px] text-ink/[0.5] reveal">{t.home.newsEyebrow}</p>
            <h2 className="font-['Cormorant_Garamond:Light_Italic'] italic text-[30px] sm:text-[38px] lg:text-[44px] text-ink leading-[1.12] lg:leading-[49.28px] reveal reveal-d1">{t.home.newsTitle}</h2>
            <p className="font-['Archivo:Light'] text-[14px] text-ink/[0.68] leading-[25.2px] reveal reveal-d2" style={{ fontVariationSettings: '"wdth" 100' }}>
              {t.home.newsPara}
            </p>
          </div>
          <button onClick={() => onNav('novedades')} className="border-b border-ink/[0.4] pb-[6px] font-['Archivo:Regular'] text-[11px] tracking-[1.1px] uppercase text-ink self-end" style={{ fontVariationSettings: '"wdth" 100' }}>
            {t.home.seeMoreNews}
          </button>
        </div>
        <div className="flex flex-col md:flex-row gap-10">
          {t.home.news.map((article, i) => (
            <button key={article.title} className={`flex-1 flex flex-col gap-[17px] cursor-pointer reveal reveal-d${i + 1} text-left`} onClick={() => onNav('novedades')}>
              <div className="overflow-hidden h-[382px]">
                <img {...md(HOME_NEWS_IMGS[i])} alt={article.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
              </div>
              <p className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.36px] text-ink/[0.5]">{article.date}</p>
              <h3 className="font-['Cormorant_Garamond:Regular'] text-[26px] text-ink leading-[32.24px]">{article.title}</h3>
              <p className="font-['Archivo:Light'] text-[13px] text-ink/[0.68] leading-[23.4px]" style={{ fontVariationSettings: '"wdth" 100' }}>{article.desc}</p>
            </button>
          ))}
        </div>
      </section>
      )}
    </div>
  );
}

// Our Wines stage: the landscape behind the bottles and the bottle size, tuned together so the
// bottles stand on the vineyard ground (base at 11% from the stage bottom).
const WINE_LINE_ORDER: WineLine[] = ['VAV', 'RESERVA', 'DAMA', 'NAVIGATO'];
const STAGE_IMG = `${A}/vinos-stage.jpg`;
const STAGE_H = 'h-[360px] sm:h-[440px] lg:h-[clamp(520px,44vw,680px)]';
const BOTTLE_H = 'h-[230px] sm:h-[290px] lg:h-[clamp(300px,25vw,400px)]';
// A lone bottle (filters Dama / Navigato) gets a larger size so it holds the whole stage.
const BOTTLE_H_SOLO = 'h-[290px] sm:h-[365px] lg:h-[clamp(400px,33vw,520px)]';

// ─── NUESTROS VINOS ───────────────────────────────────────────────────────────
function Vinos({ onNav }: { onNav: Nav }) {
  useReveal();
  const t = useT();
  const [filter, setFilter] = useState<'ALL' | WineLine>('ALL');
  // left to right: VAV, Reserva, Dama, Navigato (the catalog order is kept inside each line)
  const wines = t.wineCatalog
    .map((w) => ({ ...w, ...wineMeta(w) }))
    .sort((a, b) => WINE_LINE_ORDER.indexOf(a.line) - WINE_LINE_ORDER.indexOf(b.line));
  const filtered = filter === 'ALL' ? wines : wines.filter((w) => w.line === filter);
  const cols = useGridCols();
  const rows: (typeof filtered)[] = [];
  for (let i = 0; i < filtered.length; i += cols) rows.push(filtered.slice(i, i + cols));

  // The scroll-reveal observer only runs once on mount, so cards that mount
  // when the filter changes would stay hidden (opacity 0). Reveal them instantly
  // on every filter change after the first render.
  const gridRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    gridRef.current?.querySelectorAll('.reveal:not(.visible)').forEach((el) => el.classList.add('visible'));
  }, [filter, cols]);

  return (
    <div className="bg-surface w-full">
      <section className="relative h-[340px] overflow-hidden flex items-stretch">
        {/* on phones the photo is scaled up and raised so the dark band of the mountains sits behind the title;
            from tablets up it is anchored to the top so the blue sky stays behind the title */}
        <img {...md(`${A}/vinos-hero.jpg`)} alt="" className="absolute inset-0 size-full object-cover object-[50%_0%] max-sm:inset-auto max-sm:left-0 max-sm:top-[-10%] max-sm:h-[150%]" />
        {/* a light overall veil so the photo sits back behind the text */}
        <div className="absolute inset-0 bg-[rgba(20,18,15,0.18)]" aria-hidden="true" />
        <div
          className="absolute inset-0"
          style={{ backgroundImage: 'linear-gradient(90deg, rgba(20,18,15,0.62) 0%, rgba(20,18,15,0.3) 46%, rgba(20,18,15,0.08) 100%)' }}
        />
        {/* on phones the text spans the whole bright photo: an even veil keeps it readable */}
        <div className="absolute inset-0 bg-[rgba(20,18,15,0.24)] sm:hidden" aria-hidden="true" />
        {/* from tablets up the foot of the photo is darkened so the paragraph reads over the vines */}
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(20,18,15,0.6)] via-transparent via-[42%] to-transparent max-sm:hidden" aria-hidden="true" />
        {/* the title sits up on the blue sky and the paragraph down on the foot of the mountains and the
            vines, so no white text lands on the snow (same layout on phones and laptops) */}
        <div className="relative w-full px-5 sm:px-8 lg:px-12 py-6 sm:pt-5 sm:pb-6 flex flex-col justify-between gap-4 [text-shadow:0_1px_3px_rgba(0,0,0,0.75),0_2px_16px_rgba(0,0,0,0.55)]">
          <div className="flex flex-col gap-4">
            {/* one line in every language: on smaller screens the size follows the width (PT is the longest) */}
            <h1 className="font-['Cormorant_Garamond:Light'] whitespace-nowrap text-[calc(6.8vw-3px)] sm:text-[min(44px,calc(6.8vw-4px))] lg:text-[52px] text-on-dark leading-[1.12] lg:leading-[57.2px] hero-line-2">{t.vinos.heroTitle}</h1>
          </div>
          <p className="font-['Archivo:Light'] text-[15px] text-on-dark leading-[25.5px] max-w-[540px] text-balance sm:max-w-[820px] hero-line-3" style={{ fontVariationSettings: '"wdth" 100' }}>
            {t.vinos.heroPara}
          </p>
        </div>
      </section>

      {/* Filter tabs */}
      <div className="border-b border-ink/[0.12] flex flex-wrap items-center gap-x-8 gap-y-3 px-5 sm:px-8 lg:px-12 pt-8 lg:pt-10">
        <span className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[1.9px] text-ink/[0.5] pb-4">{t.vinos.filterLabel}</span>
        <div className="flex flex-wrap gap-x-7 gap-y-2">
          {(['ALL', ...WINE_LINE_ORDER] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`relative pb-4 font-['Archivo:Regular'] text-[11px] tracking-[1.65px] transition-colors after:absolute after:inset-x-0 after:-bottom-px after:h-px after:origin-left after:bg-ink after:transition-transform after:duration-500 ${
                filter === f ? 'text-ink after:scale-x-100' : 'text-ink/[0.48] hover:text-ink after:scale-x-0'
              }`}
              style={{ fontVariationSettings: '"wdth" 100' }}
            >
              {t.vinos.filterLabels[f]}
            </button>
          ))}
        </div>
      </div>

      <div ref={gridRef} className="pb-12 lg:pb-20">
        {rows.map((row, r) => (
          <div key={`${cols}-${r}-${filter}`} className="relative">
            {/* the landscape the bottles stand in: mountains above, vineyard ground below */}
            <div className={`absolute inset-x-0 top-0 overflow-hidden ${STAGE_H}`} aria-hidden="true">
              <img {...md(STAGE_IMG)} alt="" className="absolute inset-0 size-full object-cover object-[50%_42%]" />
              <div className="absolute inset-0 bg-black/[0.28]" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/0 from-[55%] to-black/30" />
            </div>
            <div className="relative flex justify-center">
              {row.map((wine, i) => (
                <button
                  key={wine.id}
                  className={`group flex min-w-0 flex-col cursor-pointer text-center reveal reveal-d${(i % 6) + 1} ${row.length === 1 ? 'basis-full sm:basis-1/2 lg:basis-1/3' : 'basis-1/2 sm:basis-1/3 lg:basis-1/6'}`}
                  onClick={() => onNav('wine-detail', wine.id)}
                >
                  <div className={`relative ${STAGE_H}`}>
                    <span className={`absolute bottom-[calc(11%-7px)] left-1/2 h-[12px] -translate-x-1/2 rounded-[50%] bg-black/[0.6] blur-[7px] transition-all duration-700 group-hover:bg-black/[0.4] ${row.length === 1 ? 'w-[110px] lg:w-[140px] group-hover:w-[90px]' : 'w-[78px] lg:w-[96px] group-hover:w-[62px]'}`} aria-hidden="true" />
                    <div className="absolute inset-x-0 bottom-[11%] flex justify-center">
                      <img
                        {...bottle(wine)}
                        alt={wine.name}
                        className={`${row.length === 1 ? BOTTLE_H_SOLO : BOTTLE_H} w-auto object-contain object-bottom drop-shadow-[0_10px_14px_rgba(0,0,0,0.35)] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-2`}
                      />
                    </div>
                  </div>
                  <div className="px-2 lg:px-3 pt-6 pb-8 flex flex-col items-center gap-[10px] [container-type:inline-size]">
                    {/* one line always: the size follows the card's width (cqw), so "Reserva Cabernet Franc" fits at any column count */}
                    <p className="font-['Cormorant_Garamond:Regular'] text-[clamp(11px,9.6cqw,24px)] text-ink leading-[1.12] whitespace-nowrap">
                      {wine.name}{wine.sub && <> {wine.sub}</>}
                    </p>
                    <span className="inline-flex items-center gap-2 font-['Archivo:Regular'] text-[11px] tracking-[0.4px] text-accent" style={{ fontVariationSettings: '"wdth" 100' }}>
                      <span className="border-b border-accent/[0.35] pb-[3px] transition-colors group-hover:border-accent">{t.vinos.fullInfo}</span>
                      <span aria-hidden="true" className="transition-transform duration-500 group-hover:translate-x-1">→</span>
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── VIÑEDOS ──────────────────────────────────────────────────────────────────
function Vinedos() {
  useReveal();
  const t = useT();
  const site = useSite();
  return (
    <div className="bg-surface w-full">
      <section className="relative h-[clamp(480px,62vh,620px)] lg:h-[clamp(620px,86vh,900px)] overflow-hidden flex items-end">
        <div className="absolute inset-0">
          <img
            {...md(`${A}/la-consulta-real.jpg`)}
            alt={t.vinedos.heroTitle1 + ' ' + t.vinedos.heroTitle2}
            className="absolute inset-0 size-full object-cover object-[50%_18%]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[rgba(20,18,15,0.3)] via-transparent via-[32%] to-[rgba(20,18,15,0.6)]" />
          <div className="absolute inset-x-0 bottom-0 h-[68%] bg-gradient-to-t from-[rgba(20,18,15,0.94)] via-[rgba(20,18,15,0.6)] via-[38%] to-transparent" />
        </div>
        <div className="relative px-5 sm:px-8 lg:px-12 pb-10 flex flex-col gap-[11px] [text-shadow:0_2px_16px_rgba(0,0,0,0.95)]">
          <h1 className="font-['Cormorant_Garamond:Light'] text-[clamp(27px,3.7vw,46px)] lg:whitespace-nowrap text-on-dark leading-[1.08] hero-line-2">
            {t.vinedos.heroTitle1} {t.vinedos.heroTitle2}
          </h1>
          <p className="font-['IBM_Plex_Mono:Medium'] text-[9px] sm:text-[9.5px] tracking-[2.28px] text-on-dark/[0.85] hero-line-1">{t.vinedos.heroEyebrow}</p>
        </div>
      </section>

      <section className="border-b border-ink/[0.12] px-5 sm:px-8 lg:px-12 py-14 lg:py-16 flex flex-col gap-6">
        <h2 className="font-['Cormorant_Garamond:Light'] text-[clamp(30px,3.4vw,46px)] text-ink leading-[1.12] reveal">{t.vinedos.introTitle}</h2>
        <p className="max-w-[880px] font-['Archivo:Light'] text-[clamp(18px,1.6vw,22px)] text-ink/[0.84] leading-[1.7] reveal reveal-d1" style={{ fontVariationSettings: '"wdth" 100' }}>
          {t.vinedos.intro1}
        </p>
      </section>

      <section className="border-t border-ink/[0.12] pb-14 lg:pb-24">
        {t.vinedos.cards.map((v, i) => (
          <SquareSplit key={v.italic} imgRight={i % 2 === 1} img={VINEDOS_IMGS[i]} alt={v.name + v.italic}>
            <h3 className="font-['Cormorant_Garamond:Italic'] italic text-[clamp(30px,3vw,44px)] text-ink leading-[1.12]">
              {v.name}<span className="font-['Cormorant_Garamond:Regular'] not-italic">{v.italic}</span>
            </h3>
            <p className="font-['Archivo:Light'] text-[14px] text-ink/[0.7] leading-[25px] max-w-[420px]" style={{ fontVariationSettings: '"wdth" 100' }}>{v.desc}</p>
            <div className="mt-2 max-w-[420px]">
              {v.specs.map((sp, j) => (
                <div key={sp.l} className={`flex items-baseline justify-between gap-4 sm:gap-6 py-[11px] border-t border-ink/[0.14] ${j === v.specs.length - 1 ? 'border-b' : ''}`}>
                  <span className="shrink-0 font-['IBM_Plex_Mono:Regular'] text-[9.5px] text-ink/[0.5]">{sp.l}</span>
                  {/* long values (La Consulta soil) drop a size on phones so they stay on one line */}
                  <span className={`text-right font-['Cormorant_Garamond:Regular'] leading-[1.35] text-ink ${sp.v.length > 40 && sp.v.length < 60 ? 'text-[12.5px] sm:text-[15px]' : 'text-[15px]'}`}>{sp.v}</span>
                </div>
              ))}
            </div>
          </SquareSplit>
        ))}
      </section>

      {/* Map — the Uco Valley in relief, three vineyards side by side */}
      {site.showMap && <UcoMap />}

      {/* Soil — the alluvial fan (with breathing space below the map) */}
      <div className="pt-14 lg:pt-24">
      <SquareSplit
        imgRight
        alt={t.vinedos.narrative.soilTitle}
        media={
          <>
            <img
              {...md(`${A}/soil-laconsulta.jpg`)}
              alt={t.vinedos.narrative.soilTitle}
              className="absolute inset-0 size-full object-cover object-[50%_58%] transition-transform duration-700 group-hover:scale-105"
            />
            {/* caption on the photo, same treatment as the old-vines and hand-picking photos */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/45 to-transparent px-6 pb-6 pt-24 sm:px-10 sm:pb-8">
              <p className="max-w-[540px] font-['Cormorant_Garamond:Italic'] italic text-[clamp(17px,1.55vw,22px)] leading-[1.4] text-white">
                {t.vinedos.narrative.soilCaption}
              </p>
            </div>
          </>
        }
      >
        <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[2.28px] text-ink/[0.5]">{t.vinedos.narrative.soilEyebrow}</p>
        <h2 className="font-['Cormorant_Garamond:Light'] text-[clamp(28px,3.2vw,42px)] text-ink leading-[1.14] max-w-[460px]">{t.vinedos.narrative.soilTitle}</h2>
        <p className="font-['Archivo:Light'] text-[15px] text-ink/[0.74] leading-[1.75] max-w-[520px]" style={{ fontVariationSettings: '"wdth" 100' }}>{t.vinedos.narrative.soilBody}</p>
      </SquareSplit>
      </div>

      {/* Old vines */}
      <SquareSplit
        alt={t.vinedos.narrative.vinesTitle}
        media={
          <>
            <img
              {...md(`${A}/vinedos-vines-1.jpg`)}
              alt={t.vinedos.narrative.vinesTitle}
              className="absolute inset-0 size-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
            />
            {/* caption on the photo, same treatment as the hand-picking photo below */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/45 to-transparent px-6 pb-6 pt-24 sm:px-10 sm:pb-8">
              <p className="max-w-[540px] font-['Cormorant_Garamond:Italic'] italic text-[clamp(17px,1.55vw,22px)] leading-[1.4] text-white">
                {t.vinedos.narrative.vinesCaption}
              </p>
            </div>
          </>
        }
      >
        <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[2.28px] text-ink/[0.5]">{t.vinedos.narrative.vinesEyebrow}</p>
        <h2 className="font-['Cormorant_Garamond:Light'] text-[clamp(28px,3.2vw,42px)] text-ink leading-[1.14] max-w-[460px]">{t.vinedos.narrative.vinesTitle}</h2>
        <p className="font-['Archivo:Light'] text-[15px] text-ink/[0.78] leading-[1.75] max-w-[520px]" style={{ fontVariationSettings: '"wdth" 100' }}>{t.vinedos.narrative.vinesBody1}</p>
        <p className="font-['Archivo:Light'] text-[15px] text-ink/[0.78] leading-[1.75] max-w-[520px]" style={{ fontVariationSettings: '"wdth" 100' }}>{t.vinedos.narrative.vinesBody2}</p>
      </SquareSplit>

      {/* Craftsmanship — hand-harvested, minimal intervention */}
      <div className="bg-panel">
        <SquareSplit
          imgRight
          alt={t.vinedos.narrative.craftTitle}
          media={
            <>
              <img
                {...md(`${A}/vinedos-hands.jpg`)}
                alt={t.vinedos.narrative.craftTitle}
                className="absolute inset-0 size-full object-cover object-[50%_45%] transition-transform duration-700 group-hover:scale-105"
              />
              {/* caption right under the hand-picking photo, before the Craftsmanship text */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/45 to-transparent px-6 pb-6 pt-24 sm:px-10 sm:pb-8">
                <p className="max-w-[540px] font-['Cormorant_Garamond:Italic'] italic text-[clamp(17px,1.55vw,22px)] leading-[1.4] text-white">
                  {t.vinedos.narrative.craftCaption}
                </p>
              </div>
            </>
          }
        >
          <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[2.28px] text-on-dark/[0.5]">{t.vinedos.narrative.craftEyebrow}</p>
          <h2 className="font-['Cormorant_Garamond:Light'] text-[clamp(26px,2.8vw,38px)] text-on-dark leading-[1.18] max-w-[500px]">{t.vinedos.narrative.craftTitle}</h2>
          <p className="font-['Archivo:Light'] text-[15px] text-on-dark/[0.78] leading-[1.75] max-w-[520px]" style={{ fontVariationSettings: '"wdth" 100' }}>{t.vinedos.narrative.craftBody1}</p>
          <p className="font-['Archivo:Light'] text-[15px] text-on-dark/[0.78] leading-[1.75] max-w-[520px]" style={{ fontVariationSettings: '"wdth" 100' }}>{t.vinedos.narrative.craftBody2}</p>
          <p className="font-['Archivo:Light'] text-[15px] text-on-dark/[0.78] leading-[1.75] max-w-[520px]" style={{ fontVariationSettings: '"wdth" 100' }}>{t.vinedos.narrative.craftBody3}</p>
        </SquareSplit>
      </div>
    </div>
  );
}

// ─── NOVEDADES ────────────────────────────────────────────────────────────────
function Novedades() {
  useReveal();
  const t = useT();
  return (
    <div className="bg-surface w-full">
      <section className="border-b border-ink/[0.12] flex flex-col md:flex-row md:items-end md:justify-between gap-5 px-5 sm:px-8 lg:px-12 pt-20 pb-[51px]">
        <div className="flex flex-col gap-[18px]">
          <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[2.28px] text-ink/[0.5] reveal">{t.novedades.eyebrow}</p>
          <h1 className="font-['Cormorant_Garamond:Light_Italic'] italic text-[34px] sm:text-[42px] lg:text-[50px] text-ink leading-[1.1] lg:leading-[55px] reveal reveal-d1">{t.novedades.title}</h1>
        </div>
        <p className="font-['Archivo:Light'] text-[14px] text-ink/[0.68] leading-[25.2px] max-w-[420px] reveal reveal-d2" style={{ fontVariationSettings: '"wdth" 100' }}>
          {t.novedades.para}
        </p>
      </section>

      <section className="border-b border-ink/[0.12] grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-[50px] px-5 sm:px-8 lg:px-12 pt-[60px] pb-[41px]">
        <div className="overflow-hidden reveal" style={{ aspectRatio: '630/394' }}>
          <img {...md(IMG.vinexpo, 'news-featured')} alt={t.novedades.featured.title1} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
        </div>
        <div className="flex flex-col gap-[19px] justify-center reveal reveal-d2">
          <p className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.36px] text-ink/[0.5]">{t.novedades.featured.tag}</p>
          <h2 className="font-['Cormorant_Garamond:Regular'] text-[34px] text-ink leading-[40.8px]">
            {t.novedades.featured.title1}<br />{t.novedades.featured.title2}
          </h2>
          <p className="font-['Archivo:Light'] text-[13.5px] text-ink/[0.7] leading-[25px]" style={{ fontVariationSettings: '"wdth" 100' }}>
            {t.novedades.featured.desc}
          </p>
          <button className="self-start border-b border-accent/[0.4] pb-[6px] font-['Archivo:Regular'] text-[11px] tracking-[1.1px] uppercase text-accent">
            {t.novedades.readNote}
          </button>
        </div>
      </section>

      <section className="flex flex-col md:flex-row gap-[34px] px-5 sm:px-8 lg:px-12 pt-10 pb-[90px]">
        {t.novedades.articles.map((a, i) => (
          <article key={a.title} className={`flex-1 flex flex-col gap-[15px] cursor-pointer reveal reveal-d${i + 1}`}>
            <div className="overflow-hidden" style={{ aspectRatio: '372/248' }}>
              <img {...md(NOVEDADES_ARTICLE_IMGS[i], `news-${i + 1}`)} alt={a.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
            </div>
            <p className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.36px] text-ink/[0.5] mt-1">{a.tag}</p>
            <h3 className="font-['Cormorant_Garamond:Regular'] text-[23px] text-ink leading-[28.75px]">{a.title}</h3>
            <p className="font-['Archivo:Light'] text-[12.5px] text-ink/[0.68] leading-[22.5px]" style={{ fontVariationSettings: '"wdth" 100' }}>{a.desc}</p>
            <button className="self-start border-b border-accent/[0.35] pb-[5px] font-['Archivo:Regular'] text-[10.5px] text-accent mt-2">
              {t.novedades.readNote}
            </button>
          </article>
        ))}
      </section>
    </div>
  );
}

// ─── Location map — the three estates, close up ───────────────────────────────
// Natural satellite view (Sentinel-2, see ucofincas.ts) framed on the three estates, pinned at the
// coordinates of the Google Maps list "Fincas Altamira de los Andes". Each pin opens a card with its
// copy from the Vineyards page. The frame is fitted to the box it sits in, so the whole map always
// fits on one screen. North-up like the client's Google Maps view: the Andes fill the west and the
// estates sit at their foot, on the east.
// the area that must always be visible (ucomap units); the frame grows around it to fill the box.
const UCO_FOCUS_DESKTOP = [-1050, 250, 2950, 1150] as const;
const UCO_FOCUS_MOBILE = [500, 450, 1400, 800] as const;
const UCO_GOLD = '#f0d6a0';
const UCO_GREEN = '#9cc46e';
const UCO_WATER = '#2f6f99';
const UCO_WATER_CORE = '#5d9ac0';
// index ↔ t.vinedos.cards (Altamira, Vista Flores, La Consulta); the label side keeps the names apart
const UCO_FINCAS = [
  { key: 'altamira', name: 'Altamira', pt: FINCAS_PT.altamira, pref: 'below' },
  { key: 'vistaFlores', name: 'Vista Flores', pt: FINCAS_PT.vistaFlores, pref: 'above' },
  { key: 'laConsulta', name: 'La Consulta', pt: FINCAS_PT.laConsulta, pref: 'leftHigh' },
] as const;
// the Tunuyán as points in ucomap units, to keep every pin name off the blue line
const UCO_RIVER_PTS = [...UCO_RIVER.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map((m) => [+m[1], +m[2]] as const);
// where a pin name can sit, relative to the pin: [anchor x, anchor y, shift x, shift y] (shifts × label size)
const UCO_LABEL_SPOTS = {
  leftHigh: [-0.95, -0.15, -1, -1], rightLow: [0.95, 0, 0, -0.25], belowNear: [-0.6, 1, 0, 0], below: [0, 1, -0.5, 0], above: [0, -1, -0.5, -1], aboveLeft: [-1, -1, -1, -1], belowLeft: [-1, 1, -1, 0],
  belowRight: [1, 1, 0, 0], aboveRight: [1, -1, 0, -1], left: [-1, 0, -1, -0.5], right: [1, 0, 0, -0.5],
} as const;
type UcoSpot = keyof typeof UCO_LABEL_SPOTS;
const UCO_WRAP_W = 96;
// a point on the Tunuyán between the estates and the river's heading there
const UCO_RIVER_LABEL = { pt: [850, 960], angle: 0 } as const;

function useMedia(query: string) {
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

// Fit the focus box into a w×h box, growing the frame around it (never past the close-up image)
function ucoFrame(focus: readonly number[], w: number, h: number) {
  const [fx, fy, fw, fh] = focus;
  const [ix, iy, iw, ih] = FINCAS_IMG;
  let vw = fw;
  let vh = fh;
  if (w / h > fw / fh) vw = (fh * w) / h;
  else vh = (fw * h) / w;
  const s = Math.min(1, iw / vw, ih / vh);
  vw *= s;
  vh *= s;
  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
  return [clamp(fx + fw / 2 - vw / 2, ix, ix + iw - vw), clamp(fy + fh / 2 - vh / 2, iy, iy + ih - vh), vw, vh] as const;
}

function UcoInset({ className }: { className?: string }) {
  return (
    <svg viewBox="520 20 280 540" className={className} aria-hidden="true">
      <path d={CHILE} fill="none" stroke="#f2ede4" strokeOpacity="0.22" strokeWidth="1.4" strokeLinejoin="round" />
      <path d={ARG_REST} fill="#f2ede4" fillOpacity="0.1" stroke="#f2ede4" strokeOpacity="0.5" strokeWidth="1.4" strokeLinejoin="round" />
      <path d={ARG_MENDOZA} fill={UCO_GOLD} stroke={UCO_GOLD} strokeWidth="1.4" strokeLinejoin="round" />
      {/* the valley is a thin strip at this scale: a soft halo and a firm edge keep it readable */}
      <path d={ARG_UCO} fill={UCO_GREEN} stroke={UCO_GREEN} strokeOpacity="0.35" strokeWidth="5" strokeLinejoin="round" />
      <path d={ARG_UCO} fill={UCO_GREEN} stroke={UCO_GREEN} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function UcoMap() {
  const t = useT();
  const art = t.vinedos.mapArt;
  const cards = t.vinedos.cards;
  // the cards array and the pins are in different orders, so match each finca to its card by name
  const cardFor = (i: number) =>
    cards.find((c) => c.num.toUpperCase().includes(UCO_FINCAS[i].name.toUpperCase())) ?? cards[i];
  const mobile = useMedia('(max-width: 1023px)');
  const boxRef = useRef<HTMLDivElement>(null);
  // first guess of the map box (the ResizeObserver below replaces it): the grid's 1.68fr column, or the full width on phones
  const [size, setSize] = useState<[number, number]>(() => {
    if (typeof window === 'undefined') return [1160, 780];
    const { innerWidth: iw, innerHeight: ih } = window;
    return iw < 1024
      ? [iw, Math.min(ih * 0.72, 600)]
      : [iw - Math.max(320, iw * 0.16), Math.min(Math.max(ih - 72, 560), 900)];
  });
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      if (width > 0 && height > 0) setSize([width, height]);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const [vx, vy, vw, vh] = ucoFrame(mobile ? UCO_FOCUS_MOBILE : UCO_FOCUS_DESKTOP, size[0], size[1]);
  const [ix, iy, iw] = FINCAS_IMG;
  const [winW, setWinW] = useState(() => (typeof window === 'undefined' ? 1280 : window.innerWidth));
  useEffect(() => {
    const on = () => setWinW(window.innerWidth);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  const [open, setOpen] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const px = (v: number) => `${((v - vx) / vw) * 100}%`;
  const py = (v: number) => `${((v - vy) / vh) * 100}%`;
  const at = (p: readonly number[]) => ({ left: px(p[0]), top: py(p[1]) });

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const sel = open !== null ? UCO_FINCAS[open].pt : null;
  // each pin name takes its preferred spot unless that crosses the river or leaves the map; then the first spot that doesn't
  const fontPx = Math.min(22, Math.max(16, winW * 0.015));
  // the "Andes Range" pill is an obstacle too: [x, y, w, h]
  const pillPx = Math.min(15, Math.max(11, winW * 0.011));
  const [pillW, pillH] = [clean(art.andes).length * pillPx * (mobile ? 0.95 : 1.15) + (mobile ? 32 : 44), pillPx * 1.4 + 16];
  const pill = [(mobile ? 0.5 : 0.22) * size[0] - pillW / 2, 0.12 * size[1] - pillH / 2, pillW, pillH];
  // returns the spot and whether the name wraps onto two lines (UCO_WRAP_W wide) to fit beside a pin near the map edge
  const labelSpot = (i: number): [UcoSpot, boolean] => {
    const sx = size[0] / vw;
    const sy = size[1] / vh;
    const [cx, cy] = [(UCO_FINCAS[i].pt[0] - vx) * sx, (UCO_FINCAS[i].pt[1] - vy) * sy];
    const wFull = clean(art.vineyards[i]).length * fontPx * 0.48;
    const gap = 26;
    const clear = (k: UcoSpot, wrap: boolean) => {
      const w = wrap ? Math.min(wFull, UCO_WRAP_W) : wFull;
      const h = fontPx * 1.15 * (wrap && wFull > UCO_WRAP_W ? 2 : 1);
      const [ax, ay, tx, ty] = UCO_LABEL_SPOTS[k];
      const x0 = cx + ax * gap + tx * w;
      const y0 = cy + ay * gap + ty * h;
      if (x0 < 6 || x0 + w > size[0] - 6 || y0 < 4 || y0 + h > size[1] - 4) return false;
      if (x0 < pill[0] + pill[2] + 6 && x0 + w > pill[0] - 6 && y0 < pill[1] + pill[3] + 6 && y0 + h > pill[1] - 6) return false;
      const hitsPin = UCO_FINCAS.some((o, j) => {
        if (j === i) return false;
        const [ox, oy] = [(o.pt[0] - vx) * sx, (o.pt[1] - vy) * sy];
        return x0 < ox + 28 && x0 + w > ox - 28 && y0 < oy + 28 && y0 + h > oy - 28;
      });
      if (hitsPin) return false;
      return !UCO_RIVER_PTS.some(([rx, ry], j) => {
        const pts = j ? [[rx, ry], [(rx + UCO_RIVER_PTS[j - 1][0]) / 2, (ry + UCO_RIVER_PTS[j - 1][1]) / 2]] : [[rx, ry]];
        return pts.some(([qx, qy]) => {
          const x = (qx - vx) * sx;
          const y = (qy - vy) * sy;
          return x > x0 - 4 && x < x0 + w + 4 && y > y0 - 4 && y < y0 + h + 4;
        });
      });
    };
    // beside the pin first (same side of the river as the pin), one line then two, then anywhere that is clear
    const near = [UCO_FINCAS[i].pref, 'belowNear', 'belowRight', 'right', 'aboveRight'] as UcoSpot[];
    const tries: [UcoSpot, boolean][] = [
      [UCO_FINCAS[i].pref, false],
      [UCO_FINCAS[i].pref, true],
      ...near.map((k): [UcoSpot, boolean] => [k, false]),
      ...near.map((k): [UcoSpot, boolean] => [k, true]),
      ...(Object.keys(UCO_LABEL_SPOTS) as UcoSpot[]).map((k): [UcoSpot, boolean] => [k, false]),
    ];
    return tries.find(([k, wrap]) => clear(k, wrap)) ?? [UCO_FINCAS[i].pref, false];
  };
  const shadow = '[text-shadow:0_1px_10px_rgba(0,0,0,0.85)]';

  const header = (
    <div className="flex flex-col gap-4">
      <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[2.28px] text-[#f0d6a0]">{t.vinedos.mapLabel}</p>
      <h2 className={`font-['Cormorant_Garamond:Light'] text-[clamp(34px,3.6vw,52px)] leading-[1.02] text-on-dark ${shadow}`}>
        {art.valley}
        <span className="block font-['Cormorant_Garamond:Light_Italic'] italic text-on-dark/75">{art.mendoza.charAt(0) + art.mendoza.slice(1).toLowerCase()}</span>
      </h2>
      <p className={`max-w-[340px] font-['Archivo:Light'] text-[13.5px] leading-[24px] text-on-dark/85 ${shadow}`} style={{ fontVariationSettings: '"wdth" 100' }}>
        {t.vinedos.mapDesc}
      </p>
      <p className="flex items-center gap-3 font-['IBM_Plex_Mono:Medium'] text-[9px] tracking-[0.2em] uppercase text-[#f0d6a0]">
        <span className="relative inline-block size-[7px] rounded-full bg-[#f0d6a0]">
          <span className="uco-pulse !size-[7px]" />
        </span>
        {art.hint}
      </p>
    </div>
  );

  return (
    <section id="mapa" className="relative scroll-mt-[72px] overflow-hidden border-t border-on-dark/[0.12] bg-[#0b0907] text-on-dark">
      <div className="lg:grid lg:h-[clamp(560px,calc(100svh-72px),900px)] lg:grid-cols-[minmax(320px,0.32fr)_minmax(0,1.68fr)]">
      <div className="flex flex-col gap-8 px-5 sm:px-8 pt-16 pb-8 lg:min-h-0 lg:gap-[clamp(16px,3vh,32px)] lg:overflow-hidden lg:px-[clamp(24px,2.6vw,48px)] lg:py-[clamp(24px,5vh,56px)]">
        {header}
        {!mobile && (
          <div className="flex min-h-0 flex-1 flex-col justify-end">
            {/* the Argentina inset takes whatever height is left, so the column never overflows the map */}
            <div className="flex min-h-0 flex-1 items-start gap-3">
              <UcoInset className="h-full max-h-[400px] w-auto min-w-0 shrink" />
              <div className="flex flex-col gap-[2px] pt-2">
                <span className="font-['IBM_Plex_Mono:Medium'] text-[12px] tracking-[0.2em] uppercase whitespace-nowrap text-[#9cc46e]">{art.valley}</span>
                <span className="font-['IBM_Plex_Mono:Medium'] text-[12px] tracking-[0.2em] text-[#f0d6a0]">{art.mendoza}</span>
                <span className="font-['IBM_Plex_Mono:Medium'] text-[12px] tracking-[0.2em] text-on-dark/70">{art.argentina}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div
        ref={boxRef}
        className="relative h-[min(72svh,600px)] w-full overflow-hidden [container-type:inline-size] lg:h-full"
        onClick={() => setOpen(null)}
      >
        <img
          src={`${A}/uco-fincas.webp`}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className="absolute max-w-none select-none"
          style={{ width: `${(iw / vw) * 100}%`, left: `${((ix - vx) / vw) * 100}%`, top: `${((iy - vy) / vh) * 100}%` }}
        />
        {/* soft edges into the section; on desktop also into the text column */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(11,9,7,0.5)_0%,transparent_14%,transparent_84%,rgba(11,9,7,0.7)_100%)]" />
        {!mobile && <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(11,9,7,0.9)_0%,transparent_12%)]" />}

        <svg viewBox={`${vx} ${vy} ${vw} ${vh}`} preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full">
          <defs>
            <filter id="uco-glow" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="4" />
            </filter>
            {/* ucomap's river stops inside the range: fade it in from there */}
            <linearGradient id="uco-river-fade" gradientUnits="userSpaceOnUse" x1="180" y1="0" x2="460" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="1" stopColor="#fff" />
            </linearGradient>
            <mask id="uco-river-mask" maskUnits="userSpaceOnUse" x="-2000" y="-1000" width="6000" height="4000">
              <rect x="-2000" y="-1000" width="6000" height="4000" fill="url(#uco-river-fade)" />
            </mask>
          </defs>
          <g mask="url(#uco-river-mask)">
            <path d={UCO_RIVER} fill="none" stroke={UCO_WATER} strokeOpacity="0.65" strokeWidth="9" filter="url(#uco-glow)" />
            <path d={UCO_RIVER} fill="none" stroke={UCO_WATER_CORE} strokeOpacity="1" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </g>
        </svg>

        {/* context labels */}
        <span
          className={`pointer-events-none absolute whitespace-nowrap font-['Cormorant_Garamond:Regular'] italic text-[clamp(15px,1.5vw,22px)] tracking-[0.08em] text-[#bfe4fb] [text-shadow:0_1px_12px_rgba(0,0,0,0.95),0_0_2px_rgba(0,0,0,0.9)]`}
          style={{ ...at(UCO_RIVER_LABEL.pt), transform: `translate(-50%,-50%) rotate(${UCO_RIVER_LABEL.angle}deg) translateY(-15px)` }}
        >
          {art.river}
        </span>
        <span
          className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-on-dark/25 bg-[#0b0907]/70 px-4 py-2 font-['IBM_Plex_Mono:Medium'] text-[clamp(11px,1.1vw,15px)] uppercase tracking-[0.3em] lg:px-5 lg:tracking-[0.5em] text-on-dark backdrop-blur-sm ${shadow}`}
          style={{ left: mobile ? '50%' : '22%', top: '12%' }}
        >
          {art.andes}
        </span>
        {!mobile && (
          <span
            className={`pointer-events-none absolute right-[2.5%] flex -translate-y-1/2 items-center gap-2 font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[0.2em] uppercase text-on-dark/80 ${shadow}`}
            style={{ top: '8%' }}
          >
            {art.toMendoza}
            <svg width="10" height="8" viewBox="0 0 10 8" className="-rotate-90" aria-hidden="true"><path d="M10 4 5 8V5H0V3h5V0Z" fill="currentColor" /></svg>
          </span>
        )}

        {/* the three estates */}
        {UCO_FINCAS.map((f, i) => {
          const active = open === i || hover === i;
          const dim = open !== null && open !== i;
          return (
            <button
              key={f.key}
              type="button"
              aria-label={art.vineyards[i]}
              aria-expanded={open === i}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(open === i ? null : i);
              }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              className={`group absolute z-10 -translate-x-1/2 -translate-y-1/2 outline-none transition-opacity duration-500 ${dim ? 'opacity-45' : ''}`}
              style={at(f.pt)}
            >
              <span className={`relative grid size-[46px] place-items-center rounded-full border border-[#f0d6a0]/60 transition-colors duration-300 ${active ? 'bg-[#f0d6a0]/40' : 'bg-black/10'} group-focus-visible:ring-2 group-focus-visible:ring-[#f0d6a0]`}>
                <span className={`relative block rounded-full border-2 border-[#0b0907] bg-[#f0d6a0] shadow-[0_0_0_1px_rgba(240,214,160,0.6),0_4px_14px_rgba(0,0,0,0.6)] transition-all duration-300 ${active ? 'size-[24px]' : 'size-[20px]'}`} />
                {!dim && <span className="uco-pulse" />}
              </span>
              <span
                className={`pointer-events-none absolute whitespace-nowrap font-['Cormorant_Garamond:Regular'] text-[clamp(16px,1.5vw,22px)] leading-none text-white ${shadow}`}
                style={(() => {
                  const [spot, wrap] = labelSpot(i);
                  const [ax, ay, tx, ty] = UCO_LABEL_SPOTS[spot];
                  return {
                    left: `calc(50% + ${ax * 26}px)`,
                    top: `calc(50% + ${ay * 26}px)`,
                    transform: `translate(${tx * 100}%, ${ty * 100}%)`,
                    ...(wrap && { whiteSpace: 'normal' as const, width: UCO_WRAP_W, lineHeight: 1.1, textAlign: 'left' as const }),
                  };
                })()}
              >
                {art.vineyards[i]}
              </span>
            </button>
          );
        })}

        {/* info card */}
        {open !== null && sel && (
          <div
            role="dialog"
            aria-label={art.vineyards[open]}
            onClick={(e) => e.stopPropagation()}
            className={`uco-card absolute z-20 border border-[#f0d6a0]/25 bg-[#0d0b08]/[0.9] p-6 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur-md ${
              mobile ? 'inset-x-3 bottom-3 max-h-[78svh] overflow-y-auto' : 'w-[330px] max-h-[calc(100%-32px)] overflow-y-auto'
            }`}
            style={
              mobile
                ? undefined
                : {
                    left:
                      sel[0] > vx + vw / 2
                        ? `clamp(16px, calc(${px(sel[0])} - 380px), calc(100% - 346px))`
                        : `clamp(16px, calc(${px(sel[0])} + 50px), calc(100% - 346px))`,
                    top: `clamp(16px, calc(${py(sel[1])} - 190px), calc(100% - 490px))`,
                  }
            }
          >
            <div className="flex items-start justify-between gap-4">
              <p className="font-['IBM_Plex_Mono:Medium'] text-[9px] tracking-[0.24em] text-[#f0d6a0]/85">
                {UCO_FINCAS[open].name.toUpperCase()}
              </p>
              <button
                type="button"
                aria-label={art.close}
                onClick={() => setOpen(null)}
                className="-mr-2 -mt-2 grid size-8 place-items-center text-on-dark/60 transition-colors hover:text-on-dark"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M1 1l10 10M11 1 1 11" stroke="currentColor" strokeWidth="1.2" /></svg>
              </button>
            </div>
            <h3 className="mt-2 font-['Cormorant_Garamond:Light'] text-[30px] leading-[1.05] text-on-dark">{art.vineyards[open]}</h3>
            <p className="mt-3 font-['Archivo:Light'] text-[13px] leading-[22px] text-on-dark/75" style={{ fontVariationSettings: '"wdth" 100' }}>
              {cardFor(open).desc}
            </p>
            <dl className="mt-4">
              {cardFor(open).specs.map((s) => (
                <div key={s.l} className="flex items-baseline justify-between gap-5 border-t border-on-dark/[0.14] py-[9px] last:border-b">
                  <dt className="shrink-0 font-['IBM_Plex_Mono:Regular'] text-[9px] tracking-[0.12em] text-on-dark/55">{s.l}</dt>
                  <dd className="text-right font-['Cormorant_Garamond:Regular'] text-[15px] leading-[1.35] text-on-dark">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

      </div>
      </div>

      {mobile && (
        <div className="flex flex-col gap-6 px-5 sm:px-8 pb-14 pt-6">
          <div className="flex justify-center">
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-end gap-[2px] pt-1 text-right">
                <span className="font-['IBM_Plex_Mono:Medium'] text-[10.5px] tracking-[0.2em] uppercase whitespace-nowrap text-[#9cc46e]">{art.valley}</span>
                <span className="font-['IBM_Plex_Mono:Medium'] text-[10.5px] tracking-[0.2em] text-[#f0d6a0]">{art.mendoza}</span>
                <span className="font-['IBM_Plex_Mono:Medium'] text-[10.5px] tracking-[0.2em] text-on-dark/55">{art.argentina}</span>
              </div>
              <UcoInset className="h-[270px] w-auto shrink-0" />
            </div>
          </div>
        </div>
      )}

    </section>
  );
}

// ─── CONTACTO ─────────────────────────────────────────────────────────────────
function Contacto({ onNav, inquiryWineId }: { onNav: Nav; inquiryWineId: string | null }) {
  useReveal();
  const t = useT();
  const site = useSite();
  const inquiryWine = inquiryWineId ? t.wineCatalog.find((w) => w.id === inquiryWineId) : undefined;
  const inquiryName = inquiryWine ? `${inquiryWine.name} ${inquiryWine.sub}` : '';
  const CELLAR = `${A}/altamira-vy.jpg`;
  const fields = [
    { label: t.contacto.fields[0], type: 'text' },
    { label: t.contacto.fields[1], type: 'email' },
    { label: t.contacto.fields[2], type: 'tel' },
    { label: t.contacto.fields[3], type: 'text' },
  ];
  return (
    <div className="bg-surface w-full">
      <div className="flex flex-col lg:flex-row lg:min-h-[calc(100vh-72px)]">
        {/* Phones: the vineyard-and-Andes photo as a clear band on top (the sign photo closes the page below) */}
        <div className="relative h-[clamp(240px,62vw,340px)] lg:hidden">
          <img {...md(`${A}/contact-mobile-bg.jpg`)} alt="" className="absolute inset-0 size-full object-cover object-[50%_42%]" />
        </div>
        {/* Form left */}
        <div className="relative isolate -mt-px flex-1 bg-surface pt-10 pb-20 px-5 sm:px-9 lg:mt-0 lg:py-20 lg:px-14 flex flex-col">
          <div className="flex flex-col gap-[18px] mb-[25px] reveal">
            <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[2.28px] text-ink/[0.5]">{t.contacto.eyebrow}</p>
            <h1 className="font-['Cormorant_Garamond:Light_Italic'] italic text-[32px] sm:text-[40px] lg:text-[46px] text-ink leading-[1.1] lg:leading-[50.6px]">{t.contacto.title}</h1>
          </div>
          <p className="font-['Archivo:Light'] text-[14px] text-ink/[0.7] leading-[25.9px] mb-8 reveal reveal-d1" style={{ fontVariationSettings: '"wdth" 100' }}>
            {t.contacto.intro1}<br />
            {t.contacto.intro2}
          </p>
          {inquiryWine && (
            <div className="mb-9 flex items-center gap-4 border-y border-ink/[0.14] py-4 reveal reveal-d1">
              <img {...bottle(inquiryWine)} alt="" className="h-[64px] w-auto object-contain" />
              <div className="flex flex-col gap-1">
                <span className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.36px] text-ink/[0.5]">{t.contacto.regarding}</span>
                <span className="font-['Cormorant_Garamond:Regular'] text-[20px] leading-[1.2] text-ink">
                  {inquiryWine.name} <span className="font-['Cormorant_Garamond:Italic'] italic">{inquiryWine.sub}</span>
                </span>
              </div>
            </div>
          )}
          <form className="flex flex-col gap-0 reveal reveal-d2">
            {fields.map((field, i) => (
              <div key={field.label} className="flex flex-col gap-[9px] mb-9">
                <label htmlFor={`cf-${i}`} className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.36px] text-ink/[0.5]">{field.label}</label>
                <input
                  id={`cf-${i}`}
                  type={field.type}
                  className="border-b border-ink/[0.28] bg-transparent outline-none font-['Archivo:Light'] text-[14px] text-ink py-2 focus:border-ink transition-colors"
                  style={{ fontVariationSettings: '"wdth" 100' }}
                />
              </div>
            ))}
            <div className="flex flex-col gap-[9px] mb-7">
              <label htmlFor="cf-msg" className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.36px] text-ink/[0.5]">{t.contacto.messageLabel}</label>
              <textarea
                id="cf-msg"
                key={inquiryName}
                defaultValue={inquiryName ? t.contacto.inquiry.replace('{wine}', inquiryName) : ''}
                className="border-b border-ink/[0.28] bg-transparent outline-none font-['Archivo:Light'] text-[14px] text-ink py-2 resize-none h-[80px] focus:border-ink transition-colors"
                style={{ fontVariationSettings: '"wdth" 100' }}
              />
            </div>
            <p className="mb-6 font-['Archivo:Light'] text-[12px] leading-[20px] text-ink/[0.55]" style={{ fontVariationSettings: '"wdth" 100' }}>
              {t.contacto.consentPre}
              <button type="button" onClick={() => onNav('privacidad')} className="underline underline-offset-4 hover:text-ink">
                {t.contacto.consentLink}
              </button>
              .
            </p>
            <button
              type="submit"
              className="self-start bg-panel px-[34px] py-[15px] font-['Archivo:Regular'] text-[11px] tracking-[1.32px] uppercase text-on-dark hover:bg-panel-2 transition-colors"
              style={{ fontVariationSettings: '"wdth" 100' }}
            >
              {t.contacto.submit}
            </button>
          </form>
        </div>

        {/* Image beside the form: the Altamira sign with the contact details. (On phones the other photo is the
            band above the form.) */}
        <div className="relative flex-1 overflow-hidden bg-surface min-h-[440px] lg:min-h-0 lg:bg-panel">
          <div className="absolute inset-0">
            {/* phones: the Altamira sign closes the page; laptops: the vineyard-and-Andes photo (one photo, not two) */}
            <img {...md(CELLAR)} alt="" className="absolute inset-0 size-full object-cover lg:hidden" />
            <img {...md(`${A}/contact-mobile-bg.jpg`)} alt="" className="absolute inset-0 hidden size-full object-cover object-[50%_42%] lg:block" />
            <div className="absolute inset-0 bg-gradient-to-b from-[rgba(20,18,15,0.1)] to-[rgba(20,18,15,0.6)]" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 grid grid-cols-1 gap-x-[26px] gap-y-6 p-6 sm:grid-cols-2 sm:gap-y-8 sm:p-11">
            <div className="flex flex-col gap-[9px]">
              <p className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.36px] text-on-dark/[0.65]">{t.contacto.officeLabel}</p>
              <p className="whitespace-pre-line font-['Archivo:Light'] text-[13.5px] text-on-dark leading-[24.3px]" style={{ fontVariationSettings: '"wdth" 100' }}>
                {site.office}
              </p>
            </div>
            <div className="flex flex-col gap-[9px]">
              <p className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.36px] text-on-dark/[0.65]">{t.contacto.phoneLabel}</p>
              <p className="font-['Archivo:Light'] text-[13.5px] text-on-dark leading-[24.3px]" style={{ fontVariationSettings: '"wdth" 100' }}>
                {site.phones.map((p) => (
                  <span key={p} className="block whitespace-nowrap">{p}</span>
                ))}
              </p>
            </div>
            <div className="flex flex-col gap-[9px] sm:col-span-2">
              <p className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.36px] text-on-dark/[0.65]">{t.contacto.emailLabel}</p>
              <a
                href={`mailto:${clean(site.email)}`}
                className="self-start border-b border-on-dark/[0.4] pb-[5px] font-['Archivo:Light'] text-[13.5px] text-on-dark hover:border-white/70 transition-colors"
                style={{ fontVariationSettings: '"wdth" 100' }}
              >
                {site.email}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PRIVACY ──────────────────────────────────────────────────────────────────
function Privacidad() {
  const t = useT();
  const l = t.legal;
  return (
    <div className="bg-surface w-full">
      <article className="mx-auto max-w-[760px] px-5 sm:px-8 pt-20 pb-24 lg:pt-28">
        <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[2.28px] text-ink/[0.5]">{l.eyebrow}</p>
        <h1 className="mt-5 font-['Cormorant_Garamond:Light_Italic'] italic text-[36px] sm:text-[44px] lg:text-[52px] leading-[1.08] text-ink">{l.title}</h1>
        <p className="mt-4 font-['IBM_Plex_Mono:Regular'] text-[10px] tracking-[1.4px] text-ink/[0.5]">{l.updated}</p>
        <p className="mt-10 font-['Archivo:Light'] text-[16px] leading-[1.8] text-ink/[0.8]" style={{ fontVariationSettings: '"wdth" 100' }}>{l.intro}</p>
        <div className="mt-12 flex flex-col">
          {l.sections.map((sec) => (
            <section key={sec.h} className="border-t border-ink/[0.14] py-8">
              <h2 className="font-['Cormorant_Garamond:Regular'] text-[24px] leading-[1.2] text-ink">{sec.h}</h2>
              <p className="mt-3 font-['Archivo:Light'] text-[14.5px] leading-[1.8] text-ink/[0.72]" style={{ fontVariationSettings: '"wdth" 100' }}>{sec.p}</p>
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}

// ─── WINE DETAIL ──────────────────────────────────────────────────────────────
function WineDetail({ onNav, wineId }: { onNav: Nav; wineId: string }) {
  useReveal();
  const t = useT();
  const { lang } = useLang();
  const wine = t.wineCatalog.find((w) => w.id === wineId) ?? t.wineCatalog[0];
  return (
    <div className="bg-surface w-full">
      {/* Breadcrumb */}
      <div className="border-b border-ink/[0.09] px-5 sm:px-8 lg:px-12 py-[18px]">
        <p className="font-['IBM_Plex_Mono:Regular'] text-[10px] tracking-[1px] text-ink/[0.45]">
          <button onClick={() => onNav('vinos')} className="hover:text-ink transition-colors">
            {t.nav.vinos}
          </button>{' '}
          › {wine.region}
        </p>
      </div>

      {/* Bottle over a faint mountain (client photo C26) that dissolves into the page */}
      <section className="relative isolate grid grid-cols-1 lg:grid-cols-[minmax(0,46fr)_minmax(0,54fr)] lg:min-h-[760px]">
        <div className="relative isolate flex items-end justify-center pt-12 pb-10 min-h-[560px] lg:sticky lg:top-[72px] lg:h-[calc(100svh-130px)] lg:min-h-[500px] lg:max-h-[860px] lg:self-start lg:pt-8 lg:pb-[72px]">
          {/* landscape and bottle share one panel, so the bottle always stands on the ground */}
          <div className="absolute inset-0 -z-10 overflow-hidden lg:right-auto lg:w-[130%]" aria-hidden="true">
            <img src={wine.background ?? `${A}/wbg-${wine.id}.jpg`} {...editAttr(wine.docId, 'wine', 'background')} alt="" className="h-[calc(100%-24px)] w-full lg:w-[calc(100%-24px)] object-cover object-[50%_60%] opacity-[0.78] dark:opacity-[0.62]" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent from-[45%] to-surface lg:bg-gradient-to-r lg:from-[38%] lg:to-[92%]" />
            <div className="absolute inset-0 hidden lg:block bg-gradient-to-b from-transparent from-[80%] to-surface" />
          </div>
          <span className="absolute bottom-[34px] lg:bottom-[62px] left-1/2 h-[18px] w-[150px] lg:w-[190px] -translate-x-1/2 rounded-[50%] bg-black/[0.5] blur-[12px]" aria-hidden="true" />
          <img
            {...bottle(wine)}
            alt={`${wine.title1} ${wine.title2}`.trim()}
            className="relative h-[460px] lg:h-full lg:max-h-[640px] w-auto object-contain object-bottom drop-shadow-[0_24px_30px_rgba(0,0,0,0.35)] reveal"
          />
        </div>

        <div className="py-12 px-6 sm:px-8 lg:py-[72px] lg:pl-[40px] lg:pr-12 xl:pr-[72px] flex flex-col justify-center reveal reveal-d1">
          <p className="font-['IBM_Plex_Mono:Medium'] text-[10px] tracking-[2.2px] text-ink/[0.55] mb-6">{wine.region}</p>
          <h1 className="mb-8">
            <span className="block font-['Cormorant_Garamond:Light_Italic'] italic text-[38px] sm:text-[46px] lg:text-[58px] text-ink leading-[1.04]">{wine.title1}</span>
            <span className={`block text-[38px] sm:text-[46px] lg:text-[58px] text-ink leading-[1.04] ${wine.id === 'dama' ? "font-['Cormorant_Garamond:Light_Italic'] italic" : "font-['Cormorant_Garamond:Light']"}`}>{wine.title2}</span>
          </h1>
          <div className="max-w-[540px] mb-10 flex flex-col gap-4">
            {wine.tagline && (
              <p className="font-['Cormorant_Garamond:Italic'] italic text-[22px] sm:text-[24px] text-accent leading-[1.25] -mt-3">{wine.tagline}</p>
            )}
            {wine.lead && (
              <p className="font-['Cormorant_Garamond:Light'] text-[21px] sm:text-[23px] text-ink/[0.88] leading-[1.4]">{wine.lead}</p>
            )}
            {wine.paras.map((para) => (
              <p key={para} className="font-['Archivo:Light'] text-[16px] text-ink/[0.78] leading-[1.8]" style={{ fontVariationSettings: '"wdth" 100' }}>
                {para}
              </p>
            ))}
            {wine.closing && (
              <p className="font-['Cormorant_Garamond:Italic'] italic text-[20px] sm:text-[22px] text-ink leading-[1.35]">{wine.closing}</p>
            )}
          </div>

          <p className="font-['IBM_Plex_Mono:Medium'] text-[10px] tracking-[2px] text-ink/[0.55] mb-1">{t.wineDetail.fichaLabel}</p>
          {/* one column on phones so values like "18 months · French oak" stay on one line */}
          <dl className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-10">
            {wine.ficha.map((s) => (
              <div key={s.label} className={`border-t border-ink/[0.16] py-[16px] ${clean(s.value).length > 24 ? 'sm:col-span-2' : ''}`}>
                <dt className="font-['IBM_Plex_Mono:Regular'] text-[10px] tracking-[1.4px] text-ink/[0.5] mb-[6px]">{s.label}</dt>
                <dd className="font-['Cormorant_Garamond:Regular'] text-[20px] text-ink leading-[1.25]">{s.value}</dd>
              </div>
            ))}
          </dl>

          <div className="flex flex-wrap gap-[14px] mt-9 pt-9 border-t border-ink/[0.16]">
            <button
              onClick={() => onNav('contacto', wine.id)}
              className="bg-panel px-[30px] py-[16px] font-['Archivo:Regular'] text-[11px] tracking-[1.32px] uppercase text-on-dark hover:bg-panel-2 transition-colors dark:bg-on-dark dark:text-panel dark:hover:bg-white"
              style={{ fontVariationSettings: '"wdth" 100' }}
            >
              {t.wineDetail.ctaInfo}
            </button>
            <a
              href={wine.sheet ?? `${A}/fichas/${['es', 'en', 'pt'].includes(lang) ? lang : 'en'}/${wine.id}.pdf`}
              target="_blank"
              rel="noopener"
              className="border border-ink/[0.4] px-[31px] py-[16px] font-['Archivo:Regular'] text-[11px] tracking-[1.32px] uppercase text-ink hover:border-ink transition-colors"
              style={{ fontVariationSettings: '"wdth" 100' }}
            >
              {t.wineDetail.downloadPdf}
            </a>
          </div>
        </div>
      </section>

      {/* Tasting notes */}
      <section className="bg-surface-2 px-5 sm:px-8 lg:px-12 py-[90px]">
        <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[2.28px] text-ink/[0.5] text-center mb-11 reveal">{t.wineDetail.notesLabel}</p>
        <div className="flex flex-col md:flex-row gap-px bg-ink/[0.14] reveal reveal-d1">
          {wine.notes.map((note) => (
            <div key={note.label} className="bg-surface-2 flex-1 flex flex-col gap-4 px-[30px] pt-[33px] pb-[66px]">
              <p className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.53px] text-ink/[0.5]">{note.label}</p>
              <p className="font-['Cormorant_Garamond:Light'] text-[20px] text-ink leading-[32px]">{note.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Vineyard CTA */}
      <section className="bg-panel flex items-center min-h-[400px] px-6 py-14 lg:px-[60px] lg:py-[60px] reveal">
        <div className="flex flex-col gap-6 max-w-[600px]">
          <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[2.28px] text-on-dark/[0.5]">{t.wineDetail.vyEyebrow}</p>
          <h3 className="font-['Cormorant_Garamond:Light'] text-[34px] text-on-dark leading-[38.76px]">{t.wineDetail.vyTitle}</h3>
          <p className="font-['Archivo:Light'] text-[14px] text-on-dark/[0.72] leading-[25.2px] max-w-[400px]" style={{ fontVariationSettings: '"wdth" 100' }}>
            {t.wineDetail.vyDesc}
          </p>
          <button
            onClick={() => onNav('vinedos', undefined, 'mapa')}
            className="self-start border border-on-dark/[0.45] px-[29px] py-[14px] font-['Archivo:Regular'] text-[10.5px] tracking-[1.26px] uppercase text-on-dark hover:border-white/70 transition-colors"
            style={{ fontVariationSettings: '"wdth" 100' }}
          >
            {t.wineDetail.vyBtn}
          </button>
        </div>
      </section>

      {/* All six wines in one box */}
      <section className="px-5 sm:px-8 lg:px-12 pt-20 pb-[90px]">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-[34px]">
          <h3 className="font-['Cormorant_Garamond:Light_Italic'] italic text-[32px] text-ink leading-[35.2px] reveal">{t.nav.vinos}</h3>
          <button
            onClick={() => onNav('vinos')}
            className="border-b border-ink/[0.4] pb-[5px] font-['Archivo:Regular'] text-[11px] text-ink hover:border-ink transition-colors"
            style={{ fontVariationSettings: '"wdth" 100' }}
          >
            {t.wineDetail.seeAllWines}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px border border-ink/[0.13] bg-ink/[0.13] reveal reveal-d1">
          {t.wineCatalog.map((w) => {
            const current = w.id === wine.id;
            return (
              <button
                key={w.id}
                aria-current={current ? 'page' : undefined}
                className={`group flex items-center gap-5 p-[23px] cursor-pointer transition-colors text-left ${current ? 'bg-surface-2' : 'bg-surface hover:bg-surface-2'}`}
                onClick={() => onNav('wine-detail', w.id)}
              >
                <div className="shrink-0 h-[110px] w-[58px] overflow-hidden">
                  <img {...bottle(w)} alt={w.name} className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105" />
                </div>
                <div className="flex flex-col gap-2 min-w-0">
                  <p className={`font-['IBM_Plex_Mono:Medium'] text-[8px] tracking-[1.12px] ${current ? 'text-accent' : 'text-ink/[0.5]'}`}>{wineMeta(w).tag}</p>
                  <p className="font-['Cormorant_Garamond:Regular'] text-[20px] text-ink leading-[1.2]">
                    {w.name} <span className="font-['Cormorant_Garamond:Italic'] italic">{w.sub}</span>
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
const PAGES: Page[] = ['home', 'vinos', 'vinedos', 'galeria', 'novedades', 'contacto', 'wine-detail', 'privacidad'];

// pages the editors can switch off (privacy always stays reachable)
function pageOn(p: Page, site: Site) {
  const on: Partial<Record<Page, boolean>> = {
    home: site.showHome, vinedos: site.showVineyards, vinos: site.showWines, 'wine-detail': site.showWines,
    galeria: site.showGallery, novedades: site.showNews, contacto: site.showContact,
  };
  return on[p] ?? true;
}

function parseHash(): { page: Page; wineId?: string } {
  if (typeof window === 'undefined') return { page: 'home' };
  const h = window.location.hash.replace(/^#\/?/, '');
  if (!h || h === 'home') return { page: 'home' };
  if (h.startsWith('wine/')) return { page: 'wine-detail', wineId: h.slice(5) || 'dama' };
  return PAGES.includes(h as Page) && h !== 'wine-detail' ? { page: h as Page } : { page: 'home' };
}

function hashFor(p: Page, wineId?: string): string {
  if (p === 'home') return '#/';
  if (p === 'wine-detail') return '#/wine/' + (wineId || 'dama');
  return '#/' + p;
}

function Site() {
  const initial = parseHash();
  const [wanted, setPage] = useState<Page>(initial.page);
  const site = useSite();
  // a page switched off in the CMS shows the first one still on
  const page = pageOn(wanted, site) ? wanted : (['home', 'vinos', 'vinedos', 'contacto', 'privacidad'] as Page[]).find((p) => pageOn(p, site))!;
  const [activeWine, setActiveWine] = useState(initial.wineId || 'dama');
  const [inquiry, setInquiry] = useState<string | null>(null);
  const [entered, setEntered] = useState(() => {
    try {
      return localStorage.getItem('vf-age-ok') === '1';
    } catch (e) {
      return false;
    }
  });

  // Browser back/forward (and refresh / deep links) via hash history.
  useEffect(() => {
    const onPop = () => {
      const s = parseHash();
      setPage(s.page);
      if (s.wineId) setActiveWine(s.wineId);
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const enter = () => {
    try {
      localStorage.setItem('vf-age-ok', '1');
    } catch (e) {}
    setEntered(true);
  };

  function navigate(p: Page, wineId?: string, anchor?: string) {
    if (p === 'contacto') setInquiry(wineId ?? null);
    else if (wineId) setActiveWine(wineId);
    setPage(p);
    const url = hashFor(p, p === 'contacto' ? undefined : wineId);
    if (typeof window !== 'undefined' && window.location.hash !== url) {
      window.history.pushState({ p, wineId }, '', url);
    }
    if (anchor) {
      // wait for the new page to render, then glide to the section
      window.scrollTo({ top: 0, behavior: 'instant' });
      setTimeout(() => {
        const el = document.getElementById(anchor);
        if (!el) return;
        const top = el.getBoundingClientRect().top + window.scrollY - 72;
        window.scrollTo({ top, behavior: 'smooth' });
        // smooth scrolling can stall (background tab, reduced motion): make sure we land
        setTimeout(() => {
          if (Math.abs(window.scrollY - top) > 40) window.scrollTo({ top, behavior: 'instant' });
        }, 1100);
      }, 120);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  const showFullFooter = page !== 'contacto' && page !== 'vinos' && page !== 'novedades' && page !== 'vinedos' && page !== 'galeria' && page !== 'privacidad';

  return (
    <div className="min-h-screen w-full bg-surface">
      {!entered && site.showAgeGate && !PREVIEW && <AgeGate onEnter={enter} />}
      {page === 'home' ? (
        <>
          <Header page={page} onNav={navigate} />
          <Home onNav={navigate} />
          <Footer onNav={navigate} />
        </>
      ) : (
        <>
          <Header page={page} onNav={navigate} />
          {page === 'vinos' && <Vinos onNav={navigate} />}
          {page === 'vinedos' && <Vinedos />}
          {page === 'galeria' && <Galeria />}
          {page === 'novedades' && <Novedades />}
          {page === 'contacto' && <Contacto onNav={navigate} inquiryWineId={inquiry} />}
          {page === 'privacidad' && <Privacidad />}
          {page === 'wine-detail' && <WineDetail onNav={navigate} wineId={activeWine} />}
          {showFullFooter ? (
            <Footer onNav={navigate} />
          ) : (
            <FooterBar onNav={navigate} />
          )}
        </>
      )}
    </div>
  );
}

function FooterBar({ onNav }: { onNav: Nav }) {
  const t = useT();
  return (
    <footer className="bg-accent-solid flex flex-col gap-y-1 gap-x-8 md:flex-row md:items-center md:justify-between md:gap-x-16 px-5 sm:px-8 lg:px-12 py-[34px]">
      <span className="whitespace-nowrap font-['IBM_Plex_Mono:Regular'] text-[6px] md:text-[9.5px] tracking-[0.25px] md:tracking-[1.33px] text-on-dark/[0.7]">
        {t.footer.copyright}
      </span>
      <span className="flex items-center gap-3 whitespace-nowrap font-['IBM_Plex_Mono:Regular'] text-[6px] md:text-[9.5px] tracking-[0.25px] md:tracking-[1.33px] text-on-dark/[0.7]">
        <button onClick={() => onNav('privacidad')} className="uppercase underline-offset-4 hover:text-on-dark hover:underline">
          {t.footer.privacy}
        </button>
        {t.footer.warning && <span>{t.footer.warning}</span>}
      </span>
    </footer>
  );
}

export default function App() {
  return (
    <LangProvider>
      <Site />
    </LangProvider>
  );
}
