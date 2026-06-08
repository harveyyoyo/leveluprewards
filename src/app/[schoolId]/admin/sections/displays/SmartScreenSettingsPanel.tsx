'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ArrowUpRight,
  CalendarDays,
  Cake,
  ChartNoAxesColumnIncreasing,
  CloudSun,
  Gift,
  Heart,
  Lightbulb,
  Megaphone,
  Settings2,
  Sparkles,
  Star,
  Trash2,
  Trophy,
  Users,
} from 'lucide-react';
import { SmartScreenScaledPreview } from '@/components/displays/SmartScreenScaledPreview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { DEFAULT_SMART_SCREEN_THEME, SMART_SCREEN_THEME_OPTIONS, type SmartScreenTheme } from '@/lib/smartScreenThemes';
import type { Settings } from '@/components/providers/SettingsProvider';
import { buildSmartScreenDisplayHref } from '@/lib/displays/displayRoutes';
import {
  SMART_SCREEN_PROFILE_SETTING_KEYS,
  buildSmartScreenSettingsSnapshot,
  type SmartScreenLayout,
  type SmartScreenProfileSettingKey,
  type SmartScreenSettingsSnapshot,
} from '@/lib/smartScreen/smartScreenSettings';

const MODULES = [
  { key: 'smartScreenShowWeather', label: 'Weather', icon: CloudSun },
  { key: 'smartScreenShowStats', label: 'Stats', icon: ChartNoAxesColumnIncreasing },
  { key: 'smartScreenShowCompliments', label: 'Compliments', icon: Heart },
  { key: 'smartScreenShowFocus', label: 'Focus skill', icon: Lightbulb },
  { key: 'smartScreenShowQuote', label: 'Quote', icon: Sparkles },
  { key: 'smartScreenShowLeaderboard', label: 'Leaders', icon: Trophy },
  { key: 'smartScreenShowHouses', label: 'Houses', icon: Star },
  { key: 'smartScreenShowClasses', label: 'Classes', icon: Users },
  { key: 'smartScreenShowBirthdays', label: 'Birthdays', icon: Cake },
  { key: 'smartScreenShowBulletin', label: 'Bulletin', icon: Megaphone },
  { key: 'smartScreenShowRewards', label: 'Rewards', icon: Gift },
  { key: 'smartScreenShowSchedule', label: 'Day panel', icon: CalendarDays },
] as const;

const EMPTY_PROFILE_SETTINGS: Partial<Settings> = {};

function SettingsSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-2', className)}>
      <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{title}</p>
      {children}
    </section>
  );
}

type SmartScreenSettingsPanelProps = {
  schoolId: string;
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
  isJewishOrthodoxSchool?: boolean;
};

