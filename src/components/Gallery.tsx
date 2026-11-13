import { useEffect, useRef, useState } from 'react';
import { md } from '@/cms';
import { useT } from '@/i18n';
import { A } from '@/lib/assets';

// Gallery
// A horizontal film-strip of the estate: every photo the same height, its own width,
// with a gap between them (so no two share a hard edge) and scroll-snap. Drag on desktop,
// swipe on touch. The whole strip is one focusable scroll region with arrow-key support.
// Each tile's aspect ratio (width / height) so the strip lays out before the lazy images load.
const GALLERY = [0.75, 1.5, 0.817, 1.334, 0.68, 0.75, 1.059, 0.75, 1.334, 0.68, 1.5, 0.75].map((ar, i) => ({
  src: `${A}/gallery-${String(i + 1).padStart(2, '0')}.jpg`,
  ar,
}));

export function Gallery({ showHeading = true }: { showHeading?: boolean }) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const [bar, setBar] = useState({ width: 1, left: 0 });

  const updateBar = () => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const width = Math.min(1, el.clientWidth / el.scrollWidth);
    const left = max > 0 ? (el.scrollLeft / max) * (1 - width) : 0;
    setBar({ width, left });
  };
  useEffect(() => {
    updateBar();
    window.addEventListener('resize', updateBar);
    return () => window.removeEventListener('resize', updateBar);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType === 'touch') return; // let touch use native momentum scroll
    drag.current = { x: e.clientX, left: el.scrollLeft, moved: false };
    el.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || !drag.current) return;
    const dx = e.clientX - drag.current.x;
    if (Math.abs(dx) > 4) drag.current.moved = true;
    el.scrollLeft = drag.current.left - dx;
  };
  const endDrag = (e: React.PointerEvent) => {
    const el = ref.current;
    if (el && drag.current) el.releasePointerCapture(e.pointerId);
    drag.current = null;
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    const el = ref.current;
    if (!el) return;
    if (e.key === 'ArrowRight') { el.scrollBy({ left: el.clientWidth * 0.8, behavior: 'smooth' }); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { el.scrollBy({ left: -el.clientWidth * 0.8, behavior: 'smooth' }); e.preventDefault(); }
  };

  return (
    <section className="bg-surface pt-16 lg:pt-[110px] pb-14 lg:pb-[90px]">
      {showHeading && (
        <div className="flex flex-col gap-[18px] px-5 sm:px-8 lg:px-12 reveal">
          <p className="font-['IBM_Plex_Mono:Medium'] text-[9.5px] tracking-[2.28px] text-ink/[0.62]">{t.home.galleryEyebrow}</p>
          <h2 className="font-['Cormorant_Garamond:Light'] text-[28px] sm:text-[34px] lg:text-[40px] text-ink leading-[1.14]">{t.home.galleryTitle}</h2>
        </div>
      )}
      <div
        ref={ref}
        role="group"
        aria-label={t.home.galleryTitle}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        onScroll={updateBar}
        className={`${showHeading ? 'mt-9' : 'mt-2 lg:mt-6'} flex gap-3 sm:gap-4 overflow-x-auto scroll-px-5 sm:scroll-px-8 lg:scroll-px-12 px-5 sm:px-8 lg:px-12 snap-x snap-mandatory cursor-grab active:cursor-grabbing outline-none overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`}
      >
        {GALLERY.map((g, i) => (
          <figure
            key={g.src}
            style={{ aspectRatio: g.ar }}
            className="relative m-0 h-[68vw] max-h-[560px] min-h-[320px] shrink-0 snap-start overflow-hidden bg-surface-2"
          >
            <img
              {...md(g.src)}
              alt={`${t.home.galleryTitle} - ${i + 1}`}
              loading="lazy"
              decoding="async"
              draggable={false}
              className="absolute inset-0 size-full select-none object-cover"
            />
          </figure>
        ))}
      </div>
      {/* short, centred progress bar instead of the full-width native scrollbar */}
      <div className="mx-auto mt-7 h-px w-[160px] sm:w-[200px] bg-ink/[0.16]" aria-hidden="true">
        <div
          className="h-full bg-ink/[0.55] transition-[width,margin] duration-150"
          style={{ width: `${bar.width * 100}%`, marginLeft: `${bar.left * 100}%` }}
        />
      </div>
    </section>
  );
}
