'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Building2, LogOut, Menu, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getOfficeNavItems, officeNavIdFromPath } from '@/lib/office/officeNav';
import { useOfficeHiddenSections } from '@/lib/office/useOfficeHiddenSections';
import { useOfficeTerm } from '@/lib/office/useOfficeTerm';
import { useOfficeLayoutMode } from '@/lib/office/useOfficeLayoutMode';
import { useCurrentOfficeStaffAccess } from '@/lib/office/useCurrentOfficeStaffAccess';
import { useOfficePortalChrome } from '@/components/office/OfficePortalChrome';
import { OfficeUniversalSearch } from '@/components/office/OfficeUniversalSearch';
import { OfficeInterfaceSettingsSheet } from '@/components/office/OfficeInterfaceSettingsSheet';
import { OfficeAiHelpButton } from '@/components/office/OfficeAiHelpButton';
import { OfficePageTip } from '@/components/office/OfficePageTip';
import {
  OFFICE_CONTENT_PANE_CLASS,
  OFFICE_LAYOUT_PANE_CLASS,
  OFFICE_MAIN_PANE_CLASS,
  OFFICE_MAIN_ZOOM,
  OFFICE_SIDEBAR_PANE_CLASS,
} from '@/lib/office/officeTheme';
import { OfficeEntityNavProvider } from '@/components/office/OfficeEntityNavProvider';

