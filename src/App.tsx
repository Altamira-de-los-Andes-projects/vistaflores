import { useState, useEffect, useRef } from 'react';
import { LangProvider, useLang, useT, LANGS, type Lang } from './i18n';
import { ARG_REST, ARG_MENDOZA, CHILE } from './mapdata';
import { UCO_H, UCO_RIVER, UCO_ZONES, UCO_PT, UCO_KM5 } from './ucomap';

type Page = 'home' | 'vinos' | 'vinedos' | 'novedades' | 'contacto' | 'wine-detail';
type Nav = (p: Page, wineId?: string) => void;

const A = `${import.meta.env.BASE_URL}assets`;

// News is hidden for now (client request); flip to true to bring back the nav item, the Home
// section and the #/novedades page.
const SHOW_NEWS = false;

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
const HOME_VY_IMGS = [`${A}/altamira-sq.jpg`, `${A}/vistaflores-vy.jpg`, `${A}/la-consulta-real.jpg`];
const HOME_NEWS_IMGS = [`${A}/5e611.png`, `${A}/28b42.png`];
const HOME_AWARD_IMGS = [`${A}/b1740.png`, `${A}/226c0.png`, `${A}/d7200.png`, `${A}/5b74e.png`, `${A}/fb3eb.png`, `${A}/36671.png`];
const VINEDOS_IMGS = [`${A}/altamira-vy.jpg`, `${A}/vistaflores-vy.jpg`, `${A}/la-consulta-real.jpg`];
const NOVEDADES_ARTICLE_IMGS = [IMG.prowein, IMG.vendimia, IMG.catas];

// Wine catalog scaffolding (bottle image / filter tag / blend flag) keyed by id.
type WineLine = 'RESERVA' | 'VAV' | 'DAMA' | 'NAVIGATO';
const WINE_META: Record<string, { img: string; tag: 'ALTAMIRA' | 'VAV'; line: WineLine }> = {
  dama: { img: `${A}/5c918.png`, tag: 'ALTAMIRA', line: 'DAMA' },
  navigato: { img: `${A}/3d3ec.png`, tag: 'ALTAMIRA', line: 'NAVIGATO' },
  'reserva-malbec': { img: `${A}/reserva-malbec.png`, tag: 'ALTAMIRA', line: 'RESERVA' },
  'reserva-cf': { img: `${A}/reserva-cf.png`, tag: 'ALTAMIRA', line: 'RESERVA' },
  'vav-malbec': { img: `${A}/4600e.png`, tag: 'VAV', line: 'VAV' },
  'tres-fincas': { img: `${A}/73703.png`, tag: 'VAV', line: 'VAV' },
};

