import { useEffect, useRef, useState } from 'react';
import { editAttr, md } from '@/cms';
import { useSite, useT } from '@/i18n';
import { A, HOME_AWARDS, HOME_NEWS_IMGS } from '@/lib/assets';
import { useReveal } from '@/lib/hooks';
import { type Nav } from '@/lib/routing';

// HOME
export function Home({ onNav }: { onNav: Nav }) {
  useReveal();
  const t = useT();
  const site = useSite();
  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // iPhones in Low Power Mode refuse to autoplay and draw their own big Play button over the video. When that
  // happens we cover the video with its poster instead, and start it on the visitor's first touch or scroll.
  const heroVideo = useRef<HTMLVideoElement>(null);
  const [heroBlocked, setHeroBlocked] = useState(false);
  const [heroPaused, setHeroPaused] = useState(false);
  useEffect(() => {
    const v = heroVideo.current;
    if (!v) return;
    v.muted = true;
    v.play().catch(() => setHeroBlocked(true));
    const retry = () => v.play().then(() => setHeroBlocked(false)).catch(() => {});
    const events = ['touchstart', 'scroll', 'click'] as const;
    events.forEach((e) => window.addEventListener(e, retry, { once: true, passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, retry));
  }, [site.heroVideo]);
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
            <>
              <video
                ref={heroVideo}
                className="hero-video absolute inset-0 size-full object-cover hero-fade"
                autoPlay
                muted
                loop
                playsInline
                disablePictureInPicture
                preload="auto"
                poster={site.heroPoster ?? `${A}/hero-andes.jpg`}
                key={site.heroVideo ?? 'bundled'}
                {...editAttr('siteSettings', 'siteSettings', 'heroVideo')}
              >
                <source src={site.heroVideo ?? `${A}/hero-andes.mp4`} type="video/mp4" />
              </video>
              {heroBlocked && (
                <img src={site.heroPoster ?? `${A}/hero-andes.jpg`} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 size-full object-cover" />
              )}
              {!heroBlocked && (
                <button
                  type="button"
                  onClick={() => {
                    const v = heroVideo.current;
                    if (!v) return;
                    if (v.paused) v.play().catch(() => {});
                    else v.pause();
                    setHeroPaused(!v.paused);
                  }}
                  aria-label={heroPaused ? t.a11y.play : t.a11y.pause}
                  className="absolute bottom-6 right-5 z-10 flex size-9 items-center justify-center rounded-full border border-white/35 text-white/80 transition-colors hover:border-white/70 hover:text-white sm:right-8 lg:right-12"
                >
                  {heroPaused ? (
                    <svg viewBox="0 0 12 12" width="10" height="10" fill="currentColor" aria-hidden="true"><path d="M3 1.5v9l7.5-4.5z" /></svg>
                  ) : (
                    <svg viewBox="0 0 12 12" width="10" height="10" fill="currentColor" aria-hidden="true"><path d="M2.5 1.5h2.5v9H2.5zM7 1.5h2.5v9H7z" /></svg>
                  )}
                </button>
              )}
            </>
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
          <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[2.28px] text-ink/[0.62]">{t.home.estateEyebrow}</p>
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
            <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[2.28px] text-ink/[0.62] reveal">
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
          <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[2.28px] text-ink/[0.62]">{t.home.awardsEyebrow}</p>
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
                <span className="mt-4 font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.4px] uppercase text-ink/[0.62]">{info.critic}</span>
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
            <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[2.28px] text-ink/[0.62] reveal">{t.home.newsEyebrow}</p>
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
              <p className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.36px] text-ink/[0.62]">{article.date}</p>
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
