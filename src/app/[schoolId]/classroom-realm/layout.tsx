import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Classroom — levelUp EDU',
  description: 'Dedicated classroom experience for seating charts, quick awards, and live monitors.',
};

export default function ClassroomRealmLayout({ children }: { children: React.ReactNode }) {
  return children;
}
