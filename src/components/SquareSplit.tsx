import { md } from '@/cms';

// Square pair
// Photo + text, each exactly half the page width and as tall as it is wide (stacked on mobile).
// Alternate `imgRight` down the page so the squares meet only at their corners.
export function SquareSplit({
  img,
  alt,
  imgClass = 'object-center',
  imgRight = false,
  dark = false,
  media,
  children,
}: {
  img?: string;
  media?: React.ReactNode;
  alt: string;
  imgClass?: string;
  imgRight?: boolean;
  dark?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`[container-type:inline-size] ${dark ? 'border-t border-ink/[0.14]' : ''}`}>
      <div className="grid grid-cols-1 lg:grid-cols-2 lg:grid-rows-[minmax(50cqw,auto)]">
        <div className={`group relative aspect-square overflow-hidden lg:aspect-auto ${imgRight ? 'lg:order-2' : ''}`}>
          {media ?? (
            <img
              {...md(img ?? '')}
              alt={alt}
              className={`absolute inset-0 size-full object-cover ${imgClass} transition-transform duration-700 group-hover:scale-105`}
            />
          )}
        </div>
        <div className={`reveal flex flex-col justify-center gap-6 px-6 py-14 sm:px-10 lg:px-[clamp(32px,5vw,88px)] lg:py-16 ${imgRight ? 'lg:order-1' : ''}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
