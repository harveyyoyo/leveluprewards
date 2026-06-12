'use client';

import React from 'react';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { OfficeAuthProvider } from '@/components/providers/OfficeAuthProvider';
import { OfficeSettingsProvider } from '@/components/providers/OfficeSettingsProvider';
import { Toaster } from '@/components/ui/toaster';

export function OfficeAppProvider({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseClientProvider>
      <OfficeAuthProvider>
        <OfficeSettingsProvider>
          {children}
          <Toaster />
        </OfficeSettingsProvider>
      </OfficeAuthProvider>
    </FirebaseClientProvider>
  );
}
