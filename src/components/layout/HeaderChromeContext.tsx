'use client';

import { createContext, useContext } from 'react';

/** True when `HoverRevealHeaderShell` owns header positioning (fixed tuck/reveal). */
const HeaderManagedShellContext = createContext(false);

export function HeaderManagedShellProvider({
  children,
  value = true,
}: {
  children: React.ReactNode;
  value?: boolean;
}) {
  return (
    <HeaderManagedShellContext.Provider value={value}>{children}</HeaderManagedShellContext.Provider>
  );
}

export function useHeaderManagedShell() {
  return useContext(HeaderManagedShellContext);
}