function getInitials(name: string | null | undefined): string {
  if (!name?.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase();
}

type OfficePortalShellProps = {
  schoolId: string;
  schoolName?: string;
  userName?: string | null;
  onLogout: () => void;
  children: React.ReactNode;
};

export function OfficePortalShell({ schoolId, schoolName, userName, onLogout, children }: OfficePortalShellProps) {
  const pathname = usePathname();
  const activeId = officeNavIdFromPath(pathname, schoolId);
  const [mobileOpen, setMobileOpen] = useState(false);

  const displaySchool = schoolName?.trim() || schoolId;
  const { settings, marksLabels } = useOfficePortalChrome();
  const { allowedSections } = useCurrentOfficeStaffAccess(schoolId, userName);
  const navItems = useMemo(() => {
    const all = getOfficeNavItems(settings);
    if (!allowedSections) return all;
    return all.filter((item) => item.id === 'home' || allowedSections.includes(item.id));
  }, [settings, allowedSections]);
  const activeNav = navItems.find((i) => i.id === activeId);
  const { hidden: hiddenSections } = useOfficeHiddenSections();
  // Sections hidden in Interface drop out of the menu only; the current page always stays listed.
  const menuItems = useMemo(
    () => navItems.filter((item) => item.id === 'home' || item.id === activeId || !hiddenSections.includes(item.id)),
    [navItems, hiddenSections, activeId],
  );
  const router = useRouter();

  useEffect(() => {
    if (activeId !== 'home' && !navItems.some((i) => i.id === activeId)) {
      router.replace(navItems[0]?.href(schoolId) ?? `/${schoolId}/office`);
    }
  }, [activeId, navItems, router, schoolId]);
  const { term: workingTerm } = useOfficeTerm(schoolId);
  const { isWide } = useOfficeLayoutMode();

  return (
    <div
      className={cn(
        'min-h-screen text-slate-900 dark:text-slate-100',
        isWide ? 'bg-[#f4f7f9] dark:bg-slate-950' : 'bg-[#e8edf0] dark:bg-slate-950',
      )}
    >
      <div
        className={cn(
          // `lg:h-screen` here (not just `min-h-screen`) matters: this element also carries the
          // `sm:py-6` padding below. If only its *child* were pinned to exactly 100vh while this
          // parent had no height of its own, the padding would add on top of that 100vh — an
          // invisible few-pixel overflow that made the sidebar think it needed to scroll even
          // when everything visibly fit.
          'flex min-h-screen lg:h-screen',
          !isWide && 'justify-center px-0 sm:px-6 lg:px-10 sm:py-6',
        )}
      >
        <div
          className={cn(
            OFFICE_LAYOUT_PANE_CLASS,
            // `lg:overflow-y-auto` + `lg:h-full` (100% of the now correctly-sized parent above,
            // padding already accounted for) make this the actual scrolling container on
            // desktop (instead of the window), which is what lets the sidebar below stick to
            // the viewport via `position: sticky` rather than stretching with the page.
            'relative flex min-h-screen w-full flex-col overflow-hidden bg-[#f4f7f9] lg:h-full lg:flex-row lg:overflow-y-auto dark:bg-slate-950',
            isWide
              ? 'max-w-none border-0 shadow-none'
              : 'max-w-5xl shadow-none sm:min-h-[calc(100vh-3rem)] sm:rounded-2xl sm:border sm:border-slate-200/90 sm:shadow-xl dark:sm:border-slate-800',
          )}
        >
        <aside
          className={cn(
            OFFICE_SIDEBAR_PANE_CLASS,
            // On desktop the sidebar is pinned to the viewport (sticky + its own height/scroll)
            // instead of stretching to match the main content's height — otherwise a long page
            // (e.g. a big student roster) drags the sidebar's own bottom section far below the
            // fold, leaving a blank gap where the nav used to be as you scroll.
            // Fixed height, no overflow of its own — the header and footer below always stay
            // put, and only the nav list (which has its own `overflow-y-auto`) scrolls if
            // there isn't room for every section.
            'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-teal-900/10 bg-[#0f3d4a] text-white shadow-xl transition-transform lg:sticky lg:top-0 lg:z-0 lg:h-screen lg:shrink-0 lg:translate-x-0',
            mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          )}
        >
          <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-400/20 text-teal-200">
              <Building2 className="h-6 w-6" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-200/80">School Office</p>
              <p className="truncate text-sm font-semibold">{displaySchool}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="ml-auto text-white/80 hover:bg-white/10 lg:hidden"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* `min-h-0` overrides a flex item's default `min-height: auto`, which otherwise
              forces this nav to grow to fit every item instead of shrinking and scrolling —
              the classic reason a flex child with `overflow-y-auto` refuses to actually scroll. */}
          <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = item.id === activeId;
              return (
                <Link
                  key={item.id}
                  href={item.href(schoolId)}
                  onClick={() => setMobileOpen(false)}
                  title={item.description}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold leading-snug transition-colors',
                    active ? 'bg-white/15 text-white shadow-inner' : 'text-teal-100/90 hover:bg-white/10',
                  )}
                >
                  <Icon className={cn('h-4.5 w-4.5 shrink-0', active ? 'text-teal-200' : 'text-teal-300/70')} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="space-y-2 border-t border-white/10 p-4">
            {userName ? (
              <div className="flex items-center gap-2.5 px-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-400/20 text-[10px] font-bold text-teal-200">
                  {getInitials(userName)}
                </div>
                <p className="truncate text-xs text-teal-100/70">{userName}</p>
              </div>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start gap-2 text-teal-100 hover:bg-white/10 hover:text-white"
              onClick={onLogout}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
            <p className="px-2 pt-1 text-[10px] text-teal-200/50 text-center">
              v{process.env.NEXT_PUBLIC_VERSION}
              {process.env.NEXT_PUBLIC_BUILD_TIME ? ` · ${process.env.NEXT_PUBLIC_BUILD_TIME}` : ''}
            </p>
          </div>
        </aside>

        {mobileOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            aria-label="Close menu overlay"
            onClick={() => setMobileOpen(false)}
          />
        ) : null}

        <div
          className={cn('flex min-w-0 flex-1 flex-col', OFFICE_MAIN_PANE_CLASS)}
          style={{ zoom: OFFICE_MAIN_ZOOM }}
        >
          <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
            <div
              className={cn(
                OFFICE_CONTENT_PANE_CLASS,
                'flex w-full items-center gap-3 px-4 py-3 sm:px-6',
              )}
            >
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                  {activeNav?.label ?? 'School Office'}
                </h1>
                <p className="truncate text-xs text-muted-foreground">
                  {activeNav?.description ?? `${marksLabels.section} & billing`}
                  {workingTerm ? ` · Term ${workingTerm}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <OfficeUniversalSearch />
                <OfficeInterfaceSettingsSheet schoolId={schoolId} />
                <OfficeAiHelpButton />
              </div>
            </div>
          </header>
          <main className="flex-1 py-4 sm:py-6">
            <div className={cn(OFFICE_CONTENT_PANE_CLASS, 'w-full px-4 sm:px-6')}>
              <OfficePageTip item={activeNav} />
              <OfficeEntityNavProvider schoolId={schoolId}>{children}</OfficeEntityNavProvider>
            </div>
          </main>
        </div>
        </div>
      </div>
    </div>
  );
}
