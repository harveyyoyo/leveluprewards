import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Displays - levelUp EDU',
  description: 'Smart Screen and bulletin board displays for hallways, lobbies, and staff areas.',
};

export default function DisplaysLayout({ children }: { children: React.ReactNode }) {
  return children;
}
