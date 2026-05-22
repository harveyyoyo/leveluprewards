'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { OFFICE_NAV_ITEMS, officeNavIdFromPath } from '@/lib/office/officeNav';
import { useOfficeTerm } from '@/lib/office/useOfficeTerm';
import {
  OFFICE_MAIN_PANE_CLASS,
  OFFICE_MAIN_ZOOM,
  OFFICE_SIDEBAR_PANE_CLASS,
} from '@/lib/office/officeTheme';

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
  const activeNav = OFFICE_NAV_ITEMS.find((i) => i.id === activeId);
  const { term: workingTerm } = useOfficeTerm(schoolId);

  return (
    <div className="min-h-screen bg-[#f4f7f9] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="flex min-h-screen">
        <aside
          className={cn(
            OFFICE_SIDEBAR_PANE_CLASS,
            'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-teal-900/10 bg-[#0f3d4a] text-white shadow-xl transition-transform lg:static lg:translate-x-0',
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

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {OFFICE_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = item.id === activeId;
              return (
                <Link
                  key={item.id}
                  href={item.href(schoolId)}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-start gap-3 rounded-xl px-3 py-3 transition-colors',
                    active ? 'bg-white/15 text-white shadow-inner' : 'text-teal-100/90 hover:bg-white/8',
                  )}
                >
                  <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', active ? 'text-teal-200' : 'text-teal-300/70')} />
                  <span>
                    <span className="block text-base font-semibold leading-snug">{item.label}</span>
                    <span className="block text-xs leading-snug text-teal-100/60">{item.description}</span>
                  </span>
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
            <Link
              href={`/${schoolId}/portal`}
              className="block rounded-lg px-3 py-2 text-center text-xs text-teal-200/80 hover:bg-white/5"
            >
              Back to main portal
            </Link>
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
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
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
              <p className="text-xs text-muted-foreground truncate">
                {activeNav?.description ?? 'Grades & billing'}
                {workingTerm ? ` · Term ${workingTerm}` : ''}
              </p>
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
