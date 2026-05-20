import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Library - levelUp EDU',
  description: 'Browse the school library catalog and check out books.',
};

export default function LibraryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
