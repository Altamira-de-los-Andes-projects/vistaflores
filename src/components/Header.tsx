import { useEffect, useState } from 'react';
import { clean, editAttr } from '@/cms';
import { CloseIcon, MenuIcon, MoonIcon, SunIcon } from '@/components/icons';
import { useLang, useSite, useT, type Lang } from '@/i18n';
import { useTheme } from '@/lib/hooks';
import { pageOn, type Nav, type Page } from '@/lib/routing';

/** a language's own name ("español", "English", "português"), for screen readers */
function langName(code: string) {
  try {
    return new Intl.DisplayNames([code], { type: 'language' }).of(code) ?? code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

// Shared header
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

export function Header({ page, onNav }: { page: Page; onNav: Nav }) {
  const isHome = page === 'home';
  const { theme, toggle } = useTheme();
  const { lang, setLang, langs } = useLang();
  const site = useSite();
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!menuOpen) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [menuOpen]);
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
                  aria-label={t.a11y.langOf.replace('{lang}', langName(code))}
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
                aria-label={t.a11y.langOf.replace('{lang}', langName(code))}
                className={`flex items-center gap-2 font-['IBM_Plex_Mono:Medium'] text-[11px] tracking-[1px] px-3 py-2 rounded transition-colors ${
                  code === lang ? 'text-ink border border-ink/[0.3]' : 'text-ink/[0.62] border border-transparent'
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
