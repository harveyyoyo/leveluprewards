'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUpRight,
  Megaphone,
  Monitor,
  MonitorPlay,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/components/providers/SettingsProvider';
import {
  buildBulletinDisplayHref,
  buildHallOfFameDisplayHref,
  buildSmartScreenDisplayHref,
  displaysFeatureEnabled,
  type DisplayView,
} from '@/lib/displays/displayRoutes';
import { schoolPortalHref } from '@/lib/officePublicUrl';
import { SmartScreenSettingsPanel } from '@/app/[schoolId]/admin/sections/displays/SmartScreenSettingsPanel';
import { BulletinSettingsPanel } from '@/app/[schoolId]/admin/sections/displays/BulletinSettingsPanel';
import { HallOfFameSettingsPanel } from '@/app/[schoolId]/admin/sections/displays/HallOfFameSettingsPanel';
import { useSchoolProfile } from '@/hooks/useSchoolProfile';

type Template = {
  view: DisplayView;
  label: string;
  desc: string;
  icon: LucideIcon;
};

/** One Displays feature, three templates — Hall of Fame is the default/first. */
const TEMPLATES: readonly Template[] = [
  {
    view: 'hall-of-fame',
    label: 'Hall of Fame',
    desc: 'Podium and rankings for students, classes, houses, or school goals.',
    icon: Trophy,
  },
  {
    view: 'smart',
    label: 'Smart Screen',
    desc: 'Clock, weather, leaders, houses, rewards, and bulletin in one dashboard.',
    icon: Monitor,
  },
  {
    view: 'bulletin',
    label: 'Bulletin board',
    desc: 'Focused board for celebrations and point-earning incentives.',
    icon: Megaphone,
  },
];

export default function DisplaysRealmPage() {
  const params = useParams();
  const schoolId = String(params.schoolId || '');
  const { settings, updateSettings } = useSettings();
  const { isJewishOrthodox } = useSchoolProfile();
  const [template, setTemplate] = useState<DisplayView>('hall-of-fame');

  const hallOfFameHref = useMemo(() => buildHallOfFameDisplayHref(schoolId, { fullscreen: true }), [schoolId]);
  const smartHref = useMemo(() => buildSmartScreenDisplayHref(schoolId, { fullscreen: true }), [schoolId]);
  const bulletinHref = useMemo(() => buildBulletinDisplayHref(schoolId, { fullscreen: true }), [schoolId]);
  const templateHref =
    template === 'smart' ? smartHref : template === 'bulletin' ? bulletinHref : hallOfFameHref;

  if (!displaysFeatureEnabled(settings)) {
    return (
      <div className="flex h-full items-center justify-center overflow-y-auto bg-background p-8">
        <div className="max-w-md space-y-4 text-center">
          <MonitorPlay className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden />
          <p className="text-lg font-black tracking-tight">Displays is off for this school</p>
          <p className="text-sm text-muted-foreground">
            Turn on Displays in Settings to configure Hall of Fame, Smart Screen, and the bulletin board.
          </p>
          <Link
            href={schoolPortalHref(schoolId)}
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/35 hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back to LevelUp
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href={schoolPortalHref(schoolId)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/35 hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              LevelUp
            </Link>
            <div className="flex min-w-0 items-center gap-2">
              <MonitorPlay className="h-6 w-6 shrink-0 text-ring" aria-hidden />
              <h1 className="truncate text-xl font-black tracking-tight sm:text-2xl">Displays</h1>
            </div>
          </div>
          <Button asChild className="gap-2 rounded-xl">
            <Link href={templateHref} target="_blank" rel="noopener noreferrer">
              <MonitorPlay className="h-4 w-4" aria-hidden />
              Launch live display
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          One display, three templates for your hallway TVs. Pick a template to design it below, then switch
          between all three live from the display itself.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {TEMPLATES.map(({ view, label, desc, icon: Icon }) => {
            const active = template === view;
            return (
              <button
                key={view}
                type="button"
                onClick={() => setTemplate(view)}
                aria-pressed={active}
                className={cn(
                  'group rounded-2xl border p-4 text-left transition-all',
                  active
                    ? 'border-primary/60 bg-primary/5 shadow-md'
                    : 'bg-muted/10 hover:border-primary/35 hover:shadow-lg',
                )}
              >
                <div className="mb-2 flex items-center gap-2 text-sm font-black">
                  <Icon className={cn('h-5 w-5', active ? 'text-primary' : 'text-ring')} aria-hidden />
                  {label}
                  {view === 'hall-of-fame' ? (
                    <span className="rounded-full border border-primary/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                      Default
                    </span>
                  ) : null}
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">{desc}</p>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl border bg-muted/10 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Configuring <span className="font-bold text-foreground">{TEMPLATES.find((t) => t.view === template)?.label}</span>
          </p>
          <Button asChild variant="outline" size="sm" className="gap-2 rounded-xl">
            <Link href={templateHref} target="_blank" rel="noopener noreferrer">
              <ArrowUpRight className="h-4 w-4" aria-hidden />
              Open this template
            </Link>
          </Button>
        </div>

        {template === 'hall-of-fame' ? (
          <HallOfFameSettingsPanel schoolId={schoolId} settings={settings} updateSettings={updateSettings} />
        ) : template === 'smart' ? (
          <SmartScreenSettingsPanel
            schoolId={schoolId}
            settings={settings}
            updateSettings={updateSettings}
            isJewishOrthodoxSchool={isJewishOrthodox}
          />
        ) : (
          <BulletinSettingsPanel schoolId={schoolId} settings={settings} updateSettings={updateSettings} />
        )}
      </div>
    </div>
  );
}
