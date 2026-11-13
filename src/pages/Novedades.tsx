import { md } from '@/cms';
import { useT } from '@/i18n';
import { IMG, NOVEDADES_ARTICLE_IMGS } from '@/lib/assets';
import { useReveal } from '@/lib/hooks';

// NOVEDADES
export function Novedades() {
  useReveal();
  const t = useT();
  return (
    <div className="bg-surface w-full">
      <section className="border-b border-ink/[0.12] flex flex-col md:flex-row md:items-end md:justify-between gap-5 px-5 sm:px-8 lg:px-12 pt-20 pb-[51px]">
        <div className="flex flex-col gap-[18px]">
          <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[2.28px] text-ink/[0.62] reveal">{t.novedades.eyebrow}</p>
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
          <p className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.36px] text-ink/[0.62]">{t.novedades.featured.tag}</p>
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
            <p className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.36px] text-ink/[0.62] mt-1">{a.tag}</p>
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
