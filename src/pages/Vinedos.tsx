import { md } from '@/cms';
import { SquareSplit } from '@/components/SquareSplit';
import { UcoMap } from '@/components/UcoMap';
import { useSite, useT } from '@/i18n';
import { A, VINEDOS_IMGS } from '@/lib/assets';
import { useReveal } from '@/lib/hooks';

// VIÑEDOS
export function Vinedos() {
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
                  <span className="shrink-0 font-['IBM_Plex_Mono:Regular'] text-[9.5px] text-ink/[0.62]">{sp.l}</span>
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
        <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[2.28px] text-ink/[0.62]">{t.vinedos.narrative.soilEyebrow}</p>
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
        <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[2.28px] text-ink/[0.62]">{t.vinedos.narrative.vinesEyebrow}</p>
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
