'use client';

import type { ReactNode } from 'react';
import { TabsContent } from '@/components/ui/tabs';

type TeacherPortalTabPaneProps = {
  tabId: string;
  activeTab: string;
  className?: string;
  children: ReactNode;
};

/**
 * Mount only the active teacher portal tab panel (avoids hidden Radix panels flashing animations).
 */
export function TeacherPortalTabPane({ tabId, activeTab, className, children }: TeacherPortalTabPaneProps) {
  if (activeTab !== tabId) return null;
  return (
    <TabsContent value={tabId} className={className} forceMount>
      {children}
    </TabsContent>
  );
}
