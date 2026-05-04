'use client';

import Link from 'next/link';
import { Trophy, ArrowUpRight, Loader2 } from 'lucide-react';
import { collection, limit, orderBy, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getStudentNickname } from '@/lib/utils';
import type { Student } from '@/lib/types';

export function AdminHallOfFameTab({ schoolId }: { schoolId: string }) {
  const firestore = useFirestore();

  const topStudentsQuery = useMemoFirebase(() => {
    if (!schoolId) return null;
    return query(
      collection(firestore, 'schools', schoolId, 'students'),
      orderBy('lifetimePoints', 'desc'),
      limit(10),
    );
  }, [firestore, schoolId]);

  const { data: topStudents, isLoading } = useCollection<Student>(topStudentsQuery);

  return (
    <Card className="border-t-4 border-primary shadow-md">
      <CardHeader className="py-6 flex flex-row items-start justify-between gap-4">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" /> Hall of Fame
          </CardTitle>
          <CardDescription>
            Preview the leaderboard and open the full display page (no header).
          </CardDescription>
        </div>
        <Button asChild variant="outline" className="rounded-xl gap-2 shrink-0">
          <Link href={`/${schoolId}/halloffame`}>
            View full page <ArrowUpRight className="w-4 h-4" aria-hidden />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            Loading leaderboard…
          </div>
        ) : (topStudents || []).length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No students found yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(topStudents || []).slice(0, 6).map((s, idx) => {
              const name = `${getStudentNickname(s)}${s.lastName ? ` ${s.lastName}` : ''}`.trim();
              const initials = `${s.firstName?.[0] || ''}${s.lastName?.[0] || ''}`.toUpperCase() || '?';
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border bg-muted/20 px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 text-xs font-black text-muted-foreground/60">{idx + 1}</span>
                    <Avatar className="w-9 h-9 border border-border/60">
                      {s.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.photoUrl} alt="" className="h-full w-full object-cover" />
                      ) : null}
                      <AvatarFallback className="text-[10px] font-black">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{name || 'Student'}</p>
                      <p className="truncate text-[10px] text-muted-foreground font-semibold">
                        Lifetime points
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-black text-primary">
                    {(s.lifetimePoints || 0).toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

