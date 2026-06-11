'use client';

import { useAppContext } from '@/components/AppProvider';
import type { SyncStatus } from '@/components/providers/AuthProvider';

export function isFirestoreDisconnected(syncStatus: SyncStatus): boolean {
  return syncStatus === 'offline' || syncStatus === 'error';
}

/** True when the kiosk should show a persistent Firestore connection alert. */
export function useFirestoreSyncAlert(): { show: boolean; syncStatus: SyncStatus } {
  const { syncStatus, isInitialized } = useAppContext();
  const show = isInitialized && isFirestoreDisconnected(syncStatus);
  return { show, syncStatus };
}
