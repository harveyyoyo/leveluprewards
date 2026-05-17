import type { Metadata } from 'next';
import { PortalEntryRedirect } from '@/components/PortalEntryRedirect';

export const metadata: Metadata = {
  title: 'School Portal - LevelUp',
  description: 'Open your school portal for student, teacher, and admin tools.',
};

export default function PortalEntryPage() {
  return <PortalEntryRedirect />;
}
