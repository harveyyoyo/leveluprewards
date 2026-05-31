'use client';

import { useMemo } from 'react';
import { collection, doc, limit, orderBy, query, where } from 'firebase/firestore';
import { LogOut, Star, Gift, History } from 'lucide-react';
import { useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { useSettings } from '@/components/providers/SettingsProvider';
import type { Student, Prize, HistoryItem, Badge, LibraryItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge as UiBadge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn, getStudentNickname } from '@/lib/utils';
import { EarnedBadgesShowcase } from '@/components/badges/EarnedBadgesShowcase';
import { StudentGoalsCard } from '@/components/goals/StudentGoalsCard';
import { getStudentPointTypeTotals } from '@/lib/students/studentPointTypes';
import { StudentPortalMyBooksCard } from './StudentPortalMyBooksCard';
import { StudentPortalMyHouseCard } from './StudentPortalMyHouseCard';

type Props = {
  schoolId: string;
  studentId: string;
  onSignOut: () => void;
  signingOut?: boolean;
};

export function StudentPortalDashboard({ schoolId, studentId, onSignOut, signingOut }: Props) {
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

  const libraryCheckoutsQuery = useMemoFirebase(
    () =>
      firestore && schoolId && studentId && settings.payLibrary !== false
        ? query(
            collection(firestore, 'schools', schoolId, 'library'),
            where('checkedOutTo', '==', studentId),
          )
        : null,
    [firestore, schoolId, studentId, settings.payLibrary],
  );
  const { data: libraryCheckoutsRaw, isLoading: libraryLoading } = useCollection<LibraryItem>(libraryCheckoutsQuery);
  const myLibraryBooks = useMemo(
    () => (libraryCheckoutsRaw ?? []).filter((i) => i.status === 'checked_out'),
    [libraryCheckoutsRaw],
  );

  const visiblePrizes = useMemo(() => {
    if (!prizes) return [];
    return prizes.filter((p) => p.inStock !== false && (p.stockCount == null || p.stockCount > 0));
  }, [prizes]);

  const displayName = student ? getStudentNickname(student) : 'Student';
  const pointTypeTotals = useMemo(
    () => (student ? getStudentPointTypeTotals(student) : []),
    [student],
  );

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
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
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
          {signingOut ? 'Signing out…' : 'Sign out'}
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

      {settings.enableGoals ? (
        <StudentGoalsCard schoolId={schoolId} student={student} enabled={settings.enableGoals} />
      ) : null}

      {settings.enableBadges ? (
        <EarnedBadgesShowcase student={student} badges={badges ?? []} enableBadges={settings.enableBadges} />
      ) : null}

      {settings.enableHouses && student.houseId ? (
        <StudentPortalMyHouseCard schoolId={schoolId} student={student} />
      ) : null}

      {settings.payLibrary !== false ? (
        <StudentPortalMyBooksCard items={myLibraryBooks} isLoading={libraryLoading} />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" aria-hidden />
            Prize shop
          </CardTitle>
          <CardDescription>Available at school — redeem on the in-school kiosk.</CardDescription>
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
