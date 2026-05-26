import Link from 'next/link';
import { cn } from '@/lib/utils';

/** US Letter at 96dpi — used to scale iframe snapshots on the flyers grid. */
const FLYER_WIDTH_PX = 816;
const FLYER_HEIGHT_PX = 1056;
const SNAPSHOT_SCALE = 0.26;

const scaledWidth = Math.round(FLYER_WIDTH_PX * SNAPSHOT_SCALE);
const scaledHeight = Math.round(FLYER_HEIGHT_PX * SNAPSHOT_SCALE);

type FlyerSnapshotPreviewProps = {
  href: string;
  title: string;
  tag: string;
  borderClassName?: string;
  className?: string;
};

export function FlyerSnapshotPreview({
  href,
  title,
  tag,
  borderClassName,
  className,
}: FlyerSnapshotPreviewProps) {
  const embedSrc = `${href}${href.includes('?') ? '&' : '?'}embed=1`;

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'group/snap relative block overflow-hidden border-b border-white/[0.06] bg-slate-950 outline-none transition-shadow hover:shadow-[0_0_32px_rgba(168,85,247,0.15)] focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070814]',
        className,
      )}
      aria-label={`Open ${title} flyer in a new tab`}
    >
      <div
        className="relative mx-auto flex items-start justify-center overflow-hidden bg-slate-900/80 py-3"
        style={{ height: scaledHeight + 24 }}
      >
        <div
          className="relative overflow-hidden rounded-sm shadow-2xl ring-1 ring-white/10 transition-transform duration-300 group-hover/snap:scale-[1.02]"
          style={{ width: scaledWidth, height: scaledHeight }}
        >
          <iframe
            src={embedSrc}
            title={`${title} preview`}
            className="pointer-events-none absolute left-0 top-0 border-0 bg-white"
            style={{
              width: FLYER_WIDTH_PX,
              height: FLYER_HEIGHT_PX,
              transform: `scale(${SNAPSHOT_SCALE})`,
              transformOrigin: 'top left',
            }}
            loading="lazy"
            tabIndex={-1}
          />
        </div>
        <span
          className={cn(
            'absolute right-3 top-3 z-10 rounded-full border border-white/20 bg-black/50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur-sm',
            borderClassName,
          )}
        >
          {tag}
        </span>
        <span className="absolute inset-0 z-[5] flex items-center justify-center bg-black/0 opacity-0 transition-opacity group-hover/snap:bg-black/25 group-hover/snap:opacity-100">
          <span className="rounded-full border border-white/20 bg-black/60 px-4 py-2 text-xs font-bold text-white backdrop-blur-sm">
            Click to open full flyer
          </span>
        </span>
      </div>
    </Link>
  );
}
