import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'House sorting ceremony',
  description: 'Fullscreen house sorting presentation for students.',
};

/** Minimal layout — chrome is hidden via LayoutClientWrapper for this route. */
export default function HouseSortingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
