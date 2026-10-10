import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LangProvider, useLang, useT, LANGS, type Lang } from './i18n';

type Page = 'home' | 'vinos' | 'vinedos' | 'novedades' | 'contacto' | 'wine-detail';
type Nav = (p: Page, wineId?: string) => void;

const A = `${import.meta.env.BASE_URL}assets`;
const v = (o: Record<string, string | number>) => o as CSSProperties;

// Editorial images still served remotely.
const IMG = {
  vinexpo:
    'https://images.unsplash.com/photo-1641830879467-e22004141bcb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1400',
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
const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

// Vineyard positions, in the same order as the copy: Altamira · Altamira de los Andes · La Consulta.
const VY_COORDS: [number, number][] = [
  [-33.79, -69.13],
  [-33.68, -69.13],
  [-33.76, -69.07],
];
const ESTATE_COORD = VY_COORDS[1];

// Wine catalog scaffolding (bottle image / line / blend flag) keyed by id.
const WINE_META: Record<string, { img: string; tag: 'ALTAMIRA' | 'VAV'; blend: boolean }> = {
  dama: { img: `${A}/5c918.png`, tag: 'ALTAMIRA', blend: true },
  navigato: { img: `${A}/3d3ec.png`, tag: 'ALTAMIRA', blend: true },
  'reserva-malbec': { img: `${A}/36069.png`, tag: 'ALTAMIRA', blend: false },
  'reserva-cf': { img: `${A}/42976.png`, tag: 'ALTAMIRA', blend: false },
  'vav-malbec': { img: `${A}/4600e.png`, tag: 'VAV', blend: false },
  'tres-fincas': { img: `${A}/73703.png`, tag: 'VAV', blend: true },
};
const HOME_ESTATE_IDS = ['navigato', 'dama', 'reserva-malbec', 'vav-malbec'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function dms(val: number, pos: string, neg: string) {
  const a = Math.abs(val);
  const d = Math.floor(a);
  const mf = (a - d) * 60;
  const m = Math.floor(mf);
  const s = Math.round((mf - m) * 60);
  return `${d}°${String(m).padStart(2, '0')}′${String(s).padStart(2, '0')}″${val < 0 ? neg : pos}`;
}
function useCoords() {
  const { lang } = useLang();
  const west = lang === 'en' ? 'W' : 'O';
  return (c: [number, number]) => `${dms(c[0], 'N', 'S')} · ${dms(c[1], 'E', west)}`;
}
const pad2 = (n: number) => String(n).padStart(2, '0');

// ─── Icons & brand marks ──────────────────────────────────────────────────────
const Arrow = ({ size = 14, flip = false }: { size?: number; flip?: boolean }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 14 14"
    fill="none"
    aria-hidden="true"
    style={flip ? { transform: 'scaleX(-1)' } : undefined}
  >
    <path d="M1 7h11.5M8 2.5 12.5 7 8 11.5" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);
const MenuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
    <path d="M4 9h16M8 15h12" />
  </svg>
);
const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

// The estate's own mark from the labels: a fine "A" crossed by the horizon.
function Mark({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 52" fill="none" aria-hidden="true">
      <path d="M18.5 50 L32 3.5 L45.5 50" stroke="currentColor" strokeWidth="1.3" vectorEffect="non-scaling-stroke" />
      <path d="M1 39 Q32 21 63 39 Q32 26.5 1 39 Z" fill="currentColor" />
    </svg>
  );
}

function Lockup() {
  return (
    <span className="flex items-center gap-3 leading-none">
      <Mark className="h-auto w-[30px] text-gold" />
      <span className="flex flex-col items-start">
        <span className="f-display text-[21px] tracking-[0.16em]">ALTAMIRA</span>
        <span className="mt-[5px] text-[8px] font-semibold tracking-[0.46em] text-bone/55">DE LOS ANDES</span>
      </span>
    </span>
  );
}

// Rotating seal: the estate's name around the mark.
function Seal({ text }: { text: string }) {
  return (
    <div className="relative size-[136px] rounded-full border border-line bg-night">
      <svg viewBox="0 0 136 136" className="seal absolute inset-0 text-gold" aria-hidden="true">
        <defs>
          <path id="seal-path" d="M68,68 m-54,0 a54,54 0 1,1 108,0 a54,54 0 1,1 -108,0" />
        </defs>
        <text fill="currentColor" style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 9.5 }}>
          <textPath href="#seal-path" textLength="336" lengthAdjust="spacing">
            {text}
          </textPath>
        </text>
      </svg>
      <span className="absolute inset-[30px] grid place-items-center rounded-full border border-line bg-night">
        <Mark className="h-auto w-[34px] text-gold" />
      </span>
    </div>
  );
}

// Splits text into word spans for the staggered word reveal (.fx-words).
function Words({ text, parts }: { text?: string; parts?: { t: string; cls?: string }[] }) {
  const list = parts ?? [{ t: text ?? '' }];
  let i = 0;
  return (
    <>
      {list.map((p, k) =>
        p.t.split(/(\s+)/).map((tok, j) =>
          tok.trim() === '' ? (
            tok
          ) : (
            <span key={`${k}-${j}`} className={p.cls} style={v({ '--i': i++ })}>
              {tok}
            </span>
          )
        )
      )}
    </>
  );
}

