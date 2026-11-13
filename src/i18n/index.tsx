import { createContext, lazy, Suspense, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { applyCms, cachedCms, fetchCms, PREVIEW, siteFrom, type Cms, type Site } from '@/cms';
import type { Copy } from './types';
import { es } from './es';
import { en } from './en';
import { pt } from './pt';

const CmsLive = lazy(() => import('@/cms/live'));

// a language code; es, en and pt ship with the site, others can be added from the CMS
export type Lang = string;
export type { Copy } from './types';
const LANGS: Lang[] = ['es', 'en', 'pt'];

export const COPY: Record<Lang, Copy> = { es, en, pt };

type LangOption = { code: Lang; flag?: string | null };
const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; copy: Copy; site: Site; langs: LangOption[] }>({
  lang: 'en',
  setLang: () => {},
  copy: COPY.en,
  site: siteFrom(null, 'en'),
  langs: LANGS.map((code) => ({ code })),
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [chosen, setLangState] = useState<Lang>(() => {
    try {
      const stored = localStorage.getItem('vf-lang');
      if (stored) return stored;
    } catch (e) {}
    // first visit: the visitor's own language when the site has it (Argentina → es, Brazil → pt), else English
    return navigator.languages?.map((l) => l.slice(0, 2).toLowerCase()).find((l) => (LANGS as readonly string[]).includes(l)) ?? 'en';
  });
  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem('vf-lang', l);
    } catch (e) {}
  };
  // the CMS content: last visit's copy at once, then the fresh one when it arrives (in the Studio, live drafts instead)
  const [cms, setCms] = useState<Cms | null>(cachedCms);
  useEffect(() => {
    if (PREVIEW) return;
    // the quick cached copy first, then the live one (so a change just published still shows); a late cached copy never overwrites the live one
    let live = false;
    fetchCms(true).then((c) => c && !live && setCms(c));
    fetchCms().then((c) => {
      live = true;
      if (c) setCms(c);
    });
  }, []);
  const langs = useMemo<LangOption[]>(() => {
    const active = cms?.languages?.filter((l) => l.active !== false).map((l) => ({ code: l.code, flag: l.flag }));
    return active?.length ? active : LANGS.map((code) => ({ code }));
  }, [cms]);
  // a language switched off in the CMS falls back to English, or the first one left
  const lang = langs.some((l) => l.code === chosen) ? chosen : (langs.find((l) => l.code === 'en') ?? langs[0]).code;
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  // a language added in the CMS starts from the English copy, so anything not yet translated still shows
  const copy = useMemo(() => applyCms(COPY[lang] ?? COPY.en, cms, lang), [lang, cms]);
  const site = useMemo(() => siteFrom(cms, lang), [cms, lang]);
  useEffect(() => {
    if (!site.favicon) return;
    const link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    if (link) link.href = site.favicon;
  }, [site.favicon]);
  return (
    <LangContext.Provider value={{ lang, setLang, copy, site, langs }}>
      {children}
      {PREVIEW && (
        <Suspense fallback={null}>
          <CmsLive onData={setCms} />
        </Suspense>
      )}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}

export function useSite(): Site {
  return useLang().site;
}

export function useT(): Copy {
  return useLang().copy;
}
