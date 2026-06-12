'use client';

import { cn } from '@/lib/utils';
import type { House } from '@/lib/types';

export function HouseBadge({
  house,
  size = 'md',
  className,
}: {
  house: Pick<House, 'name' | 'color' | 'emoji' | 'value'>;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[9px]' : size === 'lg' ? 'px-3 py-1.5 text-xs' : 'px-2.5 py-1 text-[10px]';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-black uppercase tracking-widest shadow-sm',
        pad,
        className,
      )}
      style={{
        borderColor: `color-mix(in srgb, ${house.color} 33%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${house.color} 10%, transparent)`,
        color: house.color,
      }}
      title={house.value ? `${house.name} — ${house.value}` : house.name}
    >
      {house.emoji ? <span aria-hidden>{house.emoji}</span> : null}
      <span>{house.name}</span>
    </span>
  );
}
