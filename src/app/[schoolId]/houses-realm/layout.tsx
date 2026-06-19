import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Houses',
  description: 'Dedicated houses experience for your school.',
};

export default function HousesRealmLayout({ children }: { children: React.ReactNode }) {
  return children;
}
