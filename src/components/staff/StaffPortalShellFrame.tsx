'use client';

import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useStaffPortalLayout } from '@/components/staff/StaffPortalLayoutContext';
import { staffPortalShellClassName } from '@/components/staff/staffPortalNavStyles';

type StaffPortalShellFrameProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

export function StaffPortalShellFrame({ children, className, style }: StaffPortalShellFrameProps) {
  const { isWide } = useStaffPortalLayout();

  return (
    <div className={cn(staffPortalShellClassName(isWide), className)} style={style}>
      {children}
    </div>
  );
}
