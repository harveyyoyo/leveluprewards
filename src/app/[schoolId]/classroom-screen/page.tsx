'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Clock, LayoutGrid, Loader2, Users } from 'lucide-react';
import { collection } from 'firebase/firestore';
import { useAppContext } from '@/components/AppProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { classroomDesignShellClass } from '@/components/points/classroomVisualTheme';
import { loadClassroomSession } from '@/lib/classroomSeatingChart';
import {
  focusLineForDay,
  loadClassroomScreenPrefs,
  type ClassroomScreenPrefs,
} from '@/lib/classroomScreen';
import { isClassroomPillarOn } from '@/lib/productPillars';
import type { Class, Student } from '@/lib/types';
import { cn, getStudentNickname } from '@/lib/utils';

function formatClock(now: Date) {
  return now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function formatDate(now: Date) {
  return now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function ClassroomScreenPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const schoolId = typeof params.schoolId === 'string' ? params.schoolId : '';
  const classId = (searchParams?.get('classId') || '').trim();
  const scope = (searchParams?.get('scope') || 'admin').trim();

  const { isInitialized } = useAppContext();
  const { settings } = useSettings();
  const classroomOn = isClassroomPillarOn(settings);
  const [now, setNow] = useState(() => new Date());
  const [prefs, setPrefs] = useState<ClassroomScreenPrefs | null>(null);

  const firestore = useFirestore();
  const classesQuery = useMemoFirebase(
    () => (schoolId && firestore ? collection(firestore, 'schools', schoolId, 'classes') : null),
    [firestore, schoolId],
  );
  const studentsQuery = useMemoFirebase(
    () => (schoolId && firestore ? collection(firestore, 'schools', schoolId, 'students') : null),
    [firestore, schoolId],
  );
  const { data: classes, isLoading: classesLoading } = useCollection<Class>(classesQuery);
  const { data: students, isLoading: studentsLoading } = useCollection<Student>(studentsQuery);

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(new Date());
      if (schoolId && classId) {
        setPrefs(loadClassroomScreenPrefs(schoolId, scope, classId));
      }
    }, 5000);
    return () => window.clearInterval(id);
  }, [schoolId, scope, classId]);

  useEffect(() => {
    if (!schoolId || !classId) return;
    setPrefs(loadClassroomScreenPrefs(schoolId, scope, classId));
  }, [schoolId, scope, classId]);

  const classMeta = useMemo(
    () => (classes ?? []).find((c) => c.id === classId),
    [classes, classId],
  );

  const classStudents = useMemo(
    () => (students ?? []).filter((s) => s.classId === classId),
    [students, classId],
  );

  const sessionTotals = useMemo(() => {
    if (!schoolId || !classId) return {};
    return loadClassroomSession(schoolId, scope, classId);
  }, [schoolId, scope, classId, now]);

  const leaderboard = useMemo(() => {
    return classStudents
      .map((s) => ({
        id: s.id,
        name: getStudentNickname(s) || s.firstName || s.id,
        session: sessionTotals[s.id] ?? 0,
      }))
      .filter((row) => row.session !== 0)
      .sort((a, b) => b.session - a.session)
      .slice(0, 12);
  }, [classStudents, sessionTotals]);

  if (!isInitialized || classesLoading || studentsLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!classroomOn) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background p-6 text-center">
        <p className="text-lg font-bold">Classroom Management is not enabled for this school.</p>
      </div>
    );
  }

  if (!classId) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background p-6 text-center">
        <p className="text-muted-foreground">Open this display from Classroom → Room display.</p>
      </div>
    );
  }

  const screen = prefs ?? loadClassroomScreenPrefs(schoolId, scope, classId);
  const design = screen.design;
  const title = (screen.title || classMeta?.name || 'Our class').trim();
  const message = (screen.message || 'Make today count.').trim();

  return (
    <main
      className={cn(
        'fixed inset-0 flex flex-col overflow-hidden p-6 sm:p-10',
        classroomDesignShellClass(design, true),
      )}
    >
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] opacity-70">
            <LayoutGrid className="h-4 w-4" aria-hidden />
            Classroom display
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
          {classMeta && title !== classMeta.name ? (
            <p className="text-sm opacity-70">{classMeta.name}</p>
          ) : null}
        </div>
        {screen.modules.clock ? (
          <div className="text-right">
            <p className="flex items-center justify-end gap-2 text-4xl font-black tabular-nums sm:text-5xl">
              <Clock className="h-8 w-8 opacity-60" aria-hidden />
              {formatClock(now)}
            </p>
            <p className="text-sm opacity-70">{formatDate(now)}</p>
          </div>
        ) : null}
      </header>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
        {screen.modules.classMessage ? (
          <section className="rounded-2xl border border-white/10 bg-black/20 p-6 backdrop-blur-sm">
            <p className="text-xs font-black uppercase tracking-wider opacity-60">Today</p>
            <p className="mt-3 text-2xl font-bold leading-snug sm:text-3xl">{message}</p>
            {screen.modules.focusLine ? (
              <p className="mt-4 text-sm opacity-80">Focus: {focusLineForDay(now)}</p>
            ) : null}
          </section>
        ) : null}

        {screen.modules.sessionLeaderboard ? (
          <section className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-black/20 p-6 backdrop-blur-sm">
            <p className="text-xs font-black uppercase tracking-wider opacity-60">This session</p>
            {leaderboard.length === 0 ? (
              <p className="mt-4 text-sm opacity-70">Awards from the seating chart will appear here.</p>
            ) : (
              <ol className="mt-4 space-y-2 overflow-y-auto">
                {leaderboard.map((row, i) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2"
                  >
                    <span className="font-bold">
                      {i + 1}. {row.name}
                    </span>
                    <span className="font-mono text-lg font-black text-emerald-300">+{row.session}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        ) : null}

        {screen.modules.studentCount ? (
          <section className="rounded-2xl border border-white/10 bg-black/20 p-6 backdrop-blur-sm lg:col-span-2">
            <p className="flex items-center gap-2 text-sm font-bold opacity-80">
              <Users className="h-4 w-4" aria-hidden />
              {classStudents.length} student{classStudents.length === 1 ? '' : 's'} in this class
            </p>
          </section>
        ) : null}
      </div>
    </main>
  );
}
