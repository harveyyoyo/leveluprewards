import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Secretary Portal - levelUp EDU',
  description: 'Print coupon sheets and manage student reward fulfilment.',
};

export default function SecretaryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
