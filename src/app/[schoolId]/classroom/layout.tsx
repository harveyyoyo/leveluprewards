import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Classroom — levelUp EDU',
  description: 'Live classroom for awards, seating, behavior notes, raffle, and the class screen.',
};

export default function ClassroomLayout({ children }: { children: React.ReactNode }) {
  return children;
}
