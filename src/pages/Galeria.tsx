import { Gallery } from '@/components/Gallery';
import { useT } from '@/i18n';
import { useReveal } from '@/lib/hooks';

export function Galeria() {
  useReveal();
  const t = useT();
  return (
    <div className="bg-surface w-full">
      <section className="border-b border-ink/[0.12] px-5 sm:px-8 lg:px-12 pt-20 pb-12 lg:pt-24 lg:pb-16">
        <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[2.28px] text-ink/[0.62] reveal">{t.nav.galeria}</p>
        <h1 className="mt-5 max-w-[760px] font-['Cormorant_Garamond:Light'] text-[clamp(42px,6vw,76px)] leading-[1.02] text-ink reveal reveal-d1">
          {t.home.galleryTitle}
        </h1>
      </section>
      <Gallery showHeading={false} />
    </div>
  );
}
