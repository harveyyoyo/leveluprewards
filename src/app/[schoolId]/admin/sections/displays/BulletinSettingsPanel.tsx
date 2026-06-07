'use client';

import { useMemo } from 'react';
import { CalendarDays, Megaphone, Palette, Settings2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Helper } from '@/components/ui/helper';
import { LiveScreenPreview } from '@/components/admin/LiveScreenPreview';
import { DEFAULT_BULLETIN_SUBTITLE, PRESET_BULLETIN_THEMES } from '@/lib/bulletinBoard';
import { cn } from '@/lib/utils';
import { buildBulletinDisplayHref } from '@/lib/displays/displayRoutes';
import type { BulletinBoardIncentiveRecord } from '@/lib/bulletinBoard';

type BulletinSettingsPanelProps = {
  schoolId: string;
  settings: {
    bulletinEnabled?: boolean;
    bulletinTitle?: string;
    bulletinSubtitle?: string;
    bulletinTheme?: string;
    bulletinLogoSize?: string;
    bulletinShowWowBadge?: boolean;
    bulletinColumns?: string;
    bulletinShowHebrewDate?: boolean;
    bulletinShowJewishHolidays?: boolean;
  };
  updateSettings: (updates: Record<string, unknown>) => void;
  sortedIncentives: BulletinBoardIncentiveRecord[];
  showPreview?: boolean;
  isJewishOrthodoxSchool?: boolean;
};

