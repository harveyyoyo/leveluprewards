'use client';

import type { ReactNode } from 'react';
import { useStaffPortalLayoutMode } from '@/lib/staffPortal/useStaffPortalLayoutMode';

/** Legacy wrapper — layout state is global via `useStaffPortalLayoutMode`. */
export function StaffPortalLayoutProvider({ children }: { children: ReactNode }) {
  return children;
}

/** Staff portal wide / standard layout toggle. */
export function useStaffPortalLayout() {
  return useStaffPortalLayoutMode();
}

/** @deprecated Side tabs are always used; kept for gradual migration of call sites. */
export function useStaffPortalSidebarLayout() {
  return { sidebar: true as const };
}
