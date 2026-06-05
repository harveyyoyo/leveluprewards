
'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from './init';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  // useMemo ensures this only runs once on the client, preventing re-initializations
  // that can cause hydration errors.
  const firebaseServices = useMemo(() => {
    try {
      if (process.env.NODE_ENV === 'development') {
        // FirebaseClientProvider: Initializing Firebase...
      }
      const sdks = initializeFirebase();
      if (!sdks) {
        console.error('FirebaseClientProvider: initializeFirebase returned null');
      }
      return { ok: sdks, error: null as string | null };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error('FirebaseClientProvider: initializeFirebase threw an error', e);
      return { ok: null, error: message };
    }
  }, []);

  if (!firebaseServices.ok?.firebaseApp) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-6 text-center">
        <div className="animate-pulse mb-4 text-primary font-bold">Initializing Firebase Services...</div>
        <p className="text-sm text-muted-foreground max-w-xs">
          If this screen persists, there might be a configuration or connectivity issue.
          Check your environment variables and internet connection.
        </p>
        {firebaseServices.error ? (
          <p className="mt-4 text-xs text-destructive max-w-md break-words font-mono">{firebaseServices.error}</p>
        ) : null}
      </div>
    );
  }

  const sdk = firebaseServices.ok;

  return (
    <FirebaseProvider
      firebaseApp={sdk.firebaseApp}
      auth={sdk.auth}
      firestore={sdk.firestore}
      functions={sdk.functions}
      storage={sdk.storage}
    >
      {children}
    </FirebaseProvider>
  );
}
