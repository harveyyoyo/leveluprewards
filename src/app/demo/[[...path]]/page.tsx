import type { Metadata } from 'next';
import { DemoSchoolEntry } from '@/components/auth/DemoSchoolEntry';

const title = 'Try the LevelUp demo school';
const description = 'Explore a LevelUp demo school. No passcode needed.';

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    siteName: 'levelUp EDU',
    images: [{ url: '/logo.png', alt: 'levelUp EDU' }],
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title,
    description,
    images: ['/logo.png'],
  },
};

/** Shareable demo links (`/demo`, `/demo/library`, `/demo/yeshiva/office`) that skip the passcode. */
export default function DemoSchoolPage() {
  return <DemoSchoolEntry />;
}
