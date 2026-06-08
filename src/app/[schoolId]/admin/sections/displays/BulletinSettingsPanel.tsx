'use client';

import { Megaphone, Palette, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Helper } from '@/components/ui/helper';
import { DEFAULT_BULLETIN_SUBTITLE, PRESET_BULLETIN_THEMES } from '@/lib/bulletinBoard';
import { cn } from '@/lib/utils';
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
  };
  updateSettings: (updates: Record<string, unknown>) => void;
  sortedIncentives: BulletinBoardIncentiveRecord[];
};

export function BulletinSettingsPanel({
  settings,
  updateSettings,
  sortedIncentives,
}: BulletinSettingsPanelProps) {
  const bulletinEnabled = settings.bulletinEnabled !== false;
  const bulletinTitle = settings.bulletinTitle || 'School Bulletin Board';
  const bulletinTheme = settings.bulletinTheme || 'default';
  const bulletinLogoSize = settings.bulletinLogoSize || 'md';
  const bulletinShowWowBadge = settings.bulletinShowWowBadge !== false;
  const bulletinColumns = settings.bulletinColumns || '2';

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-muted/10 p-4">
        <div className="mb-4 flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-muted-foreground" aria-hidden />
          <Helper content="Configure the bulletin board display. Incentives are managed in the Incentives section. Open the full-screen Bulletin link to see changes live.">
            <p className="text-sm font-bold">Bulletin board settings</p>
          </Helper>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2 flex flex-col gap-3 rounded-xl border bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-bold">Enable bulletin board</p>
              <p className="text-[11px] text-muted-foreground">Show the board on hallway displays opened from the Bulletin link above.</p>
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
              Shown on the live Board page. Leave blank to use the default sentence.
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

          <div className="md:col-span-2 flex items-center justify-between rounded-xl border bg-background px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-bold">“Wowed Design” flair in preview</p>
              <p className="text-[11px] text-muted-foreground">
                Decorative footer in the student kiosk card only (not on the live Board page).
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
    </div>
  );
}
