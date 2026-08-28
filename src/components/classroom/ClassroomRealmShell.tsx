'use client';

import { Suspense, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  BookOpenCheck,
  Dices,
  ExternalLink,
  Home,
  LayoutGrid,
  Monitor,
  Settings2,
  Tv,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { classroomRealmHref, classroomRealmManageHref } from '@/lib/classroomRealmUrl';
import { schoolPortalHref } from '@/lib/officePublicUrl';
import { classroomRealmThemeVars } from '@/lib/classroom/classroomRealmThemes';
import {
  buildClassroomSections,
  CLASSROOM_LIVE_MONITOR_NAV_LABEL,
  CLASSROOM_SECTION_LABELS,
  type ClassroomTabSection,
} from '@/lib/classroom/classroomTabSections';
import { useAppContext } from '@/components/AppProvider';
import { useSettings } from '@/components/providers/SettingsProvider';

const ACCENT_GRADIENT = 'linear-gradient(135deg, var(--cr-accent-from), var(--cr-accent-to))';
const NAV_SPRING = { type: 'spring' as const, stiffness: 380, damping: 32 };

const MANAGE_SECTION_ICONS: Record<ClassroomTabSection, typeof LayoutGrid> = {
  seating: LayoutGrid,
  behavior: BookOpenCheck,
  'room-display': Monitor,
  raffle: Dices,
};

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

type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: typeof Home;
  active: boolean;
};

function ClassroomRealmNav({
  schoolId,
  variant,
}: {
  schoolId: string;
  variant: 'sidebar' | 'mobile';
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { loginState } = useAppContext();
  const { settings } = useSettings();
  const base = `/${schoolId.trim().toLowerCase()}/classroom-realm`;
  const role = loginState === 'teacher' ? 'teacher' : 'admin';
  const manageSections = useMemo(() => buildClassroomSections(settings, role), [settings, role]);
  const manageSection = searchParams.get('section')?.trim() || 'seating';
  const onManage = Boolean(pathname?.startsWith(`${base}/manage`));

  const pathActive = (segment: '' | 'setup' | 'live' | 'class-screen') => {
    if (segment === '') return pathname === base || pathname === `${base}/`;
    return Boolean(pathname?.startsWith(`${base}/${segment}`));
  };

  const topItems: NavItem[] = [
    { id: 'home', label: 'Home', href: classroomRealmHref(schoolId, ''), icon: Home, active: pathActive('') },
    { id: 'setup', label: 'Set up', href: classroomRealmHref(schoolId, 'setup'), icon: Settings2, active: pathActive('setup') },
  ];

  const manageItems: NavItem[] = manageSections.map((section) => ({
    id: `manage-${section}`,
    label: CLASSROOM_SECTION_LABELS[section],
    href: classroomRealmManageHref(schoolId, section),
    icon: MANAGE_SECTION_ICONS[section],
    active: onManage && (manageSection === section || (!searchParams.get('section') && section === 'seating')),
  }));

  const displayItems: NavItem[] = [
    {
      id: 'live',
      label: CLASSROOM_LIVE_MONITOR_NAV_LABEL,
      href: classroomRealmHref(schoolId, 'live'),
      icon: LayoutGrid,
      active: pathActive('live'),
    },
    {
      id: 'screen',
      label: 'Class screen',
      href: classroomRealmHref(schoolId, 'class-screen'),
      icon: Tv,
      active: pathActive('class-screen'),
    },
  ];

  const renderLink = (item: NavItem) => {
    const Icon = item.icon;
    if (variant === 'mobile') {
      return (
        <Link
          key={item.id}
          href={item.href}
          className={cn(
            'relative shrink-0 rounded-lg p-2',
            item.active ? 'text-white' : 'text-white/60 hover:bg-white/10 hover:text-white',
          )}
          aria-label={item.label}
          aria-current={item.active ? 'page' : undefined}
        >
          {item.active ? (
            <motion.span
              layoutId="classroom-realm-nav-active-mobile"
              className="absolute inset-0 rounded-lg bg-white/12"
              transition={NAV_SPRING}
            />
          ) : null}
          <Icon className="relative z-10 h-4 w-4" />
        </Link>
      );
    }

    return (
      <Link
        key={item.id}
        href={item.href}
        className={cn(
          'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
          item.active ? 'text-white' : 'text-white/55 hover:bg-white/6 hover:text-white/90',
        )}
        aria-current={item.active ? 'page' : undefined}
      >
        {item.active ? (
          <motion.span
            layoutId="classroom-realm-nav-active"
            className="absolute inset-0 rounded-xl bg-white/12 shadow-inner"
            transition={NAV_SPRING}
          />
        ) : null}
        <Icon className="relative z-10 h-4 w-4 shrink-0" aria-hidden />
        <span className="relative z-10">{item.label}</span>
      </Link>
    );
  };

  if (variant === 'mobile') {
    return (
      <div className="flex gap-1 overflow-x-auto">
        {topItems.map(renderLink)}
        {manageItems.map(renderLink)}
        {displayItems.map(renderLink)}
      </div>
    );
  }

  return (
    <nav className="flex flex-1 flex-col gap-1">
      {topItems.map(renderLink)}
      <p className="mb-1 mt-4 px-3 text-[10px] font-black uppercase tracking-[0.28em] text-white/35">
        Manage
      </p>
      {manageItems.map(renderLink)}
      <p className="mb-1 mt-4 px-3 text-[10px] font-black uppercase tracking-[0.28em] text-white/35">
        Display
      </p>
      {displayItems.map(renderLink)}
    </nav>
  );
}

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

        <Suspense fallback={<div className="flex-1" />}>
          <ClassroomRealmNav schoolId={schoolId} variant="sidebar" />
        </Suspense>

        <Link
          href={schoolPortalHref(schoolId)}
          className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-white/50 transition-colors hover:border-white/20 hover:text-white/80"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          Back to LevelUp portal
        </Link>
      </aside>

      <div className="relative z-10 flex min-h-dvh min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-white/10 bg-black/20 px-4 py-3 backdrop-blur-md lg:hidden">
          <p className="shrink-0 font-serif text-lg font-bold text-white">Classroom</p>
          <Suspense fallback={null}>
            <ClassroomRealmNav schoolId={schoolId} variant="mobile" />
          </Suspense>
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
