import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Teacher Portal - levelUp EDU',
  description: 'Print point coupons, award or deduct points manually, customize categories, print reports, and add prizes.',
};

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return children;
}
