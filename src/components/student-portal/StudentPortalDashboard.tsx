'use client';

import { useEffect, useMemo, useState } from 'react';
import { Gift, History, Home, LogOut, Star, Target, Trophy } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { useSettings } from '@/components/providers/SettingsProvider';
import type { Badge, Goal, HistoryItem, House, LibraryItem, Prize, Student } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge as UiBadge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn, getStudentNickname } from '@/lib/utils';
import { EarnedBadgesShowcase } from '@/components/badges/EarnedBadgesShowcase';
import { HouseBadge } from '@/components/houses/HouseBadge';
import { HouseHallOfFameCard } from '@/components/houses/HouseHallOfFameCard';
import { getStudentPointTypeTotals } from '@/lib/students/studentPointTypes';
import { listStudentLibraryBooksRead } from '@/lib/library/libraryStudentHistory';
import { StudentPortalMyBooksCard } from './StudentPortalMyBooksCard';
import { StudentPortalMyHouseCard } from './StudentPortalMyHouseCard';
import { useSchoolSurfaceSnapshotReporter } from '@/hooks/useSchoolSurfaceSnapshotReporter';
import { STUDENT_PORTAL_PREVIEW_DEVICE_ID } from '@/lib/kiosk/kioskScreenTypes';

type Props = {
  schoolId: string;
  studentId: string;
  onSignOut: () => void;
  signingOut?: boolean;
};

type PortalGoal = Goal & { progress: number };

type DashboardData = {
  ok: true;
  student: Student;
  activities: HistoryItem[];
  prizes: Prize[];
  badges: Badge[];
  libraryCheckouts: LibraryItem[];
  houses: House[];
  goals: PortalGoal[];
};

type DashboardError = {
  ok?: false;
  error?: string;
};

