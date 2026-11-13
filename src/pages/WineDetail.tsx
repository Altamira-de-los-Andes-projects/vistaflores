import { clean, editAttr } from '@/cms';
import { useLang, useT } from '@/i18n';
import { A, bottle, wineMeta } from '@/lib/assets';
import { useReveal } from '@/lib/hooks';
import { type Nav } from '@/lib/routing';

// WINE DETAIL
export function WineDetail({ onNav, wineId }: { onNav: Nav; wineId: string }) {
  useReveal();
  const t = useT();
  const { lang } = useLang();
  const wine = t.wineCatalog.find((w) => w.id === wineId) ?? t.wineCatalog[0];
  return (
    <div className="bg-surface w-full">
      {/* Breadcrumb */}
      <div className="border-b border-ink/[0.09] px-5 sm:px-8 lg:px-12 py-[18px]">
        <p className="font-['IBM_Plex_Mono:Regular'] text-[10px] tracking-[1px] text-ink/[0.62]">
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
            fetchPriority="high"
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
                <dt className="font-['IBM_Plex_Mono:Regular'] text-[10px] tracking-[1.4px] text-ink/[0.62] mb-[6px]">{s.label}</dt>
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
        <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[2.28px] text-ink/[0.62] text-center mb-11 reveal">{t.wineDetail.notesLabel}</p>
        <div className="flex flex-col md:flex-row gap-px bg-ink/[0.14] reveal reveal-d1">
          {wine.notes.map((note) => (
            <div key={note.label} className="bg-surface-2 flex-1 flex flex-col gap-4 px-[30px] pt-[33px] pb-[66px]">
              <p className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.53px] text-ink/[0.62]">{note.label}</p>
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
                  <img {...bottle(w)} alt="" loading="lazy" decoding="async" className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105" />
                </div>
                <div className="flex flex-col gap-2 min-w-0">
                  <p className={`font-['IBM_Plex_Mono:Medium'] text-[8px] tracking-[1.12px] ${current ? 'text-accent' : 'text-ink/[0.62]'}`}>{wineMeta(w).tag}</p>
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
