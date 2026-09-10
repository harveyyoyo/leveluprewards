import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Displays — levelUp EDU',
  description: 'Dedicated display space to configure and launch Smart Screen, the bulletin board, and Hall of Fame.',
};

export default function DisplaysRealmLayout({ children }: { children: React.ReactNode }) {
  return children;
}
