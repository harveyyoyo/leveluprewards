import Link from 'next/link';
import Image from 'next/image';
import Logo from '@/components/Logo';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function RootPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#070814] font-sans text-slate-100 selection:bg-fuchsia-500/30 selection:text-white">
      {/* ── Background Cosmic Glows ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(120,119,198,0.22),transparent_50%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-[30%] left-[-10%] h-[600px] w-[600px] rounded-full bg-cyan-500/10 blur-[150px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-[60%] right-[-10%] h-[600px] w-[600px] rounded-full bg-fuchsia-500/10 blur-[150px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-[20%] h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[130px]"
      />

      {/* ── Floating Nav Bar ── */}
      <header className="sticky top-4 z-50 mx-auto max-w-5xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between rounded-2xl border border-white/[0.08] bg-slate-950/40 px-6 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
          <Link href="/" className="flex items-center gap-2 outline-none group">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-fuchsia-600 to-cyan-400 p-0.5 shadow-lg shadow-fuchsia-500/25 transition-transform duration-300 group-hover:scale-110">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-slate-950">
                <Logo className="h-5 w-5" />
              </div>
            </div>
            <span className="text-lg font-black tracking-wider bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              levelUp <span className="text-cyan-400 text-sm font-semibold">EDU</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-semibold text-slate-300 transition-colors hover:text-white"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className={cn(
                buttonVariants({ size: 'sm' }),
                'relative overflow-hidden rounded-xl bg-gradient-to-r from-fuchsia-600 to-cyan-500 px-5 font-bold text-white shadow-lg shadow-fuchsia-500/20 transition-all duration-300 hover:scale-105 hover:shadow-cyan-500/25 hover:brightness-110 active:scale-95',
              )}
            >
              Start Playing →
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero / Arcade Arena ── */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pt-20 pb-16 text-center">
        {/* Neon Chip Tag */}
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-4 py-1.5 text-[11px] font-black uppercase tracking-widest text-fuchsia-300 shadow-[0_0_15px_rgba(217,70,239,0.15)]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fuchsia-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-fuchsia-500" />
          </span>
          PBIS Level Up Activated
        </div>

        {/* Dynamic Gaming Title */}
        <h1 className="mx-auto max-w-4xl text-balance text-5xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl md:text-7xl">
          Turn school behavior into an{' '}
          <span className="relative inline-block">
            <span className="absolute -inset-1 block -skew-y-1 bg-gradient-to-r from-fuchsia-600 to-cyan-500 opacity-20 blur-sm" />
            <span className="relative bg-gradient-to-r from-fuchsia-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
              arcade adventure.
            </span>
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-slate-400 sm:text-lg">
          No boring checklists. levelUp EDU transforms positive behavior support (PBIS) into a vibrant gaming ecosystem where students earn points, unlock levels, and redeem epic rewards.
        </p>

        {/* Action Buttons */}
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/login"
            className={cn(
              buttonVariants({ size: 'lg' }),
              'h-14 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-cyan-500 px-8 text-base font-extrabold text-white shadow-xl shadow-fuchsia-500/20 transition-all duration-300 hover:scale-105 hover:shadow-cyan-500/30 hover:brightness-110 active:scale-95',
            )}
          >
            Insert Coin to Start
          </Link>
          <Link
            href="/login"
            className={cn(
              buttonVariants({ size: 'lg', variant: 'outline' }),
              'h-14 rounded-2xl border-white/[0.08] bg-white/[0.02] px-8 text-base font-bold text-slate-300 backdrop-blur-md transition-all duration-300 hover:border-cyan-500/50 hover:bg-cyan-500/5 hover:text-white',
            )}
          >
            View Live Demo
          </Link>
        </div>

        {/* Arcade Console Mockup */}
        <div className="relative mx-auto mt-20 max-w-5xl">
          {/* Glowing Aura behind screen */}
          <div className="absolute -inset-10 z-0 rounded-[2.5rem] bg-gradient-to-tr from-fuchsia-600/20 via-violet-600/10 to-cyan-500/20 blur-3xl opacity-80" />

          {/* Hologram/Cabinet Frame */}
          <div className="relative z-10 rounded-3xl border border-white/[0.1] bg-slate-950/60 p-4 shadow-[0_0_50px_rgba(168,85,247,0.15)] ring-1 ring-white/[0.05] backdrop-blur-xl">
            {/* Top Bar */}
            <div className="mb-4 flex items-center justify-between border-b border-white/[0.06] pb-3 px-2 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                <span className="h-3 w-3 rounded-full bg-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                <span className="h-3 w-3 rounded-full bg-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              </div>
              <div className="rounded-full bg-white/[0.03] px-4 py-1 font-mono tracking-wider text-slate-400">
                http://levelup.school/abc/portal
              </div>
              <div className="font-mono text-cyan-400 font-bold">STATION_01 ACTIVE</div>
            </div>

            {/* Cropped Screen Image */}
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-950">
              <Image
                alt="LevelUp Student Dashboard"
                src="/user_preview_student_details.png"
                width={1280}
                height={720}
                className="w-full object-cover shadow-inner transition-transform duration-500 hover:scale-[1.01]"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Interactive Game Stations (Features) ── */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-24">
        <div className="mb-16 text-center">
          <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1 text-[11px] font-black uppercase tracking-wider text-cyan-300">
            Feature Quests
          </span>
          <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Choose Your Playstyle
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-400">
            Equip your staff and students with tools designed to elevate the educational journey.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid gap-8 md:grid-cols-2">
          {[
            {
              label: 'Fast Access Check-In',
              title: 'Multi-Auth Scanner Hub',
              desc: 'Seamlessly identify players with NFC cards, custom barcode scans, or rapid face recognition. Instant verification with zero lag.',
              accent: 'from-cyan-500 to-blue-500',
              shadow: 'shadow-cyan-500/10',
              textAccent: 'text-cyan-400',
              border: 'hover:border-cyan-500/30',
              bgGlow: 'rgba(6,182,212,0.05)',
              src: '/user_preview_system_ready.png',
            },
            {
              label: 'Personalized Greeting',
              title: 'Welcome Banner Rewards',
              desc: 'Celebrate every entrance with high-energy greetings showing active student level tiers, point balances, and unlocked daily achievements.',
              accent: 'from-fuchsia-500 to-rose-500',
              shadow: 'shadow-fuchsia-500/10',
              textAccent: 'text-fuchsia-400',
              border: 'hover:border-fuchsia-500/30',
              bgGlow: 'rgba(217,70,239,0.05)',
              src: '/user_preview_welcome.png',
            },
            {
              label: 'School Ranking',
              title: 'The Hall of Fame Leaderboard',
              desc: 'Boost motivation with dynamic leaderboards showcasing top lifetime earners. Healthy competition to keep students engaged.',
              accent: 'from-amber-500 to-orange-500',
              shadow: 'shadow-amber-500/10',
              textAccent: 'text-amber-400',
              border: 'hover:border-amber-500/30',
              bgGlow: 'rgba(245,158,11,0.05)',
              src: '/user_preview_hall_of_fame.png',
            },
            {
              label: 'Redemption Shop',
              title: 'Arcade Rewards Marketplace',
              desc: 'Fully customizable prize inventory loaded with homework passes, custom avatars, stickers, or store privileges with instant point deductions.',
              accent: 'from-emerald-500 to-cyan-500',
              shadow: 'shadow-emerald-500/10',
              textAccent: 'text-emerald-400',
              border: 'hover:border-emerald-500/30',
              bgGlow: 'rgba(16,185,129,0.05)',
              src: '/user_preview_rewards_shop.png',
            },
          ].map((item) => (
            <div
              key={item.title}
              className={cn(
                'group relative overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-1',
                item.border,
              )}
              style={{
                boxShadow: `inset 0 0 20px rgba(255,255,255,0.01), 0 10px 30px rgba(0,0,0,0.2)`,
              }}
            >
              {/* Inner gradient glow */}
              <div
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                style={{
                  background: `radial-gradient(circle at 50% 50%, ${item.bgGlow}, transparent 70%)`,
                }}
              />

              {/* Tag */}
              <div className="mb-4 flex items-center justify-between">
                <span className={cn('text-xs font-black uppercase tracking-wider', item.textAccent)}>
                  {item.label}
                </span>
                <span className="font-mono text-[10px] text-slate-500">SYS_VER_2.4</span>
              </div>

              {/* Title & Desc */}
              <h3 className="text-2xl font-black text-white group-hover:text-white/90">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {item.desc}
              </p>

              {/* Image with Custom Neon Border */}
              <div className="mt-6 relative overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-950 p-1.5 transition-all duration-300 group-hover:border-white/[0.15]">
                <div className="overflow-hidden rounded-[10px]">
                  <Image
                    alt={item.title}
                    src={item.src}
                    width={800}
                    height={500}
                    className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Gamified Stats / Buff Bar ── */}
      <section className="relative z-10 border-y border-white/[0.06] bg-slate-950/50 py-14 backdrop-blur-md">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-6 sm:grid-cols-4">
          {[
            { value: '⚡ 1-Tap', label: 'Fast Point Awards' },
            { value: '🎮 4 Ways', label: 'Auth Check-In Modes' },
            { value: '💎 Unlimited', label: 'Custom Loot Catalog' },
            { value: '📊 Real-Time', label: 'Telemetry & PBIS Data' },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-black bg-gradient-to-r from-cyan-400 to-fuchsia-400 bg-clip-text text-transparent">
                {value}
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Insert Coin Call To Action ── */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 py-24 text-center">
        <div className="relative overflow-hidden rounded-3xl border border-fuchsia-500/20 bg-gradient-to-b from-slate-950 to-slate-900/60 p-12 shadow-[0_0_40px_rgba(217,70,239,0.1)]">
          {/* Neon lines */}
          <div className="absolute top-0 left-1/2 h-[1px] w-1/2 -translate-x-1/2 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
          <div className="absolute bottom-0 left-1/2 h-[1px] w-1/2 -translate-x-1/2 bg-gradient-to-r from-transparent via-fuchsia-500 to-transparent" />

          <h2 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Are You Ready to Level Up?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-400">
            Empower your school with the ultimate arcade ecosystem. Sign in with your school token or access your dashboard.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/login"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'h-14 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-cyan-500 px-10 text-base font-extrabold text-white shadow-xl shadow-fuchsia-500/20 transition-all duration-300 hover:scale-105 hover:shadow-cyan-500/30 hover:brightness-110',
              )}
            >
              Insert Coin to Begin
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/[0.06] py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 text-xs text-slate-500 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">© {new Date().getFullYear()} levelUp EDU.</span> All Rights Reserved.
          </div>
          <div className="flex items-center gap-6 font-semibold">
            <Link href="/privacy" className="transition-colors hover:text-slate-300">
              Privacy Quest
            </Link>
            <Link href="/terms" className="transition-colors hover:text-slate-300">
              Terms of Play
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
