'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { collection, doc, updateDoc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { useAppContext } from '@/components/AppProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import type { House, Student } from '@/lib/types';
import { HouseBadge } from '@/components/houses/HouseBadge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check, Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function HouseSortingPage() {
  const params = useParams();
  const schoolId = String(params.schoolId || '');
  const firestore = useFirestore();
  const { loginState } = useAppContext();
  const { settings } = useSettings();

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

  const queue = useMemo(
    () =>
      (students || [])
        .filter((s) => !s.houseId)
        .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName)),
    [students],
  );

  const [index, setIndex] = useState(0);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [selectedHouseId, setSelectedHouseId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

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

  const currentStudent = queue[index];
  const currentHouse =
    currentStudent && assignments[currentStudent.id]
      ? sortedHouses.find((h) => h.id === assignments[currentStudent.id])
      : null;

  useEffect(() => {
    setSelectedHouseId(null);
  }, [currentStudent?.id]);

  const revealNext = () => {
    if (!currentStudent || !selectedHouseId) return;
    setAssignments((prev) => ({ ...prev, [currentStudent.id]: selectedHouseId }));
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
            : 'All students already belong to a house.'}
        </p>
        <Button variant="secondary" asChild>
          <Link href={`/${schoolId}/admin`}>Back to Admin</Link>
        </Button>
      </div>
    );
  }

  const accentColor =
    currentHouse?.color ??
    (selectedHouseId ? sortedHouses.find((h) => h.id === selectedHouseId)?.color : undefined) ??
    '#7c3aed';

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 text-center text-white"
      style={{
        background: `radial-gradient(circle at 50% 20%, ${accentColor}55, #0f0720 70%)`,
      }}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60 mb-4">
        Are you ready?
      </p>
      <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tight mb-2">
        House sorting
      </h1>
      <p className="text-white/70 mb-2">
        Student {index + 1} of {queue.length}
      </p>
      <p className="text-xs text-white/50 mb-8 max-w-md">
        Choose a house, reveal to the room, then go to the next student. Saves when you finish.
      </p>

      {!revealed ? (
        <div className="space-y-8 max-w-2xl w-full">
          <p className="text-2xl sm:text-3xl font-bold">
            {currentStudent?.firstName} {currentStudent?.lastName}
          </p>

          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-white/50">
              Choose house
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {sortedHouses.map((house) => {
                const selected = selectedHouseId === house.id;
                return (
                  <button
                    key={house.id}
                    type="button"
                    onClick={() => setSelectedHouseId(house.id)}
                    className={cn(
                      'relative rounded-2xl border-2 px-4 py-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80',
                      selected
                        ? 'border-white bg-white/15 scale-105 shadow-lg'
                        : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10',
                    )}
                    style={selected ? { borderColor: house.color, boxShadow: `0 0 24px ${house.color}44` } : undefined}
                    aria-pressed={selected}
                    aria-label={`Assign to ${house.name}`}
                  >
                    <HouseBadge house={house} size="lg" className="text-sm" />
                    {selected ? (
                      <span
                        className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-violet-900 shadow"
                        aria-hidden
                      >
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <Button
            size="lg"
            className="rounded-full px-10 py-6 text-lg font-black uppercase tracking-widest"
            onClick={revealNext}
            disabled={!selectedHouseId}
          >
            Reveal house
          </Button>
        </div>
      ) : (
        <div className={cn('space-y-6 animate-in zoom-in-95 duration-500')}>
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
