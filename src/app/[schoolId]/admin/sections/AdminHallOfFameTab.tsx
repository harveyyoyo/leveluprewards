'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Trophy,
  ArrowUpRight,
  Loader2,
  Settings2,
  Shield,
  Users,
  User,
  Target,
  LayoutGrid,
  List,
  Sparkles,
  Tv,
  Monitor,
  Calendar,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import { collection, limit, orderBy, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Helper } from '@/components/ui/helper';
import { Button } from '@/components/ui/button';
import type { Student, Class, Category } from '@/lib/types';
import { TabWalkthroughHeaderAction } from '@/components/tabWalkthrough/TabWalkthroughContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ContentSectionTreeNav } from '@/components/ui/content-section-tree-nav';
import { useSettings } from '@/components/providers/SettingsProvider';
import { LiveScreenPreview } from '@/components/admin/LiveScreenPreview';
import { cn } from '@/lib/utils';

export function AdminHallOfFameTab({ schoolId }: { schoolId: string }) {
  const firestore = useFirestore();
  const { settings, updateSettings } = useSettings();
  const [rankType, setRankType] = useState<'students' | 'classes' | 'houses' | 'goals'>(
    settings.hallOfFameRankType ?? 'students',
  );
  const [sortBy, setSortBy] = useState<string>(settings.hallOfFameSortBy ?? 'lifetimePoints');
  const [scope, setScope] = useState<'all' | string>(settings.hallOfFameScope ?? 'all');
  const [limitCount, setLimitCount] = useState<number>(settings.hallOfFameLimit ?? 50);
  const [podiumSize, setPodiumSize] = useState<number>(settings.hallOfFamePodiumSize ?? 3);
  const [gridLayout, setGridLayout] = useState<boolean>(settings.hallOfFameGridLayout ?? true);
  const [section, setSection] = useState<'settings' | 'preview'>('settings');

  useEffect(() => setRankType(settings.hallOfFameRankType ?? 'students'), [settings.hallOfFameRankType]);
  useEffect(() => setSortBy(settings.hallOfFameSortBy ?? 'lifetimePoints'), [settings.hallOfFameSortBy]);
  useEffect(() => setScope(settings.hallOfFameScope ?? 'all'), [settings.hallOfFameScope]);
  useEffect(() => setLimitCount(settings.hallOfFameLimit ?? 50), [settings.hallOfFameLimit]);
  useEffect(() => setPodiumSize(settings.hallOfFamePodiumSize ?? 3), [settings.hallOfFamePodiumSize]);
  useEffect(() => setGridLayout(settings.hallOfFameGridLayout ?? true), [settings.hallOfFameGridLayout]);

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

  const topStudentsQuery = useMemoFirebase(() => {
    if (!schoolId) return null;
    return query(
      collection(firestore, 'schools', schoolId, 'students'),
      orderBy('lifetimePoints', 'desc'),
      limit(10),
    );
  }, [firestore, schoolId]);

  const { data: topStudents, isLoading } = useCollection<Student>(topStudentsQuery);

  const fullHref = useMemo(() => {
    const params = new URLSearchParams();
    params.set('fullscreen', '1');
    return `/${schoolId}/hall-of-fame?${params.toString()}`;
  }, [schoolId]);

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
    <Card className="w-full border-0 bg-background shadow-lg rounded-3xl overflow-hidden">
      {/* Decorative colored glow background */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-amber-500/10 to-purple-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <CardHeader className="p-6 md:p-8 border-b bg-gradient-to-r from-muted/50 via-background to-muted/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold mb-2">
              <Trophy className="w-3.5 h-3.5" />
              <span>Big Screen Mode Available</span>
            </div>
            <Helper content="Configure, customize, and launch a real-time points leaderboard for lobby screens, TVs, or projectors.">
              <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                Hall of Fame
              </CardTitle>
            </Helper>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <TabWalkthroughHeaderAction />
            <Button asChild className="rounded-xl font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md shadow-amber-500/25 border-0 gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]">
              <Link href={fullHref} target="_blank" rel="noopener noreferrer">
                Launch TV Display <ArrowUpRight className="w-4 h-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 md:p-8 space-y-8">
        <ContentSectionTreeNav
          branchLabel="Hall of Fame"
          items={[
            { id: 'settings', label: 'Display Settings' },
            { id: 'preview', label: 'Live TV Preview' },
          ]}
          value={section}
          onValueChange={(id) => setSection(id as 'settings' | 'preview')}
          className="bg-muted/50 p-1.5 rounded-2xl border"
        />

        {section === 'settings' ? (
          <div className="space-y-8">
            {/* Rank Type Card Selector */}
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold tracking-tight text-foreground">Select Leaderboard Type</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Choose the grouping structure shown on the big screen.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                        'flex flex-col items-start text-left p-5 rounded-2xl border transition-all relative overflow-hidden group',
                        isSelected
                          ? opt.activeColorClass
                          : 'border-border bg-card hover:bg-muted/20 hover:border-muted-foreground/30',
                      )}
                    >
                      <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110', opt.colorClass)}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <p className="font-bold text-sm text-foreground">{opt.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
                        {opt.description}
                      </p>

                      {isSelected && (
                        <div className="absolute top-3 right-3 h-2 w-2 rounded-full bg-primary animate-pulse" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Parameter Controls Panel */}
            <div className="rounded-3xl border bg-muted/15 p-6 md:p-8 space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b">
                <SlidersHorizontal className="w-4 h-4 text-amber-500" aria-hidden />
                <p className="text-sm font-bold tracking-tight">Leaderboard Details & Styling</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sort By Fields</Label>
                  <Select
                    value={sortBy}
                    onValueChange={(v) => {
                      setSortBy(v);
                      updateSettings({ hallOfFameSortBy: v });
                    }}
                  >
                    <SelectTrigger className="rounded-xl border bg-background font-medium h-10 shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lifetimePoints">🏆 Lifetime Points</SelectItem>
                      <SelectItem value="points">✨ Current Points Balance</SelectItem>
                      <SelectItem value="period_day">☀️ Points Earned Today</SelectItem>
                      <SelectItem value="period_week">📅 Points Earned This Week</SelectItem>
                      <SelectItem value="period_month">🌙 Points Earned This Month</SelectItem>
                      {(categories || []).map((c) => (
                        <SelectItem key={c.id} value={c.name}>
                          🏷️ {c.name} Points
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Classroom Scope</Label>
                  <Select
                    value={scope}
                    onValueChange={(v) => {
                      setScope(v);
                      updateSettings({ hallOfFameScope: v });
                    }}
                  >
                    <SelectTrigger className="rounded-xl border bg-background font-medium h-10 shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">🌐 Entire School</SelectItem>
                      {(classes || []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          🏫 {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Show Top</Label>
                    <Input
                      type="number"
                      min={1}
                      value={limitCount}
                      onChange={(e) => {
                        const next = Math.max(1, parseInt(e.target.value) || 1);
                        setLimitCount(next);
                        updateSettings({ hallOfFameLimit: next });
                      }}
                      className="rounded-xl border bg-background font-bold h-10 shadow-sm text-center"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Podium Size</Label>
                    <Input
                      type="number"
                      min={0}
                      max={3}
                      value={podiumSize}
                      onChange={(e) => {
                        const next = Math.max(0, Math.min(3, parseInt(e.target.value) || 0));
                        setPodiumSize(next);
                        updateSettings({ hallOfFamePodiumSize: next });
                      }}
                      className="rounded-xl border bg-background font-bold h-10 shadow-sm text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Switches Grid */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between rounded-2xl border bg-background p-4 shadow-sm hover:border-amber-500/20 transition-all">
                  <div className="min-w-0 pr-4">
                    <p className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                      <LayoutGrid className="w-4 h-4 text-blue-500" />
                      Multi-Column Grid
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Display students in an elegant grid rather than list view.</p>
                  </div>
                  <Switch
                    checked={gridLayout}
                    onCheckedChange={(v) => {
                      setGridLayout(v);
                      updateSettings({ hallOfFameGridLayout: v });
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Launch Tip Panel */}
            <div className="rounded-2xl bg-gradient-to-r from-amber-500/5 to-purple-500/5 border border-amber-500/10 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                  <Tv className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Ready for the Big Screen?</h4>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed max-w-lg">
                    Hook a computer up to your gym, lobby, or classroom monitor. Tap the top button to open a responsive full-screen dashboard that refreshes in real-time as points are awarded!
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" className="rounded-xl border-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 font-bold shrink-0 self-stretch sm:self-auto flex items-center justify-center gap-1">
                <Link href={fullHref} target="_blank" rel="noopener noreferrer">
                  Launch <ArrowUpRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Helper content="This preview reflects exact layout, colors, and live updates.">
                  <h3 className="text-base font-bold text-foreground">Live Monitor Preview</h3>
                </Helper>
              </div>
              <Button asChild size="sm" variant="ghost" className="text-xs gap-1 font-semibold text-muted-foreground hover:text-foreground">
                <Link href={fullHref} target="_blank" rel="noopener noreferrer">
                  Open full page <ArrowUpRight className="w-3 h-3" />
                </Link>
              </Button>
            </div>

            <div className="w-full rounded-2xl border bg-muted/10 overflow-hidden shadow-inner">
              {isLoading ? (
                <div className="flex items-center justify-center p-20 gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                  Loading Live Preview…
                </div>
              ) : (
                <LiveScreenPreview href={fullHref} title="Live preview (matches big screen)" viewport="fullscreen" />
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
