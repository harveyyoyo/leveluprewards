import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Teacher Portal - levelUp EDU',
  description: 'Generate coupons, customize categories, print reports, and add prizes.',
};

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return children;
}
