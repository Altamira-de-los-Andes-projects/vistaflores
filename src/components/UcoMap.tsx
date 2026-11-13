import { useEffect, useRef, useState } from 'react';
import { clean } from '@/cms';
import { ARG_MENDOZA, ARG_REST, ARG_UCO, CHILE } from '@/data/mapdata';
import { FINCAS_IMG, FINCAS_PT } from '@/data/ucofincas';
import { UCO_RIVER } from '@/data/ucomap';
import { useT } from '@/i18n';
import { A } from '@/lib/assets';
import { useMedia } from '@/lib/hooks';

// Location map — the three estates, close up
// Natural satellite view (Sentinel-2, see ucofincas.ts) framed on the three estates, pinned at the
// coordinates of the Google Maps list "Fincas Altamira de los Andes". Each pin opens a card with its
// copy from the Vineyards page. The frame is fitted to the box it sits in, so the whole map always
// fits on one screen. North-up like the client's Google Maps view: the Andes fill the west and the
// estates sit at their foot, on the east.
// the area that must always be visible (ucomap units); the frame grows around it to fill the box.
const UCO_FOCUS_DESKTOP = [-1050, 250, 2950, 1150] as const;

const UCO_FOCUS_MOBILE = [500, 450, 1400, 800] as const;

const UCO_GOLD = '#f0d6a0';

const UCO_GREEN = '#9cc46e';

const UCO_WATER = '#2f6f99';

const UCO_WATER_CORE = '#5d9ac0';

// index ↔ t.vinedos.cards (Altamira, Vista Flores, La Consulta); the label side keeps the names apart
const UCO_FINCAS = [
  { key: 'altamira', name: 'Altamira', pt: FINCAS_PT.altamira, pref: 'below' },
  { key: 'vistaFlores', name: 'Vista Flores', pt: FINCAS_PT.vistaFlores, pref: 'above' },
  { key: 'laConsulta', name: 'La Consulta', pt: FINCAS_PT.laConsulta, pref: 'leftHigh' },
] as const;