// Bottles per row on Our Wines, matching the sm / lg breakpoints.
function useGridCols() {
  const get = () => (typeof window === 'undefined' ? 3 : window.matchMedia('(min-width: 1024px)').matches ? 3 : window.matchMedia('(min-width: 640px)').matches ? 2 : 1);
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
        src={`${A}/gate-bg.jpg`}
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
            ALTAMIRA DE LOS ANDES
          </span>
          <span className="mt-4 font-['IBM_Plex_Mono:Medium'] text-[10px] tracking-[0.5em] text-on-dark/70">
            UCO VALLEY, MENDOZA
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
        src={`${A}/place-bg.jpg`}
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
function Flag({ code, className = '' }: { code: Lang; className?: string }) {
  const base = `block h-[12px] w-[18px] shrink-0 rounded-[2px] ring-1 ring-black/15 ${className}`;
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
  const { lang, setLang } = useLang();
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const go = (p: Page) => {
    setMenuOpen(false);
    onNav(p);
  };
  const navItems: [Page, string][] = [
    ['home', t.nav.home],
    ['vinos', t.nav.vinos],
    ['vinedos', t.nav.vinedos],
    ['novedades', t.nav.novedades],
    ['contacto', t.nav.contacto],
  ].filter(([p]) => SHOW_NEWS || p !== 'novedades') as [Page, string][];
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
        aria-label="Altamira de los Andes"
        className={`group flex flex-col items-start shrink-0 leading-none ${isHome ? 'text-white' : 'text-ink'}`}
      >
        <span className="font-['Cormorant_Garamond:Regular'] text-[15px] sm:text-[18px] lg:text-[22px] leading-[1] tracking-[0.09em] lg:tracking-[0.12em] whitespace-nowrap">
          ALTAMIRA DE LOS ANDES
        </span>
        <span
          className={`font-['IBM_Plex_Mono:Medium'] text-[8px] tracking-[0.44em] mt-[7px] pl-px transition-opacity group-hover:opacity-100 ${
            isHome ? 'text-white/70' : 'text-ink/[0.55]'
          }`}
        >
          UCO VALLEY, MENDOZA
        </span>
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
          {LANGS.map((code, i) => {
            const activeLang = code === lang;
            return (
              <span key={code} className="flex items-center">
                {i > 0 && (
                  <span className={`w-px h-[11px] ${isHome ? 'bg-white/50' : 'bg-ink/[0.2]'}`} />
                )}
                <button
                  onClick={() => setLang(code as Lang)}
                  aria-current={activeLang ? 'true' : undefined}
                  aria-label={t.a11y.langOf(code.toUpperCase())}
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
                  <Flag code={code} className={activeLang ? '' : 'opacity-60'} />
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
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
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
            {LANGS.map((code) => (
              <button
                key={code}
                onClick={() => setLang(code as Lang)}
                aria-current={code === lang ? 'true' : undefined}
                aria-label={t.a11y.langOf(code.toUpperCase())}
                className={`flex items-center gap-2 font-['IBM_Plex_Mono:Medium'] text-[11px] tracking-[1px] px-3 py-2 rounded transition-colors ${
                  code === lang ? 'text-ink border border-ink/[0.3]' : 'text-ink/[0.45] border border-transparent'
                }`}
              >
                <Flag code={code} className={code === lang ? '' : 'opacity-60'} />
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
  return (
    <footer className="bg-accent-solid">
      <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr] gap-[50px] px-5 sm:px-8 lg:px-12 pt-20 pb-10">
        <div className="flex flex-col gap-[19px]">
          <div className="flex flex-col items-start leading-none text-on-dark">
            <span className="font-['Cormorant_Garamond:Regular'] text-[26px] sm:text-[30px] leading-[1.05] tracking-[0.06em]">
              ALTAMIRA DE LOS ANDES
            </span>
            <span className="font-['IBM_Plex_Mono:Medium'] text-[9px] tracking-[0.42em] mt-[10px] pl-px text-on-dark/[0.7]">
              UCO VALLEY, MENDOZA
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
              className="font-['Archivo:Light'] text-[13.5px] text-on-dark leading-[24.3px]"
              style={{ fontVariationSettings: '"wdth" 100' }}
            >
              Av. Colón 241
              <br />
              (5500) Mendoza, Argentina
            </p>
          </div>
          <div className="flex flex-col gap-[9px]">
            <p className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.36px] text-on-dark/[0.55]">
              {t.footer.phoneLabel}
            </p>
            <p
              className="font-['Archivo:Light'] text-[13.5px] text-on-dark leading-[24.3px]"
              style={{ fontVariationSettings: '"wdth" 100' }}
            >
              Tel +54 261 4299962
              <br />
              Mobile USA +1 (305) 988 5992
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
              facundo@altamiradelosandes.com
            </button>
          </div>
          <div className="flex flex-col gap-[10px]">
            <p className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.36px] text-on-dark/[0.55]">
              {t.footer.followLabel}
            </p>
            <div className="flex gap-[10px]">
              {['IG', 'FB', 'LI'].map((s) => (
                <div
                  key={s}
                  className="border border-on-dark/[0.35] flex items-center justify-center size-[34px] cursor-pointer hover:border-white/60 transition-colors"
                >
                  <span className="font-['IBM_Plex_Mono:Medium'] text-[7px] text-on-dark/[0.6]">
                    {s}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-on-dark/[0.2] flex flex-col gap-2 md:flex-row md:items-center md:justify-between px-5 sm:px-8 lg:px-12 pt-[23px] pb-[34px]">
        <span className="font-['IBM_Plex_Mono:Regular'] text-[9.5px] text-on-dark/[0.6] tracking-[1.33px]">
          {t.footer.copyright}
        </span>
        {t.footer.warning && (
          <span className="font-['IBM_Plex_Mono:Regular'] text-[9.5px] text-on-dark/[0.6] tracking-[1.33px]">
            {t.footer.warning}
          </span>
        )}
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
  children,
}: {
  img: string;
  alt: string;
  imgClass?: string;
  imgRight?: boolean;
  dark?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`[container-type:inline-size] ${dark ? 'border-t border-on-dark/[0.14]' : ''}`}>
      <div className="grid grid-cols-1 lg:grid-cols-2 lg:grid-rows-[minmax(50cqw,auto)]">
        <div className={`group relative aspect-square overflow-hidden lg:aspect-auto ${imgRight ? 'lg:order-2' : ''}`}>
          <img
            src={img}
            alt={alt}
            className={`absolute inset-0 size-full object-cover ${imgClass} transition-transform duration-700 group-hover:scale-105`}
          />
        </div>
        <div className={`reveal flex flex-col justify-center gap-6 px-6 py-14 sm:px-10 lg:px-[clamp(32px,5vw,88px)] lg:py-16 ${imgRight ? 'lg:order-1' : ''}`}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
function Home({ onNav }: { onNav: Nav }) {
  useReveal();
  const t = useT();
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
              src={`${A}/hero-andes.jpg`}
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
              poster={`${A}/hero-andes.jpg`}
            >
              <source src={`${A}/hero-andes.mp4`} type="video/mp4" />
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
        <div className="absolute bottom-[38px] left-5 sm:left-8 lg:left-12 flex items-center gap-4">
          <div className="border border-on-dark/[0.5] rounded-full size-[32px] flex items-center justify-center">
            <span className="text-on-dark/[0.85] text-[12px]">↓</span>
          </div>
          <span className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.7px] text-on-dark/[0.7]">
            {t.home.discover}
          </span>
        </div>
      </section>

      {/* "Unique wines" — scene-setting square pair (no wines on the Home) */}
      <SquareSplit img={`${A}/estate-home.jpg`} alt={t.home.estateEyebrow} imgClass="object-[50%_60%]">
        <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[2.28px] text-ink/[0.5]">{t.home.estateEyebrow}</p>
        <h2 className="font-['Cormorant_Garamond:Regular'] text-[clamp(28px,3vw,44px)] text-ink leading-[1.16]">
          {t.home.estateTitle1}
          <br />
          {t.home.estateTitle2}
        </h2>
        <p className="font-['Archivo:Light'] text-[clamp(15px,1.3vw,19px)] text-ink/[0.86] leading-[1.72] max-w-[560px]" style={{ fontVariationSettings: '"wdth" 100' }}>
          {t.home.estatePara1}
        </p>
        <p className="font-['Archivo:Light'] text-[14px] text-ink/[0.66] leading-[1.75] max-w-[560px]" style={{ fontVariationSettings: '"wdth" 100' }}>
          {t.home.estatePara2}
        </p>
      </SquareSplit>

      {/* Vineyards dark section */}
      <section className="bg-panel">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:gap-[60px] justify-center px-5 sm:px-8 lg:px-12 pt-16 lg:pt-[100px] pb-16">
          <div className="flex flex-col gap-[21px] max-w-[562px]">
            <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[2.28px] text-on-dark/[0.5] reveal">
              {t.home.vyEyebrow}
            </p>
            <h2 className="font-['Cormorant_Garamond:Light'] text-[clamp(28px,3.5vw,44px)] text-on-dark leading-[1.12] reveal reveal-d1">
              {t.home.vyTitle1} {t.home.vyTitle2}
            </h2>
          </div>
          <p
            className="font-['Archivo:Light'] text-[15px] text-on-dark/[0.7] leading-[27px] max-w-[440px] reveal reveal-d2"
            style={{ fontVariationSettings: '"wdth" 100' }}
          >
            {t.home.vyIntro}
          </p>
        </div>

        {/* Vineyard rows — alternating square photo / square text */}
        {t.home.vyRows.map((vyd, idx) => (
          <SquareSplit
            key={vyd.num}
            dark
            imgRight={idx % 2 === 1}
            img={HOME_VY_IMGS[idx]}
            alt={vyd.name}
            imgClass={idx === 2 ? 'object-top' : 'object-center'}
          >
            <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[2.28px] text-on-dark/[0.5]">{vyd.num}</p>
            <h3 className="font-['Cormorant_Garamond:Light_Italic'] italic text-[clamp(30px,3vw,42px)] text-on-dark leading-[1.12]">
              {vyd.name}
            </h3>
            <p className="font-['Archivo:Light'] text-[14px] text-on-dark/[0.72] leading-[25.2px] max-w-[380px]" style={{ fontVariationSettings: '"wdth" 100' }}>
              {vyd.desc}
            </p>
            <div className="border-t border-on-dark/[0.2] pt-5 flex gap-[38px]">
              {vyd.stats.map((s) => (
                <div key={s.l} className="flex flex-col gap-2">
                  <p className="font-['IBM_Plex_Mono:Medium'] text-[8px] tracking-[1.28px] text-on-dark/[0.45]">{s.l}</p>
                  <p className="font-['Cormorant_Garamond:Regular'] text-[23px] text-on-dark">{s.v}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => onNav('vinedos')}
              className="self-start border border-on-dark/[0.45] px-[29px] py-[14px] font-['Archivo:Regular'] text-[10.5px] tracking-[1.26px] uppercase text-on-dark hover:border-white/70 transition-colors"
              style={{ fontVariationSettings: '"wdth" 100' }}
            >
              {t.home.vyBtn}
            </button>
          </SquareSplit>
        ))}

        {/* Stats band — oversized serif numerals over the altitude motif */}
        <div className="relative overflow-hidden border-t border-on-dark/[0.14] px-5 sm:px-8 lg:px-12 pt-[84px] pb-16 lg:pb-[100px]">
          <div className="pointer-events-none absolute inset-0 text-on-dark">
            <Contours className="h-full w-full" lines={10} seed={7} opacity={0.07} />
          </div>
          <p
            className="relative max-w-[720px] font-['Archivo:Light'] text-[19px] text-on-dark/[0.78] leading-[1.75] reveal"
            style={{ fontVariationSettings: '"wdth" 100' }}
          >
            {t.home.statsIntro}
          </p>
          <div className="relative mt-[68px] grid grid-cols-2 md:grid-cols-4 reveal reveal-d1">
            {t.home.stats.map((s, i) => (
              <div
                key={s.label}
                className={`flex flex-col gap-[18px] px-4 sm:px-9 ${i > 0 ? 'border-l border-on-dark/[0.16]' : 'pl-0'}`}
              >
                <span className="flex items-center gap-2 font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.6px] text-on-dark/[0.55]">
                  <span className="h-px w-4 bg-accent" />
                  {s.label}
                </span>
                <span className="font-['Cormorant_Garamond:Light'] text-[clamp(38px,8vw,80px)] leading-[0.86] tracking-[-0.01em] text-on-dark">
                  {s.num}
                </span>
                <span className="font-['Cormorant_Garamond:Italic'] italic text-[15px] text-on-dark/[0.6]">
                  {s.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quote section */}
      <section className="relative h-[480px] overflow-hidden flex items-center justify-center mt-16">
        <div className="absolute inset-0">
          <img src={`${A}/quote-bg.jpg`} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-[rgba(20,18,15,0.6)]" />
        </div>
        <div className="relative text-center px-6 sm:px-12 lg:px-16 max-w-[860px] reveal">
          <p className="font-['Cormorant_Garamond:Light_Italic'] italic text-[clamp(28px,3.4vw,42px)] text-on-dark leading-[1.25]">
            {t.home.quote}
          </p>
          <p className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.7px] text-on-dark/[0.7] mt-5">
            {t.home.quoteSub}
          </p>
        </div>
      </section>

      {/* Awards */}
      <section className="px-5 sm:px-8 lg:px-12 pt-16 lg:pt-[110px] pb-10">
        <div className="flex flex-col gap-[23px] items-center text-center mb-[27px] reveal">
          <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[2.28px] text-ink/[0.5]">{t.home.awardsEyebrow}</p>
          <h2 className="font-['Cormorant_Garamond:Light'] text-[28px] sm:text-[34px] lg:text-[40px] text-ink leading-[1.14] lg:leading-[45.6px]">{t.home.awardsTitle}</h2>
        </div>
        <div className="flex gap-6 justify-center flex-wrap">
          {HOME_AWARD_IMGS.map((src, i) => (
            <div key={i} className={`border border-ink/[0.16] rounded-full size-[130px] sm:size-[177px] flex items-center justify-center reveal reveal-d${(i % 5) + 1}`}>
              <img src={src} alt={t.home.awardAlt} className="size-[88px] sm:size-[120px] object-contain" />
            </div>
          ))}
        </div>
      </section>

      {/* News section */}
      {SHOW_NEWS && (
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
                <img src={HOME_NEWS_IMGS[i]} alt={article.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
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

// ─── NUESTROS VINOS ───────────────────────────────────────────────────────────
function Vinos({ onNav }: { onNav: Nav }) {
  useReveal();
  const t = useT();
  const [filter, setFilter] = useState<'ALL' | WineLine>('ALL');
  const wines = t.wineCatalog.map((w) => ({ ...w, ...WINE_META[w.id] }));
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
      <section className="relative h-[340px] overflow-hidden flex items-center">
        <img src={`${A}/vinos-hero.jpg`} alt="" className="absolute inset-0 size-full object-cover object-[50%_30%]" />
        <div
          className="absolute inset-0"
          style={{ backgroundImage: 'linear-gradient(90deg, rgba(20,18,15,0.62) 0%, rgba(20,18,15,0.3) 46%, rgba(20,18,15,0.08) 100%)' }}
        />
        <div className="relative px-5 sm:px-8 lg:px-12 flex flex-col gap-4">
          <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[2.28px] text-on-dark/[0.7] hero-line-1">{t.vinos.heroEyebrow}</p>
          <h1 className="font-['Cormorant_Garamond:Light'] text-[34px] sm:text-[44px] lg:text-[52px] text-on-dark leading-[1.12] lg:leading-[57.2px] hero-line-2">{t.vinos.heroTitle}</h1>
          <p className="font-['Archivo:Light'] text-[14px] text-on-dark/[0.8] leading-[25.2px] max-w-[520px] hero-line-3" style={{ fontVariationSettings: '"wdth" 100' }}>
            {t.vinos.heroPara}
          </p>
        </div>
      </section>

      {/* Filter tabs */}
      <div className="border-b border-ink/[0.12] flex flex-wrap items-center gap-x-8 gap-y-3 px-5 sm:px-8 lg:px-12 pt-8 lg:pt-10">
        <span className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[1.9px] text-ink/[0.5] pb-4">{t.vinos.filterLabel}</span>
        <div className="flex flex-wrap gap-x-7 gap-y-2">
          {(['ALL', 'RESERVA', 'VAV', 'DAMA', 'NAVIGATO'] as const).map((f) => (
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

      <div ref={gridRef} className="relative isolate pb-10 lg:pb-16">
        <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
          <img src={`${A}/vinos-bg-andes.jpg`} alt="" className="absolute inset-0 size-full object-cover object-[50%_35%] opacity-[0.6] dark:opacity-[0.4]" />
          <div className="absolute inset-0 bg-surface/[0.2] dark:bg-black/[0.3]" />
          <div className="absolute inset-x-0 top-0 h-[100px] bg-gradient-to-t from-transparent to-surface" />
          <div className="absolute inset-x-0 bottom-0 h-[120px] bg-gradient-to-b from-transparent to-surface" />
        </div>
        {rows.map((row, r) => (
          <div key={`${cols}-${r}-${filter}`} className="flex justify-center px-5 sm:px-8 lg:px-12">
            {row.map((wine, i) => (
              <button
                key={wine.id}
                className={`group relative basis-full sm:basis-1/2 lg:basis-1/3 min-w-0 cursor-pointer text-center reveal reveal-d${i + 1}`}
                onClick={() => onNav('wine-detail', wine.id)}
              >
                <div className="relative h-[400px] lg:h-[470px] flex items-end justify-center pb-[30px] lg:pb-[34px]">
                  <span className="absolute bottom-[24px] lg:bottom-[27px] left-1/2 h-[14px] w-[120px] -translate-x-1/2 rounded-[50%] bg-black/[0.45] blur-[9px] transition-all duration-700 group-hover:w-[96px] group-hover:bg-black/[0.32]" aria-hidden="true" />
                  <img
                    src={wine.img}
                    alt={wine.name}
                    className="relative h-[330px] lg:h-[400px] w-auto object-contain object-bottom drop-shadow-[0_18px_22px_rgba(0,0,0,0.28)] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-2"
                  />
                </div>
                <div className="absolute inset-x-4 bottom-[30px] lg:bottom-[34px] h-px bg-ink/[0.14]" aria-hidden="true" />
                <div className="px-4 pt-7 pb-12 lg:pb-14 flex flex-col items-center gap-3">
                  <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[1.7px] text-ink/[0.55]">{wine.gridRegion}</p>
                  <p className="font-['Cormorant_Garamond:Regular'] text-[27px] lg:text-[30px] text-ink leading-[1.12]">
                    {wine.name} <span className="font-['Cormorant_Garamond:Italic'] italic">{wine.sub}</span>
                  </p>
                  <span className="mt-1 inline-flex items-center gap-2 font-['Archivo:Regular'] text-[11.5px] tracking-[0.4px] text-accent" style={{ fontVariationSettings: '"wdth" 100' }}>
                    <span className="border-b border-accent/[0.35] pb-[3px] transition-colors group-hover:border-accent">{t.vinos.fullInfo}</span>
                    <span aria-hidden="true" className="transition-transform duration-500 group-hover:translate-x-1">→</span>
                  </span>
                </div>
              </button>
            ))}
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
  return (
    <div className="bg-surface w-full">
      <section className="relative h-[clamp(440px,56vh,580px)] overflow-hidden flex items-end">
        <div className="absolute inset-0">
          <img
            src={`${A}/vinedos-hero.jpg`}
            alt={t.vinedos.heroTitle1 + ' ' + t.vinedos.heroTitle2}
            className="absolute inset-0 size-full object-cover object-[50%_42%]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[rgba(20,18,15,0.34)] via-[rgba(20,18,15,0.12)] via-[42%] to-[rgba(20,18,15,0.9)]" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent to-[rgba(20,18,15,0.78)]" />
        </div>
        <div className="relative px-5 sm:px-8 lg:px-12 pb-14 flex flex-col gap-[18px] [text-shadow:0_1px_14px_rgba(0,0,0,0.85)]">
          <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[2.28px] text-on-dark/[0.9] hero-line-1">{t.vinedos.heroEyebrow}</p>
          <h1 className="font-['Cormorant_Garamond:Light'] text-[36px] sm:text-[44px] lg:text-[54px] text-on-dark leading-[1.1] lg:leading-[59.4px] max-w-[760px] hero-line-2">
            {t.vinedos.heroTitle1} {t.vinedos.heroTitle2}
          </h1>
        </div>
      </section>

      <section className="border-b border-ink/[0.12] grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-[60px] px-5 sm:px-8 lg:px-12 py-20">
        <p className="font-['Archivo:Light'] text-[22px] text-ink/[0.84] leading-[37.84px] reveal" style={{ fontVariationSettings: '"wdth" 100' }}>
          {t.vinedos.intro1}
        </p>
        <p className="font-['Archivo:Light'] text-[14px] text-ink/[0.66] leading-[25.9px] reveal reveal-d2" style={{ fontVariationSettings: '"wdth" 100' }}>
          {t.vinedos.intro2}
        </p>
      </section>

      <section className="flex flex-col lg:flex-row gap-px bg-ink/[0.13]">
        {t.vinedos.cards.map((v, i) => (
          <article key={v.num} className={`bg-surface flex-1 flex flex-col reveal reveal-d${i + 1}`}>
            <div className="overflow-hidden" style={{ aspectRatio: '426/532' }}>
              <img src={VINEDOS_IMGS[i]} alt={v.name + v.italic} className={`w-full h-full object-cover ${i === 2 ? 'object-top' : 'object-center'} hover:scale-105 transition-transform duration-700`} />
            </div>
            <div className="flex flex-col gap-4 px-[30px] pt-[31px] pb-[38px]">
              <p className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.53px] text-ink/[0.5]">{v.num}</p>
              <h3 className="font-['Cormorant_Garamond:Italic'] italic text-[27px] text-ink leading-[31.32px]">
                {v.name}<span className="font-['Cormorant_Garamond:Regular'] not-italic">{v.italic}</span>
              </h3>
              <p className="font-['Archivo:Light'] text-[12.5px] text-ink/[0.68] leading-[22.5px]" style={{ fontVariationSettings: '"wdth" 100' }}>{v.desc}</p>
              <div className="mt-2">
                {v.specs.map((s, j) => (
                  <div key={s.l} className={`flex justify-between py-[10px] border-t border-ink/[0.14] ${j === v.specs.length - 1 ? 'border-b' : ''}`}>
                    <span className="font-['IBM_Plex_Mono:Regular'] text-[9.5px] text-ink/[0.5]">{s.l}</span>
                    <span className="font-['Cormorant_Garamond:Regular'] text-[13px] text-ink">{s.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </article>
        ))}
      </section>

      {/* Map — the Uco Valley in relief, three vineyards side by side */}
      <UcoMap />

      {/* Soil — the alluvial fan */}
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] border-t border-ink/[0.12]">
        <div className="flex flex-col justify-center gap-6 px-5 sm:px-8 lg:px-12 py-16 lg:py-[110px] order-2 lg:order-1">
          <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[2.28px] text-ink/[0.5] reveal">{t.vinedos.narrative.soilEyebrow}</p>
          <h2 className="font-['Cormorant_Garamond:Light'] text-[clamp(28px,3.2vw,42px)] text-ink leading-[1.14] max-w-[460px] reveal reveal-d1">{t.vinedos.narrative.soilTitle}</h2>
          <p className="font-['Archivo:Light'] text-[15px] text-ink/[0.74] leading-[1.75] max-w-[520px] reveal reveal-d2" style={{ fontVariationSettings: '"wdth" 100' }}>{t.vinedos.narrative.soilBody}</p>
        </div>
        <div className="order-1 lg:order-2 overflow-hidden min-h-[320px] lg:min-h-0">
          <img src={`${A}/vinedos-soil.jpg`} alt={t.vinedos.narrative.soilTitle} className="w-full h-full object-cover" />
        </div>
      </section>

      {/* Old vines */}
      <section className="border-t border-ink/[0.12]">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="overflow-hidden min-h-[360px] lg:min-h-[560px]">
            <img src={`${A}/vinedos-vines-1.jpg`} alt={t.vinedos.narrative.vinesTitle} className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col justify-center gap-6 px-5 sm:px-8 lg:px-12 py-16 lg:py-[90px]">
            <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[2.28px] text-ink/[0.5] reveal">{t.vinedos.narrative.vinesEyebrow}</p>
            <h2 className="font-['Cormorant_Garamond:Light'] text-[clamp(28px,3.2vw,42px)] text-ink leading-[1.14] max-w-[460px] reveal reveal-d1">{t.vinedos.narrative.vinesTitle}</h2>
            <p className="font-['Archivo:Light'] text-[15px] text-ink/[0.78] leading-[1.75] max-w-[520px] reveal reveal-d2" style={{ fontVariationSettings: '"wdth" 100' }}>{t.vinedos.narrative.vinesBody1}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 border-t border-ink/[0.12]">
          <div className="flex flex-col justify-center gap-5 px-5 sm:px-8 lg:px-12 py-16 lg:py-[90px] order-2 lg:order-1">
            <p className="font-['Archivo:Light'] text-[15px] text-ink/[0.78] leading-[1.75] max-w-[520px] reveal" style={{ fontVariationSettings: '"wdth" 100' }}>{t.vinedos.narrative.vinesBody2}</p>
            <p className="font-['Archivo:Light'] text-[14px] text-ink/[0.64] leading-[1.75] max-w-[520px] reveal reveal-d1" style={{ fontVariationSettings: '"wdth" 100' }}>{t.vinedos.narrative.vinesBody3}</p>
          </div>
          <div className="overflow-hidden min-h-[320px] lg:min-h-[460px] order-1 lg:order-2">
            <img src={`${A}/vinedos-vines-2.jpg`} alt={t.vinedos.narrative.vinesTitle} className="w-full h-full object-cover" />
          </div>
        </div>
      </section>

      {/* Craftsmanship — hand-harvested, minimal intervention */}
      <section className="bg-panel grid grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
        <div className="overflow-hidden min-h-[360px] lg:min-h-[620px]">
          <img src={`${A}/vinedos-hands.jpg`} alt={t.vinedos.narrative.craftTitle} className="w-full h-full object-cover object-[50%_45%]" />
        </div>
        <div className="flex flex-col justify-center gap-6 px-5 sm:px-8 lg:px-12 py-16 lg:py-[90px]">
          <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[2.28px] text-on-dark/[0.5] reveal">{t.vinedos.narrative.craftEyebrow}</p>
          <h2 className="font-['Cormorant_Garamond:Light'] text-[clamp(26px,2.8vw,38px)] text-on-dark leading-[1.18] max-w-[500px] reveal reveal-d1">{t.vinedos.narrative.craftTitle}</h2>
          <p className="font-['Archivo:Light'] text-[15px] text-on-dark/[0.78] leading-[1.75] max-w-[520px] reveal reveal-d2" style={{ fontVariationSettings: '"wdth" 100' }}>{t.vinedos.narrative.craftBody1}</p>
          <p className="font-['Archivo:Light'] text-[13.5px] text-on-dark/[0.62] leading-[1.75] max-w-[520px] reveal reveal-d3" style={{ fontVariationSettings: '"wdth" 100' }}>{t.vinedos.narrative.craftBody2}</p>
          <p className="font-['Archivo:Light'] text-[13.5px] text-on-dark/[0.62] leading-[1.75] max-w-[520px] reveal reveal-d3" style={{ fontVariationSettings: '"wdth" 100' }}>{t.vinedos.narrative.craftBody3}</p>
        </div>
      </section>
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
          <img src={IMG.vinexpo} alt={t.novedades.featured.title1} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
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
              <img src={NOVEDADES_ARTICLE_IMGS[i]} alt={a.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
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

// ─── Location map — the three Geographical Indications of the vineyards ───────
// Natural satellite view of the Uco Valley (Sentinel-2, see ucomap.ts) with the official
// limits of Paraje Altamira, La Consulta and Vista Flores drawn as zones. Each zone opens
// a card with its copy from the Vineyards page.
// Shown west-up: the Andes on top, descending east to the vineyards. ucomap.ts stays north-up;
// rotated space is X' = UCO_H - y, Y' = x (uco-sat-wup.webp = uco-sat.webp turned 90° clockwise).
const UCO_ROT = `matrix(0 1 -1 0 ${UCO_H} 0)`;
const ucoRot = ([x, y]: readonly number[]) => [UCO_H - y, x] as const;
const UCO_VB_DESKTOP = [0, 60, UCO_H, 1930] as const;
const UCO_VB_MOBILE = [300, 120, 1200, 1900] as const;
const UCO_GOLD = '#f0d6a0';
const UCO_WATER = '#bfe0ea';
// index ↔ t.vinedos.cards (Altamira, Vista Flores, La Consulta); drawn La Consulta → Vista Flores → Altamira
const UCO_ZONE = [
  { key: 'altamira', name: 'Altamira', fill: '#c9a063', label: UCO_PT.altamiraLabel },
  { key: 'vistaFlores', name: 'Vista Flores', fill: '#8c3044', label: UCO_PT.vistaFloresLabel },
  { key: 'laConsulta', name: 'La Consulta', fill: '#8f9b66', label: UCO_PT.laConsultaLabel },
] as const;
const UCO_DRAW_ORDER = [2, 1, 0];

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

function UcoInset({ className }: { className?: string }) {
  return (
    <svg viewBox="438 14 372 600" className={className} aria-hidden="true">
      <path d={CHILE} fill="none" stroke="#f2ede4" strokeOpacity="0.22" strokeWidth="1.4" strokeLinejoin="round" />
      <path d={ARG_REST} fill="#f2ede4" fillOpacity="0.1" stroke="#f2ede4" strokeOpacity="0.5" strokeWidth="1.4" strokeLinejoin="round" />
      <path d={ARG_MENDOZA} fill={UCO_GOLD} stroke={UCO_GOLD} strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function UcoAltitude({ className = '' }: { className?: string }) {
  const t = useT();
  return (
    <div className={`flex flex-col ${className}`}>
      <p className="font-['Cormorant_Garamond:Light'] text-[clamp(44px,4.6vw,68px)] leading-[0.9] text-on-dark [text-shadow:0_2px_18px_rgba(0,0,0,0.6)]">
        {t.home.stats[0].num}
        <span className="ml-1 font-['Cormorant_Garamond:Light_Italic'] italic text-[0.5em] text-[#f0d6a0]">m</span>
      </p>
      <p className="mt-2 font-['IBM_Plex_Mono:Medium'] text-[9px] tracking-[0.22em] uppercase text-on-dark/70">{t.vinedos.mapArt.asl}</p>
    </div>
  );
}

function UcoScale({ vw }: { vw: number }) {
  return (
    <div className="flex items-end gap-4" aria-hidden="true">
      <div className="flex flex-col gap-[6px]">
        <div className="h-[5px] border-x border-b border-on-dark/70" style={{ width: `${(UCO_KM5 / vw) * 100}cqw` }} />
        <span className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[0.2em] text-on-dark/65">5 KM</span>
      </div>
      <div className="flex flex-col items-center gap-[2px] pb-[1px]">
        <svg width="9" height="12" viewBox="0 0 9 12" className="rotate-90"><path d="M4.5 0 9 12 4.5 9 0 12Z" fill="#f2ede4" fillOpacity="0.8" /></svg>
        <span className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] text-on-dark/65">N</span>
      </div>
    </div>
  );
}

function UcoMap() {
  const t = useT();
  const art = t.vinedos.mapArt;
  const cards = t.vinedos.cards;
  const mobile = useMedia('(max-width: 1023px)');
  const [vx, vy, vw, vh] = mobile ? UCO_VB_MOBILE : UCO_VB_DESKTOP;
  const [open, setOpen] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const px = (v: number) => `${((v - vx) / vw) * 100}%`;
  const py = (v: number) => `${((v - vy) / vh) * 100}%`;
  const at = (p: readonly number[]) => {
    const [x, y] = ucoRot(p);
    return { left: px(x), top: py(y) };
  };

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const towns = [
    { p: UCO_PT.tunuyan, name: 'Tunuyán' },
    { p: UCO_PT.sanCarlos, name: 'San Carlos' },
  ];
  const sel = open !== null ? ucoRot(UCO_ZONE[open].label) : null;
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

  const credit = (
    <p className="font-['IBM_Plex_Mono:Regular'] text-[8px] leading-[14px] tracking-[0.06em] text-on-dark/50">
      {art.limits} ·{' '}
      <a href="https://s2maps.eu" target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
        Sentinel-2 cloudless 2016
      </a>{' '}
      by EOX IT Services GmbH (Copernicus Sentinel data, CC BY 4.0) · © OpenStreetMap
    </p>
  );

  return (
    <section className="relative overflow-hidden border-t border-on-dark/[0.12] bg-[#0b0907] text-on-dark [container-type:inline-size]">
      <div className="lg:grid lg:grid-cols-[minmax(320px,0.4fr)_1fr]">
      <div className="flex flex-col justify-between gap-12 px-5 sm:px-8 pt-16 pb-8 lg:px-[clamp(24px,4vw,64px)] lg:py-20">
        {header}
        {!mobile && (
          <div className="flex flex-col gap-10">
            <div className="flex items-start gap-3">
              <UcoInset className="h-[clamp(110px,10vw,150px)] w-auto" />
              <div className="flex flex-col pt-2">
                <span className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[0.2em] text-[#f0d6a0]">{art.mendoza}</span>
                <span className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[0.2em] text-on-dark/70">{art.argentina}</span>
              </div>
            </div>
            <UcoAltitude />
            {credit}
          </div>
        )}
      </div>

      <div className="relative w-full overflow-hidden [container-type:inline-size]" style={{ aspectRatio: `${vw} / ${vh}` }} onClick={() => setOpen(null)}>
        <img
          src={`${A}/uco-sat-wup.webp`}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className="absolute max-w-none select-none"
          style={{ width: `${(UCO_H / vw) * 100}%`, left: `${(-vx / vw) * 100}%`, top: `${(-vy / vh) * 100}%` }}
        />
        {/* soft edges into the section; on desktop also into the text column */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(11,9,7,0.45)_0%,transparent_10%,transparent_86%,rgba(11,9,7,0.7)_100%)]" />
        {!mobile && <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(11,9,7,0.9)_0%,transparent_12%)]" />}

        <svg viewBox={`${vx} ${vy} ${vw} ${vh}`} className="pointer-events-none absolute inset-0 size-full">
          <defs>
            <filter id="uco-glow" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>
          <g transform={UCO_ROT}>
          {/* river — a soft wide glow under the zones to feel like water */}
          <path d={UCO_RIVER} fill="none" stroke={UCO_WATER} strokeOpacity="0.55" strokeWidth="11" filter="url(#uco-glow)" />
          {UCO_DRAW_ORDER.map((i) => {
            const z = UCO_ZONE[i];
            const active = open === i || hover === i;
            const dim = open !== null && open !== i;
            return (
              <path
                key={z.key}
                d={UCO_ZONES[z.key]}
                role="button"
                tabIndex={0}
                aria-label={`${z.name} — ${art.vineyards[i]}`}
                aria-expanded={open === i}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(open === i ? null : i);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setOpen(open === i ? null : i);
                  }
                }}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                fill={z.fill}
                fillOpacity={dim ? 0.18 : active ? 0.62 : z.key === 'altamira' ? 0.52 : 0.42}
                stroke="#fbf1dc"
                strokeOpacity={dim ? 0.35 : 0.95}
                strokeWidth={active ? 2.4 : 1.4}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                className="pointer-events-auto cursor-pointer outline-none transition-[fill-opacity,stroke-width,stroke-opacity] duration-500 focus-visible:[stroke-width:3]"
              />
            );
          })}
          {/* river again, over the zones, so the Tunuyán reads clearly along the vineyards' western edge */}
          <path d={UCO_RIVER} fill="none" stroke={UCO_WATER} strokeOpacity="0.4" strokeWidth="6" filter="url(#uco-glow)" />
          <path d={UCO_RIVER} fill="none" stroke="#eaf7fb" strokeOpacity="1" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </g>
        </svg>

        {/* zone labels */}
        {UCO_ZONE.map((z, i) => (
          <span
            key={z.key}
            className={`pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center transition-opacity duration-500 ${open !== null && open !== i ? 'opacity-50' : ''}`}
            style={at(z.label)}
          >
            <span className={`whitespace-nowrap font-['Cormorant_Garamond:Regular'] text-[clamp(17px,1.7vw,26px)] leading-[1.05] text-white ${shadow}`}>{z.name}</span>
          </span>
        ))}

        {/* context labels */}
        <span
          className={`pointer-events-none absolute whitespace-nowrap font-['Cormorant_Garamond:Light_Italic'] italic text-[clamp(13px,1.15vw,17px)] tracking-[0.06em] text-[#dff1f6] ${shadow}`}
          style={{ ...at(UCO_PT.riverLabel), transform: 'translate(-50%,-50%) rotate(49deg) translateY(-14px)' }}
        >
          {art.river}
        </span>
        <span
          className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-['IBM_Plex_Mono:Medium'] text-[clamp(9px,0.8vw,11px)] uppercase tracking-[0.5em] text-on-dark/85 ${shadow}`}
          style={{ left: '50%', top: py(330) }}
        >
          {art.andes}
        </span>
        {towns.map((tw) => (
          <span
            key={tw.name}
            className={`pointer-events-none absolute flex -translate-y-1/2 items-center gap-[7px] whitespace-nowrap font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[0.2em] uppercase text-on-dark/85 ${shadow} ${mobile ? '-translate-x-full flex-row-reverse' : ''}`}
            style={at(tw.p)}
          >
            <span className={`size-[5px] rounded-full bg-on-dark/85 ${mobile ? '-mr-[3px]' : '-ml-[3px]'}`} />
            {tw.name}
          </span>
        ))}
        {!mobile && (
          <span
            className={`pointer-events-none absolute right-[2.5%] flex -translate-y-1/2 items-center gap-2 font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[0.2em] uppercase text-on-dark/80 ${shadow}`}
            style={{ top: py(1200) }}
          >
            {art.toMendoza}
            <svg width="10" height="8" viewBox="0 0 10 8" aria-hidden="true"><path d="M10 4 5 8V5H0V3h5V0Z" fill="currentColor" /></svg>
          </span>
        )}

        {/* info card */}
        {open !== null && sel && (
          <div
            role="dialog"
            aria-label={art.vineyards[open]}
            onClick={(e) => e.stopPropagation()}
            className={`uco-card absolute z-20 border border-[#f0d6a0]/25 bg-[#0d0b08]/[0.9] p-6 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur-md ${
              mobile ? 'inset-x-3 bottom-3' : 'w-[330px]'
            }`}
            style={
              mobile
                ? undefined
                : {
                    left:
                      sel[0] > vx + vw / 2
                        ? `clamp(16px, calc(${px(sel[0])} - 420px), calc(100% - 346px))`
                        : `clamp(16px, calc(${px(sel[0])} + 90px), calc(100% - 346px))`,
                    top: `clamp(16px, calc(${py(sel[1])} - 150px), calc(100% - 390px))`,
                  }
            }
          >
            <div className="flex items-start justify-between gap-4">
              <p className="font-['IBM_Plex_Mono:Medium'] text-[9px] tracking-[0.24em] text-[#f0d6a0]/85">
                {UCO_ZONE[open].name.toUpperCase()}
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
              {cards[open].desc}
            </p>
            <dl className="mt-4">
              {cards[open].specs.map((s) => (
                <div key={s.l} className="flex justify-between border-t border-on-dark/[0.14] py-[9px] last:border-b">
                  <dt className="font-['IBM_Plex_Mono:Regular'] text-[9px] tracking-[0.12em] text-on-dark/55">{s.l}</dt>
                  <dd className="font-['Cormorant_Garamond:Regular'] text-[15px] text-on-dark">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {!mobile && (
          <div className={`pointer-events-none absolute bottom-[3%] left-[4%] transition-opacity duration-500 ${shadow} ${open !== null ? 'opacity-0' : ''}`}>
            <UcoScale vw={vw} />
          </div>
        )}
      </div>
      </div>

      {mobile && (
        <div className="flex flex-col gap-6 px-5 sm:px-8 pb-14 pt-6">
          <div className="flex items-end justify-between gap-6">
            <div className="flex flex-col gap-5">
              <UcoAltitude />
              <UcoScale vw={vw} />
            </div>
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-end pt-1 text-right">
                <span className="font-['IBM_Plex_Mono:Medium'] text-[8px] tracking-[0.2em] text-[#f0d6a0]">{art.mendoza}</span>
                <span className="font-['IBM_Plex_Mono:Medium'] text-[8px] tracking-[0.2em] text-on-dark/55">{art.argentina}</span>
              </div>
              <UcoInset className="h-[110px] w-auto" />
            </div>
          </div>
          {credit}
        </div>
      )}
    </section>
  );
}

// ─── CONTACTO ─────────────────────────────────────────────────────────────────
function Contacto() {
  useReveal();
  const t = useT();
  const CELLAR = `${A}/contact-bg.jpg`;
  const fields = [
    { label: t.contacto.fields[0], type: 'text' },
    { label: t.contacto.fields[1], type: 'email' },
    { label: t.contacto.fields[2], type: 'tel' },
    { label: t.contacto.fields[3], type: 'text' },
  ];
  return (
    <div className="bg-surface w-full">
      <div className="flex flex-col lg:flex-row lg:min-h-[calc(100vh-72px)]">
        {/* Form left */}
        <div className="flex-1 py-20 px-5 sm:px-9 lg:px-14 flex flex-col">
          <div className="flex flex-col gap-[18px] mb-[25px] reveal">
            <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[2.28px] text-ink/[0.5]">{t.contacto.eyebrow}</p>
            <h1 className="font-['Cormorant_Garamond:Light_Italic'] italic text-[32px] sm:text-[40px] lg:text-[46px] text-ink leading-[1.1] lg:leading-[50.6px]">{t.contacto.title}</h1>
          </div>
          <p className="font-['Archivo:Light'] text-[14px] text-ink/[0.7] leading-[25.9px] mb-8 reveal reveal-d1" style={{ fontVariationSettings: '"wdth" 100' }}>
            {t.contacto.intro1}<br />
            {t.contacto.intro2}
          </p>
          <form className="flex flex-col gap-0 reveal reveal-d2">
            {fields.map((field) => (
              <div key={field.label} className="flex flex-col gap-[9px] mb-9">
                <label className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.36px] text-ink/[0.5]">{field.label}</label>
                <input
                  type={field.type}
                  className="border-b border-ink/[0.28] bg-transparent outline-none font-['Archivo:Light'] text-[14px] text-ink py-2 focus:border-ink transition-colors"
                  style={{ fontVariationSettings: '"wdth" 100' }}
                />
              </div>
            ))}
            <div className="flex flex-col gap-[9px] mb-12">
              <label className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.36px] text-ink/[0.5]">{t.contacto.messageLabel}</label>
              <textarea
                className="border-b border-ink/[0.28] bg-transparent outline-none font-['Archivo:Light'] text-[14px] text-ink py-2 resize-none h-[80px] focus:border-ink transition-colors"
                style={{ fontVariationSettings: '"wdth" 100' }}
              />
            </div>
            <button
              type="submit"
              className="self-start bg-panel px-[34px] py-[15px] font-['Archivo:Regular'] text-[11px] tracking-[1.32px] uppercase text-on-dark hover:bg-panel-2 transition-colors"
              style={{ fontVariationSettings: '"wdth" 100' }}
            >
              {t.contacto.submit}
            </button>
          </form>
        </div>

        {/* Image right */}
        <div className="flex-1 relative overflow-hidden min-h-[440px] lg:min-h-0">
          <img src={CELLAR} alt="" className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-[rgba(20,18,15,0.1)] to-[rgba(20,18,15,0.6)]" />
          <div className="absolute bottom-0 left-0 right-0 grid grid-cols-2 gap-x-[26px] gap-y-8 p-11">
            <div className="flex flex-col gap-[9px]">
              <p className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.36px] text-on-dark/[0.65]">{t.contacto.officeLabel}</p>
              <p className="font-['Archivo:Light'] text-[13.5px] text-on-dark leading-[24.3px]" style={{ fontVariationSettings: '"wdth" 100' }}>
                Av. Colón 241<br />
                (5500) Mendoza, Argentina
              </p>
            </div>
            <div className="flex flex-col gap-[9px]">
              <p className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.36px] text-on-dark/[0.65]">{t.contacto.phoneLabel}</p>
              <p className="font-['Archivo:Light'] text-[13.5px] text-on-dark leading-[24.3px]" style={{ fontVariationSettings: '"wdth" 100' }}>
                Tel +54 261 4299962<br />
                Mobile USA +1 (305) 988 5992
              </p>
            </div>
            <div className="col-span-2 flex flex-col gap-[9px]">
              <p className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.36px] text-on-dark/[0.65]">{t.contacto.emailLabel}</p>
              <a
                href="mailto:facundo@altamiradelosandes.com"
                className="self-start border-b border-on-dark/[0.4] pb-[5px] font-['Archivo:Light'] text-[13.5px] text-on-dark hover:border-white/70 transition-colors"
                style={{ fontVariationSettings: '"wdth" 100' }}
              >
                facundo@altamiradelosandes.com
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── WINE DETAIL ──────────────────────────────────────────────────────────────
function WineDetail({ onNav, wineId }: { onNav: Nav; wineId: string }) {
  useReveal();
  const t = useT();
  const wine = t.wineCatalog.find((w) => w.id === wineId) ?? t.wineCatalog[0];
  const others = t.wineCatalog.filter((w) => w.id !== wine.id).slice(0, 3);
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
        <div className="absolute inset-x-0 top-0 h-[560px] lg:inset-y-0 lg:right-auto lg:h-auto lg:w-[60%] -z-10 overflow-hidden" aria-hidden="true">
          <img src={`${A}/wbg-${wine.id}.jpg`} alt="" className="h-[calc(100%-24px)] w-full lg:h-[calc(100%-24px)] lg:w-[calc(100%-24px)] object-cover object-[50%_40%] opacity-[0.78] dark:opacity-[0.62]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent from-[45%] to-surface lg:bg-gradient-to-r lg:from-[38%] lg:to-[92%]" />
          <div className="absolute inset-0 hidden lg:block bg-gradient-to-b from-transparent from-[70%] to-surface" />
        </div>

        <div className="relative flex items-end justify-center pt-12 pb-10 lg:py-16 min-h-[560px] lg:min-h-0">
          <span className="absolute bottom-[34px] lg:bottom-[58px] left-1/2 h-[18px] w-[150px] lg:w-[190px] -translate-x-1/2 rounded-[50%] bg-black/[0.5] blur-[12px]" aria-hidden="true" />
          <img
            src={WINE_META[wine.id].img}
            alt={`${wine.title1} ${wine.title2}`}
            className="relative h-[460px] lg:h-[620px] w-auto object-contain object-bottom drop-shadow-[0_24px_30px_rgba(0,0,0,0.35)] reveal"
          />
        </div>

        <div className="py-12 px-6 sm:px-8 lg:py-[72px] lg:pl-[40px] lg:pr-12 xl:pr-[72px] flex flex-col justify-center reveal reveal-d1">
          <p className="font-['IBM_Plex_Mono:Medium'] text-[10px] tracking-[2.2px] text-ink/[0.55] mb-6">{wine.region}</p>
          <h1 className="mb-8">
            <span className="block font-['Cormorant_Garamond:Light_Italic'] italic text-[38px] sm:text-[46px] lg:text-[58px] text-ink leading-[1.04]">{wine.title1}</span>
            <span className="block font-['Cormorant_Garamond:Light'] text-[38px] sm:text-[46px] lg:text-[58px] text-ink leading-[1.04]">{wine.title2}</span>
          </h1>
          <p className="font-['Archivo:Light'] text-[16px] text-ink/[0.78] leading-[1.8] max-w-[520px] mb-10" style={{ fontVariationSettings: '"wdth" 100' }}>
            {wine.desc}
          </p>

          <div className="flex items-center gap-6 mb-11">
            <p className="font-['Cormorant_Garamond:Light'] text-[58px] text-accent leading-none">{wine.score.value}</p>
            <span className="h-11 w-px bg-ink/[0.18]" aria-hidden="true" />
            <div className="flex flex-col gap-[6px]">
              <p className="font-['IBM_Plex_Mono:Medium'] text-[10px] tracking-[1.6px] text-ink/[0.75]">{wine.score.critic}</p>
              <p className="font-['IBM_Plex_Mono:Regular'] text-[10px] tracking-[1.6px] text-ink/[0.5]">{wine.score.year}</p>
            </div>
          </div>

          <p className="font-['IBM_Plex_Mono:Medium'] text-[10px] tracking-[2px] text-ink/[0.55] mb-1">{t.wineDetail.fichaLabel}</p>
          <dl className="grid grid-cols-2 gap-x-10">
            {wine.ficha.map((s) => (
              <div key={s.label} className={`border-t border-ink/[0.16] py-[16px] ${s.value.length > 24 ? 'col-span-2' : ''}`}>
                <dt className="font-['IBM_Plex_Mono:Regular'] text-[10px] tracking-[1.4px] text-ink/[0.5] mb-[6px]">{s.label}</dt>
                <dd className="font-['Cormorant_Garamond:Regular'] text-[20px] text-ink leading-[1.25]">{s.value}</dd>
              </div>
            ))}
          </dl>

          <div className="flex flex-wrap gap-[14px] mt-9 pt-9 border-t border-ink/[0.16]">
            <button
              onClick={() => onNav('contacto')}
              className="bg-panel px-[30px] py-[16px] font-['Archivo:Regular'] text-[11px] tracking-[1.32px] uppercase text-on-dark hover:bg-panel-2 transition-colors dark:bg-on-dark dark:text-panel dark:hover:bg-white"
              style={{ fontVariationSettings: '"wdth" 100' }}
            >
              {t.wineDetail.ctaInfo}
            </button>
            <button
              className="border border-ink/[0.4] px-[31px] py-[16px] font-['Archivo:Regular'] text-[11px] tracking-[1.32px] uppercase text-ink hover:border-ink transition-colors"
              style={{ fontVariationSettings: '"wdth" 100' }}
            >
              {t.wineDetail.downloadPdf}
            </button>
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
            onClick={() => onNav('vinedos')}
            className="self-start border border-on-dark/[0.45] px-[29px] py-[14px] font-['Archivo:Regular'] text-[10.5px] tracking-[1.26px] uppercase text-on-dark hover:border-white/70 transition-colors"
            style={{ fontVariationSettings: '"wdth" 100' }}
          >
            {t.wineDetail.vyBtn}
          </button>
        </div>
      </section>

      {/* Other wines */}
      <section className="px-5 sm:px-8 lg:px-12 pt-20 pb-[90px]">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-[34px]">
          <h3 className="font-['Cormorant_Garamond:Light_Italic'] italic text-[32px] text-ink leading-[35.2px] reveal">{t.wineDetail.otherWines}</h3>
          <button
            onClick={() => onNav('vinos')}
            className="border-b border-ink/[0.4] pb-[5px] font-['Archivo:Regular'] text-[11px] text-ink hover:border-ink transition-colors"
            style={{ fontVariationSettings: '"wdth" 100' }}
          >
            {t.wineDetail.seeAllWines}
          </button>
        </div>
        <div className="flex flex-col md:flex-row gap-[30px]">
          {others.map((w, i) => (
            <button
              key={w.id}
              className={`border border-ink/[0.13] flex gap-5 items-center p-[23px] flex-1 cursor-pointer hover:bg-ink/[0.03] transition-colors reveal reveal-d${i + 1} text-left`}
              onClick={() => onNav('wine-detail', w.id)}
            >
              <div className="shrink-0 h-[90px] w-[52px] overflow-hidden">
                <img src={WINE_META[w.id].img} alt={w.name} className="h-full w-full object-contain" />
              </div>
              <div className="flex flex-col gap-2">
                <p className="font-['IBM_Plex_Mono:Medium'] text-[8px] tracking-[1.12px] text-ink/[0.5]">{WINE_META[w.id].tag}</p>
                <p className="font-['Cormorant_Garamond:Regular'] text-[19px] text-ink leading-[23.75px]">
                  {w.name} <span className="font-['Cormorant_Garamond:Italic'] italic">{w.sub}</span>
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
const PAGES: Page[] = ['home', 'vinos', 'vinedos', 'novedades', 'contacto', 'wine-detail'];

function parseHash(): { page: Page; wineId?: string } {
  if (typeof window === 'undefined') return { page: 'home' };
  const h = window.location.hash.replace(/^#\/?/, '');
  if (!h || h === 'home') return { page: 'home' };
  if (h.startsWith('wine/')) return { page: 'wine-detail', wineId: h.slice(5) || 'dama' };
  if (h === 'novedades' && !SHOW_NEWS) return { page: 'home' };
  return PAGES.includes(h as Page) && h !== 'wine-detail' ? { page: h as Page } : { page: 'home' };
}

function hashFor(p: Page, wineId?: string): string {
  if (p === 'home') return '#/';
  if (p === 'wine-detail') return '#/wine/' + (wineId || 'dama');
  return '#/' + p;
}

function Site() {
  const initial = parseHash();
  const [page, setPage] = useState<Page>(initial.page);
  const [activeWine, setActiveWine] = useState(initial.wineId || 'dama');
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

  function navigate(p: Page, wineId?: string) {
    if (wineId) setActiveWine(wineId);
    setPage(p);
    const url = hashFor(p, wineId);
    if (typeof window !== 'undefined' && window.location.hash !== url) {
      window.history.pushState({ p, wineId }, '', url);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const showFullFooter = page !== 'contacto' && page !== 'vinos' && page !== 'novedades' && page !== 'vinedos';

  return (
    <div className="min-h-screen w-full bg-surface">
      {!entered && <AgeGate onEnter={enter} />}
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
          {SHOW_NEWS && page === 'novedades' && <Novedades />}
          {page === 'contacto' && <Contacto />}
          {page === 'wine-detail' && <WineDetail onNav={navigate} wineId={activeWine} />}
          {showFullFooter ? (
            <Footer onNav={navigate} />
          ) : (
            <FooterBar />
          )}
        </>
      )}
    </div>
  );
}

function FooterBar() {
  const t = useT();
  return (
    <footer className="bg-accent-solid flex flex-col gap-2 md:flex-row md:items-center md:justify-between px-5 sm:px-8 lg:px-12 py-[34px]">
      <span className="font-['IBM_Plex_Mono:Regular'] text-[9.5px] tracking-[1.33px] text-on-dark/[0.7]">{t.footer.copyright}</span>
      {t.footer.warning && <span className="font-['IBM_Plex_Mono:Regular'] text-[9.5px] tracking-[1.33px] text-on-dark/[0.7]">{t.footer.warning}</span>}
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
