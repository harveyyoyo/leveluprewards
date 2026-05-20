import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hall of Fame - levelUp EDU',
  description: 'School-wide leaderboards and top-performing students.',
};

export default function HallOfFameLayout({ children }: { children: React.ReactNode }) {
  return children;
}
