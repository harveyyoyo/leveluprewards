'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Full-width wrapper for admin record lists (no horizontal scroll — grid fits the panel). */
export function AdminRecordListScroll({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn('w-full min-w-0', className)}>{children}</div>;
}
