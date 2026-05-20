import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Prize Desk - levelUp EDU',
  description: 'Manage prize redemptions and student rewards inventory.',
};

export default function PrizeClerkLayout({ children }: { children: React.ReactNode }) {
  return children;
}
