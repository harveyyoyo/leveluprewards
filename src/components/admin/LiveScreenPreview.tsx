import Link from 'next/link';
import { ArrowUpRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function LiveScreenPreview({
  href,
  title = 'Live preview',
  className,
}: {
  href: string;
  title?: string;
  className?: string;
}) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold">{title}</p>
        <div className="flex items-center gap-2 shrink-0">
          <Button asChild variant="outline" size="sm" className="rounded-xl gap-2">
            <Link href={href} target="_blank" rel="noopener noreferrer">
              Open <ArrowUpRight className="w-4 h-4" aria-hidden />
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="rounded-xl gap-2">
            <Link href={href} target="_blank" rel="noopener noreferrer" aria-label="Open another screen">
              <Plus className="w-4 h-4" aria-hidden /> Screen
            </Link>
          </Button>
        </div>
      </div>

      <div className="aspect-video w-full overflow-hidden rounded-2xl border bg-black">
        <iframe
          title={title}
          src={href}
          className="h-full w-full"
          referrerPolicy="no-referrer"
          allow="fullscreen"
        />
      </div>
    </div>
  );
}

