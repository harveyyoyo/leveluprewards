import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reports - levelUp EDU',
  description: 'View and export student activity reports.',
};

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
