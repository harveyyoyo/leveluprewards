'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Keeps wide Admin record grids reachable on small screens without forcing the whole page sideways. */
export function AdminRecordListScroll({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn('w-full min-w-0 overflow-x-auto pb-2', className)}>{children}</div>;
}
