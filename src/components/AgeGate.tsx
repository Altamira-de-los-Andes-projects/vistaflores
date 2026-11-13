import { useState } from 'react';
import { md } from '@/cms';
import { useSite, useT } from '@/i18n';
import { A } from '@/lib/assets';

// Age gate — sober, branded first impression
export function AgeGate({ onEnter }: { onEnter: () => void }) {
  const t = useT();
  const site = useSite();
  const [leaving, setLeaving] = useState(false);
  const enter = () => {
    setLeaving(true);
    setTimeout(onEnter, 600);
  };
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gate-title"
      className={`gate ${leaving ? 'gate--leaving' : ''} fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-panel px-6 text-on-dark`}
    >
      <img
        {...md(`${A}/gate-mountain.png`)}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 size-full object-cover kenburns"
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(180deg, rgba(15,13,11,0.64) 0%, rgba(15,13,11,0.40) 42%, rgba(15,13,11,0.78) 100%)',
        }}
      />
      <div className="relative flex max-w-[560px] flex-col items-center gap-8 text-center">
        <div className="flex flex-col items-center leading-none">
          <span id="gate-title" className="font-['Cormorant_Garamond:Regular'] text-[clamp(26px,5.4vw,44px)] tracking-[0.1em] leading-[1.08]">
            {site.name.toUpperCase()}
          </span>
          <span className="mt-4 font-['IBM_Plex_Mono:Medium'] text-[10px] tracking-[0.5em] text-on-dark/70">
            {site.subtitle}
          </span>
        </div>
        <span className="h-px w-14 bg-on-dark/30" />
        <p className="font-['Cormorant_Garamond:Light_Italic'] text-[clamp(20px,2.6vw,30px)] italic leading-[1.4] text-on-dark/90">
          {t.gate.line1}
          <br />
          {t.gate.line2}
        </p>
        <p
          className="max-w-[380px] font-['Archivo:Light'] text-[13px] leading-[1.7] text-on-dark/60"
          style={{ fontVariationSettings: '"wdth" 100' }}
        >
          {t.gate.confirm}
        </p>
        <button
          autoFocus
          onClick={enter}
          className="mt-1 border border-on-dark/45 px-11 py-4 font-['Archivo:Regular'] text-[11px] uppercase tracking-[2px] text-on-dark transition-colors hover:bg-on-dark hover:text-panel"
          style={{ fontVariationSettings: '"wdth" 100' }}
        >
          {t.gate.enter}
        </button>
        {t.gate.warning && (
          <p className="mt-1 font-['IBM_Plex_Mono:Regular'] text-[9px] tracking-[1.5px] text-on-dark/70">
            {t.gate.warning}
          </p>
        )}
      </div>
    </div>
  );
}
