import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SssPortalGate } from '@/components/sss/SssPortalGate';
import { SssThemeProvider } from '@/components/sss/SssThemeProvider';

export const metadata: Metadata = {
  title: 'Student Special Services',
  description: 'Student special services roster and contacts',
};

export default function SssLayout({ children }: { children: React.ReactNode }) {
  return (
    <SssThemeProvider>
      <SssPortalGate>
        <Suspense fallback={<p className="text-sm text-muted-foreground p-6">Loading…</p>}>{children}</Suspense>
      </SssPortalGate>
    </SssThemeProvider>
  );
}
