'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
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

export function AdminHallOfFameTab({ schoolId }: { schoolId: string }) {
  const firestore = useFirestore();
  const [rankType, setRankType] = useState<'students' | 'classes' | 'goals'>('students');
  const [sortBy, setSortBy] = useState<string>('lifetimePoints');
  const [scope, setScope] = useState<'all' | string>('all');
  const [limitCount, setLimitCount] = useState<number>(50);
  const [podiumSize, setPodiumSize] = useState<number>(3);
  const [autoScroll, setAutoScroll] = useState<boolean>(false);
  const [gridLayout, setGridLayout] = useState<boolean>(true);

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
    params.set('rankType', rankType);
    params.set('sortBy', sortBy);
    params.set('scope', scope);
    params.set('limit', String(limitCount));
    params.set('podiumSize', String(podiumSize));
    params.set('autoScroll', autoScroll ? '1' : '0');
    params.set('grid', gridLayout ? '1' : '0');
    return `/${schoolId}/halloffame?${params.toString()}`;
  }, [schoolId, rankType, sortBy, scope, limitCount, podiumSize, autoScroll, gridLayout]);

  return (
    <Card className="border-t-4 border-primary shadow-md">
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2 rounded-2xl border bg-muted/10 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Settings2 className="w-4 h-4 text-muted-foreground" aria-hidden />
              <p className="text-sm font-bold">Display settings</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Rank type</Label>
                <Select value={rankType} onValueChange={(v: any) => setRankType(v)}>
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
                <Select value={sortBy} onValueChange={setSortBy}>
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
                <Select value={scope} onValueChange={setScope}>
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
                    onChange={(e) => setLimitCount(Math.max(1, parseInt(e.target.value) || 1))}
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
                    onChange={(e) =>
                      setPodiumSize(Math.max(0, Math.min(3, parseInt(e.target.value) || 0)))
                    }
                    className="rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border bg-background px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold">Auto-scroll</p>
                  <p className="text-[11px] text-muted-foreground">Scroll the full page automatically.</p>
                </div>
                <Switch checked={autoScroll} onCheckedChange={setAutoScroll} />
              </div>

              <div className="flex items-center justify-between rounded-xl border bg-background px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold">Grid layout</p>
                  <p className="text-[11px] text-muted-foreground">Multi-column leaderboard list.</p>
                </div>
                <Switch checked={gridLayout} onCheckedChange={setGridLayout} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-muted/10 p-4">
            <p className="text-sm font-bold mb-2">Quick preview</p>
            <p className="text-[11px] text-muted-foreground mb-3">
              Preview is always top lifetime points; the full page uses your settings.
            </p>
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                Loading…
              </div>
            ) : (
              <div className="space-y-2">
                {(topStudents || []).slice(0, 5).map((s, idx) => {
                  const name = `${getStudentNickname(s)}${s.lastName ? ` ${s.lastName}` : ''}`.trim();
                  return (
                    <div key={s.id} className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-muted-foreground/70">{idx + 1}</span>
                      <span className="text-xs font-semibold truncate flex-1">{name || 'Student'}</span>
                      <span className="text-xs font-black text-primary">{(s.lifetimePoints || 0).toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

