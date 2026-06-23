'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ExternalLink,
  Home,
  LayoutGrid,
  Monitor,
  Settings2,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { classroomRealmHref } from '@/lib/classroomRealmUrl';
import { schoolPortalHref } from '@/lib/officePublicUrl';
import { classroomRealmThemeVars } from '@/lib/classroom/classroomRealmThemes';
import { CLASSROOM_SEATING_SECTION_LABEL } from '@/lib/classroom/classroomTabSections';

const ACCENT_GRADIENT = 'linear-gradient(135deg, var(--cr-accent-from), var(--cr-accent-to))';

export function useClassroomRealmTheme(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const el = document.documentElement;
    const vars = classroomRealmThemeVars();
    for (const [key, value] of Object.entries(vars)) el.style.setProperty(key, value);
    return () => {
      for (const key of Object.keys(vars)) el.style.removeProperty(key);
    };
  }, [active]);
}

const NAV = [
  { id: 'home', label: 'Home', segment: '' as const, icon: Home },
  { id: 'setup', label: 'Set up', segment: 'setup' as const, icon: Settings2 },
  { id: 'manage', label: 'Manage', segment: 'manage' as const, icon: Sparkles },
  { id: 'live', label: CLASSROOM_SEATING_SECTION_LABEL, segment: 'live' as const, icon: LayoutGrid },
  { id: 'screen', label: 'Class screen', segment: 'class-screen' as const, icon: Monitor },
] as const;

export function ClassroomRealmShell({
  schoolId,
  children,
  hideChrome = false,
}: {
  schoolId: string;
  children: React.ReactNode;
  /** Live monitor runs fullscreen without side nav. */
  hideChrome?: boolean;
}) {
  const pathname = usePathname();
  const base = `/${schoolId.trim().toLowerCase()}/classroom-realm`;
  useClassroomRealmTheme(!hideChrome);

  if (hideChrome) {
    return <div className="classroom-realm-root min-h-dvh">{children}</div>;
  }

  return (
    <div className="classroom-realm-root relative flex min-h-dvh overflow-hidden">
      <div className="classroom-realm-bg pointer-events-none absolute inset-0" aria-hidden />
      <div className="classroom-realm-grid pointer-events-none absolute inset-0 opacity-50" aria-hidden />

      <aside className="relative z-20 hidden w-56 shrink-0 flex-col border-r border-white/10 bg-black/25 p-4 backdrop-blur-md lg:flex">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-2xl shadow-lg shadow-black/40"
            style={{ backgroundImage: ACCENT_GRADIENT }}
          >
            <LayoutGrid className="h-5 w-5" style={{ color: 'var(--cr-on-accent)' }} aria-hidden />
          </div>
          <div>
            <p
              className="text-[10px] font-black uppercase tracking-[0.35em]"
              style={{ color: 'var(--cr-accent-text)' }}
            >
              LevelUp
            </p>
            <p className="font-serif text-lg font-bold text-white">Classroom</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const href = classroomRealmHref(schoolId, item.segment);
            const active =
              item.segment === ''
                ? pathname === base || pathname === `${base}/`
                : pathname?.startsWith(`${base}/${item.segment}`);
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                  active
                    ? 'bg-white/12 text-white shadow-inner'
                    : 'text-white/55 hover:bg-white/6 hover:text-white/90',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Link
          href={schoolPortalHref(schoolId)}
          className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-white/50 transition-colors hover:border-white/20 hover:text-white/80"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          Back to LevelUp portal
        </Link>
      </aside>

      <div className="relative z-10 flex min-h-dvh min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-white/10 bg-black/20 px-4 py-3 backdrop-blur-md lg:hidden">
          <p className="font-serif text-lg font-bold text-white">Classroom</p>
          <div className="flex gap-1">
            {NAV.map((item) => {
              const href = classroomRealmHref(schoolId, item.segment);
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  href={href}
                  className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white"
                  aria-label={item.label}
                >
                  <Icon className="h-4 w-4" />
                </Link>
              );
            })}
          </div>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

export function ClassroomRealmHero({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className="mx-auto flex max-w-4xl flex-col items-center px-6 py-16 text-center sm:py-24"
    >
      <p
        className="mb-4 text-[10px] font-black uppercase tracking-[0.5em]"
        style={{ color: 'var(--cr-accent-text)' }}
      >
        Classroom
      </p>
      <h1 className="classroom-realm-display mb-4 text-4xl font-bold text-white sm:text-6xl">{title}</h1>
      {subtitle ? <p className="max-w-xl text-base text-white/60 sm:text-lg">{subtitle}</p> : null}
      {children ? <div className="mt-10 flex flex-wrap justify-center gap-4">{children}</div> : null}
    </motion.div>
  );
}
