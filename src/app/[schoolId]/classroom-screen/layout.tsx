import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Classroom display — levelUp EDU',
  description: 'In-room display for class session, message, and leaderboard.',
};

export default function ClassroomScreenLayout({ children }: { children: React.ReactNode }) {
  return children;
}
