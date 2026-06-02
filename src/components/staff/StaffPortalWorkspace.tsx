'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { staffPortalWorkspaceClassName } from '@/components/staff/staffPortalNavStyles';

const StaffPortalWorkspaceContext = createContext(false);

export function useStaffPortalInWorkspace() {
  return useContext(StaffPortalWorkspaceContext);
}

type StaffPortalWorkspaceProps = {
  children: ReactNode;
  className?: string;
};

/** One shared card backdrop for sidebar tabs + main panel (admin / teacher portals). */
export function StaffPortalWorkspace({ children, className }: StaffPortalWorkspaceProps) {
  return (
    <StaffPortalWorkspaceContext.Provider value={true}>
      <div className={cn(staffPortalWorkspaceClassName(), className)}>{children}</div>
    </StaffPortalWorkspaceContext.Provider>
  );
}
