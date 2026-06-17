'use client';

import Link from 'next/link';
import { HeartHandshake, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { schoolPortalHref } from '@/lib/sss/sssPublicUrl';
import { SSS_CONTENT_PANE_CLASS, SSS_LAYOUT_PANE_CLASS, SSS_MAIN_PANE_CLASS, SSS_MAIN_ZOOM, SSS_SIDEBAR_PANE_CLASS } from '@/lib/sss/sssTheme';

export function SssPortalShell({
  schoolId,
  schoolName,
  userName,
  onLogout,
  children,
}: {
  schoolId: string;
  schoolName?: string;
  userName?: string | null;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const displaySchool = schoolName?.trim() || schoolId;

  return (
    <div className="min-h-screen bg-[#f5f3ff] dark:bg-slate-950">
      <div className="flex min-h-screen justify-center sm:px-6 lg:px-10 sm:py-6">
        <div className={cn(SSS_LAYOUT_PANE_CLASS, 'flex min-h-screen w-full max-w-6xl overflow-hidden rounded-2xl border border-violet-200/90 shadow-xl dark:border-violet-900/60 lg:flex-row')}>
          <aside className={cn(SSS_SIDEBAR_PANE_CLASS, 'fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-[#4c1d95] text-white lg:static', mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0')}>
            <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-400/20"><HeartHandshake className="h-6 w-6" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-200/80">Student Special Services</p>
                <p className="truncate text-sm font-semibold">{displaySchool}</p>
              </div>
              <Button type="button" variant="ghost" size="icon" className="lg:hidden text-white/80" onClick={() => setMobileOpen(false)}><X className="h-5 w-5" /></Button>
            </div>
            <div className="flex-1 p-4 text-sm text-violet-100/80">Student database — search roster, providers, and family contacts.</div>
            <div className="border-t border-white/10 p-4 space-y-2">
              {userName ? <p className="text-xs text-violet-100/70">Signed in as {userName}</p> : null}
              <Button type="button" variant="ghost" className="w-full justify-start gap-2 rounded-xl text-violet-100" onClick={onLogout}><LogOut className="h-4 w-4" />Sign out</Button>
              <Button asChild variant="ghost" className="w-full justify-start rounded-xl text-xs text-violet-100/80 h-9"><Link href={schoolPortalHref(schoolId)}>Back to portal</Link></Button>
            </div>
          </aside>
          <div className={cn(SSS_MAIN_PANE_CLASS, 'flex flex-1 flex-col')} style={{ zoom: SSS_MAIN_ZOOM }}>
            <header className="flex items-center gap-3 border-b px-4 py-4 lg:px-6">
              <Button type="button" variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}><Menu className="h-5 w-5" /></Button>
              <div>
                <h1 className="text-lg font-bold">Student database</h1>
                <p className="text-xs text-muted-foreground">Browse and manage special services records</p>
              </div>
            </header>
            <main className={cn(SSS_CONTENT_PANE_CLASS, 'flex-1 overflow-y-auto p-4 lg:p-6')}>{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}
