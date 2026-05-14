import type { ReactNode } from 'react';

/**
 * Server segment config only applies from Server Components; keeps admin-sign-in off static paths
 * so search-param reads / session hydration do not trip SSR/RSC edge cases in dev.
 */
export const dynamic = 'force-dynamic';

export default function AdminSignInLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
