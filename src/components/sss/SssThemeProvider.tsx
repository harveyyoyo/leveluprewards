'use client';

import { useLayoutEffect } from 'react';
import { applySssRootScale, clearSssRootScale } from '@/lib/sss/sssTheme';

export function SssThemeProvider({ children }: { children: React.ReactNode }) {
  useLayoutEffect(() => {
    applySssRootScale();
    return () => clearSssRootScale();
  }, []);
  return <div className="sss-portal min-h-full">{children}</div>;
}
