import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { HomeLandingLogo } from '@/components/logos/HomeLandingLogo';
import { SiteContactForm } from '@/components/layout/SiteContactForm';

export const metadata: Metadata = {
  title: 'Contact — LevelUp',
  description: 'Request a demo or contact LevelUp Rewards.',
};

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-slate-950 p-6 text-slate-100">
      <HomeLandingLogo />
      <Suspense
        fallback={
          <div className="flex min-h-[320px] w-full max-w-md items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" aria-label="Loading form" />
          </div>
        }
      >
        <SiteContactForm />
      </Suspense>
      <Link
        href="/"
        className="text-sm font-semibold text-slate-400 transition-colors hover:text-slate-100"
      >
        &larr; Back to home
      </Link>
    </div>
  );
}