function Letters({ text }: { text: string }) {
  return (
    <>
      {[...text].map((ch, i) => (
        <span key={i} aria-hidden="true" className="ltr" style={v({ '--i': i })}>
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </>
  );
}

// Odometer: every digit column rolls up to its value; separators stay put.
function Odometer({ value }: { value: string }) {
  let c = 0;
  return (
    <span className="odo" role="img" aria-label={value}>
      {value.split('').map((ch, i) =>
        /\d/.test(ch) ? (
          <span key={i} className="d" aria-hidden="true" style={v({ '--n': +ch, '--c': c++ })}>
            <span>
              {DIGITS.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </span>
          </span>
        ) : (
          <span key={i} aria-hidden="true">
            {ch}
          </span>
        )
      )}
    </span>
  );
}

function Eyebrow({ children, center = false, className = '' }: { children: ReactNode; center?: boolean; className?: string }) {
  return <p className={`eyebrow f-label ${center ? 'eyebrow--center' : ''} ${className}`}>{children}</p>;
}

function LinkArrow({ children }: { children: ReactNode }) {
  return (
    <>
      <span>{children}</span>
      <span className="ring">
        <Arrow />
      </span>
    </>
  );
}

// ─── Age gate ─────────────────────────────────────────────────────────────────
function AgeGate({ onEnter }: { onEnter: () => void }) {
  const t = useT();
  const [leaving, setLeaving] = useState(false);
  const enter = () => {
    setLeaving(true);
    setTimeout(onEnter, 850);
  };
  return (
    <div className={`gate ${leaving ? 'gate--leaving' : ''} fixed inset-0 z-[100] overflow-y-auto bg-night text-bone`}>
      <div className="flex min-h-full flex-col items-center justify-center px-6 py-14 text-center">
        <div className="relative h-[clamp(200px,34vh,360px)] w-[clamp(160px,24vh,270px)]">
          <span className="absolute -inset-[10px] rounded-t-full border border-gold/25" aria-hidden="true" />
          <div className="absolute inset-0 overflow-hidden rounded-t-full">
            <img src={`${A}/mza-altamira.jpg`} alt="" className="absolute inset-0 size-full object-cover in-arch" />
          </div>
        </div>
        <Mark className="mt-10 h-auto w-[44px] text-gold in-up" />
        <p className="f-display mt-5 text-[clamp(44px,7vw,76px)] tracking-[0.08em]" aria-label="ALTAMIRA">
          <Letters text="ALTAMIRA" />
        </p>
        <p className="f-label mt-3 tracking-[0.5em] text-gold in-up" style={v({ '--d': '700ms' })}>
          DE LOS ANDES
        </p>
        <p className="f-lead mt-9 text-bone/80 in-up" style={v({ '--d': '850ms' })}>
          {t.gate.line1}
          <br />
          {t.gate.line2}
        </p>
        <p className="f-small mt-5 max-w-[42ch] text-bone/50 in-up" style={v({ '--d': '950ms' })}>
          {t.gate.confirm}
        </p>
        <button onClick={enter} className="b-pill b-pill--solid mt-9 in-up" style={v({ '--d': '1050ms' })}>
          {t.gate.enter}
        </button>
        <p className="f-label mt-9 text-[9px] text-bone/35 in-up" style={v({ '--d': '1150ms' })}>
          {t.gate.warning}
        </p>
      </div>
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
function Header({ page, onNav }: { page: Page; onNav: Nav }) {
  const { lang, setLang } = useLang();
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
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
  const solid = scrolled || menuOpen;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color] duration-500 ${
        solid ? 'border-line bg-night/85 backdrop-blur-xl' : 'border-transparent bg-transparent'
      }`}
    >
      <div className="wrap flex h-[var(--header)] items-center justify-between gap-6">
        <button onClick={() => go('home')} aria-label="Altamira de los Andes Estate" className="shrink-0">
          <Lockup />
        </button>

        <nav
          className="hidden items-center gap-1 rounded-full border border-line bg-night/50 p-1.5 backdrop-blur-md lg:flex"
          aria-label="Main"
        >
          {navItems.map(([p, label]) => (
            <button
              key={p}
              onClick={() => go(p)}
              aria-current={isActive(p) ? 'page' : undefined}
              className={`f-label rounded-full px-5 py-2.5 text-[10px] transition-colors duration-500 ${
                isActive(p) ? 'bg-gold text-night' : 'text-bone/70 hover:text-bone'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden items-center lg:flex">
            {LANGS.map((code) => (
              <button
                key={code}
                onClick={() => setLang(code as Lang)}
                aria-current={code === lang ? 'true' : undefined}
                aria-label={t.a11y.langOf(code.toUpperCase())}
                className={`f-label px-2.5 py-2 text-[10px] transition-colors ${
                  code === lang ? 'text-gold' : 'text-bone/45 hover:text-bone'
                }`}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? t.ui.close : t.ui.menu}
            aria-expanded={menuOpen}
            className="grid size-12 place-items-center rounded-full border border-line transition-colors hover:border-gold lg:hidden"
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-x-0 bottom-0 top-[var(--header)] overflow-y-auto bg-night lg:hidden">
          <nav className="wrap flex flex-col pb-12 pt-8" aria-label="Main">
            {navItems.map(([p, label], i) => (
              <button
                key={p}
                onClick={() => go(p)}
                className="flex items-baseline gap-5 border-b border-line py-5 text-left in-up"
                style={v({ '--d': `${i * 70}ms` })}
              >
                <span className="f-label text-gold">{pad2(i + 1)}</span>
                <span className={`f-display text-[40px] ${isActive(p) ? 'text-gold-soft' : 'text-bone'}`}>{label}</span>
              </button>
            ))}
            <div className="mt-10 flex gap-2 in-up" style={v({ '--d': '400ms' })}>
              {LANGS.map((code) => (
                <button
                  key={code}
                  onClick={() => setLang(code as Lang)}
                  aria-current={code === lang ? 'true' : undefined}
                  aria-label={t.a11y.langOf(code.toUpperCase())}
                  className={`f-label rounded-full px-5 py-3 ${
                    code === lang ? 'bg-gold text-night' : 'border border-line text-bone/60'
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
    ['home', t.nav.home],
    ['vinos', t.nav.vinos],
    ['vinedos', t.nav.vinedos],
    ['novedades', t.nav.novedades],
    ['contacto', t.nav.contacto],
  ];
  return (
    <footer className="relative mt-[clamp(40px,6vw,90px)] overflow-hidden rounded-t-[clamp(28px,4vw,64px)] border-t border-line bg-night-2">
      <div className="wrap flex flex-col items-center pb-14 pt-[clamp(90px,10vw,140px)] text-center">
        <Mark className="h-auto w-[52px] text-gold fx-up" />
        <p className="f-display mt-7 text-[clamp(52px,8vw,118px)] tracking-[0.07em] fx-up">ALTAMIRA</p>
        <p className="f-label mt-3 tracking-[0.52em] text-gold">DE LOS ANDES</p>
        <p className="f-small mt-8 max-w-[44ch] text-bone/55">
          {t.footer.tagline1} {t.footer.tagline2}
        </p>
        <nav className="mt-12 flex flex-wrap justify-center gap-x-9 gap-y-3" aria-label="Footer">
          {pages.map(([p, label]) => (
            <button key={p} onClick={() => onNav(p)} className="f-label text-bone/65 transition-colors hover:text-gold">
              {label}
            </button>
          ))}
        </nav>
      </div>

      <div className="wrap">
        <div className="grid gap-10 border-t border-line py-12 text-center sm:grid-cols-3 sm:text-left">
          <div>
            <p className="f-label text-bone/40">{t.footer.officeLabel}</p>
            <p className="f-small mt-3 text-bone/80">
              Av. Colón 241
              <br />
              (5500) Mendoza, Argentina
            </p>
          </div>
          <div>
            <p className="f-label text-bone/40">{t.footer.phoneLabel}</p>
            <p className="f-small mt-3 text-bone/80">
              Tel / Fax +54 261 4299962
              <br />
              Mobile USA +1 (305) 988 5992
            </p>
          </div>
          <div>
            <p className="f-label text-bone/40">{t.footer.contactLabel}</p>
            <a href={`mailto:${CONTACT_EMAIL}`} className="f-small mt-3 inline-block text-bone/80 transition-colors hover:text-gold">
              {CONTACT_EMAIL}
            </a>
            <p className="f-small mt-2 flex flex-wrap justify-center gap-x-4 text-bone/50 sm:justify-start">
              <span>Instagram</span>
              <span>Facebook</span>
              <span>LinkedIn</span>
            </p>
          </div>
        </div>
        <div className="f-label flex flex-col gap-2 border-t border-line py-7 text-center text-[9.5px] text-bone/35 md:flex-row md:justify-between md:text-left">
          <span>{t.footer.copyright}</span>
          <span>{t.footer.warning}</span>
        </div>
      </div>
    </footer>
  );
}

// ─── Wine showcase — one bottle at a time, with its sheet ─────────────────────
function WineShowcase({ onNav }: { onNav: Nav }) {
  const t = useT();
  const wines = t.wineCatalog;
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const [paused, setPaused] = useState(false);
  const touch = useRef<number | null>(null);
  const n = wines.length;

  const go = (to: number, d: number) => {
    setDir(d);
    setI(((to % n) + n) % n);
  };
  const next = () => go(i + 1, 1);
  const prev = () => go(i - 1, -1);

  // Slow autoplay; pauses while the visitor is reading or interacting.
  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setTimeout(() => go(i + 1, 1), 7000);
    return () => clearTimeout(id);
  });

  const w = wines[i];
  const meta = WINE_META[w.id];

  return (
    <section className="relative overflow-hidden rounded-t-[clamp(28px,4vw,64px)] bg-night-2 py-[clamp(100px,12vw,170px)]">
      <div className="wrap flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Eyebrow>{t.home.winesEyebrow}</Eyebrow>
          <h2 className="f-title mt-8 fx-words">
            <Words text={t.home.winesTitle} />
          </h2>
        </div>
        <div className="flex max-w-[40ch] flex-col items-start gap-6 fx-up">
          <p className="f-body text-bone/60">{t.home.winesPara}</p>
          <button onClick={() => onNav('vinos')} className="b-link">
            <LinkArrow>{t.home.seeAllWines}</LinkArrow>
          </button>
        </div>
      </div>

      <div
        className="wrap mt-16 grid items-center gap-x-12 gap-y-10 lg:grid-cols-[1fr_minmax(0,1.05fr)_1fr]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        onTouchStart={(e) => {
          touch.current = e.touches[0].clientX;
          setPaused(true);
        }}
        onTouchEnd={(e) => {
          if (touch.current === null) return;
          const dx = e.changedTouches[0].clientX - touch.current;
          touch.current = null;
          if (Math.abs(dx) > 50) (dx < 0 ? next : prev)();
        }}
        aria-roledescription="carousel"
        aria-label={t.home.winesTitle}
      >
        {/* Left: name, notes, score */}
        <div key={`l-${w.id}`} className="order-2 lg:order-1" aria-live="polite">
          <p className="f-label text-gold sc-in">
            {meta.tag} · {w.gridRegion}
          </p>
          <h3 className="f-display mt-5 text-[clamp(42px,4.4vw,68px)] sc-in" style={v({ '--d': '80ms' })}>
            {w.name}
          </h3>
          <p className="f-label mt-3 text-bone/55 sc-in" style={v({ '--d': '140ms' })}>
            {w.sub}
          </p>
          <p className="f-body mt-6 max-w-[42ch] text-bone/70 sc-in" style={v({ '--d': '200ms' })}>
            {w.desc}
          </p>
          <div className="mt-8 flex items-center gap-5 sc-in" style={v({ '--d': '260ms' })}>
            <span className="f-display grid size-[72px] place-items-center rounded-full border border-gold/45 text-[30px] text-gold">
              {w.score.value}
            </span>
            <span className="flex flex-col">
              <span className="f-label">{w.score.critic}</span>
              <span className="f-label text-bone/45">
                {w.score.year} · {t.ui.points}
              </span>
            </span>
          </div>
          <button onClick={() => onNav('wine-detail', w.id)} className="b-link mt-9 sc-in" style={v({ '--d': '320ms' })}>
            <LinkArrow>{t.home.fullInfo}</LinkArrow>
          </button>
        </div>

        {/* Centre: the bottle in its niche */}
        <div className="relative order-1 mx-auto flex h-[clamp(440px,62vh,660px)] w-full max-w-[440px] items-end justify-center lg:order-2">
          <span className="absolute inset-x-[6%] bottom-0 top-0 rounded-t-full border border-gold/20" aria-hidden="true" />
          <span className="absolute inset-x-[18%] bottom-0 top-[14%] rounded-t-full bg-night-3" aria-hidden="true" />
          <span
            key={`n-${w.id}`}
            aria-hidden="true"
            className="f-display pointer-events-none absolute left-1/2 top-[2%] -translate-x-1/2 select-none text-[clamp(150px,18vw,260px)] leading-none text-transparent [-webkit-text-stroke:1px_rgba(198,169,121,0.22)] sc-in"
          >
            {pad2(i + 1)}
          </span>
          <img
            key={w.id}
            src={meta.img}
            alt={`${w.name} ${w.sub}`}
            className="relative mb-[4%] h-[86%] w-auto object-contain sc-bottle"
            style={v({ '--dir': dir })}
          />
          <span className="absolute inset-x-0 bottom-0 h-px bg-gold/35" aria-hidden="true" />
        </div>

        {/* Right: the technical sheet */}
        <div key={`r-${w.id}`} className="order-3">
          <p className="f-label text-gold sc-in">{t.wineDetail.fichaLabel}</p>
          <dl className="mt-5">
            {w.ficha.map((s, k) => (
              <div
                key={s.label}
                className="flex items-baseline justify-between gap-6 border-b border-line py-4 sc-in"
                style={v({ '--d': `${80 + k * 60}ms` })}
              >
                <dt className="f-label text-[9.5px] text-bone/45">{s.label}</dt>
                <dd className="f-small text-right text-bone/90">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Controls */}
      <div className="wrap mt-14 flex items-center justify-between gap-6">
        <div className="flex gap-3">
          <button onClick={prev} className="b-icon" aria-label={t.ui.prev}>
            <Arrow size={16} flip />
          </button>
          <button onClick={next} className="b-icon" aria-label={t.ui.next}>
            <Arrow size={16} />
          </button>
        </div>
        <div className="hidden flex-1 items-center justify-center gap-2 sm:flex">
          {wines.map((x, k) => (
            <button
              key={x.id}
              onClick={() => go(k, k > i ? 1 : -1)}
              aria-label={`${x.name} ${x.sub}`}
              aria-current={k === i ? 'true' : undefined}
              className="group py-3"
            >
              <span
                className={`block h-px transition-all duration-700 ${
                  k === i ? 'w-14 bg-gold' : 'w-6 bg-bone/25 group-hover:bg-bone/60'
                }`}
              />
            </button>
          ))}
        </div>
        <p className="f-label text-bone/55">
          <span className="text-gold">{pad2(i + 1)}</span> / {pad2(n)}
        </p>
      </div>
    </section>
  );
}

// ─── Terroirs — panels that open on hover ─────────────────────────────────────
function TerroirPanels() {
  const t = useT();
  const coords = useCoords();
  const [active, setActive] = useState(0);
  return (
    <div className="wrap mt-16 flex flex-col gap-4 lg:h-[clamp(560px,78vh,760px)] lg:flex-row">
      {t.home.vyRows.map((r, k) => {
        const on = active === k;
        return (
          <article
            key={r.num}
            tabIndex={0}
            onMouseEnter={() => setActive(k)}
            onFocus={() => setActive(k)}
            onClick={() => setActive(k)}
            className={`relative min-h-[480px] cursor-pointer overflow-hidden rounded-t-[200px] transition-[flex-grow] duration-[1100ms] ease-[cubic-bezier(.19,1,.22,1)] lg:min-h-0 ${
              on ? 'lg:flex-[3.2]' : 'lg:flex-1'
            }`}
          >
            <img
              src={HOME_VY_IMGS[k]}
              alt={r.name}
              className={`absolute inset-0 size-full object-cover transition-transform duration-[1800ms] ease-[cubic-bezier(.19,1,.22,1)] ${
                on ? 'scale-100' : 'lg:scale-110'
              }`}
            />
            <div className={`absolute inset-0 transition-colors duration-700 ${on ? 'bg-night/40' : 'bg-night/40 lg:bg-night/65'}`} />
            <div className="absolute inset-x-0 bottom-0 p-[clamp(24px,3vw,44px)]">
              <p className="f-label text-gold">{r.num}</p>
              <h3 className="f-h3 mt-3 max-w-[16ch]">{r.name}</h3>
              <div
                className={`grid grid-rows-[1fr] transition-[grid-template-rows] duration-[1000ms] ease-[cubic-bezier(.19,1,.22,1)] ${
                  on ? 'lg:grid-rows-[1fr]' : 'lg:grid-rows-[0fr]'
                }`}
              >
                <div className="overflow-hidden">
                  <div className={`pt-5 transition-opacity duration-700 ${on ? 'lg:opacity-100 lg:delay-300' : 'lg:opacity-0'}`}>
                    <p className="f-label text-[9.5px] text-bone/55">{coords(VY_COORDS[k])}</p>
                    <p className="f-body mt-4 max-w-[48ch] text-bone/85">{r.desc}</p>
                    <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
                      {r.stats.map((s) => (
                        <div key={s.l}>
                          <dt className="f-label text-[9.5px] text-bone/50">{s.l}</dt>
                          <dd className="f-display mt-1 text-[26px]">{s.v}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
function Home({ onNav }: { onNav: Nav }) {
  const t = useT();
  const coords = useCoords();
  const reduceMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const altitude = t.home.stats[0];
  const statBorders = ['', 'border-l border-line', 'lg:border-l lg:border-line', 'border-l border-line'];

  return (
    <div className="w-full">
      {/* HERO — the name on the left, the Andes through a cellar vault on the right */}
      <section className="relative overflow-hidden pt-[var(--header)]">
        <div className="wrap grid min-h-[calc(100dvh_-_var(--header))] items-center gap-14 pb-24 pt-10 lg:grid-cols-12 lg:pt-0">
          <div className="relative z-10 flex flex-col lg:col-span-6">
            <Eyebrow className="in-up">{t.home.heroEyebrow}</Eyebrow>
            <h1 className="mt-9">
              <span
                className="f-display block whitespace-nowrap text-[clamp(56px,8.6vw,152px)] tracking-[0.02em]"
                aria-label={t.home.heroTitle1}
              >
                <Letters text={t.home.heroTitle1} />
              </span>
              <span
                className="mt-5 block text-[clamp(13px,1.45vw,20px)] font-semibold tracking-[0.56em] text-gold in-up"
                style={v({ '--d': '900ms' })}
              >
                {t.home.heroTitle2}
              </span>
            </h1>
            <p className="f-lead mt-10 max-w-[32ch] text-bone/75 in-up" style={v({ '--d': '1100ms' })}>
              {t.home.heroSubtitle}
            </p>
            <div className="mt-12 flex flex-wrap gap-4 in-up" style={v({ '--d': '1250ms' })}>
              <button onClick={() => onNav('vinos')} className="b-pill b-pill--solid">
                {t.home.seeAllWines}
              </button>
              <button onClick={() => onNav('vinedos')} className="b-pill">
                {t.home.heroCta}
              </button>
            </div>
          </div>

          <div className="relative flex justify-center lg:col-span-6 lg:justify-end">
            <div className="relative h-[clamp(460px,76vh,800px)] w-[min(100%,540px)]">
              <span
                className="absolute -inset-[16px] rounded-t-full border border-gold/25 in-up"
                style={v({ '--d': '700ms' })}
                aria-hidden="true"
              />
              <div className="absolute inset-0 overflow-hidden rounded-t-full bg-night-3">
                <div className="absolute inset-0 in-arch" style={v({ '--d': '150ms' })}>
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
                  <div className="absolute inset-0 bg-night/15" />
                </div>
              </div>
              <div className="absolute -left-[54px] bottom-16 hidden sm:block in-up" style={v({ '--d': '1400ms' })}>
                <Seal text={`ALTAMIRA DE LOS ANDES · ${t.vinedos.mapPlace1.toUpperCase()} · `} />
              </div>
              <p className="f-label absolute -bottom-12 right-0 text-[9.5px] text-bone/50 in-up" style={v({ '--d': '1500ms' })}>
                {altitude.num} m · {coords(ESTATE_COORD)}
              </p>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 lg:flex">
          <span className="f-label text-[9px] text-bone/45">{t.ui.scroll}</span>
          <span className="block h-12 w-px overflow-hidden bg-line">
            <span className="cue block h-full w-full bg-gold" />
          </span>
        </div>
      </section>

      {/* The place — one sentence */}
      <section className="py-[clamp(120px,16vw,230px)]">
        <div className="wrap flex max-w-[1200px] flex-col items-center text-center">
          <Mark className="h-auto w-[44px] text-gold fx-up" />
          <Eyebrow center className="mt-10">
            {t.home.breathLabel}
          </Eyebrow>
          <p className="f-title mt-10 fx-words">
            <Words parts={[{ t: t.home.breathPre }, { t: t.home.breathEm, cls: 'text-gold' }, { t: t.home.breathPost }]} />
          </p>
        </div>
      </section>

      {/* The estate — text with two layered images */}
      <section className="wrap grid items-center gap-16 pb-[clamp(120px,14vw,200px)] lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Eyebrow>{t.home.estateEyebrow}</Eyebrow>
          <h2 className="f-title mt-8 fx-words">
            <Words text={`${t.home.estateTitle1} ${t.home.estateTitle2}`} />
          </h2>
          <p className="f-lead mt-8 text-bone/80 fx-up">{t.home.estatePara1}</p>
          <p className="f-body mt-6 text-bone/55 fx-up">{t.home.estatePara2}</p>
          <ul className="mt-12 grid gap-3 sm:grid-cols-2 fx-up">
            {t.home.estateWines.map((w, i) => (
              <li key={w.name}>
                <button
                  onClick={() => onNav('wine-detail', HOME_ESTATE_IDS[i])}
                  className="group flex h-full w-full items-center justify-between gap-4 rounded-[18px] border border-line px-5 py-4 text-left transition-colors duration-500 hover:border-gold/50 hover:bg-night-2"
                >
                  <span className="flex flex-col">
                    <span className="f-display text-[22px] leading-tight">{w.name}</span>
                    <span className="f-label mt-1 text-[9px] text-bone/45">{w.sub}</span>
                  </span>
                  <span className="text-gold transition-transform duration-500 group-hover:translate-x-1">
                    <Arrow />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative h-[clamp(560px,62vw,840px)] lg:col-span-6 lg:col-start-7">
          <div className="absolute right-0 top-0 h-[86%] w-[72%] overflow-hidden rounded-t-full fx-arch">
            <img src={`${A}/mza-estate.jpg`} alt={t.home.estateEyebrow} className="absolute inset-0 size-full object-cover" />
          </div>
          <div className="absolute bottom-0 left-0 h-[48%] w-[48%]" data-speed="-0.07">
            <div className="size-full overflow-hidden rounded-[24px] border-[10px] border-night fx-img">
              <img src={`${A}/mza-vistaflores.jpg`} alt="" className="size-full object-cover" />
            </div>
          </div>
          <p className="f-label absolute bottom-2 right-0 text-[9.5px] text-bone/45">{coords(VY_COORDS[0])}</p>
        </div>
      </section>

      <WineShowcase onNav={onNav} />

      {/* The vineyards */}
      <section className="py-[clamp(110px,13vw,190px)]">
        <div className="wrap flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Eyebrow>{t.home.vyEyebrow}</Eyebrow>
            <h2 className="f-title mt-8 max-w-[15ch] fx-words">
              <Words text={`${t.home.vyTitle1} ${t.home.vyTitle2}`} />
            </h2>
          </div>
          <div className="flex max-w-[40ch] flex-col items-start gap-6 fx-up">
            <p className="f-body text-bone/60">{t.home.vyIntro}</p>
            <button onClick={() => onNav('vinedos')} className="b-link">
              <LinkArrow>{t.home.vyBtn}</LinkArrow>
            </button>
          </div>
        </div>

        <TerroirPanels />

        <div className="wrap mt-[clamp(90px,11vw,150px)]">
          <p className="f-lead mx-auto max-w-[58ch] text-center text-bone/70 fx-up">{t.home.statsIntro}</p>
          <dl className="mt-16 grid grid-cols-2 gap-y-14 border-t border-line pt-14 lg:grid-cols-4">
            {t.home.stats.map((s, i) => (
              <div key={s.label} className={`flex flex-col items-center gap-4 text-center ${statBorders[i]}`}>
                <dt className="f-label text-gold">{s.label}</dt>
                <dd className="f-display text-[clamp(58px,6.6vw,108px)]">
                  <Odometer value={s.num} />
                </dd>
                <dd className="f-small text-bone/50">{s.unit}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Quote */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-x-0 -bottom-[14%] -top-[14%]" data-speed="0.14">
          <img src={`${A}/mza-valley.jpg`} alt="" className="size-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-night/70" />
        <div className="wrap relative flex flex-col items-center py-[clamp(140px,18vw,260px)] text-center">
          <Mark className="h-auto w-[42px] text-gold fx-up" />
          <blockquote className="f-title mt-10 max-w-[24ch] fx-words">
            <Words text={t.home.quote} />
          </blockquote>
          <p className="f-label mt-10 text-gold fx-up">{t.home.quoteSub}</p>
        </div>
      </section>

      {/* Recognition — a slow, endless line of medals */}
      <section className="border-b border-line py-[clamp(70px,8vw,110px)]">
        <div className="wrap flex flex-col items-center gap-12 lg:flex-row">
          <div className="shrink-0 text-center lg:w-[30%] lg:text-left">
            <Eyebrow>{t.home.awardsEyebrow}</Eyebrow>
            <h2 className="f-h3 mt-6">{t.home.awardsTitle}</h2>
          </div>
          <div className="w-full overflow-hidden lg:flex-1">
            <div className="marquee">
              {[...HOME_AWARD_IMGS, ...HOME_AWARD_IMGS].map((src, i) => (
                <div key={i} className="flex items-center">
                  <img src={src} alt={i < HOME_AWARD_IMGS.length ? t.home.awardAlt : ''} className="mx-10 h-[92px] w-auto" />
                  <span className="h-12 w-px bg-line" aria-hidden="true" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* News */}
      <section className="py-[clamp(110px,13vw,190px)]">
        <div className="wrap flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Eyebrow>{t.home.newsEyebrow}</Eyebrow>
            <h2 className="f-title mt-8 fx-words">
              <Words text={t.home.newsTitle} />
            </h2>
          </div>
          <div className="flex max-w-[40ch] flex-col items-start gap-6 fx-up">
            <p className="f-body text-bone/60">{t.home.newsPara}</p>
            <button onClick={() => onNav('novedades')} className="b-link">
              <LinkArrow>{t.home.seeMoreNews}</LinkArrow>
            </button>
          </div>
        </div>
        <div className="wrap mt-16 grid gap-6 md:grid-cols-2">
          {t.home.news.map((a, i) => (
            <button
              key={a.title}
              onClick={() => onNav('novedades')}
              className="group relative h-[clamp(440px,46vw,640px)] overflow-hidden rounded-[28px] text-left fx-up"
              style={v({ '--d': `${i * 140}ms` })}
            >
              <span className="absolute inset-0 transition-transform duration-[1600ms] ease-[cubic-bezier(.19,1,.22,1)] group-hover:scale-[1.05]">
                <img src={HOME_NEWS_IMGS[i]} alt={a.title} className="size-full object-cover" />
              </span>
              <span className="absolute inset-0 bg-night/60 transition-colors duration-700 group-hover:bg-night/45" />
              <span className="b-link absolute right-7 top-7">
                <span className="ring bg-night/40">
                  <Arrow />
                </span>
              </span>
              <span className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-8 lg:p-10">
                <span className="f-label text-gold">{a.date}</span>
                <span className="f-h3 max-w-[18ch]">{a.title}</span>
                <span className="f-small max-w-[46ch] text-bone/70">{a.desc}</span>
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── Inner page head (centered) ───────────────────────────────────────────────
function PageHead({ eyebrow, title, para }: { eyebrow: string; title: string; para: string }) {
  return (
    <section className="wrap flex flex-col items-center pb-[clamp(56px,7vw,100px)] pt-[clamp(70px,10vw,150px)] text-center">
      <Eyebrow center className="in-up">
        {eyebrow}
      </Eyebrow>
      <h1 className="f-display mt-9 max-w-[15ch] text-[clamp(52px,8vw,128px)] fx-words">
        <Words text={title} />
      </h1>
      <p className="f-lead mt-9 max-w-[56ch] text-bone/65 in-up" style={v({ '--d': '500ms' })}>
        {para}
      </p>
    </section>
  );
}

// A bottle standing in its arched niche — used by the catalogue and the detail page.
function Niche({
  id,
  name,
  sub,
  tag,
  cta,
  onClick,
  delay = 0,
}: {
  id: string;
  name: string;
  sub: string;
  tag: string;
  cta: string;
  onClick: () => void;
  delay?: number;
}) {
  return (
    <button onClick={onClick} className="group flex flex-col items-center text-center fx-up" style={v({ '--d': `${delay}ms` })}>
      <span className="relative flex aspect-[3/4] w-full items-end justify-center overflow-hidden rounded-t-full border border-line bg-night-2 transition-colors duration-700 group-hover:border-gold/50">
        <span
          className="absolute bottom-0 left-1/2 h-[62%] w-[72%] -translate-x-1/2 rounded-t-full border border-gold/10 bg-night-3/60 transition-colors duration-700 group-hover:border-gold/30"
          aria-hidden="true"
        />
        <img
          src={WINE_META[id].img}
          alt={`${name} ${sub}`}
          className="relative mb-[7%] h-[82%] w-auto object-contain transition-transform duration-[1100ms] ease-[cubic-bezier(.19,1,.22,1)] group-hover:-translate-y-4"
        />
      </span>
      <span className="f-label mt-7 text-gold">{tag}</span>
      <span className="f-h3 mt-3">{name}</span>
      <span className="f-label mt-1 text-bone/50">{sub}</span>
      <span className="b-link mt-6">
        <LinkArrow>{cta}</LinkArrow>
      </span>
    </button>
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
    <div className="w-full">
      <PageHead eyebrow={t.vinos.heroEyebrow} title={t.vinos.heroTitle} para={t.vinos.heroPara} />

      <div className="pointer-events-none sticky top-[calc(var(--header)_+_10px)] z-30 flex justify-center px-4">
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1 rounded-full border border-line bg-night/85 p-1.5 backdrop-blur-xl">
          {(['TODOS', 'ALTAMIRA', 'VAV', 'BLENDS'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`f-label rounded-full px-5 py-2.5 text-[10px] transition-colors duration-500 ${
                filter === f ? 'bg-gold text-night' : 'text-bone/65 hover:text-bone'
              }`}
            >
              {t.vinos.filterLabels[f]}
            </button>
          ))}
          <span className="f-label px-4 text-[10px] text-bone/40">{pad2(filtered.length)}</span>
        </div>
      </div>

      <div className="wrap grid gap-x-10 gap-y-20 pb-[clamp(100px,12vw,170px)] pt-14 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((w, i) => (
          <Niche
            key={w.id}
            id={w.id}
            name={w.name}
            sub={w.sub}
            tag={w.gridRegion}
            cta={t.vinos.fullInfo}
            delay={(i % 3) * 120}
            onClick={() => onNav('wine-detail', w.id)}
          />
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
    const map = L.map(el, { scrollWheelZoom: false, zoomControl: false, attributionControl: true, minZoom: 8, maxZoom: 16 });
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    // Satellite imagery — irrigated vineyards read green against the arid foothills.
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
  return <div ref={ref} className="vf-map h-[clamp(400px,48vw,620px)] w-full" />;
}

// ─── VIÑEDOS ──────────────────────────────────────────────────────────────────
function Vinedos() {
  const t = useT();
  const coords = useCoords();
  return (
    <div className="w-full">
      <PageHead eyebrow={t.vinedos.heroEyebrow} title={`${t.vinedos.heroTitle1} ${t.vinedos.heroTitle2}`} para={t.vinedos.intro1} />

      {/* The estate's own photograph under a wide vault */}
      <section className="wrap">
        <div className="relative h-[clamp(420px,74vh,780px)] overflow-hidden rounded-t-[min(44vw,640px)] fx-arch">
          <img
            src={`${A}/andes-real.jpg`}
            alt={`${t.vinedos.heroTitle1} ${t.vinedos.heroTitle2}`}
            className="absolute inset-0 size-full object-cover object-[50%_22%]"
          />
        </div>
        <div className="f-label mt-6 flex flex-wrap justify-between gap-4 text-[9.5px] text-bone/50">
          <span>{coords(ESTATE_COORD)}</span>
          <span>
            {t.home.stats[0].num} m · {t.vinedos.mapPlace1}
          </span>
        </div>
      </section>

      <section className="wrap py-[clamp(100px,12vw,170px)] text-center">
        <p className="f-lead mx-auto max-w-[62ch] text-bone/75 fx-up">{t.vinedos.intro2}</p>
      </section>

      {/* The three terroirs */}
      {t.vinedos.cards.map((c, i) => {
        const flip = i % 2 === 1;
        return (
          <section key={c.num} className="wrap">
            <div className="grid items-center gap-12 border-t border-line py-[clamp(70px,8vw,120px)] lg:grid-cols-12">
              <div
                className={`relative h-[clamp(460px,64vh,680px)] overflow-hidden rounded-t-full lg:col-span-5 lg:row-start-1 fx-arch ${
                  flip ? 'lg:col-start-8' : 'lg:col-start-1'
                }`}
              >
                <img src={VINEDOS_IMGS[i]} alt={c.name + c.italic} className="absolute inset-0 size-full object-cover" />
              </div>
              <div className={`lg:col-span-6 lg:row-start-1 ${flip ? 'lg:col-start-1' : 'lg:col-start-7'}`}>
                <span className="f-display block text-[clamp(96px,12vw,180px)] leading-[0.8] text-gold/25">{pad2(i + 1)}</span>
                <p className="f-label mt-6 text-gold">{c.num}</p>
                <h2 className="f-title mt-4 fx-words">
                  <Words text={`${c.name}${c.italic}`} />
                </h2>
                <p className="f-label mt-5 text-[9.5px] text-bone/45">{coords(VY_COORDS[i])}</p>
                <p className="f-body mt-6 max-w-[48ch] text-bone/70 fx-up">{c.desc}</p>
                <dl className="mt-10 grid grid-cols-3 gap-4 rounded-[22px] border border-line p-6 fx-up">
                  {c.specs.map((s) => (
                    <div key={s.l}>
                      <dt className="f-label text-[9.5px] text-bone/45">{s.l}</dt>
                      <dd className="f-display mt-2 text-[clamp(20px,1.9vw,27px)] leading-tight">{s.v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </section>
        );
      })}

      {/* Location */}
      <section className="rounded-t-[clamp(28px,4vw,64px)] bg-night-2 py-[clamp(100px,12vw,170px)]">
        <div className="wrap grid items-center gap-14 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Eyebrow>{t.vinedos.mapLabel}</Eyebrow>
            <h2 className="f-title mt-8">
              {t.vinedos.mapPlace1}
              <span className="block text-gold">{t.vinedos.mapPlace2}</span>
            </h2>
            <p className="f-body mt-6 max-w-[40ch] text-bone/65 fx-up">{t.vinedos.mapDesc}</p>
            <ol className="mt-10 flex flex-col gap-3 fx-up">
              {t.vinedos.mapArt.vineyards.map((name, i) => (
                <li key={name} className="flex items-center gap-4 rounded-full border border-line px-5 py-3">
                  <span className="f-label grid size-7 shrink-0 place-items-center rounded-full bg-gold text-[9px] text-night">
                    {i + 1}
                  </span>
                  <span className="f-small text-bone/85">{name}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="overflow-hidden rounded-[28px] border border-line lg:col-span-8 fx-up">
            <TerrainMap />
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
    <div className="w-full">
      <PageHead eyebrow={t.novedades.eyebrow} title={t.novedades.title} para={t.novedades.para} />

      <section className="wrap">
        <article className="relative h-[clamp(500px,74vh,800px)] overflow-hidden rounded-[32px]">
          <div className="absolute inset-0 fx-img">
            <img src={IMG.vinexpo} alt={`${f.title1} ${f.title2}`} className="size-full object-cover" />
          </div>
          <div className="absolute inset-0 bg-night/55" />
          <div className="absolute inset-x-0 bottom-0 flex max-w-[680px] flex-col items-start p-[clamp(28px,4.5vw,72px)]">
            <p className="f-label text-gold">{f.tag}</p>
            <h2 className="f-title mt-5 fx-words">
              <Words text={`${f.title1} ${f.title2}`} />
            </h2>
            <p className="f-body mt-5 text-bone/75">{f.desc}</p>
            <button className="b-link mt-8">
              <LinkArrow>{t.novedades.readNote}</LinkArrow>
            </button>
          </div>
        </article>
      </section>

      <section className="wrap grid gap-x-10 gap-y-16 py-[clamp(100px,12vw,170px)] md:grid-cols-3">
        {t.novedades.articles.map((a, i) => (
          <article key={a.title} className="flex flex-col fx-up" style={v({ '--d': `${i * 120}ms` })}>
            <div className="relative aspect-[3/4] overflow-hidden rounded-t-full fx-arch">
              <img src={NOVEDADES_ARTICLE_IMGS[i]} alt={a.title} className="absolute inset-0 size-full object-cover" />
            </div>
            <p className="f-label mt-7 text-gold">{a.tag}</p>
            <h3 className="f-h3 mt-3">{a.title}</h3>
            <p className="f-small mt-3 text-bone/60">{a.desc}</p>
            <button className="b-link mt-6 self-start">
              <LinkArrow>{t.novedades.readNote}</LinkArrow>
            </button>
          </article>
        ))}
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
    <div className="w-full">
      <PageHead eyebrow={t.contacto.eyebrow} title={t.contacto.title} para={`${t.contacto.intro1} ${t.contacto.intro2}`} />

      <section className="wrap grid gap-10 pb-[clamp(100px,12vw,170px)] lg:grid-cols-12">
        <aside className="flex flex-col gap-10 lg:col-span-4">
          <div className="relative h-[clamp(340px,40vw,460px)] overflow-hidden rounded-t-full fx-arch">
            <img src={IMG.cellar} alt="" className="absolute inset-0 size-full object-cover" />
          </div>
          <dl className="flex flex-col gap-7">
            <div>
              <dt className="f-label text-bone/40">{t.contacto.officeLabel}</dt>
              <dd className="f-small mt-2 text-bone/85">Av. Colón 241 · (5500) Mendoza, Argentina</dd>
            </div>
            <div>
              <dt className="f-label text-bone/40">{t.contacto.phoneLabel}</dt>
              <dd className="f-small mt-2 text-bone/85">
                Tel / Fax +54 261 4299962
                <br />
                Mobile USA +1 (305) 988 5992
              </dd>
            </div>
            <div>
              <dt className="f-label text-bone/40">{t.contacto.emailLabel}</dt>
              <dd className="mt-2">
                <a href={`mailto:${CONTACT_EMAIL}`} className="f-small text-gold-soft transition-colors hover:text-gold">
                  {CONTACT_EMAIL}
                </a>
              </dd>
            </div>
          </dl>
        </aside>

        <form
          onSubmit={send}
          className="grid content-start gap-x-10 gap-y-10 rounded-[32px] border border-line bg-night-2 p-[clamp(28px,4.4vw,68px)] sm:grid-cols-2 lg:col-span-7 lg:col-start-6 fx-up"
        >
          {fields.map((field) => (
            <label key={field.name} className={`field ${field.span}`}>
              <span className="f-label text-bone/50">{field.label}</span>
              <input name={field.name} type={field.type} required autoComplete={field.auto} className="field__input" />
            </label>
          ))}
          <label className="field sm:col-span-2">
            <span className="f-label text-bone/50">{t.contacto.messageLabel}</span>
            <textarea name="message" required rows={4} className="field__input resize-none" />
          </label>
          <button type="submit" className="b-pill b-pill--solid justify-self-start sm:col-span-2">
            {t.contacto.submit}
          </button>
        </form>
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
    <div className="w-full">
      <div className="wrap pt-[clamp(28px,4vw,52px)]">
        <button onClick={() => onNav('vinos')} className="b-link">
          <span className="ring">
            <Arrow flip />
          </span>
          <span>{t.nav.vinos}</span>
        </button>
      </div>

      <section className="wrap grid items-center gap-x-12 gap-y-12 py-[clamp(40px,6vw,90px)] lg:grid-cols-[1fr_minmax(0,0.95fr)_1fr]">
        <div className="order-2 lg:order-1">
          <p className="f-label text-gold in-up">{wine.region}</p>
          <h1 className="f-display mt-6 text-[clamp(52px,5.6vw,92px)] leading-[0.98] fx-words">
            <Words parts={[{ t: wine.title1 + ' ' }, { t: wine.title2, cls: 'text-gold-soft' }]} />
          </h1>
          <p className="f-lead mt-8 text-bone/75 in-up" style={v({ '--d': '300ms' })}>
            {wine.desc}
          </p>
          <div className="mt-10 flex items-center gap-5 in-up" style={v({ '--d': '400ms' })}>
            <span className="f-display grid size-[84px] place-items-center rounded-full border border-gold/50 text-[34px] text-gold">
              {wine.score.value}
            </span>
            <span className="flex flex-col">
              <span className="f-label">{wine.score.critic}</span>
              <span className="f-label text-bone/45">
                {wine.score.year} · {t.ui.points}
              </span>
            </span>
          </div>
          <div className="mt-10 flex flex-wrap gap-3 in-up" style={v({ '--d': '500ms' })}>
            <button onClick={() => onNav('contacto')} className="b-pill b-pill--solid">
              {t.wineDetail.ctaInfo}
            </button>
            <button className="b-pill">{t.wineDetail.downloadPdf}</button>
          </div>
        </div>

        <div className="relative order-1 mx-auto flex h-[clamp(480px,74vh,760px)] w-full max-w-[460px] items-end justify-center overflow-hidden rounded-t-full border border-line bg-night-2 lg:order-2">
          <span
            className="absolute bottom-0 left-1/2 h-[64%] w-[74%] -translate-x-1/2 rounded-t-full border border-gold/15 bg-night-3/70"
            aria-hidden="true"
          />
          <img src={meta.img} alt={`${wine.title1} ${wine.title2}`} className="relative mb-[6%] h-[84%] w-auto object-contain sc-bottle" />
        </div>

        <div className="order-3">
          <p className="f-label text-gold">{t.wineDetail.fichaLabel}</p>
          <dl className="mt-5">
            {wine.ficha.map((s, k) => (
              <div
                key={s.label}
                className="flex items-baseline justify-between gap-6 border-b border-line py-4 in-up"
                style={v({ '--d': `${200 + k * 70}ms` })}
              >
                <dt className="f-label text-[9.5px] text-bone/45">{s.label}</dt>
                <dd className="f-small text-right text-bone/90">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Tasting notes */}
      <section className="mt-[clamp(40px,6vw,90px)] rounded-t-[clamp(28px,4vw,64px)] bg-night-2 py-[clamp(90px,11vw,150px)]">
        <div className="wrap">
          <div className="flex justify-center">
            <Eyebrow center>{t.wineDetail.notesLabel}</Eyebrow>
          </div>
          <div className="mt-16 grid gap-12 text-center md:grid-cols-3">
            {wine.notes.map((note, i) => (
              <div key={note.label} className="flex flex-col items-center fx-up" style={v({ '--d': `${i * 120}ms` })}>
                <span className="f-display text-[72px] leading-none text-gold/40">{pad2(i + 1)}</span>
                <p className="f-label mt-5 text-gold">{note.label}</p>
                <p className="f-lead mt-4 max-w-[30ch] text-bone/80">{note.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Origin */}
      <section className="wrap py-[clamp(90px,11vw,150px)]">
        <div className="relative overflow-hidden rounded-[32px]">
          <div className="absolute inset-x-0 -bottom-[16%] -top-[16%]" data-speed="0.1">
            <img src={`${A}/andes-real.jpg`} alt="" className="size-full object-cover object-[50%_25%]" />
          </div>
          <div className="absolute inset-0 bg-night/65" />
          <div className="relative flex flex-col items-start gap-6 p-[clamp(32px,6vw,96px)] lg:max-w-[760px]">
            <Eyebrow>{t.wineDetail.vyEyebrow}</Eyebrow>
            <h2 className="f-title fx-words">
              <Words text={t.wineDetail.vyTitle} />
            </h2>
            <p className="f-body max-w-[48ch] text-bone/75">{t.wineDetail.vyDesc}</p>
            <button onClick={() => onNav('vinedos')} className="b-pill mt-2">
              {t.wineDetail.vyBtn}
            </button>
          </div>
        </div>
      </section>

      {/* Other wines */}
      <section className="wrap pb-[clamp(90px,11vw,150px)]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h2 className="f-title fx-words">
            <Words text={t.wineDetail.otherWines} />
          </h2>
          <button onClick={() => onNav('vinos')} className="b-link">
            <LinkArrow>{t.wineDetail.seeAllWines}</LinkArrow>
          </button>
        </div>
        <div className="mt-14 grid gap-x-10 gap-y-16 sm:grid-cols-3">
          {others.map((w, i) => (
            <Niche
              key={w.id}
              id={w.id}
              name={w.name}
              sub={w.sub}
              tag={WINE_META[w.id].tag}
              cta={t.vinos.fullInfo}
              delay={i * 120}
              onClick={() => onNav('wine-detail', w.id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
const PAGES: Page[] = ['home', 'vinos', 'vinedos', 'novedades', 'contacto', 'wine-detail'];
const REVEAL_SEL =
  '.fx-up:not(.in), .fx-words:not(.in), .fx-img:not(.in), .fx-arch:not(.in), .fx-line:not(.in), .odo:not(.in)';

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
      window.scrollTo({ top: 0, behavior: 'instant' });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Arm scroll reveals before first paint (CSS only hides content under .js-reveal).
  useLayoutEffect(() => {
    document.documentElement.classList.add('js-reveal');
  }, []);

  // One observer for every reveal on any page, plus scroll parallax for [data-speed].
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.08, rootMargin: '0px 0px -6% 0px' }
    );
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let scanRaf = 0;
    let pxRaf = 0;
    const parallax = () => {
      pxRaf = 0;
      if (still) return;
      const vh = window.innerHeight;
      document.querySelectorAll<HTMLElement>('[data-speed]').forEach((el) => {
        const box = (el.parentElement ?? el).getBoundingClientRect();
        if (box.bottom < -200 || box.top > vh + 200) return;
        const y = (box.top + box.height / 2 - vh / 2) * Number(el.dataset.speed);
        el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
      });
    };
    const onScroll = () => {
      if (!pxRaf) pxRaf = requestAnimationFrame(parallax);
    };
    const scan = () => {
      cancelAnimationFrame(scanRaf);
      scanRaf = requestAnimationFrame(() => {
        document.querySelectorAll(REVEAL_SEL).forEach((el) => io.observe(el));
        parallax();
      });
    };
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(scanRaf);
      cancelAnimationFrame(pxRaf);
      io.disconnect();
      mo.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
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
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  return (
    <div className="min-h-screen w-full bg-night">
      {!entered && <AgeGate onEnter={enter} />}
      <Header page={page} onNav={navigate} />
      <main className={page === 'home' ? '' : 'pt-[var(--header)]'}>
        {page === 'home' && <Home onNav={navigate} />}
        {page === 'vinos' && <Vinos onNav={navigate} />}
        {page === 'vinedos' && <Vinedos />}
        {page === 'novedades' && <Novedades />}
        {page === 'contacto' && <Contacto />}
        {page === 'wine-detail' && <WineDetail key={activeWine} onNav={navigate} wineId={activeWine} />}
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
