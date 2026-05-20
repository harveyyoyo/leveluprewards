'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { collection, doc, updateDoc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { useAppContext } from '@/components/AppProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import type { House, Student } from '@/lib/types';
import { HouseBadge } from '@/components/houses/HouseBadge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';

type SortMode = 'reveal' | 'instant-balanced' | 'instant-random';

export default function HouseSortingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const schoolId = String(params.schoolId || '');
  const firestore = useFirestore();
  const { loginState } = useAppContext();
  const { settings } = useSettings();

  const mode = (searchParams.get('mode') as SortMode) || 'reveal';
  const studentIdsParam = searchParams.get('studentIds') || '';

  const housesQuery = useMemoFirebase(
    () => (schoolId ? collection(firestore, 'schools', schoolId, 'houses') : null),
    [firestore, schoolId],
  );
  const studentsQuery = useMemoFirebase(
    () => (schoolId ? collection(firestore, 'schools', schoolId, 'students') : null),
    [firestore, schoolId],
  );
  const { data: houses, isLoading: housesLoading } = useCollection<House>(housesQuery);
  const { data: students, isLoading: studentsLoading } = useCollection<Student>(studentsQuery);

  const sortedHouses = useMemo(
    () => [...(houses || [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name)),
    [houses],
  );

  const queue = useMemo(() => {
    const ids = studentIdsParam
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const roster = students || [];
    if (ids.length > 0) {
      return ids
        .map((id) => roster.find((s) => s.id === id))
        .filter((s): s is Student => !!s && !s.houseId);
    }
    return roster.filter((s) => !s.houseId);
  }, [studentIdsParam, students]);

  const [index, setIndex] = useState(0);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const pickHouseForStudent = useCallback(
    (studentId: string, modePick: 'balanced' | 'random') => {
      if (sortedHouses.length === 0) return null;
      if (modePick === 'random') {
        return sortedHouses[Math.floor(Math.random() * sortedHouses.length)];
      }
      const counts = new Map(sortedHouses.map((h) => [h.id, 0]));
      for (const hid of Object.values(assignments)) {
        counts.set(hid, (counts.get(hid) ?? 0) + 1);
      }
      for (const s of students || []) {
        if (s.houseId) counts.set(s.houseId, (counts.get(s.houseId) ?? 0) + 1);
      }
      let pick = sortedHouses[0];
      let min = Number.POSITIVE_INFINITY;
      for (const h of sortedHouses) {
        const c = counts.get(h.id) ?? 0;
        if (c < min) {
          min = c;
          pick = h;
        }
      }
      return pick;
    },
    [sortedHouses, assignments, students],
  );

  const commitAssignments = async (map: Record<string, string>) => {
    if (!firestore || !schoolId) return;
    setBusy(true);
    try {
      await Promise.all(
        Object.entries(map).map(([studentId, houseId]) =>
          updateDoc(doc(firestore, 'schools', schoolId, 'students', studentId), {
            houseId,
            updatedAt: Date.now(),
          }),
        ),
      );
      setDone(true);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (mode === 'reveal' || sortedHouses.length === 0 || queue.length === 0) return;
    const map: Record<string, string> = {};
    const pickMode = mode === 'instant-random' ? 'random' : 'balanced';
    for (const s of queue) {
      const house = pickHouseForStudent(s.id, pickMode);
      if (house) map[s.id] = house.id;
    }
    void commitAssignments(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, sortedHouses.length, queue.length]);

  const currentStudent = queue[index];
  const currentHouse =
    currentStudent && assignments[currentStudent.id]
      ? sortedHouses.find((h) => h.id === assignments[currentStudent.id])
      : null;

  const revealNext = () => {
    if (!currentStudent || sortedHouses.length === 0) return;
    const house = pickHouseForStudent(currentStudent.id, 'balanced');
    if (!house) return;
    setAssignments((prev) => ({ ...prev, [currentStudent.id]: house.id }));
    setRevealed(true);
  };

  const advance = () => {
    setRevealed(false);
    if (index + 1 >= queue.length) {
      setAssignments((prev) => {
        void commitAssignments(prev);
        return prev;
      });
      return;
    }
    setIndex((i) => i + 1);
  };

  const staffOk =
    loginState === 'admin' || loginState === 'developer' || loginState === 'teacher' || loginState === 'houseCoordinator';

  if (!settings.enableHouses) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-center">
        <p className="text-muted-foreground">Houses are not enabled for this school.</p>
      </div>
    );
  }

  if (!staffOk) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-center">
        <p className="text-muted-foreground">Sign in as school staff to run the sorting ceremony.</p>
      </div>
    );
  }

  if (housesLoading || studentsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
      </div>
    );
  }

  if (sortedHouses.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-lg font-bold">Create houses first</p>
        <Button asChild>
          <Link href={`/${schoolId}/admin`}>Open Admin</Link>
        </Button>
      </div>
    );
  }

  if (queue.length === 0 || done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center bg-gradient-to-b from-violet-950 to-background text-white">
        <Sparkles className="h-12 w-12 text-amber-400" />
        <h1 className="text-3xl font-black uppercase tracking-widest">
          {done ? 'Sorting complete!' : 'Everyone has a house'}
        </h1>
        <p className="text-white/70 max-w-md">
          {done
            ? 'Students have been assigned. Close this tab or return to Admin → Houses.'
            : 'All selected students already belong to a house.'}
        </p>
        <Button variant="secondary" asChild>
          <Link href={`/${schoolId}/admin`}>Back to Admin</Link>
        </Button>
      </div>
    );
  }

  if (mode !== 'reveal') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
        {busy ? <Loader2 className="h-10 w-10 animate-spin" /> : <p className="font-bold">Assigning houses…</p>}
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 text-center text-white"
      style={{
        background: `radial-gradient(circle at 50% 20%, ${currentHouse?.color ?? '#7c3aed'}55, #0f0720 70%)`,
      }}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60 mb-4">
        Are you ready?
      </p>
      <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tight mb-2">
        House sorting
      </h1>
      <p className="text-white/70 mb-10">
        Student {index + 1} of {queue.length}
      </p>

      {!revealed ? (
        <div className="space-y-6 max-w-lg">
          <p className="text-2xl font-bold">
            {currentStudent?.firstName} {currentStudent?.lastName}
          </p>
          <Button
            size="lg"
            className="rounded-full px-10 py-6 text-lg font-black uppercase tracking-widest"
            onClick={revealNext}
          >
            Reveal house
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            'space-y-6 animate-in zoom-in-95 duration-500',
          )}
        >
          <p className="text-xl font-bold text-white/90">{currentStudent?.firstName} belongs to</p>
          {currentHouse ? <HouseBadge house={currentHouse} size="lg" className="text-sm scale-125" /> : null}
          {currentHouse?.motto ? (
            <p className="text-white/70 italic">&ldquo;{currentHouse.motto}&rdquo;</p>
          ) : null}
          <Button
            size="lg"
            className="rounded-full px-10 font-black uppercase tracking-widest"
            onClick={advance}
            disabled={busy}
          >
            {index + 1 >= queue.length ? 'Finish' : 'Next student'}
          </Button>
        </div>
      )}
    </div>
  );
}
