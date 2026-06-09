'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  LayoutGrid,
  List,
  Monitor,
  Play,
  Shield,
  Smartphone,
  Target,
  User,
  Users,
} from 'lucide-react';
import { HallOfFameScaledPreview } from '@/components/displays/HallOfFameScaledPreview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { collection } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Settings } from '@/components/providers/SettingsProvider';
import { buildHallOfFameDisplayHref } from '@/lib/displays/displayRoutes';
import { clampHallOfFamePodiumSize, clampHallOfFameGridColumns } from '@/lib/hallOfFameUrlConfig';
import type { Class, Category } from '@/lib/types';
import { cn } from '@/lib/utils';

type HallOfFameSettingsPanelProps = {
  schoolId: string;
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
};

export function HallOfFameSettingsPanel({
  schoolId,
  settings,
  updateSettings,
}: HallOfFameSettingsPanelProps) {
  const firestore = useFirestore();
  const [rankType, setRankType] = useState<'students' | 'classes' | 'houses' | 'goals'>(
    settings.hallOfFameRankType ?? 'students',
  );
  const [sortBy, setSortBy] = useState<string>(settings.hallOfFameSortBy ?? 'lifetimePoints');
  const [scope, setScope] = useState<'all' | string>(settings.hallOfFameScope ?? 'all');
  const [limitCount, setLimitCount] = useState<number>(settings.hallOfFameLimit ?? 50);
  const [podiumSize, setPodiumSize] = useState<number>(
    clampHallOfFamePodiumSize(settings.hallOfFamePodiumSize),
  );
  const [autoScroll, setAutoScroll] = useState<boolean>(settings.hallOfFameAutoScroll ?? false);
  const [gridLayout, setGridLayout] = useState<boolean>(settings.hallOfFameGridLayout ?? true);
  const [gridColumns, setGridColumns] = useState<number>(clampHallOfFameGridColumns(settings.hallOfFameGridColumns));
  const [layout, setLayout] = useState<'landscape' | 'portrait'>(settings.hallOfFameLayout ?? 'landscape');

  useEffect(() => setRankType(settings.hallOfFameRankType ?? 'students'), [settings.hallOfFameRankType]);
  useEffect(() => setSortBy(settings.hallOfFameSortBy ?? 'lifetimePoints'), [settings.hallOfFameSortBy]);
  useEffect(() => setScope(settings.hallOfFameScope ?? 'all'), [settings.hallOfFameScope]);
  useEffect(() => setLimitCount(settings.hallOfFameLimit ?? 50), [settings.hallOfFameLimit]);
  useEffect(() => setPodiumSize(clampHallOfFamePodiumSize(settings.hallOfFamePodiumSize)), [settings.hallOfFamePodiumSize]);
  useEffect(() => setAutoScroll(settings.hallOfFameAutoScroll ?? false), [settings.hallOfFameAutoScroll]);
  useEffect(() => setGridLayout(settings.hallOfFameGridLayout ?? true), [settings.hallOfFameGridLayout]);
  useEffect(() => setGridColumns(clampHallOfFameGridColumns(settings.hallOfFameGridColumns)), [settings.hallOfFameGridColumns]);
  useEffect(() => setLayout(settings.hallOfFameLayout ?? 'landscape'), [settings.hallOfFameLayout]);

  const classesQuery = useMemoFirebase(
    () => (schoolId ? collection(firestore, 'schools', schoolId, 'classes') : null),
    [firestore, schoolId],
  );
  const { data: classes } = useCollection<Class>(classesQuery);

  const categoriesQuery = useMemoFirebase(
    () => (schoolId ? collection(firestore, 'schools', schoolId, 'categories') : null),
    [firestore, schoolId],
  );
  const { data: categories } = useCollection<Category>(categoriesQuery);

  const fullHref = useMemo(
    () => buildHallOfFameDisplayHref(schoolId, { fullscreen: true }),
    [schoolId],
  );

  const rankOptions = [
    {
      id: 'students' as const,
      label: 'Students',
      description: 'Individual student standings ranked by point totals.',
      icon: User,
      colorClass: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
      activeColorClass: 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/[0.04]',
    },
    {
      id: 'classes' as const,
      label: 'Class standings',
      description: 'Compare average points earned per class room.',
      icon: Users,
      colorClass: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
      activeColorClass: 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-500/[0.04]',
    },
    {
      id: 'houses' as const,
      label: 'House standings',
      description: 'School house leaderboard for high-spirit competitions.',
      icon: Shield,
      colorClass: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
      activeColorClass: 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-500/[0.04]',
      requiresHouses: true,
    },
    {
      id: 'goals' as const,
      label: 'School goals',
      description: 'Progress bar visualizers for school-wide milestones.',
      icon: Target,
      colorClass: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
      activeColorClass: 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/[0.04]',
    },
  ];

  return (
    <div className="overflow-hidden rounded-xl border bg-muted/10">
      <div className="flex h-[min(80dvh,860px)] min-h-[26rem] flex-col lg:flex-row">
        <div className="flex h-[min(42dvh,400px)] min-h-0 shrink-0 flex-col border-b p-2.5 sm:p-3 lg:h-full lg:w-1/2 lg:max-w-[50%] lg:shrink-0 lg:border-b-0 lg:border-r">
          <HallOfFameScaledPreview
            layout={layout}
            className="h-full min-h-0"
            openDisplayHref={fullHref}
            onLayoutChange={(next) => {
              setLayout(next);
              updateSettings({ hallOfFameLayout: next });
            }}
          />
        </div>

        <div className="min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-3 sm:p-3.5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {rankOptions.map((opt) => {
                  if (opt.requiresHouses && !settings.enableHouses) return null;
                  const isSelected = rankType === opt.id;
                  const Icon = opt.icon;

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setRankType(opt.id);
                        updateSettings({ hallOfFameRankType: opt.id });
                      }}
                      className={cn(
                        'flex flex-col items-start text-left rounded-2xl border p-4 transition-all relative overflow-hidden group',
                        isSelected
                          ? opt.activeColorClass
                          : 'border-border bg-card hover:bg-muted/20 hover:border-muted-foreground/30',
                      )}
                    >
                      <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center mb-3', opt.colorClass)}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <p className="font-bold text-sm text-foreground">{opt.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{opt.description}</p>
                      {isSelected ? (
                        <div className="absolute top-3 right-3 h-2 w-2 rounded-full bg-primary animate-pulse" />
                      ) : null}
                    </button>
                  );
                })}
          </div>

          <div className="rounded-2xl border bg-muted/15 p-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Sort by</Label>
                  <Select
                    value={sortBy}
                    onValueChange={(v) => {
                      setSortBy(v);
                      updateSettings({ hallOfFameSortBy: v });
                    }}
                  >
                    <SelectTrigger className="rounded-xl border bg-background font-medium h-9 text-sm shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lifetimePoints">Lifetime Points</SelectItem>
                      <SelectItem value="points">Current Points Balance</SelectItem>
                      <SelectItem value="period_day">Points Earned Today</SelectItem>
                      <SelectItem value="period_week">Points Earned This Week</SelectItem>
                      <SelectItem value="period_month">Points Earned This Month</SelectItem>
                      {(categories || []).map((c) => (
                        <SelectItem key={c.id} value={c.name}>
                          {c.name} Points
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Classroom scope</Label>
                  <Select
                    value={scope}
                    onValueChange={(v) => {
                      setScope(v);
                      updateSettings({ hallOfFameScope: v });
                    }}
                  >
                    <SelectTrigger className="rounded-xl border bg-background font-medium h-9 text-sm shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Entire School</SelectItem>
                      {(classes || []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Screen layout</Label>
                  <Select
                    value={layout}
                    onValueChange={(v: 'landscape' | 'portrait') => {
                      setLayout(v);
                      updateSettings({ hallOfFameLayout: v });
                    }}
                  >
                    <SelectTrigger className="rounded-xl border bg-background font-medium h-9 text-sm shadow-sm">
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

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Show top</Label>
                  <Input
                    type="number"
                    min={1}
                    value={limitCount}
                    onChange={(e) => {
                      const next = Math.max(1, parseInt(e.target.value, 10) || 1);
                      setLimitCount(next);
                      updateSettings({ hallOfFameLimit: next });
                    }}
                    className="rounded-xl border bg-background font-bold h-9 text-sm shadow-sm text-center"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Podium size</Label>
                  <Select
                    value={String(podiumSize)}
                    onValueChange={(v) => {
                      const next = clampHallOfFamePodiumSize(parseInt(v, 10));
                      setPodiumSize(next);
                      updateSettings({ hallOfFamePodiumSize: next });
                    }}
                  >
                    <SelectTrigger className="rounded-xl border bg-background font-bold h-9 text-sm shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Champion only (1)</SelectItem>
                      <SelectItem value="3">Top 3 on podium</SelectItem>
                      <SelectItem value="5">Top 5 on podium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-2 border-t">
                <div className="flex items-center justify-between rounded-2xl border bg-background p-3 shadow-sm">
                  <div className="min-w-0 pr-4">
                    <p className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                      <Play className="w-4 h-4 text-emerald-500 fill-emerald-500/20" aria-hidden />
                      Auto-scroll leaderboard
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Loop through entries on screen.</p>
                  </div>
                  <Switch
                    checked={autoScroll}
                    onCheckedChange={(v) => {
                      setAutoScroll(v);
                      updateSettings({ hallOfFameAutoScroll: v });
                    }}
                  />
                </div>

                <div className="flex items-center justify-between rounded-2xl border bg-background p-3 shadow-sm">
                  <div className="min-w-0 pr-4">
                    <p className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                      {gridLayout ? <LayoutGrid className="w-4 h-4 text-blue-500" aria-hidden /> : <List className="w-4 h-4 text-blue-500" aria-hidden />}
                      Multi-column grid
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Grid layout vs. wide list rows.</p>
                  </div>
                  <Switch
                    checked={gridLayout}
                    onCheckedChange={(v) => {
                      setGridLayout(v);
                      updateSettings({ hallOfFameGridLayout: v });
                    }}
                  />
                </div>

                {gridLayout ? (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Grid columns</Label>
                    <Select
                      value={String(gridColumns)}
                      onValueChange={(v) => {
                        const next = Math.max(1, Math.min(4, parseInt(v, 10) || 3));
                        setGridColumns(next);
                        updateSettings({ hallOfFameGridColumns: next });
                      }}
                    >
                      <SelectTrigger className="rounded-xl border bg-background font-medium h-9 text-sm shadow-sm max-w-xs">
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
    </div>
  );
}
