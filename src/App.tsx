import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LangProvider, useLang, useT, LANGS, type Lang } from './i18n';
import { MAP_W, MAP_H, MAGNIFIER, ARG_REST, ARG_MENDOZA, CHILE, ZOOM_NEIGHBOURS, ZOOM_MENDOZA, ZOOM_UCO, PT } from './mapdata';

type Page = 'home' | 'vinos' | 'vinedos' | 'novedades' | 'contacto' | 'wine-detail';
type Nav = (p: Page, wineId?: string) => void;

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
const HOME_VY_IMGS = [`${A}/mza-altamira.jpg`, `${A}/mza-vistaflores.jpg`, `${A}/la-consulta-real.jpg`];
const HOME_WINE_IMGS = [`${A}/73a8f.png`, `${A}/941aa.png`, `${A}/4600e.png`];
const HOME_NEWS_IMGS = [`${A}/5e611.png`, `${A}/28b42.png`];
const HOME_AWARD_IMGS = [`${A}/b1740.png`, `${A}/226c0.png`, `${A}/d7200.png`, `${A}/5b74e.png`, `${A}/fb3eb.png`, `${A}/36671.png`];
const VINEDOS_IMGS = [`${A}/mza-estate.jpg`, `${A}/mza-vistaflores.jpg`, `${A}/mza-altamira.jpg`];
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
const HOME_WINE_IDS = ['dama', 'navigato', 'reserva-malbec'];
const HOME_ESTATE_IDS = ['navigato', 'dama', 'reserva-malbec', 'vav-malbec'];

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
        src={`${A}/mza-altamira.jpg`}
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
    <section className="relative overflow-hidden bg-surface px-5 sm:px-8 lg:px-12 py-[clamp(84px,13vh,158px)]">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-ink">
        <Contours className="h-full w-full" lines={8} seed={5} opacity={0.06} />
      </div>
      <div className="reveal relative mx-auto flex max-w-[880px] flex-col items-center gap-8 text-center">
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
  ];
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
                  className={`font-['IBM_Plex_Mono:Medium'] text-[10px] tracking-[1px] px-[9px] py-[7px] transition-opacity ${
                    activeLang
                      ? isHome
                        ? 'text-white'
                        : 'text-ink'
                      : isHome
                      ? 'text-white/50 hover:text-white/80'
                      : 'text-ink/[0.4] hover:text-ink/[0.7]'
                  }`}
                >
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
                className={`font-['IBM_Plex_Mono:Medium'] text-[11px] tracking-[1px] px-3 py-2 rounded transition-colors ${
                  code === lang ? 'text-ink border border-ink/[0.3]' : 'text-ink/[0.45] border border-transparent'
                }`}
              >
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
              Tel / Fax +54 261 4299962
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
              facundo@vistafloresestate.com
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

      {/* Editorial breath — the place */}
      <Breath label={t.home.breathLabel} pre={t.home.breathPre} em={t.home.breathEm} post={t.home.breathPost} />

      {/* "Vinos únicos" split section */}
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-[70px] px-5 sm:px-8 lg:px-12 py-16 lg:py-[110px]">
        <div className="flex flex-col gap-[22px]">
          <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[2.28px] text-ink/[0.5] reveal">
            {t.home.estateEyebrow}
          </p>
          <h2 className="font-['Cormorant_Garamond:Regular'] text-[clamp(28px,3vw,40px)] text-ink leading-[1.16] reveal reveal-d1">
            {t.home.estateTitle1}
            <br />
            {t.home.estateTitle2}
          </h2>
          <div className="overflow-hidden h-[min(55vw,664px)] reveal reveal-d2">
            <img src={`${A}/mza-estate.jpg`} alt={t.home.estateEyebrow} className="w-full h-full object-cover" />
          </div>
        </div>
        <div className="flex flex-col justify-center lg:pt-[147px]">
          <p
            className="font-['Archivo:Light'] text-[clamp(16px,1.5vw,20px)] text-ink/[0.86] leading-[1.72] reveal reveal-d1"
            style={{ fontVariationSettings: '"wdth" 100' }}
          >
            {t.home.estatePara1}
          </p>
          <p
            className="font-['Archivo:Light'] text-[14.5px] text-ink/[0.66] leading-[26.8px] mt-8 reveal reveal-d2"
            style={{ fontVariationSettings: '"wdth" 100' }}
          >
            {t.home.estatePara2}
          </p>
          <div className="mt-10 grid grid-cols-2 gap-px bg-ink/[0.14] reveal reveal-d3">
            {t.home.estateWines.map((w, i) => (
              <button
                key={w.name}
                className="bg-surface p-[22px] flex flex-col gap-[8px] cursor-pointer hover:bg-surface-2 transition-colors text-left"
                onClick={() => onNav('wine-detail', HOME_ESTATE_IDS[i])}
              >
                <p className="font-['Cormorant_Garamond:Regular'] text-[22px] text-ink leading-[27.5px]">
                  {w.name}
                </p>
                <p className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.19px] text-ink/[0.5]">
                  {w.sub}
                </p>
              </button>
            ))}
          </div>
        </div>
      </section>

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

        {/* Vineyard rows */}
        {t.home.vyRows.map((vyd, idx) => {
          const imgLeft = idx % 2 === 0;
          const img = HOME_VY_IMGS[idx];
          return (
            <div
              key={vyd.num}
              className={`border-t border-on-dark/[0.14] grid ${imgLeft ? 'grid-cols-1 lg:grid-cols-[1.12fr_1fr]' : 'grid-cols-1 lg:grid-cols-[1fr_1.12fr]'}`}
            >
              {imgLeft && (
                <div className="overflow-hidden" style={{ aspectRatio: '676/520' }}>
                  <img src={img} alt={vyd.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
                </div>
              )}
              <div className={`flex flex-col gap-6 justify-center py-14 px-6 lg:py-[98px] lg:px-[55px] reveal ${imgLeft ? 'border-l border-on-dark/[0.14]' : ''}`}>
                <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[2.28px] text-on-dark/[0.5]">{vyd.num}</p>
                <h3 className="font-['Cormorant_Garamond:Light_Italic'] italic text-[38px] text-on-dark leading-[42.56px]">
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
              </div>
              {!imgLeft && (
                <div className="overflow-hidden" style={{ aspectRatio: '676/520' }}>
                  <img src={img} alt={vyd.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
                </div>
              )}
            </div>
          );
        })}

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

      {/* Wines section */}
      <section className="px-5 sm:px-8 lg:px-12 pt-16 lg:pt-[110px] pb-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-11">
          <div className="flex flex-col gap-[19px]">
            <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[2.28px] text-ink/[0.5] reveal">{t.home.winesEyebrow}</p>
            <h2 className="font-['Cormorant_Garamond:Light'] text-[30px] sm:text-[38px] lg:text-[44px] text-ink leading-[1.12] lg:leading-[49.28px] reveal reveal-d1">{t.home.winesTitle}</h2>
          </div>
          <p className="font-['Archivo:Light'] text-[14px] text-ink/[0.66] leading-[25.2px] max-w-[380px] reveal reveal-d2" style={{ fontVariationSettings: '"wdth" 100' }}>
            {t.home.winesPara}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-px bg-ink/[0.13] border-t border-b border-ink/[0.13]">
          {t.home.wines.map((wine, i) => (
            <button
              key={wine.name}
              className={`bg-surface flex-1 flex flex-col gap-[17px] items-start px-8 py-10 reveal reveal-d${i + 1} hover:bg-surface-2 transition-colors text-left`}
              onClick={() => onNav('wine-detail', HOME_WINE_IDS[i])}
            >
              <div className="h-[428px] w-full flex items-center justify-center overflow-hidden">
                <img src={HOME_WINE_IMGS[i]} alt={wine.name} className="h-full object-contain hover:scale-105 transition-transform duration-500" />
              </div>
              <p className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.36px] text-ink/[0.5]">{wine.region}</p>
              <div>
                <p className="font-['Cormorant_Garamond:Regular'] text-[24px] text-ink leading-[28.8px]">{wine.name}</p>
                <p className="font-['Cormorant_Garamond:Italic'] italic text-[24px] text-ink leading-[28.8px]">{wine.sub}</p>
              </div>
              <p className="font-['Archivo:Light'] text-[12.5px] text-ink/[0.68] leading-[21.88px]" style={{ fontVariationSettings: '"wdth" 100' }}>{wine.desc}</p>
              <span className="border-b border-accent/[0.35] pb-[5px] font-['Archivo:Regular'] text-[11px] text-accent">{t.home.fullInfo}</span>
            </button>
          ))}
        </div>

        <div className="flex justify-center mt-11">
          <button
            onClick={() => onNav('vinos')}
            className="border border-ink/[0.42] px-[35px] py-[16px] font-['Archivo:Regular'] text-[11px] tracking-[1.32px] uppercase text-ink hover:bg-ink/[0.05] transition-colors"
            style={{ fontVariationSettings: '"wdth" 100' }}
          >
            {t.home.seeAllWines}
          </button>
        </div>
      </section>

      {/* Quote section */}
      <section className="relative h-[480px] overflow-hidden flex items-center justify-center mt-16">
        <div className="absolute inset-0">
          <img src={`${A}/mza-valley.jpg`} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-[rgba(20,18,15,0.6)]" />
        </div>
        <div className="relative text-center px-6 sm:px-12 lg:px-16 max-w-[860px] reveal">
          <p className="font-['Playfair_Display:Bold_Italic'] font-bold italic text-[34px] text-on-dark leading-[48.28px]">
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
  }, [filter]);

  return (
    <div className="bg-surface w-full">
      <section className="relative h-[340px] overflow-hidden flex items-center">
        <img src={`${A}/mza-altamira.jpg`} alt="" className="absolute inset-0 size-full object-cover" style={{ filter: 'brightness(1.12)' }} />
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

      {/* One shared, semi-transparent photo behind the filter bar and the wine grid. */}
      <section className="relative isolate min-h-[640px]">
      <img src={`${A}/vinos-bg.jpg`} alt="" aria-hidden="true" className="absolute inset-0 -z-20 size-full object-cover" />
      <div className="absolute inset-0 -z-10 bg-surface/[0.8]" aria-hidden="true" />
      <div className="border-b border-ink/[0.12] flex flex-wrap items-center gap-x-5 gap-y-3 px-5 sm:px-8 lg:px-12 py-5 lg:py-[26px]">
        <span className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.36px] text-ink/[0.45]">{t.vinos.filterLabel}</span>
        <div className="flex flex-wrap gap-2">
          {(['ALL', 'RESERVA', 'VAV', 'DAMA', 'NAVIGATO'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-[19px] py-[9px] font-['Archivo:Regular'] text-[10.5px] tracking-[0.84px] transition-colors ${
                filter === f
                  ? 'bg-panel text-on-dark border border-ink'
                  : 'border border-ink/[0.25] text-ink hover:border-ink/[0.5]'
              }`}
              style={{ fontVariationSettings: '"wdth" 100' }}
            >
              {t.vinos.filterLabels[f]}
            </button>
          ))}
        </div>
        <span className="ml-auto font-['IBM_Plex_Mono:Regular'] text-[10.5px] text-ink/[0.45]">{filtered.length.toString().padStart(2, '0')}</span>
      </div>

      <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border-l border-t-0 border-ink/[0.13]">
        {filtered.map((wine, i) => (
          <button
            key={wine.id}
            className={`relative h-[547px] cursor-pointer border-r border-b border-ink/[0.13] hover:bg-surface-2/[0.7] transition-colors reveal reveal-d${(i % 3) + 1} text-left`}
            onClick={() => onNav('wine-detail', wine.id)}
          >
            <div className="absolute left-[34px] right-[34px] top-[44px] h-[365px] flex items-end justify-center overflow-hidden">
              <img src={wine.img} alt={wine.name} className="h-full object-contain hover:scale-105 transition-transform duration-500" />
            </div>
            <p className="absolute left-[34px] right-[34px] top-[417px] font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.36px] text-ink/[0.5]">{wine.gridRegion}</p>
            <p className="absolute left-[34px] right-[34px] top-[442px] font-['Cormorant_Garamond:Regular'] text-[23px] text-ink leading-[28px]">
              {wine.name} <span className="font-['Cormorant_Garamond:Italic'] italic">{wine.sub}</span>
            </p>
            <span className="absolute left-[34px] top-[487px] border-b border-accent/[0.35] pb-[5px] font-['Archivo:Regular'] text-[11px] text-accent">{t.vinos.fullInfo}</span>
          </button>
        ))}
      </div>
      </section>
    </div>
  );
}

// ─── Terrain map — real relief tiles (Leaflet + OpenTopoMap) ──────────────────
function TerrainMap() {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const pins = [
      { name: 'Vista Flores', lat: -33.68, lon: -69.13 },
      { name: 'La Consulta', lat: -33.76, lon: -69.07 },
      { name: 'Altamira', lat: -33.79, lon: -69.13 },
    ];
    const map = L.map(el, {
      scrollWheelZoom: false,
      zoomControl: false,
      attributionControl: true,
      minZoom: 8,
      maxZoom: 16,
    });
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    // Real satellite imagery — the irrigated vineyards read as green against the
    // arid Andes foothills (a cultivated oasis, not an empty desert).
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Imagery © Esri · Maxar · Earthstar Geographics', maxZoom: 18 }
    ).addTo(map);
    // Subtle place/road labels for orientation (towns, routes — shows it is farmland).
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      { attribution: '', maxZoom: 18, opacity: 0.9 }
    ).addTo(map);
    pins.forEach((p) => {
      const icon = L.divIcon({
        className: 'vf-pin',
        html: `<span class="vf-pin__dot"></span><span class="vf-pin__label">${p.name}</span>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
      L.marker([p.lat, p.lon], { icon }).addTo(map);
    });
    // Frame the cultivated valley so the geometric green vineyard parcels fill the
    // view (clearly farmland, not desert) with the three estates spread across it.
    map.fitBounds(
      L.latLngBounds([
        [-33.61, -69.2],
        [-33.86, -68.99],
      ]),
      { padding: [8, 8] }
    );
    const timer = setTimeout(() => map.invalidateSize(), 120);
    return () => {
      clearTimeout(timer);
      map.remove();
    };
  }, []);
  return <div ref={ref} className="vf-map h-[clamp(380px,46vw,560px)] w-full" />;
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
            src={`${A}/andes-real.jpg`}
            alt={t.vinedos.heroTitle1 + ' ' + t.vinedos.heroTitle2}
            className="absolute inset-0 size-full object-cover object-[50%_20%]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[rgba(20,18,15,0.28)] via-transparent to-[rgba(20,18,15,0.72)]" />
        </div>
        <div className="relative px-5 sm:px-8 lg:px-12 pb-14 flex flex-col gap-[18px]">
          <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[2.28px] text-on-dark/[0.72] hero-line-1">{t.vinedos.heroEyebrow}</p>
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
              <img src={VINEDOS_IMGS[i]} alt={v.name + v.italic} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
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

      {/* Map — bespoke location illustration (Argentina + Uco Valley inset) */}
      <section className="relative overflow-hidden bg-panel px-5 sm:px-8 lg:px-12 py-[clamp(70px,9vw,120px)]">
        <div className="pointer-events-none absolute inset-0 text-on-dark">
          <Contours className="h-full w-full" lines={9} seed={4} opacity={0.05} />
        </div>
        <div className="relative mx-auto grid max-w-[1180px] grid-cols-1 lg:grid-cols-[0.82fr_1.18fr] gap-[50px] items-center">
          <div className="flex flex-col gap-5 reveal">
            <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[2.28px] text-on-dark/[0.5]">{t.vinedos.mapLabel}</p>
            <h2 className="font-['Cormorant_Garamond:Light'] text-[clamp(30px,3.4vw,44px)] text-on-dark leading-[1.1]">
              {t.vinedos.mapPlace1}
              <br />
              <span className="font-['Cormorant_Garamond:Light_Italic'] italic">{t.vinedos.mapPlace2}</span>
            </h2>
            <p className="font-['Archivo:Light'] text-[14px] text-on-dark/[0.7] leading-[25.9px] max-w-[360px]" style={{ fontVariationSettings: '"wdth" 100' }}>
              {t.vinedos.mapDesc}
            </p>
            <div className="flex flex-col gap-[10px] pt-2">
              {t.vinedos.mapArt.vineyards.map((name) => (
                <div key={name} className="flex items-center gap-[10px]">
                  <div className="bg-on-dark rounded-full size-[7px] shrink-0" />
                  <span className="font-['Archivo:Light'] text-[12.5px] text-on-dark/[0.82]" style={{ fontVariationSettings: '"wdth" 100' }}>{name}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="reveal reveal-d1 overflow-hidden rounded-[14px] border border-on-dark/[0.14] shadow-[0_20px_60px_-24px_rgba(0,0,0,0.7)]">
            <TerrainMap />
          </div>
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

// ─── Location map (Argentina → Uco Valley magnifier) ──────────────────────────
// Editorial counterpart to the satellite map on the Vineyards page, following the
// estate's original site: the country with Mendoza highlighted, and a circular
// magnifier on the Uco Valley with the three vineyards. Real province geometry
// (see mapdata.ts), localized labels from the mapArt copy.
const MAP = {
  country: '#d9cbb0', // Argentina
  mendoza: '#b04a5f', // Mendoza province — burgundy, lifted for the dark panel
  ucoValley: '#8fae68', // Uco Valley — vine green
  chileLand: '#26343d', // beyond the Andes (inside the magnifier)
  line: '#14120f',
  text: '#eadfcb',
};

function MapArt({ view, uid }: { view: 'full' | 'lens' | 'country'; uid: string }) {
  const t = useT();
  const art = t.vinedos.mapArt;
  const short = t.vinedos.cards.map((c) => c.italic.trim()); // Altamira · Vista Flores · La Consulta
  const { cx, cy, r } = MAGNIFIER;
  const clip = `lens-${uid}`;
  const viewBox = view === 'lens' ? '20 120 440 480' : view === 'country' ? '438 14 372 600' : `0 0 ${MAP_W} ${MAP_H}`;
  const serif = "'Cormorant Garamond:Regular', Georgia, serif";
  const sans = "'Archivo:Regular', Archivo, system-ui, sans-serif";
  const [mx, my] = PT.mendozaCity;
  const [rx, ry] = PT.rim;
  const [zx, zy] = PT.mendozaCityZ;
  const [vx, vy] = PT.vistaFlores;
  const [lx, ly] = PT.laConsulta;
  const [ax, ay] = PT.altamira;
  const showLens = view !== 'country';
  const showCountry = view !== 'lens';
  return (
    <svg
      viewBox={viewBox}
      className="block h-auto w-full"
      role="img"
      aria-label={`${art.argentina} · ${art.mendoza} · ${art.valley}`}
    >
      <defs>
        <clipPath id={clip}>
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
        <path id={`pac-${uid}`} d="M 500 214 Q 470 372 512 540" />
        <path id={`atl-${uid}`} d="M 776 292 Q 812 410 742 536" />
      </defs>

      {showCountry && (
        <g>
          {/* Chile (outline only, like the original) */}
          <path d={CHILE} fill="none" stroke={MAP.text} strokeOpacity="0.5" strokeWidth="0.9" strokeLinejoin="round" />
          {/* Argentina */}
          <path d={ARG_REST} fill={MAP.country} stroke={MAP.country} strokeWidth="0.8" strokeLinejoin="round" />
          <path d={ARG_MENDOZA} fill={MAP.mendoza} stroke={MAP.mendoza} strokeWidth="0.8" strokeLinejoin="round" />
          {/* labels */}
          <text x="520" y="150" textAnchor="end" fill={MAP.text} fillOpacity="0.85" style={{ fontFamily: serif, fontSize: 19, letterSpacing: '0.04em' }}>
            {art.chile}
          </text>
          <text x="666" y="118" textAnchor="middle" fill="#14120f" fillOpacity="0.78" style={{ fontFamily: serif, fontSize: 21, letterSpacing: '0.05em' }}>
            {art.argentina}
          </text>
          <text fill={MAP.text} fillOpacity="0.8" style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 19, letterSpacing: '0.18em' }}>
            <textPath href={`#pac-${uid}`} startOffset="50%" textAnchor="middle">{art.pacific}</textPath>
          </text>
          <text fill={MAP.text} fillOpacity="0.8" style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 19, letterSpacing: '0.18em' }}>
            <textPath href={`#atl-${uid}`} startOffset="50%" textAnchor="middle">{art.atlantic}</textPath>
          </text>
          <circle cx={mx} cy={my} r="9" fill="none" stroke={MAP.text} strokeOpacity="0.7" strokeWidth="1" />
          <circle cx={mx} cy={my} r="4.2" fill={MAP.text} />
        </g>
      )}

      {showLens && view === 'full' && (
        <line x1={mx - 10} y1={my + 2} x2={rx} y2={ry} stroke={MAP.text} strokeOpacity="0.55" strokeWidth="1" />
      )}

      {showLens && (
        <g>
          <circle cx={cx} cy={cy} r={r + 9} fill="none" stroke={MAP.text} strokeOpacity="0.16" strokeWidth="1" />
          <g clipPath={`url(#${clip})`}>
            <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} fill={MAP.chileLand} />
            <path d={ZOOM_NEIGHBOURS} fill={MAP.country} stroke={MAP.country} strokeWidth="0.8" strokeLinejoin="round" />
            <path d={ZOOM_MENDOZA} fill={MAP.mendoza} stroke={MAP.country} strokeWidth="1.1" strokeLinejoin="round" />
            <path d={ZOOM_UCO} fill={MAP.ucoValley} fillOpacity="0.92" stroke={MAP.line} strokeWidth="0.6" strokeLinejoin="round" />
          </g>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={MAP.text} strokeOpacity="0.85" strokeWidth="1.4" />

          {/* Mendoza city */}
          <circle cx={zx} cy={zy} r="6" fill={MAP.text} />
          <text x={zx + 14} y={zy - 8} fill={MAP.text} style={{ fontFamily: serif, fontSize: 25, letterSpacing: '0.06em' }}>
            {art.mendoza.toUpperCase()}
          </text>
          <text x={zx + 14} y={zy + 30} fill={MAP.text} style={{ fontFamily: serif, fontSize: 21 }}>
            {art.valley}
          </text>

          {/* three vineyards */}
          {[
            { p: [vx, vy], label: short[1], side: -1, dy: -4 },
            { p: [lx, ly], label: short[2], side: 1, dy: -2 },
            { p: [ax, ay], label: short[0], side: 1, dy: 18 },
          ].map(({ p, label, side, dy }) => (
            <g key={label}>
              <circle cx={p[0]} cy={p[1]} r="4.6" fill="#fff" stroke={MAP.line} strokeWidth="1" />
              <line x1={p[0] + side * 7} y1={p[1]} x2={p[0] + side * 24} y2={p[1] + dy} stroke={MAP.text} strokeOpacity="0.7" strokeWidth="0.9" />
              <text
                x={p[0] + side * 29}
                y={p[1] + dy + 4}
                textAnchor={side < 0 ? 'end' : 'start'}
                fill="#fff"
                style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 19 }}
              >
                {label}
              </text>
            </g>
          ))}
          <text x={cx} y={cy + r + 34} textAnchor="middle" fill={MAP.text} fillOpacity="0.7" style={{ fontFamily: sans, fontSize: 11, letterSpacing: '0.2em' }}>
            {t.home.stats[0].num} M · {art.asl.toUpperCase()}
          </text>
        </g>
      )}
    </svg>
  );
}

