'use client';

import { createContext, useContext } from 'react';
import { useStaffPortalLayoutMode } from '@/lib/staffPortal/useStaffPortalLayoutMode';

type StaffPortalLayoutContextValue = {
  isWide: boolean;
  toggleLayoutMode: () => void;
};

const StaffPortalLayoutContext = createContext<StaffPortalLayoutContextValue>({
  isWide: true,
  toggleLayoutMode: () => {},
});

export function StaffPortalLayoutProvider({ children }: { children: React.ReactNode }) {
  const { isWide, toggleLayoutMode } = useStaffPortalLayoutMode();

  return (
    <StaffPortalLayoutContext.Provider value={{ isWide, toggleLayoutMode }}>
      {children}
    </StaffPortalLayoutContext.Provider>
  );
}

export function useStaffPortalLayout() {
  return useContext(StaffPortalLayoutContext);
}

/** @deprecated Side tabs are always used; kept for gradual migration of call sites. */
export function useStaffPortalSidebarLayout() {
  return { sidebar: true as const };
}
