'use client';

import type { Category } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Ticket } from 'lucide-react';

type Props = {
  category: Pick<Category, 'name' | 'color' | 'icon' | 'imageUrl' | 'isGoldenTicket'>;
  className?: string;
  size?: 'sm' | 'md';
};

export function CategoryIconBadge({ category, className, size = 'md' }: Props) {
  const box = size === 'sm' ? 'size-8 rounded-lg' : 'size-10 rounded-xl';
  const inner = size === 'sm' ? 'text-base' : 'text-lg';

  if (category.imageUrl) {
    return (
      <div
        className={cn(
          box,
          'flex shrink-0 items-center justify-center overflow-hidden border bg-background',
          category.isGoldenTicket && 'ring-2 ring-amber-400/80',
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={category.imageUrl} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }

  if (category.icon) {
    return (
      <div
        className={cn(
          box,
          'flex shrink-0 items-center justify-center border bg-background',
          category.isGoldenTicket && 'ring-2 ring-amber-400/80',
          className,
        )}
        aria-hidden
      >
        <span className={inner}>{category.icon}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        box,
        'flex shrink-0 items-center justify-center border bg-background relative',
        category.isGoldenTicket && 'ring-2 ring-amber-400/80',
        className,
      )}
    >
      <div
        className={cn(size === 'sm' ? 'size-4' : 'size-5', 'rounded-full border shadow-sm')}
        style={{ backgroundColor: category.color || '#cccccc' }}
      />
      {category.isGoldenTicket ? (
        <Ticket className="absolute -bottom-1 -right-1 h-3.5 w-3.5 text-amber-500 drop-shadow" aria-hidden />
      ) : null}
    </div>
  );
}
