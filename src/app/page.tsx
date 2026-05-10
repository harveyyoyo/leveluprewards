import Link from 'next/link';
import { HomeLandingLogo } from '@/components/HomeLandingLogo';

/** Approved marketing landing routes — add entries here as new variants ship. */
const LANDING_PAGES: ReadonlyArray<{ href: string; label: string }> = [
  { href: '/leveluparcade', label: 'LevelUp Arcade' },
];

export default function RootPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 bg-slate-950 p-6 text-slate-100">
      <HomeLandingLogo />
      <nav
        className="flex max-w-md flex-wrap items-center justify-center gap-x-1 gap-y-2 text-sm text-slate-400"
        aria-label="Marketing landing pages"
      >
        {LANDING_PAGES.map(({ href, label }, i) => (
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
