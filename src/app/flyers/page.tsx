import Link from 'next/link';
import Logo from '@/components/Logo';
import { FlyersGallery } from '@/components/marketing/FlyersGallery';
import { buttonVariants } from '@/components/ui/button';
import { APP_TAGLINE, getContactFormHref, getScheduleDemoHref, SITE_LEGAL_UMBRELLA } from '@/lib/appBranding';
import { MARKETING_LANDING_PAGES } from '@/lib/marketingLandings';
import { cn } from '@/lib/utils';
import { Printer } from 'lucide-react';

export const metadata = {
  title: 'Flyers — levelUp EDU',
  description: 'Printable flyers for LevelUp school rewards — preview, open, and print.',
};

export default function FlyersPage() {
  const scheduleDemoHref = getScheduleDemoHref();
  const scheduleDemoExternal = scheduleDemoHref.startsWith('http');

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#070814] font-sans text-slate-100 selection:bg-fuchsia-500/30 selection:text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(120,119,198,0.22),transparent_50%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-[20%] right-[-8%] h-[500px] w-[500px] rounded-full bg-fuchsia-500/10 blur-[140px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[10%] left-[-8%] h-[450px] w-[450px] rounded-full bg-cyan-500/10 blur-[130px]"
      />

      <header className="sticky top-4 z-50 mx-auto max-w-5xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between rounded-2xl border border-white/[0.08] bg-slate-950/40 px-6 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
          <Link href="/" className="flex items-center gap-2 outline-none group">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-fuchsia-600 to-cyan-400 p-0.5 shadow-lg shadow-fuchsia-500/25 transition-transform duration-300 group-hover:scale-110">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-slate-950">
                <Logo className="h-5 w-5" />
              </div>
            </div>
            <span className="text-lg font-black tracking-wider text-white">
              levelUp <span className="text-cyan-400 text-sm font-semibold">EDU</span>
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            {MARKETING_LANDING_PAGES.filter((p) => p.href !== '/flyers').map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className="hidden text-sm font-semibold text-slate-300 transition-colors hover:text-white sm:block"
              >
                {p.label}
              </Link>
            ))}
            <Link
              href="/login"
              className={cn(
                buttonVariants({ size: 'sm' }),
                'rounded-xl bg-gradient-to-r from-fuchsia-600 to-cyan-500 px-4 font-bold text-white shadow-lg shadow-fuchsia-500/20 hover:brightness-110',
              )}
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-20 pt-16">
        <div className="text-center">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-[11px] font-black uppercase tracking-widest text-cyan-300">
            <Printer className="h-3.5 w-3.5" aria-hidden />
            Printable flyers
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Choose your flyer style
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-base text-slate-400 sm:text-lg">
            {APP_TAGLINE} — pick <strong className="font-semibold text-slate-200">Bold Navy</strong> or{' '}
            <strong className="font-semibold text-slate-200">Original styles</strong>, then open a preview and
            use <strong className="font-semibold text-slate-200">Ctrl+P</strong> (Letter, backgrounds on) to save
            as PDF or print.
          </p>
        </div>

        <FlyersGallery />

        <section className="mx-auto mt-16 max-w-3xl rounded-3xl border border-white/[0.08] bg-slate-950/50 p-8 text-center backdrop-blur-md">
          <h2 className="text-2xl font-extrabold text-white">Need a custom version?</h2>
          <p className="mt-3 text-sm text-slate-400">
            Contact us for school-specific branding, bilingual copies, or bulk print files.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={getContactFormHref()}
              className={cn(
                buttonVariants({ size: 'lg' }),
                'rounded-2xl bg-gradient-to-r from-fuchsia-600 to-cyan-500 font-bold text-white',
              )}
            >
              Contact Us
            </Link>
            {scheduleDemoExternal ? (
              <a
                href={scheduleDemoHref}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ size: 'lg', variant: 'outline' }),
                  'rounded-2xl border-white/10 text-slate-200 hover:bg-white/5',
                )}
              >
                Request a Demo
              </a>
            ) : (
              <Link
                href={scheduleDemoHref}
                className={cn(
                  buttonVariants({ size: 'lg', variant: 'outline' }),
                  'rounded-2xl border-white/10 text-slate-200 hover:bg-white/5',
                )}
              >
                Request a Demo
              </Link>
            )}
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/[0.06] py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-6 text-center">
          <p className="max-w-2xl text-[10px] leading-snug text-slate-500">{SITE_LEGAL_UMBRELLA}</p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-semibold text-slate-500">
            <Link href="/" className="transition-colors hover:text-slate-300">
              Home
            </Link>
            <Link href="/level-up-arcade" className="transition-colors hover:text-slate-300">
              LevelUp Arcade
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-slate-300">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-slate-300">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
