import { useState, useEffect, useRef, type FormEvent, type ReactNode } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LangProvider, useLang, useT, LANGS, type Lang } from './i18n';

type Page = 'home' | 'vinos' | 'vinedos' | 'novedades' | 'contacto' | 'wine-detail';
type Nav = (p: Page, wineId?: string) => void;

const A = `${import.meta.env.BASE_URL}assets`;

// Editorial images still served remotely (News page).
const IMG = {
  vinexpo:
    'https://images.unsplash.com/photo-1641830879467-e22004141bcb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  prowein:
    'https://images.unsplash.com/photo-1690986535140-dc095e75b726?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  vendimia:
    'https://images.unsplash.com/photo-1472352327492-9765783b74e1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  catas:
    'https://images.unsplash.com/photo-1610065333275-b3e5c63fc872?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  cellar:
    'https://images.unsplash.com/photo-1765850257843-aa029ab7769c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
};

// Language-neutral scaffolding (images / data) — text comes from the i18n copy.
const HOME_VY_IMGS = [`${A}/mza-altamira.jpg`, `${A}/mza-vistaflores.jpg`, `${A}/mza-laconsulta.jpg`];
const HOME_NEWS_IMGS = [`${A}/5e611.png`, `${A}/28b42.png`];
const HOME_AWARD_IMGS = [`${A}/b1740.png`, `${A}/226c0.png`, `${A}/d7200.png`, `${A}/5b74e.png`, `${A}/fb3eb.png`, `${A}/36671.png`];
const VINEDOS_IMGS = [`${A}/mza-estate.jpg`, `${A}/mza-vistaflores.jpg`, `${A}/mza-altamira.jpg`];
const NOVEDADES_ARTICLE_IMGS = [IMG.prowein, IMG.vendimia, IMG.catas];
const CONTACT_EMAIL = 'facundo@vistafloresestate.com';

// Vineyard positions, in the same order as the copy: Altamira · Altamira de los Andes · La Consulta.
const VY_COORDS: [number, number][] = [
  [-33.79, -69.13],
  [-33.68, -69.13],
  [-33.76, -69.07],
];
const ESTATE_COORD = VY_COORDS[1];

// Wine catalog scaffolding (bottle image / filter tag / blend flag) keyed by id.
const WINE_META: Record<string, { img: string; tag: 'ALTAMIRA' | 'VAV'; blend: boolean }> = {
  dama: { img: `${A}/5c918.png`, tag: 'ALTAMIRA', blend: true },
  navigato: { img: `${A}/3d3ec.png`, tag: 'ALTAMIRA', blend: true },
  'reserva-malbec': { img: `${A}/36069.png`, tag: 'ALTAMIRA', blend: false },
  'reserva-cf': { img: `${A}/42976.png`, tag: 'ALTAMIRA', blend: false },
  'vav-malbec': { img: `${A}/4600e.png`, tag: 'VAV', blend: false },
  'tres-fincas': { img: `${A}/73703.png`, tag: 'VAV', blend: true },
};
const HOME_WINE_IDS = ['dama', 'navigato', 'reserva-malbec'];
const HOME_ESTATE_IDS = ['navigato', 'dama', 'reserva-malbec', 'vav-malbec'];

// ─── Instrument helpers: coordinates and the live hour in Mendoza ─────────────
function dms(v: number, pos: string, neg: string) {
  const a = Math.abs(v);
  const d = Math.floor(a);
  const mf = (a - d) * 60;
  const m = Math.floor(mf);
  const s = Math.round((mf - m) * 60);
  return `${d}°${String(m).padStart(2, '0')}′${String(s).padStart(2, '0')}″${v < 0 ? neg : pos}`;
}
function useCoords() {
  const { lang } = useLang();
  const west = lang === 'en' ? 'W' : 'O';
  return (c: [number, number]) => `${dms(c[0], 'N', 'S')}  ${dms(c[1], 'E', west)}`;
}
function mendozaTime() {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Argentina/Mendoza',
    }).format(new Date());
  } catch (e) {
    return '';
  }
}
function useMendozaTime() {
  const [time, setTime] = useState(mendozaTime);
  useEffect(() => {
    const id = setInterval(() => setTime(mendozaTime()), 15000);
    return () => clearInterval(id);
  }, []);
  return time;
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

// ─── Icons & brand marks ──────────────────────────────────────────────────────
const ThemeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor" strokeWidth="1.1" />
    <path d="M8 1.6a6.4 6.4 0 0 1 0 12.8z" fill="currentColor" />
  </svg>
);
const MenuIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
    <path d="M3 9h18M3 15h18" />
  </svg>
);
const CloseIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
    <path d="M5 5l14 14M19 5L5 19" />
  </svg>
);
const Arrow = ({ className = '' }: { className?: string }) => (
  <svg className={`arrow ${className}`} width="16" height="10" viewBox="0 0 16 10" fill="none" aria-hidden="true">
    <path d="M0 5h14.5M10.5 1l4 4-4 4" stroke="currentColor" strokeWidth="1.1" />
  </svg>
);

// The estate's own mark, as printed on the labels: a fine "A" crossed by the horizon.
function Mark({ className = '', stroke = 1.4 }: { className?: string; stroke?: number }) {
  return (
    <svg className={className} viewBox="0 0 64 52" fill="none" aria-hidden="true">
      <path
        d="M18.5 50 L32 3.5 L45.5 50"
        stroke="currentColor"
        strokeWidth={stroke}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="miter"
      />
      <path d="M1 39 Q32 21 63 39 Q32 26.5 1 39 Z" fill="currentColor" />
    </svg>
  );
}

// Lockup: mark + ALTAMIRA / DE LOS ANDES, stacked like the label.
function Lockup({ className = '' }: { className?: string }) {
  return (
    <span className={`flex items-center gap-3 leading-none ${className}`}>
      <Mark className="w-[30px] h-auto text-accent-solid" />
      <span className="flex flex-col items-start">
        <span className="text-[16px] sm:text-[17px] font-normal tracking-[0.28em]">ALTAMIRA</span>
        <span className="mt-[6px] text-[8.5px] font-medium tracking-[0.46em] opacity-75">DE LOS ANDES</span>
      </span>
    </span>
  );
}

