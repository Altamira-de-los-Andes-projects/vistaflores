import { clean } from '@/cms';
import { useSite, useT } from '@/i18n';
import { type Nav } from '@/lib/routing';

// Footer
export function Footer({ onNav }: { onNav: Nav }) {
  const t = useT();
  const site = useSite();
  return (
    <footer className="bg-accent-solid">
      <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr] gap-[50px] px-5 sm:px-8 lg:px-12 pt-20 pb-10">
        <div className="flex flex-col gap-[19px]">
          <div className="flex flex-col items-start leading-none text-on-dark">
            <span className="font-['Cormorant_Garamond:Regular'] text-[26px] sm:text-[30px] lg:whitespace-nowrap lg:text-[clamp(20px,2.1vw,30px)] leading-[1.05] tracking-[0.06em]">
              {site.name.toUpperCase()}
            </span>
            <span className="font-['IBM_Plex_Mono:Medium'] text-[9px] tracking-[0.42em] mt-[10px] pl-px text-on-dark/[0.7]">
              {site.subtitle}
            </span>
          </div>
          <p
            className="font-['Archivo:Light'] text-[12.5px] text-on-dark/[0.7] leading-[23px]"
            style={{ fontVariationSettings: '"wdth" 100' }}
          >
            {t.footer.tagline1}
            <br />
            {t.footer.tagline2}
          </p>
        </div>

        <div className="flex flex-col gap-[25px]">
          <div className="flex flex-col gap-[9px]">
            <p className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.36px] text-on-dark/[0.75]">
              {t.footer.officeLabel}
            </p>
            <p
              className="whitespace-pre-line font-['Archivo:Light'] text-[13.5px] text-on-dark leading-[24.3px]"
              style={{ fontVariationSettings: '"wdth" 100' }}
            >
              {site.office}
            </p>
          </div>
          <div className="flex flex-col gap-[9px]">
            <p className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.36px] text-on-dark/[0.75]">
              {t.footer.phoneLabel}
            </p>
            <p
              className="font-['Archivo:Light'] text-[12px] sm:text-[13.5px] text-on-dark leading-[21px] sm:leading-[24.3px]"
              style={{ fontVariationSettings: '"wdth" 100' }}
            >
              {site.phones.map((p) => (
                <a key={p} href={`tel:${clean(p).replace(/[^\d+]/g, '')}`} className="block whitespace-nowrap hover:underline underline-offset-4">{p}</a>
              ))}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-[25px]">
          <div className="flex flex-col gap-[14px]">
            <p className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.36px] text-on-dark/[0.75]">
              {t.footer.contactLabel}
            </p>
            <a
              href={`mailto:${clean(site.email)}`}
              className="border-b border-on-dark/[0.35] pb-[5px] font-['Archivo:Light'] text-[13.5px] text-on-dark text-left leading-[24.3px] hover:border-white/60 transition-colors self-start"
              style={{ fontVariationSettings: '"wdth" 100' }}
            >
              {site.email}
            </a>
          </div>
          {site.socials.some((s) => /^https?:\/\//i.test(clean(s.url ?? ''))) && (
          <div className="flex flex-col gap-[10px]">
            <p className="font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[1.36px] text-on-dark/[0.75]">
              {t.footer.followLabel}
            </p>
            <div className="flex gap-[10px]">
              {/* only networks with a real address (set in the CMS); http(s) only, so a pasted "javascript:" link can't run */}
              {site.socials.filter((s) => /^https?:\/\//i.test(clean(s.url ?? ''))).map((s) => (
                <a key={s.label} href={clean(s.url!)} target="_blank" rel="noopener noreferrer" aria-label={clean(s.label)} className="border border-on-dark/[0.35] flex items-center justify-center size-[34px] hover:border-white/60 transition-colors">
                  <span aria-hidden="true" className="font-['IBM_Plex_Mono:Medium'] text-[7px] text-on-dark/[0.6]">{s.label}</span>
                </a>
              ))}
            </div>
          </div>
          )}
        </div>
      </div>

      <div className="border-t border-on-dark/[0.2] flex flex-col gap-y-1 gap-x-8 md:flex-row md:items-center md:justify-between md:gap-x-16 px-5 sm:px-8 lg:px-12 pt-[23px] pb-[34px]">
        <span className="md:whitespace-nowrap font-['IBM_Plex_Mono:Regular'] text-[9px] leading-[1.6] md:text-[9.5px] text-on-dark/[0.6] tracking-[0.25px] md:tracking-[1.33px]">
          {t.footer.copyright}
        </span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 md:flex-nowrap md:whitespace-nowrap font-['IBM_Plex_Mono:Regular'] text-[9px] leading-[1.6] md:text-[9.5px] text-on-dark/[0.6] tracking-[0.25px] md:tracking-[1.33px]">
          <button onClick={() => onNav('privacidad')} className="uppercase underline-offset-4 hover:text-on-dark hover:underline">
            {t.footer.privacy}
          </button>
          {t.footer.warning && <span>{t.footer.warning}</span>}
        </span>
      </div>
    </footer>
  );
}

export function FooterBar({ onNav }: { onNav: Nav }) {
  const t = useT();
  return (
    <footer className="bg-accent-solid flex flex-col gap-y-1 gap-x-8 md:flex-row md:items-center md:justify-between md:gap-x-16 px-5 sm:px-8 lg:px-12 py-[34px]">
      <span className="md:whitespace-nowrap font-['IBM_Plex_Mono:Regular'] text-[9px] leading-[1.6] md:text-[9.5px] tracking-[0.25px] md:tracking-[1.33px] text-on-dark/[0.7]">
        {t.footer.copyright}
      </span>
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 md:flex-nowrap md:whitespace-nowrap font-['IBM_Plex_Mono:Regular'] text-[9px] leading-[1.6] md:text-[9.5px] tracking-[0.25px] md:tracking-[1.33px] text-on-dark/[0.7]">
        <button onClick={() => onNav('privacidad')} className="uppercase underline-offset-4 hover:text-on-dark hover:underline">
          {t.footer.privacy}
        </button>
        {t.footer.warning && <span>{t.footer.warning}</span>}
      </span>
    </footer>
  );
}
