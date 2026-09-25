import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { DemoSchoolEntry } from '@/components/auth/DemoSchoolEntry';
import { DEMO_LINK_ROOT } from '@/lib/demoSchoolLink';
import { checkDemoLink } from '@/lib/server/demoShareKey';

const title = 'Try the LevelUp demo school';
const description = 'Explore a LevelUp demo school. No passcode needed.';

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    siteName: 'levelUp EDU',
    images: [{ url: '/logo.png', alt: 'levelUp EDU' }],
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title,
    description,
    images: ['/logo.png'],
  },
};

type DemoSchoolPageProps = {
  params: { path?: string[] };
  searchParams: Record<string, string | string[] | undefined>;
};

/** Owner-made demo links (`/demo/library?key=…`); the key is checked here, on the server. */
export default function DemoSchoolPage({ params, searchParams }: DemoSchoolPageProps) {
  const pathname = [DEMO_LINK_ROOT, ...(params.path ?? [])].join('/');
  const search = new URLSearchParams();
  for (const [name, value] of Object.entries(searchParams)) {
    for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value]) {
      search.append(name, v);
    }
  }

  const check = checkDemoLink(pathname, search.toString());
  if (!check.ok) redirect(check.redirectTo);
  return <DemoSchoolEntry target={check.target} />;
}