// The curve of the horizon seen from altitude — the signature line.
function Horizon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1000 100" preserveAspectRatio="none" fill="none" aria-hidden="true">
      <path d="M0 99 Q500 1 1000 99" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Corners({ className = '' }: { className?: string }) {
  return (
    <span className={`corners ${className}`} aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

function Chapter({ n, children, className = '' }: { n?: string; children: ReactNode; className?: string }) {
  return (
    <p className={`chapter t-label ${className}`}>
      {n && <span className="chapter__n">{n}</span>}
      <span className="chapter__rule" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

// ─── Topographic contour lines (altitude texture for dark chapters) ───────────
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

// ─── Age gate ─────────────────────────────────────────────────────────────────
function AgeGate({ onEnter }: { onEnter: () => void }) {
  const t = useT();
  const [leaving, setLeaving] = useState(false);
  const enter = () => {
    setLeaving(true);
    setTimeout(onEnter, 700);
  };
  return (
    <div
      className={`gate ${leaving ? 'gate--leaving' : ''} fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-panel px-6 text-on-dark`}
    >
      <img
        src={`${A}/mza-altamira.jpg`}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 size-full object-cover kenburns"
      />
      <div className="absolute inset-0 bg-[rgba(10,9,7,0.58)]" />
      <Corners className="[--ci:clamp(14px,2.6vw,30px)] [--cs:22px] text-on-dark/70" />

      <div className="relative flex max-w-[560px] flex-col items-center text-center">
        <Mark className="w-[60px] h-auto text-accent-light in-fade" />
        <p className="t-mega mt-7 text-[clamp(36px,6.6vw,66px)] in-fade d1" style={{ paddingLeft: '0.1em' }}>
          ALTAMIRA
        </p>
        <p
          className="mt-4 text-[clamp(10px,1.35vw,13.5px)] font-normal tracking-[0.5em] text-on-dark/85 in-fade d1"
          style={{ paddingLeft: '0.5em' }}
        >
          DE LOS ANDES
        </p>
        <p className="t-name mt-12 text-[clamp(20px,2.3vw,27px)] text-on-dark/90 in-fade d2">
          {t.gate.line1}
          <br />
          {t.gate.line2}
        </p>
        <p className="t-small mt-6 max-w-[40ch] text-on-dark/65 in-fade d3">{t.gate.confirm}</p>
        <button onClick={enter} className="btn btn--light mt-10 in-fade d4">
          {t.gate.enter}
          <Arrow />
        </button>
        <p className="t-data mt-9 text-[10px] text-on-dark/45 in-fade d5">{t.gate.warning}</p>
      </div>
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
function Header({ page, onNav }: { page: Page; onNav: Nav }) {
  const isHome = page === 'home';
  const { theme, toggle } = useTheme();
  const { lang, setLang } = useLang();
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

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
  const isActive = (p: Page) => page === p || (page === 'wine-detail' && p === 'vinos');
  const tone = isHome && !menuOpen ? 'text-on-dark' : 'text-ink';

  return (
    <header
      className={`z-50 ${
        isHome
          ? `absolute inset-x-0 top-0 ${menuOpen ? 'bg-surface' : ''}`
          : 'sticky top-0 bg-surface/95 backdrop-blur-md border-b border-line'
      }`}
    >
      <div className={`wrap flex h-[var(--header)] items-center justify-between gap-6 ${tone}`}>
        <button onClick={() => go('home')} aria-label="Altamira de los Andes Estate" className="shrink-0">
          <Lockup />
        </button>

        <nav className="hidden lg:flex items-center gap-9" aria-label="Main">
          {navItems.map(([p, label]) => (
            <button
              key={p}
              onClick={() => go(p)}
              aria-current={isActive(p) ? 'page' : undefined}
              className={`t-label relative py-2 transition-opacity ${
                isActive(p) ? 'opacity-100' : 'opacity-60 hover:opacity-100'
              }`}
            >
              {label}
              {isActive(p) && <span className="absolute left-0 right-[0.22em] -bottom-[3px] h-px bg-accent-solid" />}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-5">
          <div className="hidden lg:flex items-center gap-3 t-label">
            {LANGS.map((code, i) => (
              <span key={code} className="flex items-center gap-3">
                {i > 0 && <span className="h-[10px] w-px bg-current opacity-25" />}
                <button
                  onClick={() => setLang(code as Lang)}
                  aria-current={code === lang ? 'true' : undefined}
                  aria-label={t.a11y.langOf(code.toUpperCase())}
                  className={`py-2 transition-opacity ${code === lang ? 'opacity-100' : 'opacity-45 hover:opacity-80'}`}
                >
                  {code.toUpperCase()}
                </button>
              </span>
            ))}
          </div>

          <button
            onClick={toggle}
            aria-label={theme === 'dark' ? t.a11y.toLight : t.a11y.toDark}
            title={theme === 'dark' ? t.a11y.light : t.a11y.dark}
            className="grid size-[36px] place-items-center rounded-full border border-current/25 transition-colors hover:border-current/70"
          >
            <ThemeIcon />
          </button>

          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
            className="lg:hidden grid size-[36px] place-items-center"
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-[var(--header)] bottom-0 overflow-y-auto bg-surface text-ink border-t border-line">
          <nav className="wrap flex flex-col pt-4 pb-10" aria-label="Main">
            {navItems.map(([p, label], i) => (
              <button
                key={p}
                onClick={() => go(p)}
                className="group flex items-baseline gap-5 border-b border-line py-5 text-left"
              >
                <span className="t-data text-accent">{String(i + 1).padStart(2, '0')}</span>
                <span className={`text-[30px] font-light tracking-[-0.02em] ${isActive(p) ? 'text-ink' : 'text-ink/60'}`}>
                  {label}
                </span>
              </button>
            ))}
            <div className="mt-8 flex items-center gap-2">
              {LANGS.map((code) => (
                <button
                  key={code}
                  onClick={() => setLang(code as Lang)}
                  aria-current={code === lang ? 'true' : undefined}
                  aria-label={t.a11y.langOf(code.toUpperCase())}
                  className={`t-label px-4 py-3 border ${
                    code === lang ? 'border-ink text-ink' : 'border-transparent text-ink/45'
                  }`}
                >
                  {code.toUpperCase()}
                </button>
              ))}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer({ onNav }: { onNav: Nav }) {
  const t = useT();
  const pages: [Page, string][] = [
    ['vinos', t.nav.vinos],
    ['vinedos', t.nav.vinedos],
    ['novedades', t.nav.novedades],
    ['contacto', t.nav.contacto],
  ];
  return (
    <footer className="bg-panel text-on-dark overflow-hidden">
      <div className="wrap pt-[clamp(80px,10vw,140px)]">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4 flex flex-col gap-7">
            <Lockup />
            <p className="t-small max-w-[36ch] text-on-dark/65">
              {t.footer.tagline1} {t.footer.tagline2}
            </p>
          </div>

          <nav className="lg:col-span-2 lg:col-start-6 flex flex-col items-start gap-3" aria-label="Footer">
            {pages.map(([p, label]) => (
              <button key={p} onClick={() => onNav(p)} className="t-small text-on-dark/80 hover:text-on-dark transition-colors">
                {label}
              </button>
            ))}
          </nav>

          <div className="lg:col-span-3 flex flex-col gap-8">
            <div>
              <p className="t-label text-on-dark/45">{t.footer.officeLabel}</p>
              <p className="t-small mt-3 text-on-dark/85">
                Av. Colón 241
                <br />
                (5500) Mendoza, Argentina
              </p>
            </div>
            <div>
              <p className="t-label text-on-dark/45">{t.footer.phoneLabel}</p>
              <p className="t-small mt-3 text-on-dark/85">
                Tel / Fax +54 261 4299962
                <br />
                Mobile USA +1 (305) 988 5992
              </p>
            </div>
          </div>

          <div className="lg:col-span-3 flex flex-col gap-8">
            <div>
              <p className="t-label text-on-dark/45">{t.footer.contactLabel}</p>
              <a href={`mailto:${CONTACT_EMAIL}`} className="t-small mt-3 inline-block text-on-dark/85 border-b border-on-dark/30 pb-1 hover:border-on-dark transition-colors">
                {CONTACT_EMAIL}
              </a>
            </div>
            <div>
              <p className="t-label text-on-dark/45">{t.footer.followLabel}</p>
              <p className="t-small mt-3 flex flex-wrap gap-x-5 text-on-dark/85">
                <span>Instagram</span>
                <span>Facebook</span>
                <span>LinkedIn</span>
              </p>
            </div>
          </div>
        </div>

        <Horizon className="draw mt-[clamp(64px,8vw,110px)] h-[34px] w-full text-accent-solid" />
        <p
          aria-hidden="true"
          className="t-mega -mt-[0.04em] select-none text-center text-[clamp(56px,15vw,236px)] leading-[0.8] text-on-dark/[0.92]"
          style={{ paddingLeft: '0.1em' }}
        >
          ALTAMIRA
        </p>
      </div>
      <div className="mt-10 border-t border-line-dark">
        <div className="wrap flex flex-col gap-2 py-7 t-data text-[10.5px] text-on-dark/50 md:flex-row md:justify-between">
          <span>{t.footer.copyright}</span>
          <span>{t.footer.warning}</span>
        </div>
      </div>
    </footer>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
function Home({ onNav }: { onNav: Nav }) {
  const t = useT();
  const coords = useCoords();
  const time = useMendozaTime();
  const reduceMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const altitude = t.home.stats[0];
  const statBorders = ['', 'border-l border-line-dark pl-6 lg:pl-8', 'lg:border-l lg:border-line-dark lg:pl-8', 'border-l border-line-dark pl-6 lg:pl-8'];

  return (
    <div className="w-full bg-surface">
      {/* HERO — a viewfinder onto the Andes: "alta mira", the view from above. */}
      <section className="relative flex min-h-[100dvh] flex-col bg-panel pt-[var(--header)] text-on-dark">
        <div className="wrap flex flex-1 flex-col pb-7">
          <div className="relative min-h-[440px] flex-1 overflow-hidden in-frame">
            {reduceMotion ? (
              <img src={`${A}/hero-andes.jpg`} alt={t.home.heroEyebrow} className="absolute inset-0 size-full object-cover" />
            ) : (
              <video
                className="absolute inset-0 size-full object-cover"
                autoPlay
                muted
                loop
                playsInline
                poster={`${A}/hero-andes.jpg`}
              >
                <source src={`${A}/hero-andes.mp4`} type="video/mp4" />
              </video>
            )}
            <div className="absolute inset-0 bg-[rgba(10,9,7,0.34)]" />
            <Corners className="[--ci:16px] text-on-dark/80" />

            {/* Instrument readouts */}
            <p className="absolute left-[38px] top-[34px] t-data text-[10.5px] text-on-dark/80 in-fade d4">
              {coords(ESTATE_COORD)}
            </p>
            <p className="absolute right-[38px] top-[34px] hidden t-data text-[10.5px] text-on-dark/80 sm:block in-fade d4">
              {altitude.num} m · {altitude.unit}
            </p>
            <p className="absolute bottom-[34px] left-[38px] flex items-center gap-3 t-data text-[10.5px] text-on-dark/80 in-fade d5">
              <span className="live" aria-hidden="true" />
              Mendoza {time}
            </p>
            <p className="absolute bottom-[34px] right-[38px] hidden t-data text-[10.5px] text-on-dark/80 sm:block in-fade d5">
              {t.vinedos.mapPlace1}
            </p>

            <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
              <Mark className="w-[clamp(44px,5.4vw,84px)] h-auto text-on-dark in-fade d1" />
              <h1 className="t-mega mt-[clamp(16px,2.2vw,30px)] text-[clamp(44px,12.4vw,190px)]">
                <span className="in-rise">
                  <span className="d2" style={{ paddingLeft: '0.1em' }}>
                    {t.home.heroTitle1}
                  </span>
                </span>
                <span className="in-rise mt-[0.42em] text-[0.27em] font-normal tracking-[0.46em]">
                  <span className="d3" style={{ paddingLeft: '0.46em' }}>
                    {t.home.heroTitle2}
                  </span>
                </span>
              </h1>
            </div>
          </div>

          <div className="grid items-end gap-6 pt-8 lg:grid-cols-[1fr_auto_1fr]">
            <p className="t-label hidden text-on-dark/55 lg:block in-fade d4">{t.home.heroEyebrow}</p>
            <p className="t-lead mx-auto max-w-[34ch] text-center text-on-dark/90 in-fade d4">{t.home.heroSubtitle}</p>
            <div className="flex justify-center lg:justify-end in-fade d5">
              <button onClick={() => onNav('vinedos')} className="btn btn--light">
                {t.home.heroCta}
                <Arrow />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 01 — The place */}
      <section className="py-[clamp(110px,15vw,210px)]">
        <div className="wrap flex max-w-[1120px] flex-col items-center text-center">
          <Chapter n="01">{t.home.breathLabel}</Chapter>
          <p className="t-statement mt-10 reveal">
            {t.home.breathPre}
            <em>{t.home.breathEm}</em>
            {t.home.breathPost}
          </p>
          <Horizon className="draw mt-16 h-[44px] w-[min(760px,92%)] text-accent-solid" />
        </div>
      </section>

      {/* 02 — The estate */}
      <section className="wrap grid grid-cols-1 gap-x-12 gap-y-14 pb-[clamp(110px,13vw,190px)] lg:grid-cols-12">
        <figure className="relative aspect-[4/5] overflow-hidden lg:col-span-7 lg:aspect-[6/7] unveil">
          <img src={`${A}/mza-estate.jpg`} alt={t.home.estateEyebrow} className="absolute inset-0 size-full object-cover" />
          <Corners className="text-on-dark/85" />
          <figcaption className="absolute bottom-[32px] left-[38px] t-data text-[10.5px] text-on-dark/85">
            {coords(VY_COORDS[0])}
          </figcaption>
        </figure>
        <div className="flex flex-col lg:col-span-5 lg:pt-[16%]">
          <Chapter n="02">{t.home.estateEyebrow}</Chapter>
          <h2 className="t-h2 mt-8 reveal">
            {t.home.estateTitle1} {t.home.estateTitle2}
          </h2>
          <p className="t-lead mt-8 text-ink/80 reveal">{t.home.estatePara1}</p>
          <p className="t-body mt-6 text-ink/62 reveal">{t.home.estatePara2}</p>
          <ul className="mt-12 border-t border-line reveal">
            {t.home.estateWines.map((w, i) => (
              <li key={w.name}>
                <button
                  onClick={() => onNav('wine-detail', HOME_ESTATE_IDS[i])}
                  className="group flex w-full items-center justify-between gap-6 border-b border-line py-5 text-left"
                >
                  <span className="flex flex-col gap-1">
                    <span className="t-name text-[clamp(23px,2vw,29px)] transition-colors group-hover:text-accent">
                      {w.name}
                    </span>
                    <span className="t-label text-[10px] text-ink/45">{w.sub}</span>
                  </span>
                  <Arrow className="text-ink/50" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 03 — The vineyards (dark chapter) */}
      <section className="bg-panel text-on-dark">
        <div className="wrap grid items-end gap-10 pb-[clamp(56px,7vw,96px)] pt-[clamp(100px,12vw,170px)] lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Chapter n="03" className="text-accent-light">
              {t.home.vyEyebrow}
            </Chapter>
            <h2 className="t-h2 mt-8 reveal">
              {t.home.vyTitle1} {t.home.vyTitle2}
            </h2>
          </div>
          <p className="t-body text-on-dark/68 lg:col-span-4 lg:col-start-9 reveal">{t.home.vyIntro}</p>
        </div>

        {t.home.vyRows.map((vyd, idx) => {
          const flip = idx % 2 === 1;
          return (
            <article key={vyd.num} className="border-t border-line-dark">
              <div className="wrap grid items-center gap-x-12 gap-y-10 py-[clamp(48px,6vw,88px)] lg:grid-cols-12">
                <figure
                  className={`relative aspect-[4/3] overflow-hidden lg:row-start-1 lg:col-span-7 unveil ${
                    flip ? 'lg:col-start-6' : 'lg:col-start-1'
                  }`}
                >
                  <img src={HOME_VY_IMGS[idx]} alt={vyd.name} className="absolute inset-0 size-full object-cover" />
                  <Corners className="text-on-dark/80" />
                </figure>
                <div className={`flex flex-col lg:row-start-1 lg:col-span-4 ${flip ? 'lg:col-start-1' : 'lg:col-start-9'}`}>
                  <p className="t-data text-accent-light">{vyd.num}</p>
                  <h3 className="t-name mt-4 text-[clamp(32px,3.3vw,50px)] reveal">{vyd.name}</h3>
                  <p className="t-data mt-4 text-[10.5px] text-on-dark/50">{coords(VY_COORDS[idx])}</p>
                  <p className="t-body mt-6 text-on-dark/72 reveal">{vyd.desc}</p>
                  <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-line-dark pt-5">
                    {vyd.stats.map((s) => (
                      <div key={s.l}>
                        <dt className="t-label text-[10px] text-on-dark/45">{s.l}</dt>
                        <dd className="mt-2 text-[21px] font-light">{s.v}</dd>
                      </div>
                    ))}
                  </dl>
                  <button onClick={() => onNav('vinedos')} className="tlink mt-9 self-start">
                    {t.home.vyBtn}
                    <Arrow />
                  </button>
                </div>
              </div>
            </article>
          );
        })}

        {/* Altitude, in numbers */}
        <div className="relative overflow-hidden border-t border-line-dark">
          <div className="pointer-events-none absolute inset-0 text-on-dark">
            <Contours className="h-full w-full" lines={10} seed={7} opacity={0.06} />
          </div>
          <div className="wrap relative py-[clamp(90px,11vw,150px)]">
            <p className="t-lead max-w-[46ch] text-on-dark/78 reveal">{t.home.statsIntro}</p>
            <dl className="mt-16 grid grid-cols-2 gap-y-14 lg:grid-cols-4 reveal">
              {t.home.stats.map((s, i) => (
                <div key={s.label} className={`flex flex-col gap-4 ${statBorders[i]}`}>
                  <dt className="t-label text-accent-light">{s.label}</dt>
                  <dd className="t-num text-[clamp(54px,7.2vw,112px)]">{s.num}</dd>
                  <dd className="t-small text-on-dark/55">{s.unit}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* 04 — The wines: bottles stand on a shelf, no boxes */}
      <section className="py-[clamp(110px,13vw,190px)]">
        <div className="wrap grid items-end gap-10 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <Chapter n="04">{t.home.winesEyebrow}</Chapter>
            <h2 className="t-h2 mt-8 reveal">{t.home.winesTitle}</h2>
          </div>
          <div className="flex flex-col items-start gap-7 lg:col-span-4 lg:col-start-9">
            <p className="t-body text-ink/62 reveal">{t.home.winesPara}</p>
            <button onClick={() => onNav('vinos')} className="tlink">
              {t.home.seeAllWines}
              <Arrow />
            </button>
          </div>
        </div>

        <div className="wrap mt-[clamp(56px,7vw,100px)]">
          <div className="lineup -mx-[var(--gutter)] flex snap-x snap-mandatory gap-8 overflow-x-auto px-[var(--gutter)] lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-14 lg:overflow-visible lg:px-0">
            {t.home.wines.map((wine, i) => {
              const id = HOME_WINE_IDS[i];
              return (
                <button
                  key={wine.name}
                  onClick={() => onNav('wine-detail', id)}
                  className="group flex w-[74%] shrink-0 snap-start flex-col text-left sm:w-[44%] lg:w-auto reveal"
                >
                  <span className="relative flex h-[clamp(340px,34vw,480px)] items-end justify-center border-b border-line">
                    <img
                      src={WINE_META[id].img}
                      alt={`${wine.name} ${wine.sub}`}
                      className="h-[92%] w-auto object-contain transition-transform duration-[900ms] ease-[cubic-bezier(.22,1,.36,1)] group-hover:-translate-y-3"
                    />
                  </span>
                  <span className="mt-6 block t-data text-[10.5px] text-ink/45">
                    {String(i + 1).padStart(2, '0')} — {wine.region}
                  </span>
                  <span className="mt-3 block t-name text-[clamp(27px,2.4vw,35px)] transition-colors group-hover:text-accent">
                    {wine.name}
                  </span>
                  <span className="mt-2 block t-label text-ink/55">{wine.sub}</span>
                  <span className="mt-5 block t-small max-w-[36ch] text-ink/62">{wine.desc}</span>
                  <span className="tlink mt-7 self-start text-accent">
                    {t.home.fullInfo}
                    <Arrow />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Quote */}
      <section className="relative overflow-hidden text-on-dark">
        <img src={`${A}/mza-valley.jpg`} alt="" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-[rgba(10,9,7,0.56)]" />
        <Corners className="[--ci:22px] text-on-dark/70" />
        <div className="wrap relative flex flex-col items-center py-[clamp(120px,15vw,220px)] text-center">
          <Mark className="w-[46px] h-auto text-accent-light reveal" />
          <blockquote className="t-display mt-10 max-w-[24ch] reveal">{t.home.quote}</blockquote>
          <p className="t-label mt-10 text-on-dark/65 reveal">{t.home.quoteSub}</p>
        </div>
      </section>

      {/* 05 — Recognition */}
      <section className="bg-surface-2 py-[clamp(90px,11vw,150px)]">
        <div className="wrap grid items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Chapter n="05">{t.home.awardsEyebrow}</Chapter>
            <h2 className="t-h2 mt-8 reveal">{t.home.awardsTitle}</h2>
          </div>
          <ul className="grid grid-cols-3 border-l border-t border-line sm:grid-cols-6 lg:col-span-8 reveal">
            {HOME_AWARD_IMGS.map((src, i) => (
              <li key={i} className="flex aspect-square items-center justify-center border-b border-r border-line p-4">
                <img src={src} alt={t.home.awardAlt} className="h-auto w-[74%] object-contain" />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 06 — News: asymmetric pair */}
      <section className="py-[clamp(110px,13vw,190px)]">
        <div className="wrap grid items-end gap-10 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <Chapter n="06">{t.home.newsEyebrow}</Chapter>
            <h2 className="t-h2 mt-8 reveal">{t.home.newsTitle}</h2>
          </div>
          <div className="flex flex-col items-start gap-7 lg:col-span-4 lg:col-start-9">
            <p className="t-body text-ink/62 reveal">{t.home.newsPara}</p>
            <button onClick={() => onNav('novedades')} className="tlink">
              {t.home.seeMoreNews}
              <Arrow />
            </button>
          </div>
        </div>
        <div className="wrap mt-16 grid gap-x-12 gap-y-16 md:grid-cols-12">
          {t.home.news.map((article, i) => (
            <button
              key={article.title}
              onClick={() => onNav('novedades')}
              className={`group flex flex-col text-left ${i === 0 ? 'md:col-span-7' : 'md:col-span-5 md:mt-[22%]'}`}
            >
              <span className="relative block aspect-[4/3] overflow-hidden unveil">
                <img
                  src={HOME_NEWS_IMGS[i]}
                  alt={article.title}
                  className="absolute inset-0 size-full object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-[1.04]"
                />
              </span>
              <span className="mt-6 block t-data text-[10.5px] text-ink/45">{article.date}</span>
              <span className="mt-3 block t-h3 transition-colors group-hover:text-accent">{article.title}</span>
              <span className="mt-3 block t-small max-w-[50ch] text-ink/62">{article.desc}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── Shared page heading for inner pages ──────────────────────────────────────
function PageHead({ eyebrow, title, para }: { eyebrow: string; title: string; para: string }) {
  return (
    <section className="wrap grid items-end gap-10 pb-[clamp(44px,6vw,80px)] pt-[clamp(64px,9vw,130px)] lg:grid-cols-12">
      <div className="lg:col-span-7">
        <Chapter className="in-fade">{eyebrow}</Chapter>
        <h1 className="t-h1 mt-8">
          <span className="in-rise">
            <span className="d1">{title}</span>
          </span>
        </h1>
      </div>
      <p className="t-body text-ink/62 lg:col-span-4 lg:col-start-9 in-fade d2">{para}</p>
    </section>
  );
}

// ─── NUESTROS VINOS ───────────────────────────────────────────────────────────
function Vinos({ onNav }: { onNav: Nav }) {
  const t = useT();
  const [filter, setFilter] = useState<'TODOS' | 'ALTAMIRA' | 'VAV' | 'BLENDS'>('TODOS');
  const wines = t.wineCatalog.map((w) => ({ ...w, ...WINE_META[w.id] }));
  const filtered =
    filter === 'TODOS' ? wines : filter === 'BLENDS' ? wines.filter((w) => w.blend) : wines.filter((w) => w.tag === filter);

  return (
    <div className="w-full bg-surface">
      <PageHead eyebrow={t.vinos.heroEyebrow} title={t.vinos.heroTitle} para={t.vinos.heroPara} />

      <div className="sticky top-[var(--header)] z-30 border-y border-line bg-surface/95 backdrop-blur-md">
        <div className="wrap flex flex-wrap items-center gap-x-8 gap-y-2 py-3">
          <span className="t-label text-ink/45">{t.vinos.filterLabel}</span>
          <div role="tablist" className="flex flex-wrap gap-x-7">
            {(['TODOS', 'ALTAMIRA', 'VAV', 'BLENDS'] as const).map((f) => (
              <button
                key={f}
                role="tab"
                aria-selected={filter === f}
                onClick={() => setFilter(f)}
                className={`t-label border-b py-3 transition-colors ${
                  filter === f ? 'border-accent-solid text-ink' : 'border-transparent text-ink/45 hover:text-ink'
                }`}
              >
                {t.vinos.filterLabels[f]}
              </button>
            ))}
          </div>
          <span className="ml-auto t-data text-ink/45">{filtered.length.toString().padStart(2, '0')}</span>
        </div>
      </div>

      <div className="wrap grid grid-cols-1 gap-x-14 gap-y-20 py-[clamp(64px,8vw,120px)] sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((wine) => (
          <button key={wine.id} onClick={() => onNav('wine-detail', wine.id)} className="group flex flex-col text-left reveal">
            <span className="relative flex h-[clamp(360px,32vw,470px)] items-end justify-center border-b border-line">
              <img
                src={wine.img}
                alt={`${wine.name} ${wine.sub}`}
                className="h-[90%] w-auto object-contain transition-transform duration-[900ms] ease-[cubic-bezier(.22,1,.36,1)] group-hover:-translate-y-3"
              />
            </span>
            <span className="mt-6 block t-data text-[10.5px] text-ink/45">{wine.gridRegion}</span>
            <span className="mt-3 block t-name text-[clamp(27px,2.3vw,34px)] transition-colors group-hover:text-accent">
              {wine.name}
            </span>
            <span className="mt-2 block t-label text-ink/55">{wine.sub}</span>
            <span className="tlink mt-7 self-start text-accent">
              {t.vinos.fullInfo}
              <Arrow />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Terrain map — real satellite imagery (Leaflet + Esri) ────────────────────
function TerrainMap() {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const pins = [
      { name: 'Altamira de los Andes', lat: -33.68, lon: -69.13 },
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
    // Satellite imagery — the irrigated vineyards read as green against the arid
    // Andes foothills (a cultivated oasis, not an empty desert).
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Imagery © Esri · Maxar · Earthstar Geographics',
      maxZoom: 18,
    }).addTo(map);
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
  return <div ref={ref} className="vf-map h-[clamp(380px,46vw,580px)] w-full" />;
}

// ─── VIÑEDOS ──────────────────────────────────────────────────────────────────
function Vinedos() {
  const t = useT();
  const coords = useCoords();
  const offsets = ['', 'md:mt-28', 'md:mt-14'];
  return (
    <div className="w-full bg-surface">
      {/* The estate's own photograph, framed */}
      <section className="relative flex h-[clamp(500px,76vh,780px)] items-end overflow-hidden text-on-dark">
        <img
          src={`${A}/andes-real.jpg`}
          alt={t.vinedos.heroTitle1 + ' ' + t.vinedos.heroTitle2}
          className="absolute inset-0 size-full object-cover object-[50%_20%] kenburns"
        />
        <div className="absolute inset-0 bg-[rgba(10,9,7,0.36)]" />
        <Corners className="[--ci:20px] text-on-dark/80" />
        <div className="wrap relative grid w-full items-end gap-6 pb-[clamp(44px,6vw,84px)] lg:grid-cols-12">
          <div className="lg:col-span-9">
            <p className="t-label text-on-dark/80 in-fade">{t.vinedos.heroEyebrow}</p>
            <h1 className="t-h1 mt-6 max-w-[16ch]">
              <span className="in-rise">
                <span className="d1">
                  {t.vinedos.heroTitle1} {t.vinedos.heroTitle2}
                </span>
              </span>
            </h1>
          </div>
          <p className="t-data text-[10.5px] text-on-dark/75 lg:col-span-3 lg:text-right in-fade d2">{coords(ESTATE_COORD)}</p>
        </div>
      </section>

      <section className="wrap grid gap-10 py-[clamp(90px,11vw,160px)] lg:grid-cols-12">
        <p className="t-lead text-ink/85 lg:col-span-7 reveal">{t.vinedos.intro1}</p>
        <p className="t-body text-ink/62 lg:col-span-4 lg:col-start-9 reveal">{t.vinedos.intro2}</p>
      </section>

      {/* Three terroirs — a staggered triptych */}
      <section className="wrap pb-[clamp(110px,13vw,190px)]">
        <div className="grid gap-x-12 gap-y-20 md:grid-cols-3">
          {t.vinedos.cards.map((v, i) => (
            <article key={v.num} className={`flex flex-col ${offsets[i]}`}>
              <figure className="relative aspect-[4/5] overflow-hidden unveil">
                <img src={VINEDOS_IMGS[i]} alt={v.name + v.italic} className="absolute inset-0 size-full object-cover" />
                <Corners className="text-on-dark/80" />
              </figure>
              <p className="t-data mt-7 text-accent">{v.num}</p>
              <h3 className="t-name mt-3 text-[clamp(29px,2.6vw,38px)]">
                {v.name}
                {v.italic}
              </h3>
              <p className="t-data mt-3 text-[10.5px] text-ink/45">{coords(VY_COORDS[i])}</p>
              <p className="t-small mt-5 text-ink/70">{v.desc}</p>
              <dl className="mt-7 border-t border-line">
                {v.specs.map((s) => (
                  <div key={s.l} className="flex items-baseline justify-between gap-4 border-b border-line py-3">
                    <dt className="t-label text-[10px] text-ink/45">{s.l}</dt>
                    <dd className="text-[15px]">{s.v}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      </section>

      {/* Location — satellite map in a viewfinder */}
      <section className="relative overflow-hidden bg-panel py-[clamp(90px,11vw,160px)] text-on-dark">
        <div className="pointer-events-none absolute inset-0 text-on-dark">
          <Contours className="h-full w-full" lines={9} seed={4} opacity={0.05} />
        </div>
        <div className="wrap relative grid items-center gap-14 lg:grid-cols-12">
          <div className="flex flex-col lg:col-span-4 reveal">
            <Chapter className="text-accent-light">{t.vinedos.mapLabel}</Chapter>
            <h2 className="t-h2 mt-8">
              {t.vinedos.mapPlace1}
              <span className="t-name block">{t.vinedos.mapPlace2}</span>
            </h2>
            <p className="t-body mt-6 max-w-[40ch] text-on-dark/70">{t.vinedos.mapDesc}</p>
            <ol className="mt-10 border-t border-line-dark">
              {t.vinedos.mapArt.vineyards.map((name, i) => (
                <li key={name} className="flex items-baseline gap-5 border-b border-line-dark py-4">
                  <span className="t-data text-accent-light">{String(i + 1).padStart(2, '0')}</span>
                  <span className="t-small text-on-dark/85">{name}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="relative lg:col-span-8 reveal">
            <div className="border border-line-dark">
              <TerrainMap />
            </div>
            <Corners className="[--ci:-12px] [--cs:20px] text-accent-light" />
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── NOVEDADES ────────────────────────────────────────────────────────────────
function Novedades() {
  const t = useT();
  const f = t.novedades.featured;
  return (
    <div className="w-full bg-surface">
      <PageHead eyebrow={t.novedades.eyebrow} title={t.novedades.title} para={t.novedades.para} />

      <section className="wrap grid items-center gap-12 border-t border-line py-[clamp(56px,7vw,110px)] lg:grid-cols-12">
        <figure className="relative aspect-[16/10] overflow-hidden lg:col-span-7 unveil">
          <img src={IMG.vinexpo} alt={f.title1 + ' ' + f.title2} className="absolute inset-0 size-full object-cover" />
          <Corners className="text-on-dark/80" />
        </figure>
        <div className="flex flex-col lg:col-span-4 lg:col-start-9">
          <p className="t-data text-[10.5px] text-accent">{f.tag}</p>
          <h2 className="t-h2 mt-6 reveal">
            {f.title1} {f.title2}
          </h2>
          <p className="t-body mt-6 text-ink/68 reveal">{f.desc}</p>
          <button className="tlink mt-9 self-start">
            {t.novedades.readNote}
            <Arrow />
          </button>
        </div>
      </section>

      <section className="wrap pb-[clamp(90px,11vw,160px)]">
        <ul className="border-t border-line">
          {t.novedades.articles.map((a, i) => (
            <li key={a.title} className="reveal">
              <article className="grid items-center gap-x-12 gap-y-5 border-b border-line py-10 md:grid-cols-12">
                <p className="t-data text-[10.5px] text-ink/50 md:col-span-3">{a.tag}</p>
                <div className="md:col-span-5">
                  <h3 className="t-h3">{a.title}</h3>
                  <p className="t-small mt-3 text-ink/62">{a.desc}</p>
                  <button className="tlink mt-5">
                    {t.novedades.readNote}
                    <Arrow />
                  </button>
                </div>
                <div className="relative aspect-[3/2] overflow-hidden md:col-span-3 md:col-start-10">
                  <img src={NOVEDADES_ARTICLE_IMGS[i]} alt={a.title} className="absolute inset-0 size-full object-cover" />
                </div>
              </article>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// ─── CONTACTO ─────────────────────────────────────────────────────────────────
function Contacto() {
  const t = useT();
  // No backend: hand the message to the visitor's mail app, addressed to the estate.
  const send = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const name = String(d.get('name') || '');
    const body = `${name}\n${d.get('email') || ''}\n${d.get('country') || ''}\n\n${d.get('message') || ''}`;
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
      'Altamira de los Andes — ' + name
    )}&body=${encodeURIComponent(body)}`;
  };
  const fields = [
    { name: 'name', label: t.contacto.fields[0], type: 'text', span: '', auto: 'name' },
    { name: 'email', label: t.contacto.fields[1], type: 'email', span: '', auto: 'email' },
    { name: 'country', label: t.contacto.fields[2], type: 'text', span: 'sm:col-span-2', auto: 'country-name' },
  ];
  return (
    <div className="w-full bg-surface">
      <section className="grid lg:min-h-[calc(100dvh_-_var(--header))] lg:grid-cols-2">
        <div className="flex flex-col px-[var(--gutter)] py-[clamp(64px,9vw,130px)] lg:pr-16">
          <Chapter className="in-fade">{t.contacto.eyebrow}</Chapter>
          <h1 className="t-h1 mt-8">
            <span className="in-rise">
              <span className="d1">{t.contacto.title}</span>
            </span>
          </h1>
          <p className="t-lead mt-8 max-w-[36ch] text-ink/72 in-fade d2">
            {t.contacto.intro1} {t.contacto.intro2}
          </p>
          <form onSubmit={send} className="mt-14 grid max-w-[640px] gap-x-10 gap-y-9 sm:grid-cols-2 in-fade d3">
            {fields.map((field) => (
              <label key={field.name} className={`field ${field.span}`}>
                <span className="t-label text-ink/50">{field.label}</span>
                <input name={field.name} type={field.type} required autoComplete={field.auto} className="field__input" />
              </label>
            ))}
            <label className="field sm:col-span-2">
              <span className="t-label text-ink/50">{t.contacto.messageLabel}</span>
              <textarea name="message" required rows={3} className="field__input resize-none" />
            </label>
            <button type="submit" className="btn btn--solid mt-2 justify-self-start sm:col-span-2">
              {t.contacto.submit}
              <Arrow />
            </button>
          </form>
        </div>

        <div className="relative min-h-[500px] overflow-hidden text-on-dark">
          <img src={IMG.cellar} alt="" className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0 bg-[rgba(10,9,7,0.52)]" />
          <Corners className="[--ci:20px] text-on-dark/75" />
          <dl className="absolute inset-x-0 bottom-0 grid gap-x-10 gap-y-8 p-[clamp(36px,4.4vw,64px)] sm:grid-cols-2">
            <div>
              <dt className="t-label text-on-dark/55">{t.contacto.officeLabel}</dt>
              <dd className="t-small mt-3">
                Av. Colón 241
                <br />
                (5500) Mendoza, Argentina
              </dd>
            </div>
            <div>
              <dt className="t-label text-on-dark/55">{t.contacto.phoneLabel}</dt>
              <dd className="t-small mt-3">
                Tel / Fax +54 261 4299962
                <br />
                Mobile USA +1 (305) 988 5992
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="t-label text-on-dark/55">{t.contacto.emailLabel}</dt>
              <dd className="mt-3">
                <a href={`mailto:${CONTACT_EMAIL}`} className="t-small border-b border-on-dark/40 pb-1 transition-colors hover:border-on-dark">
                  {CONTACT_EMAIL}
                </a>
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  );
}

// ─── WINE DETAIL ──────────────────────────────────────────────────────────────
function WineDetail({ onNav, wineId }: { onNav: Nav; wineId: string }) {
  const t = useT();
  const wine = t.wineCatalog.find((w) => w.id === wineId) ?? t.wineCatalog[0];
  const meta = WINE_META[wine.id];
  const others = t.wineCatalog.filter((w) => w.id !== wine.id).slice(0, 3);
  return (
    <div className="w-full bg-surface">
      <div className="border-b border-line">
        <nav className="wrap flex items-center gap-3 py-4 t-data text-[10.5px] text-ink/50" aria-label="Breadcrumb">
          <button onClick={() => onNav('vinos')} className="transition-colors hover:text-ink">
            {t.nav.vinos}
          </button>
          <span aria-hidden="true">/</span>
          <span className="text-ink/80">{wine.region}</span>
        </nav>
      </div>

      <section className="grid lg:grid-cols-12">
        {/* Bottle on a stage, under the horizon */}
        <div className="relative flex min-h-[560px] items-end justify-center overflow-hidden bg-panel pb-16 text-on-dark lg:col-span-6 lg:min-h-[calc(100dvh_-_var(--header)_-_50px)]">
          <Horizon className="absolute inset-x-0 top-[30%] h-[140px] w-full text-on-dark/15" />
          <Corners className="[--ci:20px] text-on-dark/60" />
          <p className="absolute left-[38px] top-[36px] t-data text-[10.5px] text-on-dark/60">{meta.tag}</p>
          <span className="absolute inset-x-[14%] bottom-16 h-px bg-on-dark/20" aria-hidden="true" />
          <img
            key={wine.id}
            src={meta.img}
            alt={`${wine.title1} ${wine.title2}`}
            className="relative h-[clamp(380px,62vh,640px)] w-auto object-contain in-fade"
          />
        </div>

        <div className="flex flex-col justify-center px-[var(--gutter)] py-[clamp(56px,7vw,110px)] lg:col-span-6 lg:px-[clamp(40px,5.4vw,96px)]">
          <p className="t-data text-[10.5px] text-accent">{wine.region}</p>
          <h1 className="mt-6">
            <span className="block t-name text-[clamp(42px,4.8vw,72px)]">{wine.title1}</span>
            <span className="block t-h1 text-[clamp(38px,4.3vw,64px)]">{wine.title2}</span>
          </h1>
          <p className="t-lead mt-8 max-w-[44ch] text-ink/78">{wine.desc}</p>

          <div className="mt-10 flex items-end gap-6 border-t border-line pt-6">
            <span className="t-num text-[64px] text-accent">{wine.score.value}</span>
            <span className="flex flex-col gap-1 pb-2">
              <span className="t-label">{wine.score.critic}</span>
              <span className="t-data text-ink/50">{wine.score.year}</span>
            </span>
          </div>

          <p className="t-label mt-12 text-ink/50">{t.wineDetail.fichaLabel}</p>
          <dl className="mt-4 border-t border-line">
            {wine.ficha.map((s) => (
              <div key={s.label} className="flex items-baseline justify-between gap-6 border-b border-line py-3.5">
                <dt className="t-label text-[10px] text-ink/50">{s.label}</dt>
                <dd className="text-right text-[15px]">{s.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-10 flex flex-wrap gap-4">
            <button onClick={() => onNav('contacto')} className="btn btn--solid">
              {t.wineDetail.ctaInfo}
              <Arrow />
            </button>
            <button className="btn">{t.wineDetail.downloadPdf}</button>
          </div>
        </div>
      </section>

      {/* Tasting notes */}
      <section className="bg-surface-2 py-[clamp(90px,11vw,150px)]">
        <div className="wrap">
          <Chapter>{t.wineDetail.notesLabel}</Chapter>
          <div className="mt-12 grid gap-x-12 gap-y-12 md:grid-cols-3">
            {wine.notes.map((note, i) => (
              <div key={note.label} className="border-t border-line pt-6 reveal">
                <p className="t-data text-[10.5px] text-accent">
                  {String(i + 1).padStart(2, '0')} — {note.label}
                </p>
                <p className="t-name mt-5 text-[clamp(22px,2vw,28px)] leading-[1.38]">{note.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Origin */}
      <section className="relative overflow-hidden bg-panel text-on-dark">
        <div className="pointer-events-none absolute inset-0 text-on-dark">
          <Contours className="h-full w-full" lines={9} seed={3} opacity={0.06} />
        </div>
        <div className="wrap relative grid items-end gap-10 py-[clamp(90px,11vw,150px)] lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Chapter className="text-accent-light">{t.wineDetail.vyEyebrow}</Chapter>
            <h2 className="t-h2 mt-8 reveal">{t.wineDetail.vyTitle}</h2>
          </div>
          <div className="lg:col-span-4 lg:col-start-9">
            <p className="t-body text-on-dark/70 reveal">{t.wineDetail.vyDesc}</p>
            <button onClick={() => onNav('vinedos')} className="btn btn--light mt-8">
              {t.wineDetail.vyBtn}
              <Arrow />
            </button>
          </div>
        </div>
      </section>

      {/* Other wines */}
      <section className="wrap py-[clamp(90px,11vw,150px)]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h2 className="t-h2">{t.wineDetail.otherWines}</h2>
          <button onClick={() => onNav('vinos')} className="tlink">
            {t.wineDetail.seeAllWines}
            <Arrow />
          </button>
        </div>
        <ul className="mt-12 border-t border-line">
          {others.map((w) => (
            <li key={w.id}>
              <button
                onClick={() => onNav('wine-detail', w.id)}
                className="group grid w-full grid-cols-[52px_1fr_auto] items-center gap-6 border-b border-line py-5 text-left"
              >
                <img src={WINE_META[w.id].img} alt={w.name} className="h-[86px] w-[52px] object-contain" />
                <span className="flex flex-col gap-1">
                  <span className="t-data text-[10.5px] text-ink/45">{WINE_META[w.id].tag}</span>
                  <span className="t-name text-[clamp(23px,2vw,29px)] transition-colors group-hover:text-accent">
                    {w.name}
                  </span>
                  <span className="t-label text-[10px] text-ink/50">{w.sub}</span>
                </span>
                <Arrow className="text-ink/50" />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
const PAGES: Page[] = ['home', 'vinos', 'vinedos', 'novedades', 'contacto', 'wine-detail'];
const REVEAL_SEL = '.reveal:not(.visible), .unveil:not(.visible), .draw:not(.visible)';

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

  // One observer for every scroll reveal on any page; a mutation watcher picks
  // up content that mounts later (page changes, filters, language switches).
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.06, rootMargin: '0px 0px -6% 0px' }
    );
    let raf = 0;
    const scan = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => document.querySelectorAll(REVEAL_SEL).forEach((el) => io.observe(el)));
    };
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      mo.disconnect();
    };
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

  return (
    <div className="min-h-screen w-full bg-surface">
      {!entered && <AgeGate onEnter={enter} />}
      <Header page={page} onNav={navigate} />
      <main>
        {page === 'home' && <Home onNav={navigate} />}
        {page === 'vinos' && <Vinos onNav={navigate} />}
        {page === 'vinedos' && <Vinedos />}
        {page === 'novedades' && <Novedades />}
        {page === 'contacto' && <Contacto />}
        {page === 'wine-detail' && <WineDetail onNav={navigate} wineId={activeWine} />}
      </main>
      <Footer onNav={navigate} />
    </div>
  );
}

export default function App() {
  return (
    <LangProvider>
      <Site />
    </LangProvider>
  );
}
