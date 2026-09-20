'use client';

import Link from 'next/link';
import {
  Castle,
  Compass,
  Home,
  Plus,
  Settings,
  Sparkles,
  Trophy,
  Users,
  Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import LevelUpLogoMark from '@/components/logos/Logo';
import { schoolPortalHref } from '@/lib/officePublicUrl';
import { Button } from '@/components/ui/button';

export type HousesHeaderTab = 'teams' | 'rosters' | 'ceremony' | 'hall-of-fame' | 'settings';

export const HOUSES_NAV_TABS = [
  { id: 'teams' as const, label: 'Teams', icon: Castle },
  { id: 'rosters' as const, label: 'Rosters', icon: Users },
  { id: 'ceremony' as const, label: 'Ceremony', icon: Sparkles },
  { id: 'hall-of-fame' as const, label: 'Hall of Fame', icon: Trophy },
] as const;

export interface HousesHeaderBarProps {
  schoolId: string;
  schoolName: string;
  activeTab: HousesHeaderTab;
  onNavigate: (tab: HousesHeaderTab) => void;
  onHome: () => void;
  onOpenAddHouse: () => void;
  onOpenSetupWizard: () => void;
  onOpenSettings: () => void;
  onOpenGuide?: () => void;
  isStaff?: boolean;
}

export function HousesHeaderBar({
  schoolId,
  schoolName,
  activeTab,
  onNavigate,
  onHome,
  onOpenAddHouse,
  onOpenSetupWizard,
  onOpenSettings,
  onOpenGuide,
  isStaff = true,
}: HousesHeaderBarProps) {
  const portalHref = schoolPortalHref(schoolId);

  return (
    <header className="relative z-20 w-full border-b hr-chrome backdrop-blur-md px-3 sm:px-6 py-2.5 sm:py-3 transition-colors">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 sm:gap-4">
        {/* Left: Logo & School Identity */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link
            href={portalHref}
            title="Back to LevelUp Portal"
            className="group flex items-center shrink-0"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl border hr-border hr-soft p-1 shadow-sm transition-transform group-hover:-translate-y-0.5">
              <LevelUpLogoMark className="h-full w-full" />
            </span>
          </Link>

          <Link
            href={portalHref}
            title="Back to LevelUp Portal"
            className="hidden sm:flex flex-col leading-tight min-w-0"
          >
            <span className="font-bold text-sm sm:text-base hr-fg truncate max-w-[180px] lg:max-w-xs">
              {schoolName || 'School'}
            </span>
            <span
              className="text-[10px] font-black uppercase tracking-[0.28em]"
              style={{ color: 'var(--hr-accent-text, #fde68a)' }}
            >
              HOUSES
            </span>
          </Link>

          <button
            type="button"
            onClick={onHome}
            title="Houses Home"
            aria-label="Houses Home"
            className={cn(
              'flex items-center justify-center h-8 w-8 rounded-lg hr-nav-idle hr-muted hr-soft transition-colors',
              activeTab === 'teams' && 'hr-fg hr-soft-strong',
            )}
          >
            <Home className="h-4 w-4" />
          </button>
        </div>

        {/* Center: Main Navigation Tabs */}
        <nav
          className="flex min-w-0 flex-1 items-center justify-center gap-1 sm:gap-2 overflow-x-auto py-0.5"
          aria-label="Houses sections"
        >
          {HOUSES_NAV_TABS.map(({ id, label, icon: TabIcon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onNavigate(id)}
                title={label}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold tracking-tight transition-all shrink-0',
                  active
                    ? 'hr-soft-strong hr-fg shadow-sm ring-1'
                    : 'hr-nav-idle hr-muted hr-soft',
                )}
                style={
                  active
                    ? {
                        borderColor: 'var(--hr-border)',
                        backgroundImage:
                          'linear-gradient(135deg, color-mix(in srgb, var(--hr-fg) 10%, transparent), color-mix(in srgb, var(--hr-fg) 4%, transparent))',
                      }
                    : undefined
                }
              >
                <TabIcon
                  className="h-4 w-4 shrink-0"
                  style={active ? { color: 'var(--hr-accent-text, #fde68a)' } : undefined}
                />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: Guide, quick actions & Settings */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {onOpenGuide ? (
            <button
              type="button"
              onClick={onOpenGuide}
              title="Houses Guide"
              aria-label="Houses Guide"
              className="h-8 px-3 rounded-full border hr-border hr-soft flex items-center gap-1.5 shadow-sm transition-all hover:-translate-y-0.5 text-xs font-bold shrink-0 hr-fg"
            >
              <Compass className="h-4 w-4" style={{ color: 'var(--hr-accent-text, #fde68a)' }} />
              <span className="hidden sm:inline">Guide</span>
            </button>
          ) : null}

          {isStaff ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenSetupWizard}
                className="hidden md:inline-flex h-8 rounded-full hr-border hr-soft px-3 text-xs font-semibold hr-fg hover:opacity-90 shadow-xs"
              >
                <Wand2 className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
                <span>AI Setup</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={onOpenAddHouse}
                className="h-8 rounded-full border-0 px-3 text-xs font-bold shadow-md transition-transform hover:-translate-y-0.5"
                style={{
                  backgroundImage:
                    'linear-gradient(135deg, var(--hr-accent-from, #fbbf24), var(--hr-accent-to, #7c3aed))',
                  color: 'var(--hr-on-accent, #1a0f2e)',
                }}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                <span className="hidden sm:inline">Add House</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </>
          ) : null}

          <button
            type="button"
            onClick={onOpenSettings}
            title="Theme & Settings"
            aria-label="Theme & Settings"
            className={cn(
              'grid h-8 w-8 place-items-center rounded-full border hr-border hr-soft hr-nav-idle hr-muted shadow-sm transition-all hover:-translate-y-0.5',
              activeTab === 'settings' && 'hr-fg hr-soft-strong ring-1',
            )}
            style={activeTab === 'settings' ? { borderColor: 'var(--hr-border)' } : undefined}
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
