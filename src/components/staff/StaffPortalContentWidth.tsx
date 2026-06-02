'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useStaffPortalLayout } from '@/components/staff/StaffPortalLayoutContext';
import { staffPortalContentWidthClassName } from '@/components/staff/staffPortalNavStyles';

type StaffPortalContentWidthProps = {
  children: ReactNode;
  className?: string;
};

/** Centers page content when standard layout is selected; full width when wide. */
export function StaffPortalContentWidth({ children, className }: StaffPortalContentWidthProps) {
  const { isWide } = useStaffPortalLayout();

  return <div className={cn(staffPortalContentWidthClassName(isWide), className)}>{children}</div>;
}
