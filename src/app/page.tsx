import Link from 'next/link';
import { HomeLandingLogo } from '@/components/HomeLandingLogo';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function RootPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(56,189,248,0.18),transparent)]"
      />
      <div className="relative z-20 flex min-h-screen items-center justify-center p-6">
        <div className="flex w-full max-w-md flex-col items-center gap-8 text-center">
          <div className="flex w-full flex-col items-center">
            <HomeLandingLogo />
          </div>

          <div className="relative z-20 w-full space-y-3">
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: 'default', size: 'lg' }),
                'h-12 min-h-12 w-full rounded-xl border-0 bg-sky-600 font-bold text-white shadow-lg shadow-sky-950/40 hover:bg-sky-500',
              )}
            >
              School Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