export function StudentPortalDashboard({ schoolId, studentId, onSignOut, signingOut }: Props) {
  const { auth } = useFirebase();
  const { settings } = useSettings();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth || !schoolId || !studentId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      const user = auth.currentUser;
      if (!user) throw new Error('Session expired. Sign in again with your student ID.');

      const idToken = await user.getIdToken();
      const res = await fetch('/api/student-portal/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, schoolId, studentId }),
      });
      const json = (await res.json().catch(() => ({}))) as DashboardData | DashboardError;

      if (!res.ok || json.ok !== true) {
        throw new Error('error' in json && json.error ? json.error : 'Could not load student dashboard.');
      }

      if (!cancelled) {
        setData(json);
        setLoading(false);
      }
    })().catch((e) => {
      if (!cancelled) {
        setError(e instanceof Error ? e.message : 'Could not load student dashboard.');
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [auth, schoolId, studentId]);

  const student = data?.student ?? null;
  const activities = data?.activities ?? [];
  const prizes = useMemo(() => data?.prizes ?? [], [data?.prizes]);
  const badges = data?.badges ?? [];
  const houses = useMemo(() => data?.houses ?? [], [data?.houses]);
  const goals = data?.goals ?? [];

  const myLibraryBooks = useMemo(
    () => (data?.libraryCheckouts ?? []).filter((item) => item.status === 'checked_out'),
    [data?.libraryCheckouts],
  );
  const libraryBooksRead = useMemo(
    () => listStudentLibraryBooksRead(activities),
    [activities],
  );

  const visiblePrizes = useMemo(
    () => prizes.filter((p) => p.inStock !== false && (p.stockCount == null || p.stockCount > 0)),
    [prizes],
  );

  const standings = useMemo(
    () => [...houses].sort((a, b) => (b.points ?? 0) - (a.points ?? 0)).map((h, i) => ({ ...h, rank: i + 1 })),
    [houses],
  );

  const myHouse = useMemo(
    () => (student?.houseId ? houses.find((h) => h.id === student.houseId) : undefined),
    [houses, student?.houseId],
  );
  const myHouseRank = standings.find((h) => h.id === student?.houseId)?.rank;

  const displayName = student ? getStudentNickname(student) : 'Student';
  const pointTypeTotals = useMemo(
    () => (student ? getStudentPointTypeTotals(student) : []),
    [student],
  );

  useSchoolSurfaceSnapshotReporter({
    schoolId,
    surface: 'studentPortal',
    deviceId: STUDENT_PORTAL_PREVIEW_DEVICE_ID,
    enabled: Boolean(schoolId && studentId && student),
    studentId,
    studentName: displayName,
    firstCaptureOnly: true,
  });

  if (loading && !student) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        Loading your rewards...
      </div>
    );
  }

  if (error || !student) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>{error ? 'Could not load dashboard' : 'Session expired'}</CardTitle>
          <CardDescription>{error || 'Sign in again with your student ID.'}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onSignOut}>Back to sign in</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8"
      data-kiosk-snapshot-root
      data-intro-tour="student-portal-dashboard"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Student home</p>
          <h1 className="font-headline text-3xl font-black tracking-tight">{displayName}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            View your points and rewards. Redeem prizes at school on the kiosk.
          </p>
        </div>
        <Button variant="outline" className="rounded-xl" onClick={onSignOut} disabled={signingOut}>
          <LogOut className="mr-2 h-4 w-4" aria-hidden />
          {signingOut ? 'Signing out...' : 'Sign out'}
        </Button>
      </div>

      <Card className="border-t-4 border-primary shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Star className="h-5 w-5 text-primary" aria-hidden />
            Points balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-headline text-5xl font-black tabular-nums text-primary">{student.points ?? 0}</p>
          {typeof student.lifetimePoints === 'number' ? (
            <p className="text-sm text-muted-foreground mt-2">Lifetime: {student.lifetimePoints}</p>
          ) : null}
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Point types</p>
            {pointTypeTotals.length > 0 ? (
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {pointTypeTotals.map((row) => (
                  <li key={row.label} className="flex items-center justify-between gap-3 rounded-xl border bg-muted/30 px-3 py-2 text-sm">
                    <span className="font-semibold">{row.label}</span>
                    <span className="font-black tabular-nums text-primary">{row.points.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No point types yet.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {settings.enableGoals && goals.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Target className="h-5 w-5 text-primary" aria-hidden />
              Your goals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {goals.map((goal) => {
              const target = Math.max(0, Number(goal.targetPoints || 0));
              const progress = Math.max(0, Number(goal.progress || 0));
              const pct = target > 0 ? Math.min(100, Math.round((progress / target) * 100)) : 0;
              const label =
                goal.type === 'class'
                  ? 'Class goal'
                  : goal.type === 'prize_savings'
                    ? 'Savings goal'
                    : 'Personal goal';
              return (
                <div key={goal.id} className="space-y-2 rounded-2xl border border-border/60 bg-muted/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
                      <p className="font-bold leading-snug">{goal.title}</p>
                      {goal.description ? (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{goal.description}</p>
                      ) : null}
                    </div>
                    <span className="shrink-0 whitespace-nowrap text-xs font-black tabular-nums text-primary">
                      {progress.toLocaleString()} / {target.toLocaleString()}
                    </span>
                  </div>
                  <Progress value={pct} className="h-2" />
                  {goal.status === 'completed' ? (
                    <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Completed</p>
                  ) : null}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      {settings.enableBadges ? (
        <EarnedBadgesShowcase student={student} badges={badges} enableBadges={settings.enableBadges} />
      ) : null}

      {settings.enableHouses && student.houseId && myHouse ? (
        <Card className="border-t-4" style={{ borderTopColor: myHouse.color }}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Home className="h-5 w-5 text-primary" aria-hidden />
              My house
            </CardTitle>
            <CardDescription>
              {myHouse.motto ? `"${myHouse.motto}"` : `You belong to ${myHouse.name}.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <HouseBadge house={myHouse} size="lg" />
              {myHouseRank ? (
                <span className="text-sm font-semibold text-muted-foreground">
                  <Trophy className="mr-0.5 inline h-3.5 w-3.5 text-primary" />
                  {myHouseRank}
                  {myHouseRank === 1 ? 'st' : myHouseRank === 2 ? 'nd' : myHouseRank === 3 ? 'rd' : 'th'} place
                </span>
              ) : null}
            </div>
            <HouseHallOfFameCard houses={houses} currentHouseId={student.houseId} compact />
          </CardContent>
        </Card>
      ) : null}

      {settings.payLibrary !== false && (myLibraryBooks.length > 0 || libraryBooksRead.length > 0) ? (
        <StudentPortalMyBooksCard items={myLibraryBooks} booksRead={libraryBooksRead} />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" aria-hidden />
            Prize shop
          </CardTitle>
          <CardDescription>Available at school - redeem on the in-school kiosk.</CardDescription>
        </CardHeader>
        <CardContent>
          {visiblePrizes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No prizes listed right now.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {visiblePrizes.slice(0, 12).map((p) => (
                <li
                  key={p.id}
                  className={cn(
                    'rounded-xl border bg-muted/30 px-3 py-2 text-sm font-medium',
                    (p.points ?? 0) > (student.points ?? 0) && 'opacity-60',
                  )}
                >
                  <span>{p.name}</span>
                  <UiBadge variant="secondary" className="ml-2 tabular-nums">
                    {p.points ?? 0} pts
                  </UiBadge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" aria-hidden />
            Recent activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[220px] pr-3">
            {!activities.length ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <ul className="space-y-2">
                {activities.map((a) => (
                  <li key={a.id} className="flex justify-between gap-3 text-sm border-b border-border/60 pb-2">
                    <span className="text-foreground">{a.desc}</span>
                    <span
                      className={cn(
                        'shrink-0 font-bold tabular-nums',
                        (a.amount ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600',
                      )}
                    >
                      {(a.amount ?? 0) >= 0 ? '+' : ''}
                      {a.amount ?? 0}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
