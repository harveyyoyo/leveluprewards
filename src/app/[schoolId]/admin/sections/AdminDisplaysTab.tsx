'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { collection, query } from 'firebase/firestore';
import {
  ArrowUpRight,
  LayoutGrid,
  Megaphone,
  Monitor,
  Sparkles,
  Tag,
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import {
  StaffPortalSectionCard,
  StaffPortalSectionCardContent,
  StaffPortalSectionCardHeader,
  StaffPortalSectionCardTitle,
} from '@/components/staff/StaffPortalSection';
import { Button } from '@/components/ui/button';
import { Helper } from '@/components/ui/helper';
import { TabWalkthroughHeaderAction } from '@/components/tabWalkthrough/TabWalkthroughContext';
import { ContentSectionTreeNav } from '@/components/ui/content-section-tree-nav';
import { LiveScreenPreview } from '@/components/admin/LiveScreenPreview';
import { cn } from '@/lib/utils';
import type { Settings } from '@/components/providers/SettingsProvider';
import type { BulletinBoardIncentiveRecord } from '@/lib/bulletinBoard';
import {
  buildBulletinDisplayHref,
  buildSmartScreenDisplayHref,
} from '@/lib/displays/displayRoutes';
import { SmartScreenSettingsPanel } from './displays/SmartScreenSettingsPanel';
import { BulletinSettingsPanel } from './displays/BulletinSettingsPanel';
import { BulletinIncentivesPanel } from './displays/BulletinIncentivesPanel';
import { useSchoolProfile } from '@/hooks/useSchoolProfile';

type DisplaysSection = 'overview' | 'smart-screen' | 'bulletin' | 'incentives';

type AdminDisplaysTabProps = {
  schoolId: string;
  schoolLogoUrl: string | null;
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
};

export function AdminDisplaysTab({
  schoolId,
  settings,
  updateSettings,
}: AdminDisplaysTabProps) {
  const firestore = useFirestore();
  const { isJewishOrthodox } = useSchoolProfile();
  const [section, setSection] = useState<DisplaysSection>('overview');
  const [previewView, setPreviewView] = useState<'smart' | 'bulletin'>('smart');

  const incentivesQuery = useMemoFirebase(
    () => (schoolId ? query(collection(firestore, 'schools', schoolId, 'bulletinBoardIncentives')) : null),
    [firestore, schoolId],
  );
  const { data: incentives } = useCollection<BulletinBoardIncentiveRecord>(incentivesQuery);

  const sortedIncentives = useMemo(() => {
    if (!incentives?.length) return [];
    return [...incentives].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }, [incentives]);

  const bulletinEnabled = settings.bulletinEnabled !== false;
  const smartScreenEnabled = !!settings.smartScreenEnabled;
  const activeIncentiveCount = sortedIncentives.filter((item) => item.active !== false).length;

  const smartHref = useMemo(
    () =>
      buildSmartScreenDisplayHref(schoolId, {
        fullscreen: true,
        layout: (settings.smartScreenLayout as string) || 'mirror',
        theme: (settings.smartScreenTheme as string) || 'midnight',
        zip: settings.smartScreenLocationZip,
      }),
    [schoolId, settings.smartScreenLayout, settings.smartScreenLocationZip, settings.smartScreenTheme],
  );

  const bulletinHref = useMemo(() => buildBulletinDisplayHref(schoolId, { fullscreen: true }), [schoolId]);
  const previewHref = previewView === 'smart' ? smartHref : bulletinHref;

  return (
    <StaffPortalSectionCard className="w-full overflow-hidden">
      <StaffPortalSectionCardHeader className="flex flex-row items-start justify-between gap-4 py-6">
        <div className="min-w-0 space-y-1">
          <Helper content="Hallway monitors, lobby screens, and bulletin boards — configure both display types from one place. Open the full-screen links on any TV or projector.">
            <StaffPortalSectionCardTitle className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-primary" />
              Displays
            </StaffPortalSectionCardTitle>
          </Helper>
          <p className="text-xs text-muted-foreground">
            Smart Screen for live dashboards · Bulletin board for incentives and celebrations
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <TabWalkthroughHeaderAction />
          <Button asChild variant="outline" className="gap-2 rounded-xl">
            <Link href={smartHref} target="_blank" rel="noopener noreferrer">
              <Monitor className="h-4 w-4" aria-hidden />
              Smart Screen
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2 rounded-xl">
            <Link href={bulletinHref} target="_blank" rel="noopener noreferrer">
              <Megaphone className="h-4 w-4" aria-hidden />
              Bulletin
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </StaffPortalSectionCardHeader>

      <StaffPortalSectionCardContent className="space-y-6">
        <ContentSectionTreeNav
          branchLabel="Displays"
          fullWidth
          items={[
            { id: 'overview', label: 'Overview', icon: LayoutGrid },
            { id: 'smart-screen', label: 'Smart Screen', icon: Monitor, badge: smartScreenEnabled ? 'On' : 'Off' },
            { id: 'bulletin', label: 'Bulletin board', icon: Megaphone, badge: bulletinEnabled ? 'On' : 'Off' },
            { id: 'incentives', label: 'Incentives', icon: Tag, badge: activeIncentiveCount },
          ]}
          value={section}
          onValueChange={(id) => setSection(id as DisplaysSection)}
          aria-label="Displays sections"
        />

        {section === 'overview' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <button
                type="button"
                onClick={() => setSection('smart-screen')}
                className={cn(
                  'group rounded-2xl border p-5 text-left transition-all hover:border-primary/35 hover:shadow-lg',
                  smartScreenEnabled ? 'bg-primary/5 border-primary/20' : 'bg-muted/10',
                )}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-black">
                    <Monitor className="h-5 w-5 text-primary" />
                    Smart Screen
                  </span>
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide',
                      smartScreenEnabled
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {smartScreenEnabled ? 'Enabled' : 'Off'}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Clock, weather, leaders, houses, rewards, and bulletin items on one live dashboard for hallways and gyms.
                </p>
                <p className="mt-3 text-xs font-bold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  Configure Smart Screen →
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSection('bulletin')}
                className={cn(
                  'group rounded-2xl border p-5 text-left transition-all hover:border-primary/35 hover:shadow-lg',
                  bulletinEnabled ? 'bg-primary/5 border-primary/20' : 'bg-muted/10',
                )}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-black">
                    <Megaphone className="h-5 w-5 text-primary" />
                    Bulletin board
                  </span>
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide',
                      bulletinEnabled
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {bulletinEnabled ? 'Enabled' : 'Off'}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Focused board for point-earning incentives and celebration posts — great for office TVs and staff areas.
                </p>
                <p className="mt-3 text-xs font-bold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  Configure bulletin →
                </p>
              </button>
            </div>

            <div className="rounded-2xl border bg-muted/10 p-4">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold">Live preview</p>
                  <p className="text-[11px] text-muted-foreground">Switch between display types without leaving this tab.</p>
                </div>
                <div className="flex items-center gap-1 rounded-xl border bg-muted/40 p-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className={cn(
                      'h-9 rounded-lg px-4 text-xs font-black uppercase tracking-wide',
                      previewView === 'smart'
                        ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                        : 'text-muted-foreground',
                    )}
                    onClick={() => setPreviewView('smart')}
                  >
                    Smart Screen
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className={cn(
                      'h-9 rounded-lg px-4 text-xs font-black uppercase tracking-wide',
                      previewView === 'bulletin'
                        ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                        : 'text-muted-foreground',
                    )}
                    onClick={() => setPreviewView('bulletin')}
                  >
                    Bulletin
                  </Button>
                </div>
              </div>

              {(previewView === 'smart' && smartScreenEnabled) || (previewView === 'bulletin' && bulletinEnabled) ? (
                <LiveScreenPreview
                  href={previewHref}
                  title={previewView === 'smart' ? 'Smart Screen preview' : 'Bulletin board preview'}
                  viewport="fullscreen"
                  className="max-w-none"
                />
              ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center opacity-70">
                  <Sparkles className="mb-2 h-8 w-8 animate-pulse text-muted-foreground" />
                  <p className="text-sm font-bold">
                    {previewView === 'smart' ? 'Smart Screen is off' : 'Bulletin board is off'}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3 rounded-xl"
                    onClick={() => setSection(previewView === 'smart' ? 'smart-screen' : 'bulletin')}
                  >
                    Turn on in settings
                  </Button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSection('incentives')}
              className="flex w-full items-center justify-between gap-3 rounded-2xl border bg-background px-4 py-3 text-left transition-colors hover:border-primary/25 hover:bg-muted/20"
            >
              <span className="flex items-center gap-2 text-sm font-bold">
                <Tag className="h-4 w-4 text-primary" />
                Manage incentives
              </span>
              <span className="rounded-full border bg-muted/30 px-2.5 py-1 text-xs font-black">
                {activeIncentiveCount} active
              </span>
            </button>
          </div>
        ) : null}

        {section === 'smart-screen' ? (
          <SmartScreenSettingsPanel schoolId={schoolId} settings={settings} updateSettings={updateSettings} />
        ) : null}

        {section === 'bulletin' ? (
          <BulletinSettingsPanel
            schoolId={schoolId}
            settings={settings}
            updateSettings={updateSettings}
            sortedIncentives={sortedIncentives}
            isJewishOrthodoxSchool={isJewishOrthodox}
          />
        ) : null}

        {section === 'incentives' ? <BulletinIncentivesPanel schoolId={schoolId} /> : null}
      </StaffPortalSectionCardContent>
    </StaffPortalSectionCard>
  );
}