export function SmartScreenSettingsPanel({
  schoolId,
  settings,
  updateSettings,
  isJewishOrthodoxSchool = false,
}: SmartScreenSettingsPanelProps) {
  const [activeProfileId, setActiveProfileId] = useState<string>('default');
  const [newProfileName, setNewProfileName] = useState('');
  const [draft, setDraft] = useState<SmartScreenSettingsSnapshot>({});
  const savedSnapshotRef = useRef('');

  const smartScreenProfiles = settings.smartScreenProfiles || {};
  const activeProfile = activeProfileId === 'default' ? null : smartScreenProfiles[activeProfileId];
  const activeProfileSettings = useMemo(
    () => activeProfile?.settings ?? EMPTY_PROFILE_SETTINGS,
    [activeProfile?.settings],
  );

  useEffect(() => {
    const profile =
      activeProfileId === 'default' ? null : (settings.smartScreenProfiles?.[activeProfileId] ?? null);
    const profileSettings = profile?.settings ?? EMPTY_PROFILE_SETTINGS;
    const snapshot = buildSmartScreenSettingsSnapshot(settings, profileSettings);
    setDraft(snapshot);
    savedSnapshotRef.current = JSON.stringify(snapshot);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- settings read at profile-switch time only
  }, [activeProfileId]);

  const hasUnsavedChanges = JSON.stringify(draft) !== savedSnapshotRef.current;

  const readDraftSetting = <K extends SmartScreenProfileSettingKey>(key: K): Settings[K] => {
    if (draft[key] !== undefined) return draft[key] as Settings[K];
    const profileValue = activeProfileSettings[key as keyof typeof activeProfileSettings];
    if (profileValue !== undefined) return profileValue as Settings[K];
    return settings[key];
  };

  const updateDraft = (updates: Partial<Settings>) => {
    setDraft((prev) => ({ ...prev, ...updates }));
  };

  const discardDraft = () => {
    const snapshot = buildSmartScreenSettingsSnapshot(settings, activeProfileSettings);
    setDraft(snapshot);
    savedSnapshotRef.current = JSON.stringify(snapshot);
  };

  const saveDraft = () => {
    if (activeProfile) {
      updateSettings({
        smartScreenProfiles: {
          ...smartScreenProfiles,
          [activeProfile.id]: {
            ...activeProfile,
            updatedAt: Date.now(),
            settings: {
              ...activeProfile.settings,
              ...draft,
            },
          },
        },
      });
    } else {
      updateSettings(draft);
    }
    savedSnapshotRef.current = JSON.stringify(draft);
  };

  const createProfile = () => {
    const label = newProfileName.trim();
    if (!label) return;
    const slug = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
    const id = `${slug || 'screen'}-${Date.now().toString(36)}`;
    const profileSettings: Partial<Settings> = {};
    for (const key of SMART_SCREEN_PROFILE_SETTING_KEYS) {
      (profileSettings as Record<SmartScreenProfileSettingKey, Settings[SmartScreenProfileSettingKey]>)[key] =
        readDraftSetting(key);
    }
    updateSettings({
      smartScreenProfiles: {
        ...smartScreenProfiles,
        [id]: {
          id,
          name: label,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          settings: profileSettings,
        },
      },
    });
    setActiveProfileId(id);
    setNewProfileName('');
  };

  const deleteProfile = (profileId: string) => {
    const nextProfiles = { ...smartScreenProfiles };
    delete nextProfiles[profileId];
    updateSettings({ smartScreenProfiles: nextProfiles });
    if (activeProfileId === profileId) setActiveProfileId('default');
  };

  const fullHref = useMemo(
    () =>
      buildSmartScreenDisplayHref(schoolId, {
        fullscreen: true,
        screenProfileId: activeProfile?.id,
      }),
    [activeProfile?.id, schoolId],
  );

  const activeTheme = (readDraftSetting('smartScreenTheme') as string) || DEFAULT_SMART_SCREEN_THEME;
  const activeLayout = (readDraftSetting('smartScreenLayout') as SmartScreenLayout) || 'mirror';
  const isDashboardLayout = activeLayout === 'dashboard';
  const activeThemeOption =
    SMART_SCREEN_THEME_OPTIONS.find((option) => option.id === activeTheme) ?? SMART_SCREEN_THEME_OPTIONS[0];

  return (
    <div className="flex flex-col gap-4">
      <div className="order-2 rounded-xl border bg-muted/10 px-3 py-3 sm:px-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold">Screen versions</p>
          <span className="rounded-md border bg-background px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-muted-foreground">
            {activeProfile ? activeProfile.name : 'School default'}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
          <Select value={activeProfileId} onValueChange={setActiveProfileId}>
            <SelectTrigger className="h-9 rounded-lg bg-background text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">School default</SelectItem>
              {Object.values(smartScreenProfiles).map((profile) => (
                <SelectItem key={profile.id} value={profile.id}>
                  {profile.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-1.5">
            {activeProfile ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 rounded-lg text-rose-600"
                onClick={() => deleteProfile(activeProfile.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            ) : null}
            <Button asChild variant="outline" size="sm" className="h-9 rounded-lg gap-1 px-2.5 text-xs">
              <Link href={fullHref} target="_blank" rel="noopener noreferrer">
                Open URL <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
        <div className="mt-2 flex gap-2">
          <Input
            value={newProfileName}
            onChange={(event) => setNewProfileName(event.target.value)}
            placeholder="New version name"
            className="h-9 rounded-lg bg-background text-sm"
          />
          <Button type="button" size="sm" className="h-9 shrink-0 rounded-lg px-3 text-xs" onClick={createProfile}>
            Add
          </Button>
        </div>
      </div>

      <div className="order-1 overflow-hidden rounded-xl border bg-muted/10">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-background/80 px-3 py-2.5 sm:px-4">
          <div className="flex items-center gap-2">
            <Settings2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            <p className="text-xs font-bold">Editor</p>
          </div>
          {hasUnsavedChanges ? (
            <div className="flex items-center gap-1.5">
              <span className="rounded-full border border-amber-300/50 bg-amber-50 px-2 py-0.5 text-[9px] font-black uppercase text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                Unsaved
              </span>
              <Button type="button" variant="outline" size="sm" className="h-7 rounded-lg px-2 text-xs" onClick={discardDraft}>
                Discard
              </Button>
              <Button type="button" size="sm" className="h-7 rounded-lg px-2.5 text-xs" onClick={saveDraft}>
                Save
              </Button>
            </div>
          ) : (
            <span className="text-[10px] font-semibold text-muted-foreground">Saved</span>
          )}
        </div>

        <div className="flex h-[min(80dvh,860px)] min-h-[26rem] flex-col lg:flex-row">
          <div className="flex h-[min(42dvh,400px)] min-h-0 shrink-0 flex-col border-b p-2.5 sm:p-3 lg:h-full lg:w-auto lg:max-w-[62%] lg:border-b-0 lg:border-r">
            <SmartScreenScaledPreview
              layout="docked"
              schoolId={schoolId}
              schoolSettings={settings}
              draftSettings={draft}
              screenProfileName={activeProfile?.name}
              isJewishOrthodox={isJewishOrthodoxSchool}
              onOrientationChange={(orientation) => updateDraft({ smartScreenLayout: orientation })}
              className="h-full min-h-0"
            />
          </div>

          <div className="min-h-0 min-w-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3 sm:p-3.5">
            <SettingsSection title="Content">
              <div className="space-y-2">
                <Input
                  id="smart-screen-title"
                  value={(readDraftSetting('smartScreenTitle') as string) || ''}
                  onChange={(event) => updateDraft({ smartScreenTitle: event.target.value })}
                  placeholder="Display title"
                  className="h-9 rounded-lg text-sm"
                />
                <Textarea
                  id="smart-screen-message"
                  value={(readDraftSetting('smartScreenMessage') as string) || ''}
                  onChange={(event) => updateDraft({ smartScreenMessage: event.target.value })}
                  placeholder="Daily message"
                  className="min-h-[72px] resize-y rounded-lg text-sm"
                />
              </div>
            </SettingsSection>

            <SettingsSection title="Location & weather">
              <div className="grid grid-cols-[1fr_4.5rem] gap-2">
                <Input
                  id="smart-screen-weather"
                  value={(readDraftSetting('smartScreenWeatherLabel') as string) || ''}
                  onChange={(event) => updateDraft({ smartScreenWeatherLabel: event.target.value })}
                  placeholder="Weather label"
                  className="h-9 rounded-lg text-sm"
                />
                <Input
                  aria-label="Temperature"
                  value={(readDraftSetting('smartScreenWeatherTemp') as string) || ''}
                  onChange={(event) => updateDraft({ smartScreenWeatherTemp: event.target.value })}
                  placeholder="°F"
                  className="h-9 rounded-lg text-sm"
                  inputMode="numeric"
                />
              </div>
              <Input
                id="smart-screen-zip"
                value={(readDraftSetting('smartScreenLocationZip') as string) || ''}
                onChange={(event) =>
                  updateDraft({
                    smartScreenLocationZip: event.target.value.replace(/[^\d]/g, '').slice(0, 5),
                  })
                }
                placeholder="ZIP (blank = IP location)"
                className="h-9 rounded-lg text-sm"
                inputMode="numeric"
              />
            </SettingsSection>

            <SettingsSection title="Theme">
              <Select
                value={activeTheme}
                onValueChange={(value) => updateDraft({ smartScreenTheme: value as SmartScreenTheme })}
              >
                <SelectTrigger className="h-9 rounded-lg bg-background text-sm">
                  <SelectValue>{activeThemeOption.label}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {SMART_SCREEN_THEME_OPTIONS.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      <span className="font-semibold">{option.label}</span>
                      <span className="text-muted-foreground"> — {option.description}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingsSection>

            <SettingsSection title="Layout">
              <label className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border bg-background px-2.5 py-2">
                <div className="min-w-0">
                  <span className="text-xs font-bold">Modules below clock</span>
                  <p className="text-[10px] text-muted-foreground">Dashboard style — clock on top, grid underneath</p>
                </div>
                <Switch
                  checked={isDashboardLayout}
                  onCheckedChange={(checked) =>
                    updateDraft({ smartScreenLayout: checked ? 'dashboard' : 'mirror' })
                  }
                  aria-label="Stack modules below clock"
                />
              </label>
              {!isDashboardLayout ? (
                <p className="text-[10px] text-muted-foreground">
                  Use Wide or Tall on the preview for side-by-side or portrait orientation.
                </p>
              ) : null}
            </SettingsSection>

            {isJewishOrthodoxSchool ? (
              <SettingsSection title="Jewish calendar">
                <div className="space-y-1.5">
                  <label className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5">
                    <span className="text-xs font-bold">Hebrew date</span>
                    <Switch
                      checked={readDraftSetting('smartScreenShowHebrewDate') === true}
                      onCheckedChange={(checked) => updateDraft({ smartScreenShowHebrewDate: checked })}
                    />
                  </label>
                  <label className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5">
                    <span className="text-xs font-bold">Jewish holidays</span>
                    <Switch
                      checked={readDraftSetting('smartScreenShowJewishHolidays') === true}
                      onCheckedChange={(checked) => updateDraft({ smartScreenShowJewishHolidays: checked })}
                    />
                  </label>
                </div>
              </SettingsSection>
            ) : null}

            <SettingsSection title="Modules">
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {MODULES.map((module) => {
                  const Icon = module.icon;
                  const checked = readDraftSetting(module.key as SmartScreenProfileSettingKey) !== false;
                  return (
                    <label
                      key={module.key}
                      className={cn(
                        'flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-2 py-1.5 transition-colors',
                        checked ? 'border-primary/30 bg-primary/5' : 'bg-muted/15',
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                        <span className="truncate text-[11px] font-bold">{module.label}</span>
                      </span>
                      <Switch
                        checked={checked}
                        onCheckedChange={(value) => updateDraft({ [module.key]: value })}
                        aria-label={`Show ${module.label}`}
                        className="scale-90"
                      />
                    </label>
                  );
                })}
              </div>
            </SettingsSection>
          </div>
        </div>
      </div>
    </div>
  );
}
