'use client';

import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useStaffPortalLayoutMode } from '@/lib/staffPortal/useStaffPortalLayoutMode';
import { staffPortalShellClassName } from '@/components/staff/staffPortalNavStyles';

type StaffPortalShellFrameProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

export function StaffPortalShellFrame({ children, className, style }: StaffPortalShellFrameProps) {
  const { isWide } = useStaffPortalLayoutMode();

  return (
    <div className={cn(staffPortalShellClassName(isWide), className)} style={style}>
      {children}
    </div>
  );
}
