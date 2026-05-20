'use client';

import { useMemo } from 'react';
import { collection } from 'firebase/firestore';
import { Home, Trophy } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HouseBadge } from '@/components/houses/HouseBadge';
import type { House, Student } from '@/lib/types';

/**
 * Student portal "My House" card — shows the student's house identity,
 * current standings, and their contribution to house points.
 */
export function StudentPortalMyHouseCard({
  schoolId,
  student,
}: {
  schoolId: string;
  student: Student;
}) {
  const firestore = useFirestore();

  const housesQuery = useMemoFirebase(
    () => (firestore && schoolId && student.houseId ? collection(firestore, 'schools', schoolId, 'houses') : null),
    [firestore, schoolId, student.houseId],
  );
  const { data: houses, isLoading } = useCollection<House>(housesQuery);

  const myHouse = useMemo(
    () => (houses ?? []).find((h) => h.id === student.houseId),
    [houses, student.houseId],
  );

  const standings = useMemo(() => {
    if (!houses || houses.length === 0) return [];
    return [...houses]
      .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
      .map((h, i) => ({ ...h, rank: i + 1 }));
  }, [houses]);

  const myRank = standings.find((h) => h.id === student.houseId)?.rank;

  if (!student.houseId) return null;

  if (isLoading || !myHouse) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" aria-hidden />
            My house
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>
        </CardContent>
      </Card>
    );
  }

  const rankSuffix = (n: number) => {
    if (n === 1) return 'st';
    if (n === 2) return 'nd';
    if (n === 3) return 'rd';
    return 'th';
  };

  return (
    <Card
      className="border-t-4"
      style={{ borderTopColor: myHouse.color }}
    >
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
          {myRank ? (
            <span className="text-sm text-muted-foreground font-semibold">
              <Trophy className="inline h-3.5 w-3.5 mr-0.5 text-primary" />
              {myRank}{rankSuffix(myRank)} place
            </span>
          ) : null}
        </div>

        {/* House standings mini-table */}
        {standings.length > 1 ? (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Standings
            </p>
            <ul className="space-y-1">
              {standings.map((h) => {
                const isMe = h.id === student.houseId;
                return (
                  <li
                    key={h.id}
                    className={`flex items-center justify-between rounded-xl border px-3 py-1.5 text-sm ${
                      isMe ? 'border-primary/30 bg-primary/5 font-bold' : 'border-border/40 bg-muted/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 text-xs font-black text-muted-foreground tabular-nums">{h.rank}</span>
                      <HouseBadge house={h} size="sm" />
                    </div>
                    <span className="tabular-nums text-xs font-bold" style={{ color: isMe ? myHouse.color : undefined }}>
                      {(h.points ?? 0).toLocaleString()} pts
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
