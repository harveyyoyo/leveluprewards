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
      <OfficePortalGate>
        <Suspense fallback={null}>
          <OfficeHandoffBootstrap />
        </Suspense>
        {children}
      </OfficePortalGate>
    </OfficeThemeProvider>
  );
}
