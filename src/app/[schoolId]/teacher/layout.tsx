import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Teacher Portal - levelUp EDU',
  description: 'Generate coupons add prizes and generate reports.',
};

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return children;
}
