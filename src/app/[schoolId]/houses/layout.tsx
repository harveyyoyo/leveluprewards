import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Houses',
  description: 'Dedicated houses experience for your school.',
};

export default function HousesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
