'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Trophy, ArrowUpRight, Loader2, Settings2 } from 'lucide-react';
import { collection, limit, orderBy, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getStudentNickname } from '@/lib/utils';
import type { Student } from '@/lib/types';
import type { Class, Category } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSettings } from '@/components/providers/SettingsProvider';
import { LiveScreenPreview } from '@/components/admin/LiveScreenPreview';

export function AdminHallOfFameTab({ schoolId }: { schoolId: string }) {
  const firestore = useFirestore();
  const { settings, updateSettings } = useSettings();
  const [rankType, setRankType] = useState<'students' | 'classes' | 'goals'>(settings.hallOfFameRankType ?? 'students');
  const [sortBy, setSortBy] = useState<string>(settings.hallOfFameSortBy ?? 'lifetimePoints');
  const [scope, setScope] = useState<'all' | string>(settings.hallOfFameScope ?? 'all');
  const [limitCount, setLimitCount] = useState<number>(settings.hallOfFameLimit ?? 50);
  const [podiumSize, setPodiumSize] = useState<number>(settings.hallOfFamePodiumSize ?? 3);
  const [autoScroll, setAutoScroll] = useState<boolean>(settings.hallOfFameAutoScroll ?? false);
  const [gridLayout, setGridLayout] = useState<boolean>(settings.hallOfFameGridLayout ?? true);

  useEffect(() => setRankType(settings.hallOfFameRankType ?? 'students'), [settings.hallOfFameRankType]);
  useEffect(() => setSortBy(settings.hallOfFameSortBy ?? 'lifetimePoints'), [settings.hallOfFameSortBy]);
  useEffect(() => setScope(settings.hallOfFameScope ?? 'all'), [settings.hallOfFameScope]);
  useEffect(() => setLimitCount(settings.hallOfFameLimit ?? 50), [settings.hallOfFameLimit]);
  useEffect(() => setPodiumSize(settings.hallOfFamePodiumSize ?? 3), [settings.hallOfFamePodiumSize]);
  useEffect(() => setAutoScroll(settings.hallOfFameAutoScroll ?? false), [settings.hallOfFameAutoScroll]);
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

  return (
    <Card className="w-full border-t-4 border-primary shadow-md overflow-hidden">
      <CardHeader className="py-6 flex flex-row items-start justify-between gap-4">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" /> Hall of Fame
          </CardTitle>
          <CardDescription>
            Configure the view here, then open the full-screen display (opens in a new tab).
          </CardDescription>
        </div>
        <Button asChild variant="outline" className="rounded-xl gap-2 shrink-0">
          <Link href={fullHref} target="_blank" rel="noopener noreferrer">
            View full page <ArrowUpRight className="w-4 h-4" aria-hidden />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 mb-6">
          <div className="w-full rounded-2xl border bg-muted/10 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Settings2 className="w-4 h-4 text-muted-foreground" aria-hidden />
              <p className="text-sm font-bold">Display settings</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Rank type</Label>
                <Select
                  value={rankType}
                  onValueChange={(v: any) => {
                    setRankType(v);
                    updateSettings({ hallOfFameRankType: v });
                  }}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="students">Students</SelectItem>
                    <SelectItem value="classes">Class standings</SelectItem>
                    <SelectItem value="goals">School goals</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Sort by</Label>
                <Select
                  value={sortBy}
                  onValueChange={(v) => {
                    setSortBy(v);
                    updateSettings({ hallOfFameSortBy: v });
                  }}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lifetimePoints">Lifetime points</SelectItem>
                    <SelectItem value="points">Current points</SelectItem>
                    <SelectItem value="period_day">Points today</SelectItem>
                    <SelectItem value="period_week">Points this week</SelectItem>
                    <SelectItem value="period_month">Points this month</SelectItem>
                    {(categories || []).map((c) => (
                      <SelectItem key={c.id} value={c.name}>
                        {c.name} points
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Scope</Label>
                <Select
                  value={scope}
                  onValueChange={(v) => {
                    setScope(v);
                    updateSettings({ hallOfFameScope: v });
                  }}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Entire school</SelectItem>
                    {(classes || []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Show top</Label>
                  <Input
                    type="number"
                    min={1}
                    value={limitCount}
                    onChange={(e) => {
                      const next = Math.max(1, parseInt(e.target.value) || 1);
                      setLimitCount(next);
                      updateSettings({ hallOfFameLimit: next });
                    }}
                    className="rounded-xl font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Podium</Label>
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
                    className="rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border bg-background px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold">Auto-scroll</p>
                  <p className="text-[11px] text-muted-foreground">Scroll the full page automatically.</p>
                </div>
                <Switch
                  checked={autoScroll}
                  onCheckedChange={(v) => {
                    setAutoScroll(v);
                    updateSettings({ hallOfFameAutoScroll: v });
                  }}
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border bg-background px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold">Grid layout</p>
                  <p className="text-[11px] text-muted-foreground">Multi-column leaderboard list.</p>
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

          <div className="w-full rounded-2xl border bg-muted/10 p-4">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                Loading…
              </div>
            ) : (
              <LiveScreenPreview href={fullHref} title="Live preview (matches big screen)" viewport="fullscreen" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
