'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
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
import { LiveScreenPreview } from '@/components/admin/LiveScreenPreview';
import { cn } from '@/lib/utils';
import { SMART_SCREEN_THEME_OPTIONS } from '@/lib/smartScreenThemes';
import type { Settings } from '@/components/providers/SettingsProvider';
import { buildSmartScreenDisplayHref } from '@/lib/displays/displayRoutes';

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

const SMART_SCREEN_PROFILE_SETTING_KEYS = [
  'smartScreenEnabled',
  'smartScreenTitle',
  'smartScreenMessage',
  'smartScreenTheme',
  'smartScreenLayout',
  'smartScreenLocationZip',
  'smartScreenWeatherLabel',
  'smartScreenWeatherTemp',
  'smartScreenShowWeather',
  'smartScreenShowStats',
  'smartScreenShowCompliments',
  'smartScreenShowFocus',
  'smartScreenShowQuote',
  'smartScreenShowLeaderboard',
  'smartScreenShowHouses',
  'smartScreenShowClasses',
  'smartScreenShowBirthdays',
  'smartScreenShowBulletin',
  'smartScreenShowRewards',
  'smartScreenShowSchedule',
] as const;

type SmartScreenProfileSettingKey = (typeof SMART_SCREEN_PROFILE_SETTING_KEYS)[number];

type SmartScreenSettingsPanelProps = {
  schoolId: string;
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
  showPreview?: boolean;
};

export function SmartScreenSettingsPanel({
  schoolId,
  settings,
  updateSettings,
  showPreview = true,
}: SmartScreenSettingsPanelProps) {
  const [activeProfileId, setActiveProfileId] = useState<string>('default');
  const [newProfileName, setNewProfileName] = useState('');
  const smartScreenProfiles = settings.smartScreenProfiles || {};
  const activeProfile = activeProfileId === 'default' ? null : smartScreenProfiles[activeProfileId];
  const activeProfileSettings = activeProfile?.settings || {};

  const readScreenSetting = <K extends SmartScreenProfileSettingKey>(key: K): Settings[K] => {
    const profileValue = activeProfileSettings[key as keyof typeof activeProfileSettings];
    if (profileValue !== undefined) return profileValue as Settings[K];
    return settings[key];
  };

  const updateScreenSettings = (updates: Partial<Settings>) => {
    if (!activeProfile) {
      updateSettings(updates);
      return;
    }
    updateSettings({
      smartScreenProfiles: {
        ...smartScreenProfiles,
        [activeProfile.id]: {
          ...activeProfile,
          updatedAt: Date.now(),
          settings: {
            ...activeProfile.settings,
            ...updates,
          },
        },
      },
    });
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
        readScreenSetting(key);
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

  const selectedLayout = ((readScreenSetting('smartScreenLayout') as string) || 'mirror') as 'mirror' | 'dashboard' | 'portrait';
  const selectedTheme = ((readScreenSetting('smartScreenTheme') as string) || 'midnight') as 'midnight' | 'daylight' | 'studio';
  const selectedZip = (readScreenSetting('smartScreenLocationZip') as string) || '';

  const fullHref = useMemo(
    () =>
      buildSmartScreenDisplayHref(schoolId, {
        fullscreen: true,
        layout: selectedLayout,
        theme: selectedTheme,
        zip: selectedZip,
        screenProfileId: activeProfile?.id,
      }),
    [activeProfile?.id, schoolId, selectedLayout, selectedTheme, selectedZip],
  );

  const enabled = !!readScreenSetting('smartScreenEnabled');

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-muted/10 p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold">Screen versions</p>
            <p className="text-[11px] text-muted-foreground">
              Create multiple versions and open a unique URL on each hallway monitor.
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
        <div className="mb-4 flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-muted-foreground" aria-hidden />
          <p className="text-sm font-bold">Smart Screen settings</p>
        </div>

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
                onCheckedChange={(checked) => updateScreenSettings({ smartScreenEnabled: checked })}
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
                  value={(readScreenSetting('smartScreenTitle') as string) || ''}
                  onChange={(event) => updateScreenSettings({ smartScreenTitle: event.target.value })}
                  placeholder="Smart Screen"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smart-screen-zip" className="text-xs font-bold uppercase text-muted-foreground">
                  ZIP override
                </Label>
                <Input
                  id="smart-screen-zip"
                  value={(readScreenSetting('smartScreenLocationZip') as string) || ''}
                  onChange={(event) =>
                    updateScreenSettings({
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
                value={(readScreenSetting('smartScreenMessage') as string) || ''}
                onChange={(event) => updateScreenSettings({ smartScreenMessage: event.target.value })}
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
                  value={(readScreenSetting('smartScreenWeatherLabel') as string) || ''}
                  onChange={(event) => updateScreenSettings({ smartScreenWeatherLabel: event.target.value })}
                  placeholder="Clear focus"
                />
                <Input
                  aria-label="Weather fallback temperature"
                  value={(readScreenSetting('smartScreenWeatherTemp') as string) || ''}
                  onChange={(event) => updateScreenSettings({ smartScreenWeatherTemp: event.target.value })}
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
                  value={(readScreenSetting('smartScreenLayout') as string) || 'mirror'}
                  onValueChange={(value: 'mirror' | 'dashboard' | 'portrait') =>
                    updateScreenSettings({ smartScreenLayout: value })
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

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Theme</Label>
                <Select
                  value={(readScreenSetting('smartScreenTheme') as string) || 'midnight'}
                  onValueChange={(value: 'midnight' | 'daylight' | 'studio') =>
                    updateScreenSettings({ smartScreenTheme: value })
                  }
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SMART_SCREEN_THEME_OPTIONS.map((option) => (
                      <SelectItem key={option.id} value={option.id} className="text-sm">
                        <span className="font-semibold">{option.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {' '}
                          — {option.description}
                          {option.tone === 'light' ? ' (light)' : ''}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-xl border bg-background p-3">
              <p className="mb-3 text-xs font-black uppercase tracking-wider text-muted-foreground">Modules</p>
              <div className="space-y-2">
                {MODULES.map((module) => {
                  const Icon = module.icon;
                  const checked = readScreenSetting(module.key as SmartScreenProfileSettingKey) !== false;
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
                        onCheckedChange={(value) => updateScreenSettings({ [module.key]: value })}
                        aria-label={`Show ${module.label}`}
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showPreview ? <LiveScreenPreview href={fullHref} title="Smart Screen preview" /> : null}
    </div>
  );
}
