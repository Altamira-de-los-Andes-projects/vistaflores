import { useEffect, useRef, useState } from 'react';
import { md } from '@/cms';
import { useT } from '@/i18n';
import { A, bottle, wineMeta, type WineLine } from '@/lib/assets';
import { useGridCols, useReveal } from '@/lib/hooks';
import { type Nav } from '@/lib/routing';

// Our Wines stage: the landscape behind the bottles and the bottle size, tuned together so the
// bottles stand on the vineyard ground (base at 11% from the stage bottom).
const WINE_LINE_ORDER: WineLine[] = ['VAV', 'RESERVA', 'DAMA', 'NAVIGATO'];

const STAGE_IMG = `${A}/vinos-stage.jpg`;

const STAGE_H = 'h-[360px] sm:h-[440px] lg:h-[clamp(520px,44vw,680px)]';

const BOTTLE_H = 'h-[230px] sm:h-[290px] lg:h-[clamp(300px,25vw,400px)]';

// A lone bottle (filters Dama / Navigato) gets a larger size so it holds the whole stage.
const BOTTLE_H_SOLO = 'h-[290px] sm:h-[365px] lg:h-[clamp(400px,33vw,520px)]';

// NUESTROS VINOS
export function Vinos({ onNav }: { onNav: Nav }) {
  useReveal();
  const t = useT();
  const [filter, setFilter] = useState<'ALL' | WineLine>('ALL');
  // left to right: VAV, Reserva, Dama, Navigato (the catalog order is kept inside each line)
  const wines = t.wineCatalog
    .map((w) => ({ ...w, ...wineMeta(w) }))
    .sort((a, b) => WINE_LINE_ORDER.indexOf(a.line) - WINE_LINE_ORDER.indexOf(b.line));
  const filtered = filter === 'ALL' ? wines : wines.filter((w) => w.line === filter);
  const cols = useGridCols();
  const rows: (typeof filtered)[] = [];
  for (let i = 0; i < filtered.length; i += cols) rows.push(filtered.slice(i, i + cols));

  // The scroll-reveal observer only runs once on mount, so cards that mount
  // when the filter changes would stay hidden (opacity 0). Reveal them instantly
  // on every filter change after the first render.
  const gridRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    gridRef.current?.querySelectorAll('.reveal:not(.visible)').forEach((el) => el.classList.add('visible'));
  }, [filter, cols]);

  return (
    <div className="bg-surface w-full">
      <section className="relative h-[340px] overflow-hidden flex items-stretch">
        {/* on phones the photo is scaled up and raised so the dark band of the mountains sits behind the title;
            from tablets up it is anchored to the top so the blue sky stays behind the title */}
        <img {...md(`${A}/vinos-hero.jpg`)} alt="" className="absolute inset-0 size-full object-cover object-[50%_0%] max-sm:inset-auto max-sm:left-0 max-sm:top-[-10%] max-sm:h-[150%]" />
        {/* a light overall veil so the photo sits back behind the text */}
        <div className="absolute inset-0 bg-[rgba(20,18,15,0.18)]" aria-hidden="true" />
        <div
          className="absolute inset-0"
          style={{ backgroundImage: 'linear-gradient(90deg, rgba(20,18,15,0.62) 0%, rgba(20,18,15,0.3) 46%, rgba(20,18,15,0.08) 100%)' }}
        />
        {/* on phones the text spans the whole bright photo: an even veil keeps it readable */}
        <div className="absolute inset-0 bg-[rgba(20,18,15,0.24)] sm:hidden" aria-hidden="true" />
        {/* from tablets up the foot of the photo is darkened so the paragraph reads over the vines */}
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(20,18,15,0.6)] via-transparent via-[42%] to-transparent max-sm:hidden" aria-hidden="true" />
        {/* the title sits up on the blue sky and the paragraph down on the foot of the mountains and the
            vines, so no white text lands on the snow (same layout on phones and laptops) */}
        <div className="relative w-full px-5 sm:px-8 lg:px-12 py-6 sm:pt-5 sm:pb-6 flex flex-col justify-between gap-4 [text-shadow:0_1px_3px_rgba(0,0,0,0.75),0_2px_16px_rgba(0,0,0,0.55)]">
          <div className="flex flex-col gap-4">
            {/* one line in every language: on smaller screens the size follows the width (PT is the longest) */}
            <h1 className="font-['Cormorant_Garamond:Light'] whitespace-nowrap text-[calc(6.8vw-3px)] sm:text-[min(44px,calc(6.8vw-4px))] lg:text-[52px] text-on-dark leading-[1.12] lg:leading-[57.2px] hero-line-2">{t.vinos.heroTitle}</h1>
          </div>
          <p className="font-['Archivo:Light'] text-[15px] text-on-dark leading-[25.5px] max-w-[540px] text-balance sm:max-w-[820px] hero-line-3" style={{ fontVariationSettings: '"wdth" 100' }}>
            {t.vinos.heroPara}
          </p>
        </div>
      </section>

      {/* Filter tabs */}
      <div className="border-b border-ink/[0.12] flex flex-wrap items-center gap-x-8 gap-y-3 px-5 sm:px-8 lg:px-12 pt-8 lg:pt-10">
        <span className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[1.9px] text-ink/[0.62] pb-4">{t.vinos.filterLabel}</span>
        <div className="flex flex-wrap gap-x-7 gap-y-2">
          {(['ALL', ...WINE_LINE_ORDER] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`relative pb-4 font-['Archivo:Regular'] text-[11px] tracking-[1.65px] transition-colors after:absolute after:inset-x-0 after:-bottom-px after:h-px after:origin-left after:bg-ink after:transition-transform after:duration-500 ${
                filter === f ? 'text-ink after:scale-x-100' : 'text-ink/[0.48] hover:text-ink after:scale-x-0'
              }`}
              style={{ fontVariationSettings: '"wdth" 100' }}
            >
              {t.vinos.filterLabels[f]}
            </button>
          ))}
        </div>
      </div>

      <div ref={gridRef} className="pb-12 lg:pb-20">
        {rows.map((row, r) => (
          <div key={`${cols}-${r}-${filter}`} className="relative">
            {/* the landscape the bottles stand in: mountains above, vineyard ground below */}
            <div className={`absolute inset-x-0 top-0 overflow-hidden ${STAGE_H}`} aria-hidden="true">
              <img {...md(STAGE_IMG)} alt="" className="absolute inset-0 size-full object-cover object-[50%_42%]" />
              <div className="absolute inset-0 bg-black/[0.28]" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/0 from-[55%] to-black/30" />
            </div>
            <div className="relative flex justify-center">
              {row.map((wine, i) => (
                <button
                  key={wine.id}
                  className={`group flex min-w-0 flex-col cursor-pointer text-center reveal reveal-d${(i % 6) + 1} ${row.length === 1 ? 'basis-full sm:basis-1/2 lg:basis-1/3' : 'basis-1/2 sm:basis-1/3 lg:basis-1/6'}`}
                  onClick={() => onNav('wine-detail', wine.id)}
                >
                  <div className={`relative ${STAGE_H}`}>
                    <span className={`absolute bottom-[calc(11%-7px)] left-1/2 h-[12px] -translate-x-1/2 rounded-[50%] bg-black/[0.6] blur-[7px] transition-all duration-700 group-hover:bg-black/[0.4] ${row.length === 1 ? 'w-[110px] lg:w-[140px] group-hover:w-[90px]' : 'w-[78px] lg:w-[96px] group-hover:w-[62px]'}`} aria-hidden="true" />
                    <div className="absolute inset-x-0 bottom-[11%] flex justify-center">
                      <img
                        {...bottle(wine)}
                        alt="" // the card's text already names the wine
                        fetchPriority="high"
                        className={`${row.length === 1 ? BOTTLE_H_SOLO : BOTTLE_H} w-auto object-contain object-bottom drop-shadow-[0_10px_14px_rgba(0,0,0,0.35)] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-2`}
                      />
                    </div>
                  </div>
                  <div className="px-2 lg:px-3 pt-6 pb-8 flex flex-col items-center gap-[10px] [container-type:inline-size]">
                    {/* one line always: the size follows the card's width (cqw), so "Reserva Cabernet Franc" fits at any column count */}
                    <p className="font-['Cormorant_Garamond:Regular'] text-[clamp(11px,9.6cqw,24px)] text-ink leading-[1.12] whitespace-nowrap">
                      {wine.name}{wine.sub && <> {wine.sub}</>}
                    </p>
                    <span className="inline-flex items-center gap-2 font-['Archivo:Regular'] text-[11px] tracking-[0.4px] text-accent" style={{ fontVariationSettings: '"wdth" 100' }}>
                      <span className="border-b border-accent/[0.35] pb-[3px] transition-colors group-hover:border-accent">{t.vinos.fullInfo}</span>
                      <span aria-hidden="true" className="transition-transform duration-500 group-hover:translate-x-1">→</span>
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