function LocationMap() {
  const t = useT();
  const art = t.vinedos.mapArt;
  const short = t.vinedos.cards.map((c) => c.italic.trim());
  return (
    <section className="relative overflow-hidden border-t border-on-dark/[0.12] bg-panel text-on-dark">
      <div className="pointer-events-none absolute inset-0 text-on-dark">
        <Contours className="h-full w-full" lines={9} seed={6} opacity={0.05} />
      </div>
      <div className="relative mx-auto grid max-w-[1180px] items-center gap-x-10 gap-y-10 px-5 sm:px-8 lg:px-12 py-[clamp(64px,8vw,112px)] lg:grid-cols-[0.62fr_1.38fr]">
        <div className="flex flex-col gap-5 reveal">
          <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[2.28px] text-[#d9a6b0]">{t.vinedos.mapLabel}</p>
          <h2 className="font-['Cormorant_Garamond:Light'] text-[clamp(28px,3.1vw,40px)] leading-[1.08]">
            {art.valley}
            <span className="block font-['Cormorant_Garamond:Light_Italic'] italic text-on-dark/70">{art.mendoza}</span>
          </h2>
          <p className="max-w-[320px] font-['Archivo:Light'] text-[13.5px] leading-[24px] text-on-dark/70" style={{ fontVariationSettings: '"wdth" 100' }}>
            {t.vinedos.mapDesc}
          </p>
          <ol className="mt-1 flex flex-col gap-[10px]">
            {short.map((name) => (
              <li key={name} className="flex items-center gap-[10px]">
                <span className="size-[7px] shrink-0 rounded-full bg-white" />
                <span className="font-['Archivo:Light'] text-[12.5px] text-on-dark/85" style={{ fontVariationSettings: '"wdth" 100' }}>
                  {name}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="reveal reveal-d1">
          {/* desktop: one composite, like the original; mobile: lens then country */}
          <div className="hidden lg:block">
            <MapArt view="full" uid="f" />
          </div>
          <div className="mx-auto flex max-w-[460px] flex-col gap-6 lg:hidden">
            <MapArt view="lens" uid="l" />
            <div className="mx-auto w-[62%]">
              <MapArt view="country" uid="c" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── CONTACTO ─────────────────────────────────────────────────────────────────
function Contacto() {
  useReveal();
  const t = useT();
  const CELLAR =
    'https://images.unsplash.com/photo-1765850257843-aa029ab7769c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3aW5lcnklMjJjZWxsYXIlMjJBcmdlbnRpbmElMjB2aW5leWFyZCUyMG1vdW50YWluJTIwQW5kZXN8ZW58MXx8fHwxNzg5OTE3MTUzfDA&ixlib=rb-4.1.0&q=80&w=1080';
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
                Tel / Fax +54 261 4299962<br />
                Mobile USA +1 (305) 988 5992
              </p>
            </div>
            <div className="col-span-2 flex flex-col gap-[9px]">
              <p className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.36px] text-on-dark/[0.65]">{t.contacto.emailLabel}</p>
              <a
                href="mailto:facundo@vistafloresestate.com"
                className="self-start border-b border-on-dark/[0.4] pb-[5px] font-['Archivo:Light'] text-[13.5px] text-on-dark hover:border-white/70 transition-colors"
                style={{ fontVariationSettings: '"wdth" 100' }}
              >
                facundo@vistafloresestate.com
              </a>
            </div>
          </div>
        </div>
      </div>

      <LocationMap />
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

      {/* Split: dark left / light right */}
      <section className="flex flex-col lg:flex-row lg:min-h-[700px]">
        <div className="bg-panel w-full lg:w-[45%] flex items-center justify-center relative overflow-hidden min-h-[420px] lg:min-h-0">
          <div className="absolute inset-0 opacity-[0.32]">
            <img src={`${A}/e17ef.png`} alt="" className="size-full object-cover" />
          </div>
          <div className="relative py-16 reveal">
            <img src={WINE_META[wine.id].img} alt={`${wine.title1} ${wine.title2}`} className="h-[420px] lg:h-[620px] object-contain hover:scale-105 transition-transform duration-700" />
          </div>
        </div>

        <div className="flex-1 py-12 px-6 lg:py-[60px] lg:px-[60px] flex flex-col justify-center reveal reveal-d1">
          <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[2.28px] text-ink/[0.5] mb-5">{wine.region}</p>
          <div className="mb-8">
            <p className="font-['Cormorant_Garamond:Light_Italic'] italic text-[32px] sm:text-[40px] lg:text-[48px] text-ink leading-[1.1] lg:leading-[52.8px]">{wine.title1}</p>
            <p className="font-['Cormorant_Garamond:Light'] text-[32px] sm:text-[40px] lg:text-[48px] text-ink leading-[1.1] lg:leading-[52.8px]">{wine.title2}</p>
          </div>
          <p className="font-['Archivo:Light'] text-[15px] text-ink/[0.78] leading-[27.75px] max-w-prose mb-8" style={{ fontVariationSettings: '"wdth" 100' }}>
            {wine.desc}
          </p>
          <div className="flex items-center gap-[18px] mb-10">
            <div className="border border-accent/[0.5] rounded-full size-[46px] flex items-center justify-center shrink-0">
              <span className="font-['Cormorant_Garamond:Regular'] text-[15px] text-accent">{wine.score.value}</span>
            </div>
            <div>
              <p className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.19px] text-ink/[0.5]">{wine.score.critic}</p>
              <p className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.19px] text-ink/[0.5]">{wine.score.year}</p>
            </div>
          </div>

          <p className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.53px] text-ink/[0.5] mb-4">{t.wineDetail.fichaLabel}</p>
          <div className="flex flex-col">
            {wine.ficha.map((s, i) => (
              <div key={s.label} className={`flex justify-between py-[13px] border-t border-ink/[0.16] ${i === wine.ficha.length - 1 ? 'border-b' : ''}`}>
                <span className="font-['IBM_Plex_Mono:Regular'] text-[11px] text-ink/[0.5]">{s.label}</span>
                <span className="font-['Cormorant_Garamond:Regular'] text-[15px] text-ink">{s.value}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-[14px] mt-8">
            <button
              onClick={() => onNav('contacto')}
              className="bg-panel px-[30px] py-[15px] font-['Archivo:Regular'] text-[11px] tracking-[1.32px] uppercase text-on-dark hover:bg-panel-2 transition-colors"
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
          {page === 'novedades' && <Novedades />}
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
