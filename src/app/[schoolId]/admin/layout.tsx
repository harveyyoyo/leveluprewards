import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | LevelUp EDU',
    default: 'Staff portal | LevelUp EDU',
  },
  description: 'Manage students, classes, teachers, points, prizes and much more...',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
