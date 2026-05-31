import Link from 'next/link';
import { HomeLandingLogo } from '@/components/logos/HomeLandingLogo';
import { Button } from '@/components/ui/button';
import { getLevelUpLogoHref, getScheduleDemoHref } from '@/lib/appBranding';
import { MARKETING_LANDING_PAGES } from '@/lib/marketingLandings';

export default function RootPage() {
  const scheduleDemoHref = getScheduleDemoHref();
  const scheduleDemoExternal = scheduleDemoHref.startsWith('http');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-slate-950 p-6 text-slate-100">
      <HomeLandingLogo />
      <div className="flex w-full max-w-xs flex-col gap-3">
        <Button asChild className="h-12 w-full rounded-xl font-bold">
          <Link href={getLevelUpLogoHref()}>School Login</Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-12 w-full rounded-xl border-slate-700 bg-slate-900/50 font-bold text-slate-100 hover:bg-slate-800 hover:text-white"
        >
          {scheduleDemoExternal ? (
            <a href={scheduleDemoHref} target="_blank" rel="noopener noreferrer">
              Request a Demo
            </a>
          ) : (
            <Link href={scheduleDemoHref}>Request a Demo</Link>
          )}
        </Button>
      </div>
      <nav
        className="flex max-w-md flex-wrap items-center justify-center gap-x-1 gap-y-2 text-sm text-slate-400"
        aria-label="Marketing landing pages"
      >
        {MARKETING_LANDING_PAGES.map(({ href, label }, i) => (
          <span key={href} className="inline-flex items-center gap-x-1">
            {i > 0 ? (
              <span className="select-none text-slate-600" aria-hidden>
                ·
              </span>
            ) : null}
            <Link
              href={href}
              className="rounded-lg px-3 py-1.5 transition-colors hover:bg-white/5 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              {label}
            </Link>
          </span>
        ))}
      </nav>
    </div>
  );
}
