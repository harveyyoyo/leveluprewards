'use client';

import { useEffect, useMemo, useState } from 'react';
import { Clock, LayoutGrid, Loader2, MessageSquare, Trophy, Users } from 'lucide-react';
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

function ScreenSection({
  children,
  className,
  icon: Icon,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  icon?: React.ComponentType<{ className?: string }>;
  title?: string;
}) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-white/20 bg-white/[0.08] p-5 shadow-xl backdrop-blur-md sm:p-6',
        className,
      )}
    >
      {title && (
        <p className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white/60">
          {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
          {title}
        </p>
      )}
      {children}
    </section>
  );
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

  const screen = prefs ?? loadClassroomScreenPrefs(schoolId, scope, classId);
  const title = (screen.title || classLabel || 'Our class').trim();
  const message = (screen.message || 'Make today count.').trim();
  const modulesEnabled = Object.values(screen.modules).some(Boolean);

  if (isLoading && !studentsProp?.length) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white',
          embedded ? 'h-full min-h-[280px] rounded-xl' : 'fixed inset-0 z-20',
          className,
        )}
      >
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-400" />
          <p className="mt-3 text-sm text-white/60">Loading classroom…</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white',
        embedded ? 'h-full min-h-[280px] rounded-xl p-4' : 'fixed inset-0 z-20 p-6 sm:p-10',
        className,
      )}
    >
      {/* Header */}
      <header className="mb-4 flex shrink-0 flex-wrap items-start justify-between gap-4 border-b border-white/15 pb-4 sm:mb-6 sm:pb-5">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400/80 sm:text-xs">
            <LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
            Classroom Display
          </p>
          <h1 className="mt-1.5 truncate text-2xl font-black tracking-tight text-white sm:text-4xl">
            {title}
          </h1>
        </div>
        {screen.modules.clock && (
          <div className="shrink-0 text-right">
            <p className="flex items-center justify-end gap-2 text-3xl font-black tabular-nums text-white sm:text-5xl">
              <Clock className="h-7 w-7 text-emerald-400/70 sm:h-9 sm:w-9" aria-hidden />
              {formatClock(now)}
            </p>
            <p className="mt-1 text-sm font-medium text-white/60 sm:text-base">{formatDate(now)}</p>
          </div>
        )}
      </header>

      {/* Content grid */}
      <div className="grid min-h-0 flex-1 auto-rows-min content-start gap-4 overflow-y-auto sm:gap-5 lg:grid-cols-2">
        {!modulesEnabled ? (
          <ScreenSection className="lg:col-span-2">
            <p className="text-lg font-bold">No modules enabled</p>
            <p className="mt-2 text-sm text-white/70">
              Turn on clock, message, leaderboard, or class size in the settings.
            </p>
          </ScreenSection>
        ) : (
          <>
            {/* Daily message */}
            {screen.modules.classMessage && (
              <ScreenSection icon={MessageSquare} title="Today">
                <p className="text-xl font-bold leading-snug text-white sm:text-2xl lg:text-3xl">
                  {message}
                </p>
                {screen.modules.focusLine && (
                  <p className="mt-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80">
                    <span className="font-semibold text-emerald-300">Focus:</span>{' '}
                    {focusLineForDay(now)}
                  </p>
                )}
              </ScreenSection>
            )}

            {/* Session leaderboard */}
            {screen.modules.sessionLeaderboard && (
              <ScreenSection
                icon={Trophy}
                title="Session Leaderboard"
                className="flex min-h-0 flex-col"
              >
                {leaderboard.length === 0 ? (
                  <p className="text-sm text-white/60">
                    Awards from the seating chart appear here as students earn points.
                  </p>
                ) : (
                  <ol className="min-h-0 space-y-2 overflow-y-auto">
                    {leaderboard.map((row, i) => (
                      <li
                        key={row.id}
                        className={cn(
                          'flex items-center justify-between gap-3 rounded-xl px-4 py-2.5',
                          i === 0
                            ? 'border-2 border-amber-400/40 bg-gradient-to-r from-amber-500/20 to-yellow-500/10'
                            : i === 1
                              ? 'border border-slate-300/30 bg-slate-300/10'
                              : i === 2
                                ? 'border border-orange-400/30 bg-orange-500/10'
                                : 'border border-white/10 bg-white/5',
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <span
                            className={cn(
                              'flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-black',
                              i === 0
                                ? 'bg-amber-400 text-amber-950'
                                : i === 1
                                  ? 'bg-slate-300 text-slate-800'
                                  : i === 2
                                    ? 'bg-orange-400 text-orange-950'
                                    : 'bg-white/20 text-white',
                            )}
                          >
                            {i + 1}
                          </span>
                          <span className="min-w-0 truncate text-sm font-bold text-white sm:text-base">
                            {row.name}
                          </span>
                          {row.lastLabel && (
                            <span className="hidden truncate text-xs font-medium text-emerald-300/80 sm:inline">
                              · {row.lastLabel}
                            </span>
                          )}
                        </span>
                        <span
                          className={cn(
                            'shrink-0 rounded-lg px-2.5 py-1 font-mono text-base font-black sm:text-lg',
                            row.session > 0
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300',
                          )}
                        >
                          {row.session > 0 ? '+' : ''}
                          {row.session}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </ScreenSection>
            )}

            {/* Student count */}
            {screen.modules.studentCount && (
              <ScreenSection className="lg:col-span-2">
                <p className="flex items-center gap-3 text-base font-bold text-white sm:text-lg">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
                    <Users className="h-5 w-5 text-emerald-400" aria-hidden />
                  </span>
                  {classStudents.length} student{classStudents.length === 1 ? '' : 's'} in this
                  class
                </p>
              </ScreenSection>
            )}
          </>
        )}
      </div>
    </div>
  );
}
