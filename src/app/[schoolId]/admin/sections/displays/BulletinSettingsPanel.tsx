'use client';

import { useMemo, useState } from 'react';
import { Megaphone, Palette } from 'lucide-react';
import { collection, query } from 'firebase/firestore';
import { BulletinBoardScaledPreview, type BulletinBoardPreviewLayout } from '@/components/displays/BulletinBoardScaledPreview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { buildBulletinDisplayHref } from '@/lib/displays/displayRoutes';
import { DEFAULT_BULLETIN_SUBTITLE, PRESET_BULLETIN_THEMES, type BulletinBoardIncentiveRecord } from '@/lib/bulletinBoard';
import { activeIncentivesList, incentivesVisibleOnSurface } from '@/lib/incentives/incentiveSurfaces';

type BulletinSettingsPanelProps = {
  schoolId: string;
  settings: {
    bulletinTitle?: string;
    bulletinSubtitle?: string;
    bulletinTheme?: string;
    bulletinLogoSize?: string;
    bulletinShowWowBadge?: boolean;
    bulletinColumns?: string;
    incentivesShowOnBulletinBoard?: boolean;
  };
  updateSettings: (updates: Record<string, unknown>) => void;
};

export function BulletinSettingsPanel({
  schoolId,
  settings,
  updateSettings,
}: BulletinSettingsPanelProps) {
  const firestore = useFirestore();
  const [layout, setLayout] = useState<BulletinBoardPreviewLayout>('landscape');

  const incentivesQuery = useMemoFirebase(
    () => (schoolId ? query(collection(firestore, 'schools', schoolId, 'bulletinBoardIncentives')) : null),
    [firestore, schoolId],
  );
  const { data: incentives } = useCollection<BulletinBoardIncentiveRecord>(incentivesQuery);
  const activeIncentives = useMemo(() => activeIncentivesList(incentives), [incentives]);
  const showIncentivesOnBoard = incentivesVisibleOnSurface(settings, 'bulletinBoard');

  const bulletinTitle = settings.bulletinTitle || 'School Bulletin Board';
  const bulletinTheme = settings.bulletinTheme || 'default';
  const bulletinLogoSize = settings.bulletinLogoSize || 'md';
  const bulletinShowWowBadge = settings.bulletinShowWowBadge !== false;
  const bulletinColumns = settings.bulletinColumns || '2';

  const fullHref = useMemo(() => buildBulletinDisplayHref(schoolId, { fullscreen: true }), [schoolId]);

  return (
    <div className="overflow-hidden rounded-xl border bg-muted/10">
      <div className="flex h-[min(80dvh,860px)] min-h-[26rem] flex-col lg:flex-row">
        <div className="flex h-[min(42dvh,400px)] min-h-0 shrink-0 flex-col border-b p-2.5 sm:p-3 lg:h-full lg:w-1/2 lg:max-w-[50%] lg:shrink-0 lg:border-b-0 lg:border-r">
          <BulletinBoardScaledPreview
            layout={layout}
            className="h-full min-h-0"
            openDisplayHref={fullHref}
            onLayoutChange={setLayout}
          />
        </div>

        <div className="min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-3 sm:p-3.5">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground" htmlFor="bulletinTitle">
                Bulletin board title
              </Label>
              <Input
                id="bulletinTitle"
                value={bulletinTitle}
                onChange={(e) => updateSettings({ bulletinTitle: e.target.value })}
                placeholder="e.g., Monthly Challenges"
                className="rounded-lg text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground" htmlFor="bulletinSubtitle">
                Tagline (under the title)
              </Label>
              <Textarea
                id="bulletinSubtitle"
                value={settings.bulletinSubtitle ?? ''}
                onChange={(e) => updateSettings({ bulletinSubtitle: e.target.value })}
                placeholder={DEFAULT_BULLETIN_SUBTITLE}
                rows={2}
                className="min-h-[72px] resize-y rounded-lg text-sm"
              />
              <p className="text-[10px] text-muted-foreground">
                Shown on the live board page. Leave blank to use the default sentence.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground" htmlFor="bulletinTheme">
                Board theme
              </Label>
              <div className="flex max-h-[140px] flex-wrap gap-2 overflow-y-auto pt-1 pr-1">
                {PRESET_BULLETIN_THEMES.map((theme) => (
                  <Button
                    key={theme.id}
                    type="button"
                    variant={bulletinTheme === theme.id ? 'default' : 'outline'}
                    className="flex h-8 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-bold uppercase tracking-wide"
                    onClick={() => updateSettings({ bulletinTheme: theme.id })}
                  >
                    <Palette className="h-3 w-3" />
                    {theme.name}
                  </Button>
                ))}
              </div>
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
                    className="rounded-lg text-xs font-bold capitalize"
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
                  className="rounded-lg text-xs font-bold"
                  onClick={() => updateSettings({ bulletinColumns: '2' })}
                >
                  Two columns (wide screens)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={bulletinColumns === '1' ? 'default' : 'outline'}
                  className="rounded-lg text-xs font-bold"
                  onClick={() => updateSettings({ bulletinColumns: '1' })}
                >
                  Single column
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border bg-background px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-bold">“Wowed Design” flair in kiosk</p>
                <p className="text-[11px] text-muted-foreground">
                  Decorative footer in the student kiosk card only (not on the live board page).
                </p>
              </div>
              <Switch
                checked={bulletinShowWowBadge}
                onCheckedChange={(checked) => updateSettings({ bulletinShowWowBadge: checked })}
              />
            </div>

            <div className="rounded-xl border bg-background px-4 py-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-2 font-semibold text-foreground/80">
                  <Megaphone className="h-4 w-4 text-ring" aria-hidden />
                  Incentives on this board
                </span>
                <span className="rounded-full border border-border/60 bg-muted/30 px-2.5 py-1 text-xs font-black">
                  {activeIncentives.length} active
                </span>
                <span
                  className={
                    showIncentivesOnBoard
                      ? 'rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-300'
                      : 'rounded-full bg-muted px-2.5 py-1 text-[10px] font-black uppercase tracking-wide'
                  }
                >
                  {showIncentivesOnBoard ? 'Visible' : 'Hidden'}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Create and choose surfaces in Admin → Incentives. This panel only controls bulletin layout and theme.
              </p>
            </div>
        </div>
      </div>
    </div>
  );
}