export function BulletinSettingsPanel({
  schoolId,
  settings,
  updateSettings,
  sortedIncentives,
  showPreview = true,
  isJewishOrthodoxSchool = false,
}: BulletinSettingsPanelProps) {
  const bulletinEnabled = settings.bulletinEnabled !== false;
  const bulletinTitle = settings.bulletinTitle || 'School Bulletin Board';
  const bulletinTheme = settings.bulletinTheme || 'default';
  const bulletinLogoSize = settings.bulletinLogoSize || 'md';
  const bulletinShowWowBadge = settings.bulletinShowWowBadge !== false;
  const bulletinColumns = settings.bulletinColumns || '2';

  const fullHref = useMemo(() => buildBulletinDisplayHref(schoolId, { fullscreen: true }), [schoolId]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-muted/10 p-4">
        <div className="mb-4 flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-muted-foreground" aria-hidden />
          <Helper content="Configure the bulletin board display. Incentives are managed in the Incentives section.">
            <p className="text-sm font-bold">Bulletin board settings</p>
          </Helper>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2 flex flex-col gap-3 rounded-xl border bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-bold">Enable bulletin board</p>
              <p className="text-[11px] text-muted-foreground">Show the board on the staff display and in preview.</p>
            </div>
            <div
              className="flex shrink-0 items-center gap-1 rounded-xl border bg-muted/40 p-1"
              role="group"
              aria-label="Bulletin board on or off"
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  'h-9 min-w-[72px] rounded-lg px-4 text-xs font-black uppercase tracking-wide',
                  bulletinEnabled
                    ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                onClick={() => updateSettings({ bulletinEnabled: true })}
              >
                On
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  'h-9 min-w-[72px] rounded-lg px-4 text-xs font-black uppercase tracking-wide',
                  !bulletinEnabled
                    ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                onClick={() => updateSettings({ bulletinEnabled: false })}
              >
                Off
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground" htmlFor="bulletinTitle">
              Bulletin board title
            </Label>
            <Input
              id="bulletinTitle"
              value={bulletinTitle}
              onChange={(e) => updateSettings({ bulletinTitle: e.target.value })}
              placeholder="e.g., Monthly Challenges"
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground" htmlFor="bulletinTheme">
              Board theme
            </Label>
            <div className="flex flex-wrap gap-2 pt-1 max-h-[140px] overflow-y-auto pr-1">
              {PRESET_BULLETIN_THEMES.map((theme) => (
                <Button
                  key={theme.id}
                  type="button"
                  variant={bulletinTheme === theme.id ? 'default' : 'outline'}
                  className="text-xs h-8 px-3 rounded-full font-bold transition-all uppercase tracking-wide flex items-center gap-1 shrink-0"
                  onClick={() => updateSettings({ bulletinTheme: theme.id })}
                >
                  <Palette className="w-3 h-3" />
                  {theme.name}
                </Button>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground" htmlFor="bulletinSubtitle">
              Tagline (under the title)
            </Label>
            <Textarea
              id="bulletinSubtitle"
              value={settings.bulletinSubtitle ?? ''}
              onChange={(e) => updateSettings({ bulletinSubtitle: e.target.value })}
              placeholder={DEFAULT_BULLETIN_SUBTITLE}
              rows={2}
              className="rounded-xl resize-y min-h-[72px] text-sm"
            />
            <p className="text-[10px] text-muted-foreground">
              Shown on the Board page and this preview. Leave blank to use the default sentence.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">School logo size</Label>
            <div className="flex flex-wrap gap-2">
              {(['sm', 'md', 'lg'] as const).map((sz) => (
                <Button
                  key={sz}
                  type="button"
                  size="sm"
                  variant={bulletinLogoSize === sz ? 'default' : 'outline'}
                  className="rounded-xl capitalize font-bold text-xs"
                  onClick={() => updateSettings({ bulletinLogoSize: sz })}
                >
                  {sz === 'sm' ? 'Small' : sz === 'md' ? 'Medium' : 'Large'}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Incentive grid</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={bulletinColumns === '2' ? 'default' : 'outline'}
                className="rounded-xl font-bold text-xs"
                onClick={() => updateSettings({ bulletinColumns: '2' })}
              >
                Two columns (wide screens)
              </Button>
              <Button
                type="button"
                size="sm"
                variant={bulletinColumns === '1' ? 'default' : 'outline'}
                className="rounded-xl font-bold text-xs"
                onClick={() => updateSettings({ bulletinColumns: '1' })}
              >
                Single column
              </Button>
            </div>
          </div>

          {isJewishOrthodoxSchool ? (
            <div className="md:col-span-2 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 space-y-4">
              <div>
                <p className="text-sm font-bold flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-amber-700 dark:text-amber-300" aria-hidden />
                  Jewish calendar options
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Available because this school is marked as Jewish Orthodox in Developer.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-xl border bg-background px-4 py-3">
                  <div className="min-w-0 pr-3">
                    <p className="text-sm font-bold">Hebrew date</p>
                    <p className="text-[11px] text-muted-foreground">Show today&apos;s Hebrew date on the live bulletin board.</p>
                  </div>
                  <Switch
                    checked={settings.bulletinShowHebrewDate === true}
                    onCheckedChange={(checked) => updateSettings({ bulletinShowHebrewDate: checked })}
                    aria-label="Show Hebrew date on bulletin board"
                  />
                </div>
                <div className="flex items-center justify-between rounded-xl border bg-background px-4 py-3">
                  <div className="min-w-0 pr-3">
                    <p className="text-sm font-bold flex items-center gap-1.5">
                      <Star className="h-3.5 w-3.5 text-amber-600" aria-hidden />
                      Jewish holidays
                    </p>
                    <p className="text-[11px] text-muted-foreground">Show upcoming holidays beneath the Hebrew date.</p>
                  </div>
                  <Switch
                    checked={settings.bulletinShowJewishHolidays === true}
                    onCheckedChange={(checked) => updateSettings({ bulletinShowJewishHolidays: checked })}
                    aria-label="Show Jewish holidays on bulletin board"
                  />
                </div>
              </div>
            </div>
          ) : null}

          <div className="md:col-span-2 flex items-center justify-between rounded-xl border bg-background px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-bold">“Wowed Design” flair in preview</p>
              <p className="text-[11px] text-muted-foreground">
                Decorative footer in this admin preview only (not on the live Board page).
              </p>
            </div>
            <Switch
              checked={bulletinShowWowBadge}
              onCheckedChange={(checked) => updateSettings({ bulletinShowWowBadge: checked })}
            />
          </div>

          <div className="md:col-span-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground pt-1">
            <span className="font-semibold text-foreground/80">Active incentives:</span>
            <span className="rounded-full border border-border/60 bg-muted/30 px-2.5 py-1 text-xs font-black">
              {(sortedIncentives || []).filter((i) => i.active !== false).length}
            </span>
            <span className="text-xs">Total incentives: {(sortedIncentives || []).length}</span>
          </div>
        </div>
      </div>

      {showPreview ? (
        bulletinEnabled ? (
          <LiveScreenPreview
            href={fullHref}
            title="Bulletin board preview"
            viewport="fullscreen"
            className="max-w-none"
          />
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center space-y-3 opacity-60 p-6">
            <Megaphone className="w-10 h-10 text-muted-foreground animate-pulse" />
            <div>
              <p className="font-black text-sm uppercase tracking-wider">Bulletin Board Disabled</p>
              <p className="text-xs text-muted-foreground">Turn on the feature to see the preview.</p>
            </div>
          </div>
        )
      ) : null}
    </div>
  );
}
