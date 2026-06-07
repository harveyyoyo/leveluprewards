'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  LayoutGrid,
  List,
  Play,
  Shield,
  SlidersHorizontal,
  Smartphone,
  Monitor,
  Trophy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useSettings } from '@/components/providers/SettingsProvider';
import { resolveAppAbsoluteUrl } from '@/lib/appUrl';
import { buildHouseHallOfFameHref, isHouseStudentPointsRollupEnabled } from '@/lib/houses/housePointsSettings';
import { clampHallOfFamePodiumSize, clampHallOfFameGridColumns } from '@/lib/hallOfFameUrlConfig';

export function AdminHouseHallOfFamePanel({ schoolId }: { schoolId: string }) {
  const { settings, updateSettings } = useSettings();

  const [sortBy, setSortBy] = useState(
    settings.houseHallOfFameSortBy ?? settings.hallOfFameSortBy ?? 'lifetimePoints',
  );
  const [limitCount, setLimitCount] = useState(settings.houseHallOfFameLimit ?? settings.hallOfFameLimit ?? 50);
  const [podiumSize, setPodiumSize] = useState(
    clampHallOfFamePodiumSize(settings.houseHallOfFamePodiumSize ?? settings.hallOfFamePodiumSize),
  );
  const [autoScroll, setAutoScroll] = useState(settings.houseHallOfFameAutoScroll ?? settings.hallOfFameAutoScroll ?? false);
  const [gridLayout, setGridLayout] = useState(settings.houseHallOfFameGridLayout ?? settings.hallOfFameGridLayout ?? true);
  const [gridColumns, setGridColumns] = useState(
    clampHallOfFameGridColumns(settings.houseHallOfFameGridColumns ?? settings.hallOfFameGridColumns),
  );
  const [layout, setLayout] = useState<'landscape' | 'portrait'>(
    settings.houseHallOfFameLayout ?? settings.hallOfFameLayout ?? 'landscape',
  );

  useEffect(() => setSortBy(settings.houseHallOfFameSortBy ?? settings.hallOfFameSortBy ?? 'lifetimePoints'), [settings.houseHallOfFameSortBy, settings.hallOfFameSortBy]);
  useEffect(() => setLimitCount(settings.houseHallOfFameLimit ?? settings.hallOfFameLimit ?? 50), [settings.houseHallOfFameLimit, settings.hallOfFameLimit]);
  useEffect(
    () => setPodiumSize(clampHallOfFamePodiumSize(settings.houseHallOfFamePodiumSize ?? settings.hallOfFamePodiumSize)),
    [settings.houseHallOfFamePodiumSize, settings.hallOfFamePodiumSize],
  );
  useEffect(() => setAutoScroll(settings.houseHallOfFameAutoScroll ?? settings.hallOfFameAutoScroll ?? false), [settings.houseHallOfFameAutoScroll, settings.hallOfFameAutoScroll]);
  useEffect(() => setGridLayout(settings.houseHallOfFameGridLayout ?? settings.hallOfFameGridLayout ?? true), [settings.houseHallOfFameGridLayout, settings.hallOfFameGridLayout]);
  useEffect(
    () => setGridColumns(clampHallOfFameGridColumns(settings.houseHallOfFameGridColumns ?? settings.hallOfFameGridColumns)),
    [settings.houseHallOfFameGridColumns, settings.hallOfFameGridColumns],
  );
  useEffect(() => setLayout(settings.houseHallOfFameLayout ?? settings.hallOfFameLayout ?? 'landscape'), [settings.houseHallOfFameLayout, settings.hallOfFameLayout]);

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
        houseHallOfFameGridColumns: gridColumns,
        houseHallOfFameLayout: layout,
      }),
    [schoolId, sortBy, limitCount, podiumSize, autoScroll, gridLayout, gridColumns, layout],
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
            Monitor link pins <code className="text-[10px]">rankType=houses</code> only — podium size, layout, and other options update live from these settings.
          </p>
        </div>
        <Button asChild className="rounded-xl font-bold shrink-0">
          <a href={launchUrl} target="_blank" rel="noopener noreferrer">
            Launch monitor display <ArrowUpRight className="ml-1.5 h-4 w-4" />
          </a>
        </Button>
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl border bg-card/60 p-4 flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0">
            <Shield className="w-5 h-5" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">House standings only</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Point totals follow the Houses tab. When linked to student rewards, standings roll up from LevelUp; when
              off, house points are given manually on Rosters &amp; Points.
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
              <Select
                value={String(podiumSize)}
                onValueChange={(v) => {
                  const next = clampHallOfFamePodiumSize(parseInt(v, 10));
                  setPodiumSize(next);
                  updateSettings({ houseHallOfFamePodiumSize: next });
                }}
              >
                <SelectTrigger className="rounded-xl border bg-background font-bold h-10 shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Champion only (1)</SelectItem>
                  <SelectItem value="3">Top 3 on podium</SelectItem>
                  <SelectItem value="5">Top 5 on podium</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-1">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Screen layout</Label>
              <Select
                value={layout}
                onValueChange={(v: 'landscape' | 'portrait') => {
                  setLayout(v);
                  updateSettings({ houseHallOfFameLayout: v });
                }}
              >
                <SelectTrigger className="rounded-xl border bg-background font-medium h-10 shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="landscape">
                    <span className="inline-flex items-center gap-2"><Monitor className="w-3.5 h-3.5" /> Landscape</span>
                  </SelectItem>
                  <SelectItem value="portrait">
                    <span className="inline-flex items-center gap-2"><Smartphone className="w-3.5 h-3.5" /> Portrait</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div className="flex items-center justify-between rounded-2xl border bg-background p-4 shadow-sm">
              <div className="min-w-0 pr-4">
                <p className="text-sm font-bold flex items-center gap-1.5">
                  <Play className="w-4 h-4 text-emerald-500" aria-hidden />
                  Auto-scroll
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Holds at the top for a few seconds before scrolling. Press Esc to stop on the display.</p>
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
                  {gridLayout ? <LayoutGrid className="w-4 h-4 text-blue-500" aria-hidden /> : <List className="w-4 h-4 text-blue-500" aria-hidden />}
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

            {gridLayout ? (
              <div className="md:col-span-2 space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Grid columns</Label>
                <Select
                  value={String(gridColumns)}
                  onValueChange={(v) => {
                    const next = Math.max(1, Math.min(4, parseInt(v, 10) || 3));
                    setGridColumns(next);
                    updateSettings({ houseHallOfFameGridColumns: next });
                  }}
                >
                  <SelectTrigger className="rounded-xl border bg-background font-medium h-10 shadow-sm max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 column</SelectItem>
                    <SelectItem value="2">2 columns</SelectItem>
                    <SelectItem value="3">3 columns</SelectItem>
                    <SelectItem value="4">4 columns</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
