'use client';

import { createContext, useContext } from 'react';

const StaffPortalLayoutContext = createContext({ sidebar: false });

export function StaffPortalLayoutProvider({
  sidebar,
  children,
}: {
  sidebar: boolean;
  children: React.ReactNode;
}) {
  return (
    <StaffPortalLayoutContext.Provider value={{ sidebar }}>
      {children}
    </StaffPortalLayoutContext.Provider>
  );
}

export function useStaffPortalLayout() {
  return useContext(StaffPortalLayoutContext);
}
