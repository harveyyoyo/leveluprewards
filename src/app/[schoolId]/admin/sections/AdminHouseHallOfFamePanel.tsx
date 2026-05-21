'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  LayoutGrid,
  Play,
  Shield,
  SlidersHorizontal,
  Tv,
  Trophy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ContentSectionTreeNav } from '@/components/ui/content-section-tree-nav';
import { LiveScreenPreview } from '@/components/admin/LiveScreenPreview';
import { useSettings } from '@/components/providers/SettingsProvider';
import { resolveAppAbsoluteUrl } from '@/lib/appUrl';
import { buildHouseHallOfFameHref, isHouseStudentPointsRollupEnabled } from '@/lib/housePointsSettings';

export function AdminHouseHallOfFamePanel({ schoolId }: { schoolId: string }) {
  const { settings, updateSettings } = useSettings();
  const [section, setSection] = useState<'settings' | 'preview'>('settings');

  const [sortBy, setSortBy] = useState(
    settings.houseHallOfFameSortBy ?? settings.hallOfFameSortBy ?? 'lifetimePoints',
  );
  const [limitCount, setLimitCount] = useState(settings.houseHallOfFameLimit ?? settings.hallOfFameLimit ?? 50);
  const [podiumSize, setPodiumSize] = useState(settings.houseHallOfFamePodiumSize ?? settings.hallOfFamePodiumSize ?? 3);
  const [autoScroll, setAutoScroll] = useState(settings.houseHallOfFameAutoScroll ?? settings.hallOfFameAutoScroll ?? false);
  const [gridLayout, setGridLayout] = useState(settings.houseHallOfFameGridLayout ?? settings.hallOfFameGridLayout ?? true);

  useEffect(() => setSortBy(settings.houseHallOfFameSortBy ?? settings.hallOfFameSortBy ?? 'lifetimePoints'), [settings.houseHallOfFameSortBy, settings.hallOfFameSortBy]);
  useEffect(() => setLimitCount(settings.houseHallOfFameLimit ?? settings.hallOfFameLimit ?? 50), [settings.houseHallOfFameLimit, settings.hallOfFameLimit]);
  useEffect(() => setPodiumSize(settings.houseHallOfFamePodiumSize ?? settings.hallOfFamePodiumSize ?? 3), [settings.houseHallOfFamePodiumSize, settings.hallOfFamePodiumSize]);
  useEffect(() => setAutoScroll(settings.houseHallOfFameAutoScroll ?? settings.hallOfFameAutoScroll ?? false), [settings.houseHallOfFameAutoScroll, settings.hallOfFameAutoScroll]);
  useEffect(() => setGridLayout(settings.houseHallOfFameGridLayout ?? settings.hallOfFameGridLayout ?? true), [settings.houseHallOfFameGridLayout, settings.hallOfFameGridLayout]);

  const studentRollup = isHouseStudentPointsRollupEnabled(settings);
  const housesEnabled = settings.enableHouses;

  const previewPath = useMemo(
    () =>
      buildHouseHallOfFameHref(schoolId, {
        houseHallOfFameSortBy: sortBy,
        houseHallOfFameLimit: limitCount,
        houseHallOfFamePodiumSize: podiumSize,
        houseHallOfFameAutoScroll: autoScroll,
        houseHallOfFameGridLayout: gridLayout,
      }),
    [schoolId, sortBy, limitCount, podiumSize, autoScroll, gridLayout],
  );

  const launchUrl = useMemo(() => resolveAppAbsoluteUrl(previewPath), [previewPath]);

  useEffect(() => {
    if (!studentRollup && sortBy.startsWith('period_')) {
      const next = 'lifetimePoints';
      setSortBy(next);
      updateSettings({ houseHallOfFameSortBy: next });
    }
  }, [studentRollup, sortBy, updateSettings]);

  if (!housesEnabled) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 space-y-3">
        <p className="text-sm font-bold text-foreground">Turn on Houses first</p>
        <p className="text-xs text-muted-foreground">
          The House Hall of Fame display needs the house system enabled. Use the Setup wizard on Rosters &amp; Points, or enable Houses in Settings.
        </p>
        <Button className="rounded-xl" onClick={() => updateSettings({ enableHouses: true })}>
          Enable houses
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-3xl border bg-muted/10 p-5 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 mb-2">
            <Trophy className="w-3.5 h-3.5" aria-hidden />
            House Hall of Fame
          </div>
          <h3 className="text-lg font-black tracking-tight text-foreground">Big-screen house leaderboard</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-xl">
            TV link always includes <code className="text-[10px]">rankType=houses</code> so this board never shows student rankings.
          </p>
        </div>
        <Button asChild className="rounded-xl font-bold shrink-0">
          <a href={launchUrl} target="_blank" rel="noopener noreferrer">
            Launch TV display <ArrowUpRight className="ml-1.5 h-4 w-4" />
          </a>
        </Button>
      </div>

      <ContentSectionTreeNav
        branchLabel="House Hall of Fame"
        items={[
          { id: 'settings', label: 'Display Settings' },
          { id: 'preview', label: 'Live TV Preview' },
        ]}
        value={section}
        onValueChange={(id) => setSection(id as 'settings' | 'preview')}
        className="bg-muted/50 p-1.5 rounded-2xl border"
      />

      {section === 'settings' ? (
        <div className="space-y-6">
          <div className="rounded-2xl border bg-card/60 p-4 flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0">
              <Shield className="w-5 h-5" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">House standings only</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Point totals follow your Houses tab: linked to student rewards or manual house scores.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border bg-muted/15 p-6 space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b">
              <SlidersHorizontal className="w-4 h-4 text-rose-500" aria-hidden />
              <p className="text-sm font-bold tracking-tight">Leaderboard details</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2 md:col-span-1">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sort by</Label>
                <Select
                  value={sortBy}
                  onValueChange={(v) => {
                    setSortBy(v);
                    updateSettings({ houseHallOfFameSortBy: v });
                  }}
                >
                  <SelectTrigger className="rounded-xl border bg-background font-medium h-10 shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lifetimePoints">Lifetime house points</SelectItem>
                    <SelectItem value="points">Current house points</SelectItem>
                    {studentRollup ? (
                      <>
                        <SelectItem value="period_day">Points earned today (from students)</SelectItem>
                        <SelectItem value="period_week">Points earned this week (from students)</SelectItem>
                        <SelectItem value="period_month">Points earned this month (from students)</SelectItem>
                      </>
                    ) : null}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Show top</Label>
                <Input
                  type="number"
                  min={1}
                  value={limitCount}
                  onChange={(e) => {
                    const next = Math.max(1, parseInt(e.target.value, 10) || 1);
                    setLimitCount(next);
                    updateSettings({ houseHallOfFameLimit: next });
                  }}
                  className="rounded-xl border bg-background font-bold h-10 shadow-sm text-center"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Podium size</Label>
                <Input
                  type="number"
                  min={0}
                  max={3}
                  value={podiumSize}
                  onChange={(e) => {
                    const next = Math.max(0, Math.min(3, parseInt(e.target.value, 10) || 0));
                    setPodiumSize(next);
                    updateSettings({ houseHallOfFamePodiumSize: next });
                  }}
                  className="rounded-xl border bg-background font-bold h-10 shadow-sm text-center"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div className="flex items-center justify-between rounded-2xl border bg-background p-4 shadow-sm">
                <div className="min-w-0 pr-4">
                  <p className="text-sm font-bold flex items-center gap-1.5">
                    <Play className="w-4 h-4 text-emerald-500" aria-hidden />
                    Auto-scroll
                  </p>
                </div>
                <Switch
                  checked={autoScroll}
                  onCheckedChange={(v) => {
                    setAutoScroll(v);
                    updateSettings({ houseHallOfFameAutoScroll: v });
                  }}
                />
              </div>
              <div className="flex items-center justify-between rounded-2xl border bg-background p-4 shadow-sm">
                <div className="min-w-0 pr-4">
                  <p className="text-sm font-bold flex items-center gap-1.5">
                    <LayoutGrid className="w-4 h-4 text-blue-500" aria-hidden />
                    Multi-column grid
                  </p>
                </div>
                <Switch
                  checked={gridLayout}
                  onCheckedChange={(v) => {
                    setGridLayout(v);
                    updateSettings({ houseHallOfFameGridLayout: v });
                  }}
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-r from-rose-500/5 to-amber-500/5 border border-rose-500/10 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0">
                <Tv className="w-5 h-5" aria-hidden />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Ready for the gym or lobby?</h4>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono break-all">{launchUrl}</p>
              </div>
            </div>
            <Button asChild variant="outline" className="rounded-xl shrink-0">
              <a href={launchUrl} target="_blank" rel="noopener noreferrer">
                Launch <ArrowUpRight className="w-4 h-4 ml-1" />
              </a>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-foreground">Live monitor preview</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Updates when you change settings above.</p>
            </div>
            <Button asChild size="sm" variant="ghost" className="text-xs gap-1 shrink-0">
              <a href={launchUrl} target="_blank" rel="noopener noreferrer">
                Open full page <ArrowUpRight className="w-3 h-3" />
              </a>
            </Button>
          </div>
          <div className="w-full rounded-2xl border bg-muted/10 overflow-hidden shadow-inner p-4">
            <LiveScreenPreview href={previewPath} title="House Hall of Fame preview" viewport="fullscreen" />
          </div>
        </div>
      )}
    </div>
  );
}
