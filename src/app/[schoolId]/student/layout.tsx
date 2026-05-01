import type { ReactNode } from 'react';

import { StudentKioskSessionProvider } from '@/components/providers/StudentKioskSessionProvider';

export default function StudentSectionLayout({ children }: { children: ReactNode }) {
  return <StudentKioskSessionProvider>{children}</StudentKioskSessionProvider>;
}
