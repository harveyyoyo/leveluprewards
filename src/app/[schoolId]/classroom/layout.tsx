import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Classroom — levelUp EDU',
  description: 'Full-screen classroom seating chart for quick point awards.',
};

export default function ClassroomLayout({ children }: { children: React.ReactNode }) {
  return children;
}