// the Tunuyán as points in ucomap units, to keep every pin name off the blue line
const UCO_RIVER_PTS = [...UCO_RIVER.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map((m) => [+m[1], +m[2]] as const);

// where a pin name can sit, relative to the pin: [anchor x, anchor y, shift x, shift y] (shifts × label size)
const UCO_LABEL_SPOTS = {
  leftHigh: [-0.95, -0.15, -1, -1], rightLow: [0.95, 0, 0, -0.25], belowNear: [-0.6, 1, 0, 0], below: [0, 1, -0.5, 0], above: [0, -1, -0.5, -1], aboveLeft: [-1, -1, -1, -1], belowLeft: [-1, 1, -1, 0],
  belowRight: [1, 1, 0, 0], aboveRight: [1, -1, 0, -1], left: [-1, 0, -1, -0.5], right: [1, 0, 0, -0.5],
} as const;

type UcoSpot = keyof typeof UCO_LABEL_SPOTS;

const UCO_WRAP_W = 96;

// a point ON the Tunuyán (between the estates) and the river's heading there: the name runs along the river, just above the blue line
const UCO_RIVER_LABEL = { pt: [851, 1149], angle: -37 } as const;

// Fit the focus box into a w×h box, growing the frame around it (never past the close-up image)
function ucoFrame(focus: readonly number[], w: number, h: number) {
  const [fx, fy, fw, fh] = focus;
  const [ix, iy, iw, ih] = FINCAS_IMG;
  let vw = fw;
  let vh = fh;
  if (w / h > fw / fh) vw = (fh * w) / h;
  else vh = (fw * h) / w;
  const s = Math.min(1, iw / vw, ih / vh);
  vw *= s;
  vh *= s;
  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
  return [clamp(fx + fw / 2 - vw / 2, ix, ix + iw - vw), clamp(fy + fh / 2 - vh / 2, iy, iy + ih - vh), vw, vh] as const;
}

function UcoInset({ className }: { className?: string }) {
  return (
    <svg viewBox="520 20 280 540" className={className} aria-hidden="true">
      <path d={CHILE} fill="none" stroke="#f2ede4" strokeOpacity="0.22" strokeWidth="1.4" strokeLinejoin="round" />
      <path d={ARG_REST} fill="#f2ede4" fillOpacity="0.1" stroke="#f2ede4" strokeOpacity="0.5" strokeWidth="1.4" strokeLinejoin="round" />
      <path d={ARG_MENDOZA} fill={UCO_GOLD} stroke={UCO_GOLD} strokeWidth="1.4" strokeLinejoin="round" />
      {/* the valley is a thin strip at this scale: a soft halo and a firm edge keep it readable */}
      <path d={ARG_UCO} fill={UCO_GREEN} stroke={UCO_GREEN} strokeOpacity="0.35" strokeWidth="5" strokeLinejoin="round" />
      <path d={ARG_UCO} fill={UCO_GREEN} stroke={UCO_GREEN} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export function UcoMap() {
  const t = useT();
  const art = t.vinedos.mapArt;
  const cards = t.vinedos.cards;
  // the cards array and the pins are in different orders, so match each finca to its card by name
  const cardFor = (i: number) =>
    cards.find((c) => c.num.toUpperCase().includes(UCO_FINCAS[i].name.toUpperCase())) ?? cards[i];
  const mobile = useMedia('(max-width: 1023px)');
  const boxRef = useRef<HTMLDivElement>(null);
  // first guess of the map box (the ResizeObserver below replaces it): the grid's 1.68fr column, or the full width on phones
  const [size, setSize] = useState<[number, number]>(() => {
    if (typeof window === 'undefined') return [1160, 780];
    const { innerWidth: iw, innerHeight: ih } = window;
    return iw < 1024
      ? [iw, Math.min(ih * 0.72, 600)]
      : [iw - Math.max(320, iw * 0.16), Math.min(Math.max(ih - 72, 560), 900)];
  });
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      if (width > 0 && height > 0) setSize([width, height]);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const [vx, vy, vw, vh] = ucoFrame(mobile ? UCO_FOCUS_MOBILE : UCO_FOCUS_DESKTOP, size[0], size[1]);
  const [ix, iy, iw] = FINCAS_IMG;
  const [winW, setWinW] = useState(() => (typeof window === 'undefined' ? 1280 : window.innerWidth));
  useEffect(() => {
    const on = () => setWinW(window.innerWidth);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  const [open, setOpen] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const px = (v: number) => `${((v - vx) / vw) * 100}%`;
  const py = (v: number) => `${((v - vy) / vh) * 100}%`;
  const at = (p: readonly number[]) => ({ left: px(p[0]), top: py(p[1]) });

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const sel = open !== null ? UCO_FINCAS[open].pt : null;
  // each pin name takes its preferred spot unless that crosses the river or leaves the map; then the first spot that doesn't
  const fontPx = Math.min(22, Math.max(16, winW * 0.015));
  // the "Andes Range" pill is an obstacle too: [x, y, w, h]
  const pillPx = Math.min(15, Math.max(11, winW * 0.011));
  const [pillW, pillH] = [clean(art.andes).length * pillPx * (mobile ? 0.95 : 1.15) + (mobile ? 32 : 44), pillPx * 1.4 + 16];
  const pill = [(mobile ? 0.5 : 0.22) * size[0] - pillW / 2, 0.12 * size[1] - pillH / 2, pillW, pillH];
  // returns the spot and whether the name wraps onto two lines (UCO_WRAP_W wide) to fit beside a pin near the map edge
  const labelSpot = (i: number): [UcoSpot, boolean] => {
    const sx = size[0] / vw;
    const sy = size[1] / vh;
    const [cx, cy] = [(UCO_FINCAS[i].pt[0] - vx) * sx, (UCO_FINCAS[i].pt[1] - vy) * sy];
    const wFull = clean(art.vineyards[i]).length * fontPx * 0.48;
    const gap = 26;
    const clear = (k: UcoSpot, wrap: boolean) => {
      const w = wrap ? Math.min(wFull, UCO_WRAP_W) : wFull;
      const h = fontPx * 1.15 * (wrap && wFull > UCO_WRAP_W ? 2 : 1);
      const [ax, ay, tx, ty] = UCO_LABEL_SPOTS[k];
      const x0 = cx + ax * gap + tx * w;
      const y0 = cy + ay * gap + ty * h;
      if (x0 < 6 || x0 + w > size[0] - 6 || y0 < 4 || y0 + h > size[1] - 4) return false;
      if (x0 < pill[0] + pill[2] + 6 && x0 + w > pill[0] - 6 && y0 < pill[1] + pill[3] + 6 && y0 + h > pill[1] - 6) return false;
      const hitsPin = UCO_FINCAS.some((o, j) => {
        if (j === i) return false;
        const [ox, oy] = [(o.pt[0] - vx) * sx, (o.pt[1] - vy) * sy];
        return x0 < ox + 28 && x0 + w > ox - 28 && y0 < oy + 28 && y0 + h > oy - 28;
      });
      if (hitsPin) return false;
      return !UCO_RIVER_PTS.some(([rx, ry], j) => {
        const pts = j ? [[rx, ry], [(rx + UCO_RIVER_PTS[j - 1][0]) / 2, (ry + UCO_RIVER_PTS[j - 1][1]) / 2]] : [[rx, ry]];
        return pts.some(([qx, qy]) => {
          const x = (qx - vx) * sx;
          const y = (qy - vy) * sy;
          return x > x0 - 4 && x < x0 + w + 4 && y > y0 - 4 && y < y0 + h + 4;
        });
      });
    };
    // beside the pin first (same side of the river as the pin), one line then two, then anywhere that is clear
    const near = [UCO_FINCAS[i].pref, 'belowNear', 'belowRight', 'right', 'aboveRight'] as UcoSpot[];
    const tries: [UcoSpot, boolean][] = [
      [UCO_FINCAS[i].pref, false],
      [UCO_FINCAS[i].pref, true],
      ...near.map((k): [UcoSpot, boolean] => [k, false]),
      ...near.map((k): [UcoSpot, boolean] => [k, true]),
      ...(Object.keys(UCO_LABEL_SPOTS) as UcoSpot[]).map((k): [UcoSpot, boolean] => [k, false]),
    ];
    return tries.find(([k, wrap]) => clear(k, wrap)) ?? [UCO_FINCAS[i].pref, false];
  };
  const shadow = '[text-shadow:0_1px_10px_rgba(0,0,0,0.85)]';

  const header = (
    <div className="flex flex-col gap-4">
      <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[2.28px] text-[#f0d6a0]">{t.vinedos.mapLabel}</p>
      <h2 className={`font-['Cormorant_Garamond:Light'] text-[clamp(34px,3.6vw,52px)] leading-[1.02] text-on-dark ${shadow}`}>
        {art.valley}
        <span className="block font-['Cormorant_Garamond:Light_Italic'] italic text-on-dark/75">{art.mendoza.charAt(0) + art.mendoza.slice(1).toLowerCase()}</span>
      </h2>
      <p className={`max-w-[340px] font-['Archivo:Light'] text-[13.5px] leading-[24px] text-on-dark/85 ${shadow}`} style={{ fontVariationSettings: '"wdth" 100' }}>
        {t.vinedos.mapDesc}
      </p>
      <p className="flex items-center gap-3 font-['IBM_Plex_Mono:Medium'] text-[9px] tracking-[0.2em] uppercase text-[#f0d6a0]">
        <span className="relative inline-block size-[7px] rounded-full bg-[#f0d6a0]">
          <span className="uco-pulse !size-[7px]" />
        </span>
        {art.hint}
      </p>
    </div>
  );

  return (
    <section id="mapa" className="relative scroll-mt-[72px] overflow-hidden border-t border-on-dark/[0.12] bg-[#0b0907] text-on-dark">
      <div className="lg:grid lg:h-[clamp(560px,calc(100svh-72px),900px)] lg:grid-cols-[minmax(320px,0.32fr)_minmax(0,1.68fr)]">
      <div className="flex flex-col gap-8 px-5 sm:px-8 pt-16 pb-8 lg:min-h-0 lg:gap-[clamp(16px,3vh,32px)] lg:overflow-hidden lg:px-[clamp(24px,2.6vw,48px)] lg:py-[clamp(24px,5vh,56px)]">
        {header}
        {!mobile && (
          <div className="flex min-h-0 flex-1 flex-col justify-end">
            {/* the Argentina inset takes whatever height is left, so the column never overflows the map */}
            <div className="flex min-h-0 flex-1 items-start gap-3">
              <UcoInset className="h-full max-h-[400px] w-auto min-w-0 shrink" />
              <div className="flex flex-col gap-[2px] pt-2">
                <span className="font-['IBM_Plex_Mono:Medium'] text-[12px] tracking-[0.2em] uppercase whitespace-nowrap text-[#9cc46e]">{art.valley}</span>
                <span className="font-['IBM_Plex_Mono:Medium'] text-[12px] tracking-[0.2em] text-[#f0d6a0]">{art.mendoza}</span>
                <span className="font-['IBM_Plex_Mono:Medium'] text-[12px] tracking-[0.2em] text-on-dark/70">{art.argentina}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div
        ref={boxRef}
        className="relative h-[min(72svh,600px)] w-full overflow-hidden [container-type:inline-size] lg:h-full"
        onClick={() => setOpen(null)}
      >
        <img
          src={`${A}/uco-fincas.webp`}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className="absolute max-w-none select-none"
          style={{ width: `${(iw / vw) * 100}%`, left: `${((ix - vx) / vw) * 100}%`, top: `${((iy - vy) / vh) * 100}%` }}
        />
        {/* soft edges into the section; on desktop also into the text column */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(11,9,7,0.5)_0%,transparent_14%,transparent_84%,rgba(11,9,7,0.7)_100%)]" />
        {!mobile && <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(11,9,7,0.9)_0%,transparent_12%)]" />}

        <svg viewBox={`${vx} ${vy} ${vw} ${vh}`} preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full">
          <defs>
            <filter id="uco-glow" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="4" />
            </filter>
            {/* ucomap's river stops inside the range: fade it in from there */}
            <linearGradient id="uco-river-fade" gradientUnits="userSpaceOnUse" x1="180" y1="0" x2="460" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="1" stopColor="#fff" />
            </linearGradient>
            <mask id="uco-river-mask" maskUnits="userSpaceOnUse" x="-2000" y="-1000" width="6000" height="4000">
              <rect x="-2000" y="-1000" width="6000" height="4000" fill="url(#uco-river-fade)" />
            </mask>
          </defs>
          <g mask="url(#uco-river-mask)">
            <path d={UCO_RIVER} fill="none" stroke={UCO_WATER} strokeOpacity="0.65" strokeWidth="9" filter="url(#uco-glow)" />
            <path d={UCO_RIVER} fill="none" stroke={UCO_WATER_CORE} strokeOpacity="1" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </g>
        </svg>

        {/* context labels */}
        <span
          className={`pointer-events-none absolute whitespace-nowrap font-['Cormorant_Garamond:Regular'] italic text-[clamp(15px,1.5vw,22px)] tracking-[0.08em] text-[#bfe4fb] [text-shadow:0_1px_12px_rgba(0,0,0,0.95),0_0_2px_rgba(0,0,0,0.9)]`}
          style={{ ...at(UCO_RIVER_LABEL.pt), transform: `translate(-50%,-50%) rotate(${UCO_RIVER_LABEL.angle}deg) translateY(calc(-0.6em - 9px))` }}
        >
          {art.river}
        </span>
        <span
          className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-on-dark/25 bg-[#0b0907]/70 px-4 py-2 font-['IBM_Plex_Mono:Medium'] text-[clamp(11px,1.1vw,15px)] uppercase tracking-[0.3em] lg:px-5 lg:tracking-[0.5em] text-on-dark backdrop-blur-sm ${shadow}`}
          style={{ left: mobile ? '50%' : '22%', top: '12%' }}
        >
          {art.andes}
        </span>
        {!mobile && (
          <span
            className={`pointer-events-none absolute right-[2.5%] flex -translate-y-1/2 items-center gap-2 font-['IBM_Plex_Mono:Medium'] text-[8.5px] tracking-[0.2em] uppercase text-on-dark/80 ${shadow}`}
            style={{ top: '8%' }}
          >
            {art.toMendoza}
            <svg width="10" height="8" viewBox="0 0 10 8" className="-rotate-90" aria-hidden="true"><path d="M10 4 5 8V5H0V3h5V0Z" fill="currentColor" /></svg>
          </span>
        )}

        {/* the three estates */}
        {UCO_FINCAS.map((f, i) => {
          const active = open === i || hover === i;
          const dim = open !== null && open !== i;
          return (
            <button
              key={f.key}
              type="button"
              aria-label={art.vineyards[i]}
              aria-expanded={open === i}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(open === i ? null : i);
              }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              className={`group absolute z-10 -translate-x-1/2 -translate-y-1/2 outline-none transition-opacity duration-500 ${dim ? 'opacity-45' : ''}`}
              style={at(f.pt)}
            >
              <span className={`relative grid size-[46px] place-items-center rounded-full border border-[#f0d6a0]/60 transition-colors duration-300 ${active ? 'bg-[#f0d6a0]/40' : 'bg-black/10'} group-focus-visible:ring-2 group-focus-visible:ring-[#f0d6a0]`}>
                <span className={`relative block rounded-full border-2 border-[#0b0907] bg-[#f0d6a0] shadow-[0_0_0_1px_rgba(240,214,160,0.6),0_4px_14px_rgba(0,0,0,0.6)] transition-all duration-300 ${active ? 'size-[24px]' : 'size-[20px]'}`} />
                {!dim && <span className="uco-pulse" />}
              </span>
              <span
                className={`pointer-events-none absolute whitespace-nowrap font-['Cormorant_Garamond:Regular'] text-[clamp(16px,1.5vw,22px)] leading-none text-white ${shadow}`}
                style={(() => {
                  const [spot, wrap] = labelSpot(i);
                  const [ax, ay, tx, ty] = UCO_LABEL_SPOTS[spot];
                  return {
                    left: `calc(50% + ${ax * 26}px)`,
                    top: `calc(50% + ${ay * 26}px)`,
                    transform: `translate(${tx * 100}%, ${ty * 100}%)`,
                    ...(wrap && { whiteSpace: 'normal' as const, width: UCO_WRAP_W, lineHeight: 1.1, textAlign: 'left' as const }),
                  };
                })()}
              >
                {art.vineyards[i]}
              </span>
            </button>
          );
        })}

        {/* info card */}
        {open !== null && sel && (
          <div
            role="dialog"
            aria-label={art.vineyards[open]}
            onClick={(e) => e.stopPropagation()}
            className={`uco-card absolute z-20 border border-[#f0d6a0]/25 bg-[#0d0b08]/[0.9] p-6 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur-md ${
              mobile ? 'inset-x-3 bottom-3 max-h-[78svh] overflow-y-auto' : 'w-[330px] max-h-[calc(100%-32px)] overflow-y-auto'
            }`}
            style={
              mobile
                ? undefined
                : {
                    left:
                      sel[0] > vx + vw / 2
                        ? `clamp(16px, calc(${px(sel[0])} - 380px), calc(100% - 346px))`
                        : `clamp(16px, calc(${px(sel[0])} + 50px), calc(100% - 346px))`,
                    top: `clamp(16px, calc(${py(sel[1])} - 190px), calc(100% - 490px))`,
                  }
            }
          >
            <div className="flex items-start justify-between gap-4">
              <p className="font-['IBM_Plex_Mono:Medium'] text-[9px] tracking-[0.24em] text-[#f0d6a0]/85">
                {UCO_FINCAS[open].name.toUpperCase()}
              </p>
              <button
                type="button"
                aria-label={art.close}
                onClick={() => setOpen(null)}
                className="-mr-2 -mt-2 grid size-8 place-items-center text-on-dark/60 transition-colors hover:text-on-dark"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M1 1l10 10M11 1 1 11" stroke="currentColor" strokeWidth="1.2" /></svg>
              </button>
            </div>
            <h3 className="mt-2 font-['Cormorant_Garamond:Light'] text-[30px] leading-[1.05] text-on-dark">{art.vineyards[open]}</h3>
            <p className="mt-3 font-['Archivo:Light'] text-[13px] leading-[22px] text-on-dark/75" style={{ fontVariationSettings: '"wdth" 100' }}>
              {cardFor(open).desc}
            </p>
            <dl className="mt-4">
              {cardFor(open).specs.map((s) => (
                <div key={s.l} className="flex items-baseline justify-between gap-5 border-t border-on-dark/[0.14] py-[9px] last:border-b">
                  <dt className="shrink-0 font-['IBM_Plex_Mono:Regular'] text-[9px] tracking-[0.12em] text-on-dark/55">{s.l}</dt>
                  <dd className="text-right font-['Cormorant_Garamond:Regular'] text-[15px] leading-[1.35] text-on-dark">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

      </div>
      </div>

      {mobile && (
        <div className="flex flex-col gap-6 px-5 sm:px-8 pb-14 pt-6">
          <div className="flex justify-center">
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-end gap-[2px] pt-1 text-right">
                <span className="font-['IBM_Plex_Mono:Medium'] text-[10.5px] tracking-[0.2em] uppercase whitespace-nowrap text-[#9cc46e]">{art.valley}</span>
                <span className="font-['IBM_Plex_Mono:Medium'] text-[10.5px] tracking-[0.2em] text-[#f0d6a0]">{art.mendoza}</span>
                <span className="font-['IBM_Plex_Mono:Medium'] text-[10.5px] tracking-[0.2em] text-on-dark/55">{art.argentina}</span>
              </div>
              <UcoInset className="h-[270px] w-auto shrink-0" />
            </div>
          </div>
        </div>
      )}

    </section>
  );
}
