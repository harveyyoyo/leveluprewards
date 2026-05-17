'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { getAdminTabWalkthrough, getTeacherTabWalkthrough } from '@/lib/tabWalkthrough';
import { TabWalkthroughWizard } from '@/components/TabWalkthroughWizard';

type TabWalkthroughContextValue = {
  scope: 'admin' | 'teacher';
  tabId: string;
};

const TabWalkthroughContext = createContext<TabWalkthroughContextValue | null>(null);

export function TabWalkthroughProvider({
  scope,
  tabId,
  children,
}: {
  scope: 'admin' | 'teacher';
  tabId: string;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ scope, tabId }), [scope, tabId]);
  return <TabWalkthroughContext.Provider value={value}>{children}</TabWalkthroughContext.Provider>;
}

/** Place in a tab card header (top-right action row). */
export function TabWalkthroughHeaderAction({ className }: { className?: string }) {
  const ctx = useContext(TabWalkthroughContext);
  if (!ctx) return null;

  const config =
    ctx.scope === 'admin' ? getAdminTabWalkthrough(ctx.tabId) : getTeacherTabWalkthrough(ctx.tabId);
  if (!config) return null;

  return <TabWalkthroughWizard {...config} className={className} />;
}
