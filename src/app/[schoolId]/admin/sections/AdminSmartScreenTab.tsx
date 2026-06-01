'use client';

import Link from 'next/link';
import { useMemo } from 'react';
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
  Monitor,
  Settings2,
  Sparkles,
  Star,
  Trophy,
  Users,
} from 'lucide-react';
import {
  StaffPortalSectionCard,
  StaffPortalSectionCardContent,
  StaffPortalSectionCardHeader,
  StaffPortalSectionCardTitle,
} from '@/components/staff/StaffPortalSection';
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
import { Helper } from '@/components/ui/helper';
import { TabWalkthroughHeaderAction } from '@/components/tabWalkthrough/TabWalkthroughContext';
import { LiveScreenPreview } from '@/components/admin/LiveScreenPreview';
import { cn } from '@/lib/utils';
import { SMART_SCREEN_THEME_OPTIONS } from '@/lib/smartScreenThemes';
import type { Settings } from '@/components/providers/SettingsProvider';

type SmartScreenTabProps = {
  schoolId: string;
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
};

const MODULES = [
  {
    key: 'smartScreenShowWeather',
    label: 'Weather card',
    description: 'Manual temperature and condition text for now.',
    icon: CloudSun,
  },
  {
    key: 'smartScreenShowStats',
    label: 'School stats',
    description: 'Student count, active points, and reward count.',
    icon: ChartNoAxesColumnIncreasing,
  },
  {
    key: 'smartScreenShowCompliments',
    label: 'Compliments',
    description: 'School-appropriate encouragement that rotates daily.',
    icon: Heart,
  },
  {
    key: 'smartScreenShowFocus',
    label: 'Focus skill',
    description: 'A short SEL-friendly skill for the day.',
    icon: Lightbulb,
  },
  {
    key: 'smartScreenShowQuote',
    label: 'Learning quote',
    description: 'Brief growth mindset line for hallway displays.',
    icon: Sparkles,
  },
  {
    key: 'smartScreenShowLeaderboard',
    label: 'Top students',
    description: 'Live leaders from student point balances.',
    icon: Trophy,
  },
  {
    key: 'smartScreenShowHouses',
    label: 'House standings',
    description: 'House totals when houses are enabled.',
    icon: Star,
  },
  {
    key: 'smartScreenShowClasses',
    label: 'Class spotlight',
    description: 'Highlights an active class from the roster.',
    icon: Users,
  },
  {
    key: 'smartScreenShowBirthdays',
    label: 'Birthdays',
    description: 'Shows today\'s birthdays when student birthdays are saved.',
    icon: Cake,
  },
  {
    key: 'smartScreenShowBulletin',
    label: 'Bulletin items',
    description: 'Active bulletin incentives and the daily message.',
    icon: Megaphone,
  },
  {
    key: 'smartScreenShowRewards',
    label: 'Reward shop',
    description: 'Available rewards students can work toward.',
    icon: Gift,
  },
  {
    key: 'smartScreenShowSchedule',
    label: 'Day panel',
    description: 'Date, school status, and rotating display cues.',
    icon: CalendarDays,
  },
] as const;

function moduleEnabled(settings: Settings, key: (typeof MODULES)[number]['key']) {
  return settings[key] !== false;
}

export function AdminSmartScreenTab({
  schoolId,
  settings,
  updateSettings,
}: SmartScreenTabProps) {
  const fullHref = useMemo(() => {
    const params = new URLSearchParams();
    params.set('fullscreen', '1');
    params.set('layout', settings.smartScreenLayout || 'mirror');
    params.set('theme', settings.smartScreenTheme || 'midnight');
    if (/^\d{5}$/.test(settings.smartScreenLocationZip || '')) {
      params.set('zip', settings.smartScreenLocationZip || '');
    }
    return `/${schoolId}/smart-screen?${params.toString()}`;
  }, [schoolId, settings.smartScreenLayout, settings.smartScreenLocationZip, settings.smartScreenTheme]);
  const enabled = !!settings.smartScreenEnabled;

  return (
    <StaffPortalSectionCard className="w-full overflow-hidden">
      <StaffPortalSectionCardHeader className="flex flex-row items-start justify-between gap-4 py-6">
        <div className="min-w-0">
          <Helper content="Hallway and lobby signage: a full-screen display with clock, school message, leaders, bulletin items, and rewards. Included with every plan — not part of the Classroom Management pillar.">
            <StaffPortalSectionCardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-primary" /> Smart Screen
            </StaffPortalSectionCardTitle>
          </Helper>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <TabWalkthroughHeaderAction />
          <Button asChild variant="outline" className="gap-2 rounded-xl">
            <Link href={fullHref} target="_blank" rel="noopener noreferrer">
              View full page <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </StaffPortalSectionCardHeader>
      <StaffPortalSectionCardContent className="space-y-6">
        <div className="rounded-2xl border bg-muted/10 p-4">
          <div className="mb-4 flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-muted-foreground" aria-hidden />
            <p className="text-sm font-bold">Display settings</p>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <div className="flex flex-col gap-3 rounded-xl border bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-bold">Enable Smart Screen</p>
                  <p className="text-[11px] text-muted-foreground">
                    Open the full-screen link on a hallway monitor, lobby TV, or gym display.
                  </p>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={(checked) => updateSettings({ smartScreenEnabled: checked })}
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
                    value={settings.smartScreenTitle || ''}
                    onChange={(event) => updateSettings({ smartScreenTitle: event.target.value })}
                    placeholder="Smart Screen"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smart-screen-zip" className="text-xs font-bold uppercase text-muted-foreground">
                    ZIP override
                  </Label>
                  <Input
                    id="smart-screen-zip"
                    value={settings.smartScreenLocationZip || ''}
                    onChange={(event) =>
                      updateSettings({ smartScreenLocationZip: event.target.value.replace(/[^\d]/g, '').slice(0, 5) })
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
                  value={settings.smartScreenMessage || ''}
                  onChange={(event) => updateSettings({ smartScreenMessage: event.target.value })}
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
                    value={settings.smartScreenWeatherLabel || ''}
                    onChange={(event) => updateSettings({ smartScreenWeatherLabel: event.target.value })}
                    placeholder="Clear focus"
                  />
                  <Input
                    aria-label="Weather fallback temperature"
                    value={settings.smartScreenWeatherTemp || ''}
                    onChange={(event) => updateSettings({ smartScreenWeatherTemp: event.target.value })}
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
                    value={settings.smartScreenLayout || 'mirror'}
                    onValueChange={(value: 'mirror' | 'dashboard' | 'portrait') =>
                      updateSettings({ smartScreenLayout: value })
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
                    value={settings.smartScreenTheme || 'midnight'}
                    onValueChange={(value: 'midnight' | 'daylight' | 'studio') =>
                      updateSettings({ smartScreenTheme: value })
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
                <p className="mb-3 text-xs font-black uppercase tracking-wider text-muted-foreground">
                  Modules
                </p>
                <div className="space-y-2">
                  {MODULES.map((module) => {
                    const Icon = module.icon;
                    const checked = moduleEnabled(settings, module.key);
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
                          onCheckedChange={(value) => updateSettings({ [module.key]: value })}
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

        <LiveScreenPreview href={fullHref} title="Smart Screen preview" />
      </StaffPortalSectionCardContent>
    </StaffPortalSectionCard>
  );
}
