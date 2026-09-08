'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Copy,
  Megaphone,
  Monitor,
  MonitorPlay,
  Plus,
  Trash2,
  Trophy,
  Tv,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSettings, type SchoolDisplayProfile } from '@/components/providers/SettingsProvider';
import {
  buildDisplayHref,
  displaysFeatureEnabled,
  type DisplayView,
} from '@/lib/displays/displayRoutes';
import { schoolPortalHref } from '@/lib/officePublicUrl';
import { SmartScreenSettingsPanel } from '@/app/[schoolId]/admin/sections/displays/SmartScreenSettingsPanel';
import { BulletinSettingsPanel } from '@/app/[schoolId]/admin/sections/displays/BulletinSettingsPanel';
import { HallOfFameSettingsPanel } from '@/app/[schoolId]/admin/sections/displays/HallOfFameSettingsPanel';
import { useSchoolProfile } from '@/hooks/useSchoolProfile';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  const [activeDisplayId, setActiveDisplayId] = useState<string>('default');
  const [template, setTemplate] = useState<DisplayView>('hall-of-fame');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newDisplayTemplate, setNewDisplayTemplate] = useState<DisplayView>('hall-of-fame');
  const [copiedLink, setCopiedLink] = useState(false);

  // Combine custom displayProfiles with legacy smartScreenProfiles so no user data is lost
  const allDisplays = useMemo(() => {
    const list: { id: string; name: string; template: DisplayView; isCustom: boolean }[] = [
      { id: 'default', name: 'Main School Display', template, isCustom: false },
    ];

    const customProfiles = settings.displayProfiles || {};
    for (const [id, profile] of Object.entries(customProfiles)) {
      if (id && profile) {
        list.push({
          id,
          name: profile.name || 'Unnamed Display',
          template: profile.template || 'hall-of-fame',
          isCustom: true,
        });
      }
    }

    const legacySmartProfiles = settings.smartScreenProfiles || {};
    for (const [id, profile] of Object.entries(legacySmartProfiles)) {
      if (id && profile && !customProfiles[id]) {
        list.push({
          id,
          name: profile.name || 'Screen Version',
          template: 'smart',
          isCustom: true,
        });
      }
    }

    return list;
  }, [settings.displayProfiles, settings.smartScreenProfiles, template]);

  const activeDisplay = useMemo(
    () => allDisplays.find((d) => d.id === activeDisplayId) ?? allDisplays[0],
    [allDisplays, activeDisplayId],
  );

  const activeDisplayHref = useMemo(() => {
    const isCustom = activeDisplay?.isCustom;
    return buildDisplayHref(schoolId, template, {
      fullscreen: true,
      displayId: isCustom ? activeDisplay.id : undefined,
      screenProfileId: isCustom && template === 'smart' ? activeDisplay.id : undefined,
    });
  }, [activeDisplay, schoolId, template]);

  const handleSelectDisplay = (display: (typeof allDisplays)[number]) => {
    setActiveDisplayId(display.id);
    if (display.isCustom) {
      setTemplate(display.template);
    }
  };

  const handleCreateDisplay = () => {
    const trimmed = newDisplayName.trim();
    if (!trimmed) {
      toast({
        variant: 'destructive',
        title: 'Display name required',
        description: 'Please provide a name for this display (e.g. "Main Lobby TV").',
      });
      return;
    }

    const slug = trimmed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
    const newId = `${slug || 'display'}-${Date.now().toString(36)}`;

    const newProfile: SchoolDisplayProfile = {
      id: newId,
      name: trimmed,
      template: newDisplayTemplate,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      settings: {},
    };

    const nextProfiles = {
      ...(settings.displayProfiles || {}),
      [newId]: newProfile,
    };

    updateSettings({ displayProfiles: nextProfiles });
    setActiveDisplayId(newId);
    setTemplate(newDisplayTemplate);
    setNewDisplayName('');
    setIsCreateOpen(false);

    toast({
      title: 'Display Created',
      description: `"${trimmed}" is ready. Configure its template and launch URL below.`,
    });
  };

  const handleDeleteDisplay = (id: string, name: string) => {
    const nextProfiles = { ...(settings.displayProfiles || {}) };
    delete nextProfiles[id];
    const nextSmart = { ...(settings.smartScreenProfiles || {}) };
    delete nextSmart[id];

    updateSettings({ displayProfiles: nextProfiles, smartScreenProfiles: nextSmart });
    if (activeDisplayId === id) {
      setActiveDisplayId('default');
    }

    toast({
      title: 'Display Removed',
      description: `Deleted display "${name}".`,
    });
  };

  const handleCopyLink = () => {
    const fullUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}${activeDisplayHref}`
        : activeDisplayHref;

    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
      toast({
        title: 'Display Link Copied',
        description: 'Paste this URL on your TV browser or digital signage player.',
      });
    });
  };

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
        {/* Top Header: back link, title, and + New Display */}
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
              <MonitorPlay className="h-6 w-6 shrink-0 text-primary" aria-hidden />
              <h1 className="truncate text-xl font-black tracking-tight sm:text-2xl">Displays</h1>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="gap-2 rounded-xl bg-primary shadow-sm hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Create new display
          </Button>
        </div>

        {/* Displays Selector Card */}
        <div className="rounded-2xl border bg-card/60 p-4 shadow-sm backdrop-blur-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                Your Hallway Displays
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage multiple displays across your campus (hallways, cafeteria, lobby, gym).
              </p>
            </div>
            {activeDisplay.isCustom ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-xs text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                onClick={() => handleDeleteDisplay(activeDisplay.id, activeDisplay.name)}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Delete display
              </Button>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {allDisplays.map((disp) => {
              const isActive = disp.id === activeDisplayId;
              return (
                <button
                  key={disp.id}
                  type="button"
                  onClick={() => handleSelectDisplay(disp)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-all',
                    isActive
                      ? 'border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/40'
                      : 'border-border bg-background/80 text-muted-foreground hover:border-primary/40 hover:text-foreground',
                  )}
                >
                  <Tv className={cn('h-3.5 w-3.5', isActive ? 'text-primary' : 'text-muted-foreground')} />
                  <span>{disp.name}</span>
                  {disp.isCustom ? (
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-muted-foreground">
                      {disp.template === 'hall-of-fame'
                        ? 'Fame'
                        : disp.template === 'smart'
                          ? 'Smart'
                          : 'Bulletin'}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Quick TV Launch & Copy Bar for Active Display */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2.5">
            <div className="min-w-0">
              <span className="text-xs font-semibold text-muted-foreground">Active Display: </span>
              <span className="text-xs font-black text-foreground">{activeDisplay.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="h-8 gap-1.5 rounded-lg text-xs font-semibold"
              >
                {copiedLink ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy TV link
                  </>
                )}
              </Button>
              <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 rounded-lg text-xs font-semibold">
                <Link href={activeDisplayHref} target="_blank" rel="noopener noreferrer">
                  <MonitorPlay className="h-3.5 w-3.5" />
                  Launch full screen
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Templates Selection */}
        <div className="space-y-3">
          <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">
            Display Templates
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
                      ? 'border-primary bg-primary/5 shadow-md ring-1 ring-primary/30'
                      : 'bg-card/50 hover:border-primary/40 hover:shadow-md',
                  )}
                >
                  <div className="mb-2 flex items-center gap-2 text-sm font-black">
                    <Icon className={cn('h-5 w-5', active ? 'text-primary' : 'text-muted-foreground')} aria-hidden />
                    {label}
                    {view === 'hall-of-fame' ? (
                      <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                        Default
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">{desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Settings Panel for Selected Template */}
        {template === 'hall-of-fame' ? (
          <HallOfFameSettingsPanel schoolId={schoolId} settings={settings} updateSettings={updateSettings} />
        ) : template === 'smart' ? (
          <SmartScreenSettingsPanel
            schoolId={schoolId}
            settings={settings}
            updateSettings={updateSettings}
            isJewishOrthodoxSchool={isJewishOrthodox}
            activeProfileId={activeDisplay.id}
            hideInternalProfileSelector={true}
          />
        ) : (
          <BulletinSettingsPanel schoolId={schoolId} settings={settings} updateSettings={updateSettings} />
        )}
      </div>

      {/* Create New Display Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black tracking-tight">Create New Display</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add a dedicated display configuration for a hallway TV, cafeteria screen, or lobby kiosk.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <label htmlFor="display-name" className="text-xs font-bold">
                Display Name
              </label>
              <Input
                id="display-name"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                placeholder="e.g. Front Entrance TV, Cafeteria Monitor, Gym Leaderboard"
                className="h-10 text-sm"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold">Starting Template</label>
              <div className="grid grid-cols-3 gap-2">
                {TEMPLATES.map(({ view, label, icon: Icon }) => {
                  const isSelected = newDisplayTemplate === view;
                  return (
                    <button
                      key={view}
                      type="button"
                      onClick={() => setNewDisplayTemplate(view)}
                      className={cn(
                        'flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-center transition-all',
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/40'
                          : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground',
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-xs font-bold leading-tight">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleCreateDisplay}>
              Create Display
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
