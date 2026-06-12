'use client';

import { useLayoutEffect } from 'react';
import { applyOfficeRootScale, clearOfficeRootScale } from '@/lib/office/officeTheme';

type OfficeThemeProviderProps = {
  children: React.ReactNode;
};

/**
 * School Office typography: sidebar and main pane use separate font-size roots
 * so the right-hand workspace stays smaller than the left navigation.
 */
export function OfficeThemeProvider({ children }: OfficeThemeProviderProps) {
  useLayoutEffect(() => {
    applyOfficeRootScale();
    return () => clearOfficeRootScale();
  }, []);

  return <div className="office-portal min-h-full">{children}</div>;
}
