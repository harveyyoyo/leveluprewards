'use client';

import { useEffect } from 'react';
import { OFFICE_PORTAL_DATA_ATTR, OFFICE_UI_SCALE } from '@/lib/office/officeTheme';

type OfficeThemeProviderProps = {
  children: React.ReactNode;
};

/**
 * Applies a larger rem baseline for all School Office routes so Tailwind spacing
 * and typography scale proportionally without document zoom.
 */
export function OfficeThemeProvider({ children }: OfficeThemeProviderProps) {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset[OFFICE_PORTAL_DATA_ATTR] = 'true';
    root.style.setProperty('--office-ui-scale', String(OFFICE_UI_SCALE));

    return () => {
      delete root.dataset[OFFICE_PORTAL_DATA_ATTR];
      root.style.removeProperty('--office-ui-scale');
    };
  }, []);

  return <div className="office-portal min-h-full">{children}</div>;
}
