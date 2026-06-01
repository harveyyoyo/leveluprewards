'use client';

import { useEffect, useMemo, useState } from 'react';
import { Clock, LayoutGrid, Loader2, Users } from 'lucide-react';
import { collection } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { loadClassroomSession } from '@/lib/classroomSeatingChart';
import {
  focusLineForDay,
  loadClassroomScreenPrefs,
  type ClassroomScreenPrefs,
} from '@/lib/classroomScreen';
import type { Student } from '@/lib/types';
import { cn, getStudentNickname } from '@/lib/utils';

function formatClock(now: Date) {
  return now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function formatDate(now: Date) {
  return now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

function screenSectionClass(): string {
  return 'rounded-2xl border border-white/15 bg-white/10 p-4 shadow-lg backdrop-blur-sm sm:p-6';
}

export type ClassroomRoomDisplayViewProps = {
  schoolId: string;
  scope: string;
  classId: string;
  classLabel?: string;
  /** When provided, skips loading all students from Firestore. */
  students?: Student[];
  embedded?: boolean;
  className?: string;
};

export function ClassroomRoomDisplayView({
  schoolId,
  scope,
  classId,
  classLabel,
  students: studentsProp,
  embedded = false,
  className,
}: ClassroomRoomDisplayViewProps) {
  const [now, setNow] = useState(() => new Date());
  const [prefs, setPrefs] = useState<ClassroomScreenPrefs | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const firestore = useFirestore();
  const studentsQuery = useMemoFirebase(
    () =>
      !studentsProp?.length && schoolId && firestore
        ? collection(firestore, 'schools', schoolId, 'students')
        : null,
    [firestore, schoolId, studentsProp?.length],
  );
  const { data: fetchedStudents, isLoading } = useCollection<Student>(studentsQuery);

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(new Date());
      if (schoolId && classId) {
        setPrefs(loadClassroomScreenPrefs(schoolId, scope, classId));
        setRefreshKey((k) => k + 1);
      }
    }, 5000);
    return () => window.clearInterval(id);
  }, [schoolId, scope, classId]);

  useEffect(() => {
    if (!schoolId || !classId) return;
    setPrefs(loadClassroomScreenPrefs(schoolId, scope, classId));
  }, [schoolId, scope, classId, refreshKey]);

  const classStudents = useMemo(() => {
    const list = studentsProp?.length ? studentsProp : (fetchedStudents ?? []);
    return list.filter((s) => s.classId === classId);
  }, [studentsProp, fetchedStudents, classId]);

  const sessionData = useMemo(() => {
    if (!schoolId || !classId) return { totals: {}, lastAward: {} };
    return loadClassroomSession(schoolId, scope, classId);
    // refreshKey bumps when the room-display clock ticks so session totals stay live.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional poll via refreshKey
  }, [schoolId, scope, classId, refreshKey]);

  const leaderboard = useMemo(() => {
    return classStudents
      .map((s) => ({
        id: s.id,
        name: getStudentNickname(s) || s.firstName || s.id,
        session: sessionData.totals[s.id] ?? 0,
        lastLabel: sessionData.lastAward[s.id]?.label ?? null,
      }))
      .filter((row) => row.session !== 0)
      .sort((a, b) => b.session - a.session)
      .slice(0, 12);
  }, [classStudents, sessionData]);

  if (isLoading && !studentsProp?.length) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white',
          embedded ? 'min-h-[320px] h-full rounded-xl' : 'fixed inset-0',
          className,
        )}
      >
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  const screen = prefs ?? loadClassroomScreenPrefs(schoolId, scope, classId);
  const title = (screen.title || classLabel || 'Our class').trim();
  const message = (screen.message || 'Make today count.').trim();
  const modulesEnabled = Object.values(screen.modules).some(Boolean);

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white',
        embedded ? 'h-full min-h-[280px] rounded-xl' : 'fixed inset-0 z-20 p-6 sm:p-10',
        className,
      )}
    >
      <header className="mb-4 flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-white/15 pb-3 sm:mb-6 sm:pb-4">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/70 sm:text-xs">
            <LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
            Classroom display
          </p>
          <h1 className="mt-1 text-xl font-black tracking-tight text-white sm:text-3xl">{title}</h1>
        </div>
        {screen.modules.clock ? (
          <div className="text-right text-white">
            <p className="flex items-center justify-end gap-2 text-2xl font-black tabular-nums sm:text-4xl">
              <Clock className="h-6 w-6 text-white/60 sm:h-8 sm:w-8" aria-hidden />
              {formatClock(now)}
            </p>
            <p className="text-xs text-white/70 sm:text-sm">{formatDate(now)}</p>
          </div>
        ) : null}
      </header>

      <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto sm:gap-4 lg:grid-cols-2">
        {!modulesEnabled ? (
          <section className={cn(screenSectionClass(), 'lg:col-span-2')}>
            <p className="text-base font-bold sm:text-lg">No modules enabled</p>
            <p className="mt-2 text-sm text-white/75">
              Turn on clock, message, leaderboard, or class size in settings below.
            </p>
          </section>
        ) : (
          <>
            {screen.modules.classMessage ? (
              <section className={screenSectionClass()}>
                <p className="text-xs font-black uppercase tracking-wider text-white/60">Today</p>
                <p className="mt-2 text-lg font-bold leading-snug text-white sm:text-2xl">{message}</p>
                {screen.modules.focusLine ? (
                  <p className="mt-3 text-sm text-white/80">Focus: {focusLineForDay(now)}</p>
                ) : null}
              </section>
            ) : null}

            {screen.modules.sessionLeaderboard ? (
              <section className={cn(screenSectionClass(), 'flex min-h-0 flex-col')}>
                <p className="text-xs font-black uppercase tracking-wider text-white/60">This session</p>
                {leaderboard.length === 0 ? (
                  <p className="mt-3 text-sm text-white/75">
                    Awards from the seating chart appear here with the quick-award label and points.
                  </p>
                ) : (
                  <ol className="mt-3 min-h-0 space-y-2 overflow-y-auto">
                    {leaderboard.map((row, i) => (
                      <li
                        key={row.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 sm:px-4"
                      >
                        <span className="min-w-0 text-sm font-bold text-white sm:text-base">
                          {i + 1}. {row.name}
                          {row.lastLabel ? (
                            <span className="ml-1.5 text-xs font-semibold text-emerald-300/90">
                              · {row.lastLabel}
                            </span>
                          ) : null}
                        </span>
                        <span className="shrink-0 font-mono text-base font-black text-emerald-300 sm:text-lg">
                          +{row.session}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            ) : null}

            {screen.modules.studentCount ? (
              <section className={cn(screenSectionClass(), 'lg:col-span-2')}>
                <p className="flex items-center gap-2 text-sm font-bold text-white/90">
                  <Users className="h-4 w-4" aria-hidden />
                  {classStudents.length} student{classStudents.length === 1 ? '' : 's'} in this class
                </p>
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
