import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Portal - levelUp EDU',
  description: 'Manage students, classes, prizes, and system settings.',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
