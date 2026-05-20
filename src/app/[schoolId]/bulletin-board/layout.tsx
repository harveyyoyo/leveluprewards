import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bulletin Board - levelUp EDU',
  description: 'School announcements and notices for students and staff.',
};

export default function BulletinBoardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
