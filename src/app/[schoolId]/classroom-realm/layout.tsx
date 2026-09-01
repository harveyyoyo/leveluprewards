import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Classroom — levelUp EDU',
  description:
    'Dedicated classroom space for live awards, seating charts, behavior notes, and student class screens.',
};

export default function ClassroomRealmLayout({ children }: { children: React.ReactNode }) {
  return children;
}
