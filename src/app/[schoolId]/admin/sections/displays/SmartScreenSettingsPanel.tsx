'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  Palette,
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
import { Label } from '@/components/ui/label';
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
  type SmartScreenProfileSettingKey,
  type SmartScreenSettingsSnapshot,
} from '@/lib/smartScreen/smartScreenSettings';

const MODULES = [
  { key: 'smartScreenShowWeather', label: 'Weather card', description: 'Manual temperature and condition text for now.', icon: CloudSun },
  { key: 'smartScreenShowStats', label: 'School stats', description: 'Student count, active points, and reward count.', icon: ChartNoAxesColumnIncreasing },
  { key: 'smartScreenShowCompliments', label: 'Compliments', description: 'School-appropriate encouragement that rotates daily.', icon: Heart },
  { key: 'smartScreenShowFocus', label: 'Focus skill', description: 'A short SEL-friendly skill for the day.', icon: Lightbulb },
  { key: 'smartScreenShowQuote', label: 'Learning quote', description: 'Brief growth mindset line for hallway displays.', icon: Sparkles },
  { key: 'smartScreenShowLeaderboard', label: 'Top students', description: 'Live leaders from student point balances.', icon: Trophy },
  { key: 'smartScreenShowHouses', label: 'House standings', description: 'House totals when houses are enabled.', icon: Star },
  { key: 'smartScreenShowClasses', label: 'Class spotlight', description: 'Highlights an active class from the roster.', icon: Users },
  { key: 'smartScreenShowBirthdays', label: 'Birthdays', description: "Shows today's birthdays when student birthdays are saved.", icon: Cake },
  { key: 'smartScreenShowBulletin', label: 'Bulletin items', description: 'Active bulletin incentives and the daily message.', icon: Megaphone },
  { key: 'smartScreenShowRewards', label: 'Reward shop', description: 'Available rewards students can work toward.', icon: Gift },
  { key: 'smartScreenShowSchedule', label: 'Day panel', description: 'Date, school status, and rotating display cues.', icon: CalendarDays },
] as const;

