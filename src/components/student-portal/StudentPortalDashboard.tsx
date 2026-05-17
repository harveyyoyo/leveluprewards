'use client';

import { useMemo } from 'react';
import { collection, doc, limit, orderBy, query } from 'firebase/firestore';
import { LogOut, Star, Gift, History } from 'lucide-react';
import { useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { useSettings } from '@/components/providers/SettingsProvider';
import type { Student, Prize, HistoryItem, Badge } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge as UiBadge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn, getStudentNickname } from '@/lib/utils';
import { studentPortalContentClass } from '@/lib/studentPortalLayout';
import { EarnedBadgesShowcase } from '@/components/EarnedBadgesShowcase';
import { StudentGoalsCard } from '@/components/goals/StudentGoalsCard';

type Props = {
  schoolId: string;
  studentId: string;
  portraitDisplay?: boolean;
  onSignOut: () => void;
  signingOut?: boolean;
};

export function StudentPortalDashboard({
  schoolId,
  studentId,
  portraitDisplay = false,
  onSignOut,
  signingOut,
}: Props) {
  const firestore = useFirestore();
  const { settings } = useSettings();

  const studentRef = useMemoFirebase(
    () => (firestore && schoolId && studentId ? doc(firestore, 'schools', schoolId, 'students', studentId) : null),
    [firestore, schoolId, studentId],
  );
  const { data: student, isLoading: studentLoading } = useDoc<Student>(studentRef);

  const activitiesQuery = useMemoFirebase(
    () =>
      firestore && schoolId && studentId
        ? query(
            collection(firestore, 'schools', schoolId, 'students', studentId, 'activities'),
            orderBy('date', 'desc'),
            limit(25),
          )
        : null,
    [firestore, schoolId, studentId],
  );
  const { data: activities } = useCollection<HistoryItem>(activitiesQuery);

  const prizesQuery = useMemoFirebase(
    () => (firestore && schoolId ? collection(firestore, 'schools', schoolId, 'prizes') : null),
    [firestore, schoolId],
  );
  const { data: prizes } = useCollection<Prize>(prizesQuery);

  const badgesQuery = useMemoFirebase(
    () => (firestore && schoolId ? collection(firestore, 'schools', schoolId, 'badges') : null),
    [firestore, schoolId],
  );
  const { data: badges } = useCollection<Badge>(badgesQuery);

  const visiblePrizes = useMemo(() => {
    if (!prizes) return [];
    return prizes.filter((p) => p.inStock !== false && (p.stockCount == null || p.stockCount > 0));
  }, [prizes]);

  const displayName = student ? getStudentNickname(student) : 'Student';

  if (studentLoading && !student) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        Loading your rewards…
      </div>
    );
  }

  if (!student) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Session expired</CardTitle>
          <CardDescription>Sign in again with your student ID.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onSignOut}>Back to sign in</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={studentPortalContentClass(portraitDisplay)}>
      <div
        className={cn(
          'flex gap-3',
          portraitDisplay ? 'flex-col items-stretch' : 'flex-wrap items-start justify-between gap-4',
        )}
      >
        <div className="min-w-0">
          <p
            className={cn(
              'font-semibold uppercase tracking-widest text-primary',
              portraitDisplay ? 'text-xs' : 'text-sm',
            )}
          >
            Student home
          </p>
          <h1
            className={cn(
              'font-headline font-black tracking-tight',
              portraitDisplay ? 'text-2xl' : 'text-3xl',
            )}
          >
            {displayName}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            View your points and rewards. Redeem prizes at school on the kiosk.
          </p>
        </div>
        <Button
          variant="outline"
          className={cn('rounded-xl shrink-0', portraitDisplay && 'w-full')}
          onClick={onSignOut}
          disabled={signingOut}
        >
          <LogOut className="mr-2 h-4 w-4" aria-hidden />
          {signingOut ? 'Signing out…' : 'Sign out'}
        </Button>
      </div>

      <Card className={cn('border-t-4 border-primary shadow-lg', portraitDisplay && 'shadow-md')}>
        <CardHeader className={cn('pb-2', portraitDisplay && 'px-4 py-3')}>
          <CardTitle
            className={cn('flex items-center gap-2', portraitDisplay ? 'text-lg' : 'text-xl')}
          >
            <Star className="h-5 w-5 text-primary" aria-hidden />
            Points balance
          </CardTitle>
        </CardHeader>
        <CardContent className={portraitDisplay ? 'px-4 pb-4 pt-0' : undefined}>
          <p
            className={cn(
              'font-headline font-black tabular-nums text-primary',
              portraitDisplay ? 'text-4xl' : 'text-5xl',
            )}
          >
            {student.points ?? 0}
          </p>
          {typeof student.lifetimePoints === 'number' ? (
            <p className="text-sm text-muted-foreground mt-2">Lifetime: {student.lifetimePoints}</p>
          ) : null}
        </CardContent>
      </Card>

      {settings.enableGoals ? (
        <StudentGoalsCard schoolId={schoolId} student={student} enabled={settings.enableGoals} />
      ) : null}

      {settings.enableBadges ? (
        <EarnedBadgesShowcase student={student} badges={badges ?? []} enableBadges={settings.enableBadges} />
      ) : null}

      <Card className={portraitDisplay ? 'shadow-md' : undefined}>
        <CardHeader className={portraitDisplay ? 'px-4 py-3' : undefined}>
          <CardTitle
            className={cn('flex items-center gap-2', portraitDisplay && 'text-lg')}
          >
            <Gift className="h-5 w-5" aria-hidden />
            Prize shop
          </CardTitle>
          <CardDescription>Available at school — redeem on the in-school kiosk.</CardDescription>
        </CardHeader>
        <CardContent className={portraitDisplay ? 'px-4 pb-4' : undefined}>
          {visiblePrizes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No prizes listed right now.</p>
          ) : (
            <ul
              className={cn(
                'grid gap-2',
                portraitDisplay ? 'grid-cols-1' : 'sm:grid-cols-2',
              )}
            >
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

      <Card className={portraitDisplay ? 'shadow-md' : undefined}>
        <CardHeader className={portraitDisplay ? 'px-4 py-3' : undefined}>
          <CardTitle
            className={cn('flex items-center gap-2', portraitDisplay && 'text-lg')}
          >
            <History className="h-5 w-5" aria-hidden />
            Recent activity
          </CardTitle>
        </CardHeader>
        <CardContent className={portraitDisplay ? 'px-4 pb-4' : undefined}>
          <ScrollArea
            className={cn('pr-3', portraitDisplay ? 'h-[min(38vh,240px)]' : 'h-[220px]')}
          >
            {!activities?.length ? (
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
