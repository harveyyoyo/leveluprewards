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
  Palette,
  Tv,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { classroomRealmHref, classroomRealmManageHref } from '@/lib/classroomRealmUrl';
import { schoolPortalHref } from '@/lib/officePublicUrl';
import {
  classroomRealmThemeVars,
  resolveClassroomRealmTheme,
} from '@/lib/classroom/classroomRealmThemes';
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

function schoolLabel(schoolId: string) {
  const raw = schoolId.trim();
  if (!raw) return 'LevelUp';
  return raw.charAt(0).toUpperCase() + raw.slice(1).replace(/[-_]/g, ' ');
}

export function useClassroomRealmTheme(active: boolean) {
  const { settings } = useSettings();
  const themeId = resolveClassroomRealmTheme(settings.classroomRealmTheme).id;

  useEffect(() => {
    const el = document.documentElement;
    el.setAttribute('data-classroom-realm', '');
    if (!active) {
      return () => el.removeAttribute('data-classroom-realm');
    }
    const vars = classroomRealmThemeVars(resolveClassroomRealmTheme(themeId));
    for (const [key, value] of Object.entries(vars)) el.style.setProperty(key, value);
    return () => {
      el.removeAttribute('data-classroom-realm');
      for (const key of Object.keys(vars)) el.style.removeProperty(key);
    };
  }, [active, themeId]);
}

type NavItem = {
  id: string;
  label: string;
  shortLabel?: string;
  href: string;
  icon: typeof Home;
  active: boolean;
};

function ClassroomRealmNav({
  schoolId,
  variant,
}: {
  schoolId: string;
  variant: 'sidebar' | 'dock';
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

  const teachItems: NavItem[] = [
    { id: 'home', label: 'Home', href: classroomRealmHref(schoolId, ''), icon: Home, active: pathActive('') },
    {
      id: 'live',
      label: CLASSROOM_LIVE_MONITOR_NAV_LABEL,
      shortLabel: 'Live',
      href: classroomRealmHref(schoolId, 'live'),
      icon: LayoutGrid,
      active: pathActive('live'),
    },
    {
      id: 'screen',
      label: 'Class screen',
      shortLabel: 'Screen',
      href: classroomRealmHref(schoolId, 'class-screen'),
      icon: Tv,
      active: pathActive('class-screen'),
    },
  ];

  const manageItems: NavItem[] = manageSections.map((section) => ({
    id: `manage-${section}`,
    label: CLASSROOM_SECTION_LABELS[section],
    href: classroomRealmManageHref(schoolId, section),
    icon: MANAGE_SECTION_ICONS[section],
    active: onManage && (manageSection === section || (!searchParams.get('section') && section === 'seating')),
  }));

  const lookItems: NavItem[] = [
    {
      id: 'setup',
      label: 'Change look',
      shortLabel: 'Look',
      href: classroomRealmHref(schoolId, 'setup'),
      icon: Palette,
      active: pathActive('setup'),
    },
  ];

  const dockItems: NavItem[] = [
    teachItems[0],
    teachItems[1],
    teachItems[2],
    {
      id: 'manage',
      label: 'Manage',
      href: classroomRealmManageHref(schoolId, 'seating'),
      icon: BookOpenCheck,
      active: onManage,
    },
    lookItems[0],
  ];

  const renderSidebarLink = (item: NavItem) => {
    const Icon = item.icon;
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

  if (variant === 'dock') {
    return (
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-white/10 bg-black/60 backdrop-blur-xl lg:hidden"
        aria-label="Classroom navigation"
      >
        {dockItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              className="relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-center"
              aria-label={item.label}
              aria-current={item.active ? 'page' : undefined}
            >
              {item.active ? (
                <motion.span
                  layoutId="classroom-realm-nav-active-mobile"
                  className="absolute inset-x-2 inset-y-1 rounded-xl bg-white/10"
                  transition={NAV_SPRING}
                />
              ) : null}
              <Icon
                className="relative z-10 h-5 w-5 shrink-0"
                style={{ color: item.active ? 'var(--cr-accent-text)' : undefined }}
                aria-hidden
              />
              <span
                className="relative z-10 text-[9px] font-bold uppercase tracking-wider leading-none"
                style={{
                  color: item.active ? 'var(--cr-accent-text)' : 'rgba(255,255,255,0.45)',
                }}
              >
                {item.shortLabel ?? item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="flex flex-1 flex-col gap-1">
      <p className="mb-1 px-3 text-[10px] font-black uppercase tracking-[0.28em] text-white/35">
        Teach
      </p>
      {teachItems.map(renderSidebarLink)}
      <p className="mb-1 mt-4 px-3 text-[10px] font-black uppercase tracking-[0.28em] text-white/35">
        Manage
      </p>
      {manageItems.map(renderSidebarLink)}
      <p className="mb-1 mt-4 px-3 text-[10px] font-black uppercase tracking-[0.28em] text-white/35">
        Change look
      </p>
      {lookItems.map(renderSidebarLink)}
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
      <div className="classroom-realm-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden />
      <div className="classroom-realm-grain pointer-events-none absolute inset-0" aria-hidden />
      <div className="classroom-realm-dust pointer-events-none absolute inset-0" aria-hidden />

      <aside className="relative z-20 hidden w-60 shrink-0 flex-col border-r border-white/10 bg-black/25 p-4 backdrop-blur-md lg:flex">
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
              {schoolLabel(schoolId)}
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
          <p className="font-serif text-lg font-bold text-white">Classroom</p>
          <Link
            href={classroomRealmHref(schoolId, 'setup')}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-xs font-bold"
            style={{ color: 'var(--cr-accent-text)' }}
          >
            <Palette className="h-3.5 w-3.5" aria-hidden />
            Change look
          </Link>
        </header>
        <main className="flex-1 overflow-auto pb-20 lg:pb-0">{children}</main>
        <Suspense fallback={null}>
          <ClassroomRealmNav schoolId={schoolId} variant="dock" />
        </Suspense>
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
      className="mx-auto flex max-w-4xl flex-col items-center px-6 py-14 text-center sm:py-20"
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
