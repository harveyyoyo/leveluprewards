'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useStaffPortalLayoutMode } from '@/lib/staffPortal/useStaffPortalLayoutMode';
import { staffPortalContentWidthClassName } from '@/components/staff/staffPortalNavStyles';

type StaffPortalContentWidthProps = {
  children: ReactNode;
  className?: string;
};

/** Width helper inside the staff portal shell — wide stretches edge-to-edge inside `<main>`. */
export function StaffPortalContentWidth({ children, className }: StaffPortalContentWidthProps) {
  const { isWide } = useStaffPortalLayoutMode();

  return <div className={cn(staffPortalContentWidthClassName(isWide), className)}>{children}</div>;
}
