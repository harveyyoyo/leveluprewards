'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { resolveAppAbsoluteUrl } from '@/lib/appUrl';
import { cn } from '@/lib/utils';

export function LiveScreenPreview({
  href,
  title = 'Live preview',
  className,
  viewport = 'fullscreen',
}: {
  href: string;
  title?: string;
  className?: string;
  viewport?: 'video' | 'fullscreen';
}) {
  const [iframeSrc, setIframeSrc] = useState(href);

  useEffect(() => {
    setIframeSrc(resolveAppAbsoluteUrl(href));
  }, [href]);

  const openHref = useMemo(() => resolveAppAbsoluteUrl(href), [href]);

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-bold">{title}</p>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button asChild variant="outline" size="sm" className="rounded-xl gap-2">
            <a href={openHref} target="_blank" rel="noopener noreferrer">
              Open <ArrowUpRight className="w-4 h-4" aria-hidden />
            </a>
          </Button>
          <Button asChild variant="outline" size="sm" className="rounded-xl gap-2">
            <a href={openHref} target="_blank" rel="noopener noreferrer" aria-label="Open another screen">
              <Plus className="w-4 h-4" aria-hidden /> Screen
            </a>
          </Button>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground font-mono break-all rounded-lg border bg-muted/30 px-2 py-1.5">
        {openHref}
      </p>

      <div
        className={cn(
          'w-full overflow-hidden rounded-2xl border bg-black',
          viewport === 'video' ? 'aspect-video' : 'h-[min(70vh,640px)] min-h-[420px]',
        )}
      >
        <iframe
          key={iframeSrc}
          title={title}
          src={iframeSrc}
          className="h-full w-full border-0"
          referrerPolicy="no-referrer"
          allow="fullscreen"
        />
      </div>
    </div>
  );
}
