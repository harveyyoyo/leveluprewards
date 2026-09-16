import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OfficePortalGate } from '@/components/office/OfficePortalGate';
import { OfficeHandoffBootstrap } from '@/components/office/OfficeHandoffBootstrap';
import { OfficeThemeProvider } from '@/components/office/OfficeThemeProvider';

export const metadata: Metadata = {
  title: 'School Office',
  description: 'Grades and billing for your school',
};

export default function OfficeLayout({ children }: { children: React.ReactNode }) {
  return (
    <OfficeThemeProvider>
      {/* Rendered outside the gate: OfficePortalGate shows a loading/sign-in screen
          instead of `children` whenever a handoff is pending, so the bootstrap that
          actually completes the handoff must not depend on the gate opening first. */}
      <Suspense fallback={null}>
        <OfficeHandoffBootstrap />
      </Suspense>
      <OfficePortalGate>{children}</OfficePortalGate>
    </OfficeThemeProvider>
  );
}
