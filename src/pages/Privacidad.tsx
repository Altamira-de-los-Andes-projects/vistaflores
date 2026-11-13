import { useT } from '@/i18n';

// PRIVACY
export function Privacidad() {
  const t = useT();
  const l = t.legal;
  return (
    <div className="bg-surface w-full">
      <article className="mx-auto max-w-[760px] px-5 sm:px-8 pt-20 pb-24 lg:pt-28">
        <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[2.28px] text-ink/[0.62]">{l.eyebrow}</p>
        <h1 className="mt-5 font-['Cormorant_Garamond:Light_Italic'] italic text-[36px] sm:text-[44px] lg:text-[52px] leading-[1.08] text-ink">{l.title}</h1>
        <p className="mt-4 font-['IBM_Plex_Mono:Regular'] text-[10px] tracking-[1.4px] text-ink/[0.62]">{l.updated}</p>
        <p className="mt-10 font-['Archivo:Light'] text-[16px] leading-[1.8] text-ink/[0.8]" style={{ fontVariationSettings: '"wdth" 100' }}>{l.intro}</p>
        <div className="mt-12 flex flex-col">
          {l.sections.map((sec) => (
            <section key={sec.h} className="border-t border-ink/[0.14] py-8">
              <h2 className="font-['Cormorant_Garamond:Regular'] text-[24px] leading-[1.2] text-ink">{sec.h}</h2>
              <p className="mt-3 font-['Archivo:Light'] text-[14.5px] leading-[1.8] text-ink/[0.72]" style={{ fontVariationSettings: '"wdth" 100' }}>{sec.p}</p>
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
