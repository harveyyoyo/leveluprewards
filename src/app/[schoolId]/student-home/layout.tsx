import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Student Home - levelUp EDU',
  description: 'Your personal student dashboard for points, prizes, and achievements.',
};

export default function StudentHomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