const EMPTY_PROFILE_SETTINGS: Partial<Settings> = {};

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
    // Only re-load draft when switching screen versions — not on every settings render.
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

  const enabled = !!readDraftSetting('smartScreenEnabled');

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-muted/10 p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold">Screen versions</p>
            <p className="text-[11px] text-muted-foreground">
              Create multiple versions and open a unique URL on each hallway monitor. Save here to push changes to open displays.
            </p>
          </div>
          <div className="rounded-lg border bg-background px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground">
            {activeProfile ? `Active: ${activeProfile.name}` : 'Active: School default'}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto]">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Edit version</Label>
            <Select value={activeProfileId} onValueChange={setActiveProfileId}>
              <SelectTrigger className="h-10 rounded-xl bg-background">
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
          </div>
          <div className="flex items-end gap-2">
            {activeProfile ? (
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl gap-1.5 text-rose-600 border-rose-300/60 hover:text-rose-700"
                onClick={() => deleteProfile(activeProfile.id)}
              >
                <Trash2 className="h-4 w-4" />
                Delete version
              </Button>
            ) : null}
            <Button asChild variant="outline" className="h-10 rounded-xl gap-2">
              <Link href={fullHref} target="_blank" rel="noopener noreferrer">
                Open active URL <ArrowUpRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <Input
            value={newProfileName}
            onChange={(event) => setNewProfileName(event.target.value)}
            placeholder="New version name (e.g., Lobby Monitor, Cafeteria)"
            className="h-10 rounded-xl bg-background"
          />
          <Button type="button" className="h-10 rounded-xl" onClick={createProfile}>
            Create version from current settings
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border bg-muted/10 p-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-muted-foreground" aria-hidden />
            <p className="text-sm font-bold">Smart Screen settings</p>
          </div>
          {hasUnsavedChanges ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-amber-300/50 bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                Unsaved changes
              </span>
              <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={discardDraft}>
                Discard
              </Button>
              <Button type="button" size="sm" className="rounded-xl" onClick={saveDraft}>
                Save
              </Button>
            </div>
          ) : (
            <span className="text-[11px] font-semibold text-muted-foreground">All changes saved</span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <div className="flex flex-col gap-3 rounded-xl border bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-bold">Enable Smart Screen</p>
                  <p className="text-[11px] text-muted-foreground">
                    Open the full-screen link on a hallway monitor, lobby monitor, or gym display.
                  </p>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={(checked) => updateDraft({ smartScreenEnabled: checked })}
                  aria-label="Enable Smart Screen"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smart-screen-title" className="text-xs font-bold uppercase text-muted-foreground">
                    Display title
                  </Label>
                  <Input
                    id="smart-screen-title"
                    value={(readDraftSetting('smartScreenTitle') as string) || ''}
                    onChange={(event) => updateDraft({ smartScreenTitle: event.target.value })}
                    placeholder="Smart Screen"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smart-screen-zip" className="text-xs font-bold uppercase text-muted-foreground">
                    ZIP override
                  </Label>
                  <Input
                    id="smart-screen-zip"
                    value={(readDraftSetting('smartScreenLocationZip') as string) || ''}
                    onChange={(event) =>
                      updateDraft({
                        smartScreenLocationZip: event.target.value.replace(/[^\d]/g, '').slice(0, 5),
                      })
                    }
                    placeholder="Use IP location"
                    inputMode="numeric"
                  />
                  <p className="text-[11px] font-medium text-muted-foreground">
                    Blank uses IP location. A ZIP sets both weather and timezone.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="smart-screen-message" className="text-xs font-bold uppercase text-muted-foreground">
                  Daily message
                </Label>
                <Textarea
                  id="smart-screen-message"
                  value={(readDraftSetting('smartScreenMessage') as string) || ''}
                  onChange={(event) => updateDraft({ smartScreenMessage: event.target.value })}
                  placeholder="Make today count."
                  className="min-h-[96px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smart-screen-weather" className="text-xs font-bold uppercase text-muted-foreground">
                  Weather fallback
                </Label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_7rem]">
                  <Input
                    id="smart-screen-weather"
                    value={(readDraftSetting('smartScreenWeatherLabel') as string) || ''}
                    onChange={(event) => updateDraft({ smartScreenWeatherLabel: event.target.value })}
                    placeholder="Clear focus"
                  />
                  <Input
                    aria-label="Weather fallback temperature"
                    value={(readDraftSetting('smartScreenWeatherTemp') as string) || ''}
                    onChange={(event) => updateDraft({ smartScreenWeatherTemp: event.target.value })}
                    placeholder="72"
                    inputMode="numeric"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Layout</Label>
                  <Select
                    value={(readDraftSetting('smartScreenLayout') as string) || 'mirror'}
                    onValueChange={(value: 'mirror' | 'dashboard' | 'portrait') =>
                      updateDraft({ smartScreenLayout: value })
                    }
                  >
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mirror">Mirror</SelectItem>
                      <SelectItem value="dashboard">Dashboard</SelectItem>
                      <SelectItem value="portrait">Portrait</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Theme</Label>
                  <div className="flex flex-wrap gap-2 pt-1 max-h-[180px] overflow-y-auto pr-1">
                    {SMART_SCREEN_THEME_OPTIONS.map((option) => {
                      const activeTheme = (readDraftSetting('smartScreenTheme') as string) || DEFAULT_SMART_SCREEN_THEME;
                      return (
                        <Button
                          key={option.id}
                          type="button"
                          variant={activeTheme === option.id ? 'default' : 'outline'}
                          className="text-xs h-8 px-3 rounded-full font-bold transition-all uppercase tracking-wide flex items-center gap-1 shrink-0"
                          onClick={() => updateDraft({ smartScreenTheme: option.id as SmartScreenTheme })}
                        >
                          <Palette className="w-3 h-3" aria-hidden />
                          {option.label}
                          {option.tone === 'light' ? (
                            <span className="sr-only"> (light theme)</span>
                          ) : (
                            <span className="sr-only"> (dark theme)</span>
                          )}
                        </Button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    New Smart Screens start with the bright Daylight theme. Pick any style below for hallway displays.
                  </p>
                </div>
              </div>

              {isJewishOrthodoxSchool ? (
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 space-y-3">
                  <div>
                    <p className="text-sm font-bold flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-amber-700 dark:text-amber-300" aria-hidden />
                      Jewish calendar
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Available because this school is marked as Jewish Orthodox in Developer.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2">
                      <span className="min-w-0">
                        <span className="block text-sm font-bold">Hebrew date</span>
                        <span className="block text-[11px] text-muted-foreground">Show today&apos;s Hebrew date under the clock.</span>
                      </span>
                      <Switch
                        checked={readDraftSetting('smartScreenShowHebrewDate') === true}
                        onCheckedChange={(checked) => updateDraft({ smartScreenShowHebrewDate: checked })}
                        aria-label="Show Hebrew date on Smart Screen"
                      />
                    </label>
                    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2">
                      <span className="min-w-0">
                        <span className="block text-sm font-bold flex items-center gap-1.5">
                          <Star className="h-3.5 w-3.5 text-amber-600" aria-hidden />
                          Jewish holidays
                        </span>
                        <span className="block text-[11px] text-muted-foreground">Show upcoming holidays as a Smart Screen module.</span>
                      </span>
                      <Switch
                        checked={readDraftSetting('smartScreenShowJewishHolidays') === true}
                        onCheckedChange={(checked) => updateDraft({ smartScreenShowJewishHolidays: checked })}
                        aria-label="Show Jewish holidays on Smart Screen"
                      />
                    </label>
                  </div>
                </div>
              ) : null}

              <div className="rounded-xl border bg-background p-3">
                <p className="mb-3 text-xs font-black uppercase tracking-wider text-muted-foreground">Modules</p>
                <div className="space-y-2">
                  {MODULES.map((module) => {
                    const Icon = module.icon;
                    const checked = readDraftSetting(module.key as SmartScreenProfileSettingKey) !== false;
                    return (
                      <label
                        key={module.key}
                        className={cn(
                          'flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2 transition-colors',
                          checked ? 'bg-primary/5 border-primary/25' : 'bg-muted/20',
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                          <span className="min-w-0">
                            <span className="block text-sm font-bold">{module.label}</span>
                            <span className="block text-[11px] text-muted-foreground">{module.description}</span>
                          </span>
                        </span>
                        <Switch
                          checked={checked}
                          onCheckedChange={(value) => updateDraft({ [module.key]: value })}
                          aria-label={`Show ${module.label}`}
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="xl:sticky xl:top-4 xl:self-start">
            <div className="rounded-2xl border bg-background p-4">
              <SmartScreenScaledPreview
                schoolId={schoolId}
                schoolSettings={settings}
                draftSettings={draft}
                screenProfileName={activeProfile?.name}
                isJewishOrthodox={isJewishOrthodoxSchool}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
