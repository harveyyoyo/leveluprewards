'use client';

import type { Category } from '@/lib/types';
import { cn } from '@/lib/utils';

type Props = {
  category: Pick<Category, 'name' | 'color' | 'icon' | 'imageUrl' | 'isGoldenTicket'>;
  className?: string;
  size?: 'sm' | 'md';
};

export function categoryDisplayIcon(category: Pick<Category, 'icon'>): string {
  return category.icon?.trim() || '⭐';
}

export function CategoryIconBadge({ category, className, size = 'md' }: Props) {
  const box = size === 'sm' ? 'size-8 rounded-lg' : 'size-10 rounded-xl';
  const inner = size === 'sm' ? 'text-base' : 'text-lg';
  const fill = category.color || '#6366f1';
  const mark = categoryDisplayIcon(category);

  return (
    <div
      className={cn(
        box,
        'relative flex shrink-0 items-center justify-center overflow-hidden text-white shadow-sm',
        category.isGoldenTicket && 'ring-2 ring-amber-400/80',
        className,
      )}
      style={{ backgroundColor: fill, boxShadow: `0 0 0 2px ${fill}` }}
      aria-hidden
    >
      {category.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={category.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className={cn(inner, 'leading-none drop-shadow-sm')}>{mark}</span>
      )}
    </div>
  );
}
