import type { Metadata } from 'next';
import { OfficeEntryPage } from '@/components/office/OfficeEntryPage';

export const metadata: Metadata = {
  title: 'School Office - LevelUp',
  description: 'Sign in to School Office for grades and billing.',
};

export default function OfficeBootstrapPage() {
  return <OfficeEntryPage />;
}
