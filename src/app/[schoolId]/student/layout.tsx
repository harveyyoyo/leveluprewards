import type { ReactNode } from 'react';
import type { Metadata } from 'next';

import { StudentKioskSessionProvider } from '@/components/providers/StudentKioskSessionProvider';

export const metadata: Metadata = {
  title: 'Student Kiosk - levelUp EDU',
  description: 'Scan your card, check your points, and redeem prizes.',
};

export default function StudentSectionLayout({ children }: { children: ReactNode }) {
  return <StudentKioskSessionProvider>{children}</StudentKioskSessionProvider>;
}
