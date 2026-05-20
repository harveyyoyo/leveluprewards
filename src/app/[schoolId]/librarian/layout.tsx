import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Librarian Portal - levelUp EDU',
  description: 'Manage the school library catalog, check-outs, and returns.',
};

export default function LibrarianLayout({ children }: { children: React.ReactNode }) {
  return children;
}
