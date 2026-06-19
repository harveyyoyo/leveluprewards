'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { collection } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { useAppContext } from '@/components/AppProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import type { House, Student } from '@/lib/types';
import { HouseBadge } from '@/components/houses/HouseBadge';
import { Button } from '@/components/ui/button';
import { pickRandomSortingQuestion } from '@/lib/houses/sortingCeremonyQuestions';
import { resolveHouseSortingCelebrationEffect } from '@/lib/houses/houseSortingCelebration';
import { HouseSortingCelebrationLayer } from '@/components/houses/HouseSortingCelebrationLayer';
import { Loader2, MessageCircleQuestion, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

type CeremonyStep = 'question' | 'name' | 'reveal';

export function HouseSortingCeremony() {
  const params = useParams();
  const schoolId = String(params.schoolId || '');
  const firestore = useFirestore();
  const { loginState } = useAppContext();
  const { settings } = useSettings();

  const housesQuery = useMemoFirebase(
    () => (firestore && schoolId ? collection(firestore, 'schools', schoolId, 'houses') : null),
    [firestore, schoolId],
  );
  const studentsQuery = useMemoFirebase(
    () => (firestore && schoolId ? collection(firestore, 'schools', schoolId, 'students') : null),
    [firestore, schoolId],
  );
  const { data: houses, isLoading: housesLoading } = useCollection<House>(housesQuery);
  const { data: students, isLoading: studentsLoading } = useCollection<Student>(studentsQuery);

  const sortedHouses = useMemo(
    () =>
      [...(houses || [])].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || (a.name ?? '').localeCompare(b.name ?? ''),
      ),
    [houses],
  );

  const houseById = useMemo(() => new Map(sortedHouses.map((h) => [h.id, h])), [sortedHouses]);

  const queue = useMemo(
    () =>
      [...(students || [])].sort(
        (a, b) =>
          (a.lastName ?? '').localeCompare(b.lastName ?? '') ||
          (a.firstName ?? '').localeCompare(b.firstName ?? ''),
      ),
    [students],
  );

  const useFakeQuestions = settings.houseSortingUseFakeQuestions === true;

  const [index, setIndex] = useState(0);
  const [step, setStep] = useState<CeremonyStep>(useFakeQuestions ? 'question' : 'name');
  const [fakeQuestion, setFakeQuestion] = useState(() => pickRandomSortingQuestion());
  const [done, setDone] = useState(false);
  const [celebrationRunId, setCelebrationRunId] = useState(0);

  const currentStudent = queue[index];
  const currentHouse = currentStudent?.houseId ? houseById.get(currentStudent.houseId) : undefined;

  const goToReveal = () => {
    setStep('reveal');
    setCelebrationRunId(Date.now());
  };

  const initialStepForStudent = useFakeQuestions ? 'question' : 'name';

  useEffect(() => {
    document.documentElement.setAttribute('data-presentation', 'house-sorting');
    document.documentElement.setAttribute('data-houses-realm', '');
    document.body.classList.add('overflow-hidden');
    return () => {
      document.documentElement.removeAttribute('data-presentation');
      document.documentElement.removeAttribute('data-houses-realm');
      document.body.classList.remove('overflow-hidden');
    };
  }, []);

  useEffect(() => {
    setStep(initialStepForStudent);
    setFakeQuestion(pickRandomSortingQuestion());
  }, [currentStudent?.id, initialStepForStudent]);

  const advance = () => {
    if (index + 1 >= queue.length) {
      setDone(true);
      return;
    }
    setIndex((i) => i + 1);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== ' ' && event.key !== 'Enter') return;
      event.preventDefault();
      if (step === 'question' || step === 'name') {
        setStep('reveal');
        setCelebrationRunId(Date.now());
        return;
      }
      if (index + 1 >= queue.length) {
        setDone(true);
        return;
      }
      setIndex((i) => i + 1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [step, index, queue.length]);

  const staffOk =
    loginState === 'admin' ||
    loginState === 'developer' ||
    loginState === 'teacher' ||
    loginState === 'houseCoordinator';

  if (!settings.enableHouses) {
    return (
      <div className="absolute inset-0 flex min-h-dvh items-center justify-center bg-[#0f0720] p-8 text-center text-white/70">
        <p>Houses are not enabled for this school.</p>
      </div>
    );
  }

  if (!staffOk) {
    return (
      <div className="absolute inset-0 flex min-h-dvh items-center justify-center bg-[#0f0720] p-8 text-center text-white/70">
        <p>Staff sign-in is required to run this presentation.</p>
      </div>
    );
  }

  if (housesLoading || studentsLoading) {
    return (
      <div className="absolute inset-0 flex min-h-dvh items-center justify-center bg-[#0f0720]">
        <Loader2 className="h-10 w-10 animate-spin text-violet-400" />
      </div>
    );
  }

  if (sortedHouses.length === 0 || queue.length === 0) {
    return (
      <div className="absolute inset-0 flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#0f0720] p-8 text-center text-white">
        <p className="text-lg font-bold">Nothing to present yet</p>
        <p className="text-white/60 max-w-md text-sm">
          Add houses and students in Admin before launching the ceremony.
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="absolute inset-0 flex min-h-dvh flex-col items-center justify-center gap-4 bg-gradient-to-b from-violet-950 to-[#0f0720] p-8 text-center text-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 22 }}
        >
          <Sparkles className="mx-auto h-14 w-14 text-amber-400 mb-6" />
          <h1 className="text-3xl font-black uppercase tracking-widest text-white sm:text-5xl">Ceremony complete</h1>
          <p className="text-white/70 max-w-md mt-4 text-lg">Every student has been celebrated.</p>
        </motion.div>
      </div>
    );
  }

  const accentColor = currentHouse?.color ?? '#7c3aed';
  const celebrationEffect = resolveHouseSortingCelebrationEffect(settings.houseSortingCelebrationEffect);
  const showFlyUp = settings.houseSortingShowFlyUp !== false;

  return (
    <div
      className="absolute inset-0 flex min-h-dvh flex-col items-center justify-center overflow-hidden p-6 sm:p-10 text-center text-white"
      style={{
        background: `radial-gradient(circle at 50% 18%, ${accentColor}44, #0f0720 72%)`,
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(255,255,255,0.06),transparent_55%)]" />

      {step === 'reveal' && celebrationRunId > 0 ? (
        <HouseSortingCelebrationLayer
          runId={celebrationRunId}
          celebrationEffect={celebrationEffect}
          showFlyUp={showFlyUp}
          house={currentHouse}
        />
      ) : null}

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="relative z-10 mb-10"
      >
        <p className="mb-3 text-[10px] font-black uppercase tracking-[0.45em] text-white/50">
          House ceremony
        </p>
        <p className="text-sm text-white/50">
          {index + 1} of {queue.length}
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {step === 'question' ? (
          <motion.div
            key={`question-${currentStudent?.id}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="relative z-10 w-full max-w-3xl space-y-8"
          >
            <p className="text-3xl font-black tracking-tight text-white sm:text-5xl md:text-6xl">
              {currentStudent?.firstName} {currentStudent?.lastName}
            </p>
            <div className="rounded-3xl border border-white/15 bg-white/10 px-6 py-10 backdrop-blur-md">
              <MessageCircleQuestion className="mx-auto mb-5 h-12 w-12 text-amber-300" aria-hidden />
              <p className="text-xl font-bold leading-snug text-white sm:text-3xl">{fakeQuestion}</p>
            </div>
          </motion.div>
        ) : step === 'name' ? (
          <motion.div
            key={`name-${currentStudent?.id}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="relative z-10 w-full max-w-3xl space-y-6"
          >
            <p className="text-3xl font-black tracking-tight text-white sm:text-5xl md:text-6xl">
              {currentStudent?.firstName} {currentStudent?.lastName}
            </p>
            <p className="text-lg font-medium text-white/60 sm:text-xl">
              Ready to reveal their house?
            </p>
          </motion.div>
        ) : (
          <motion.div
            key={`reveal-${currentStudent?.id}`}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="relative z-10 w-full max-w-3xl space-y-8"
          >
            <p className="text-3xl font-black tracking-tight text-white sm:text-5xl md:text-6xl">
              {currentStudent?.firstName} {currentStudent?.lastName}
            </p>
            {currentHouse ? (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: 0.12 } },
                }}
                className="space-y-4"
              >
                <motion.p
                  variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                  transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                  className="text-lg font-bold uppercase tracking-[0.2em] text-white/85 sm:text-xl"
                >
                  Belongs to
                </motion.p>
                <motion.div
                  variants={{ hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1 } }}
                  transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                >
                  <HouseBadge house={currentHouse} size="lg" className="scale-125 text-base sm:scale-150 sm:text-lg" />
                </motion.div>
                {currentHouse.motto ? (
                  <motion.p
                    variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
                    transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                    className="text-lg italic text-white/70"
                  >
                    &ldquo;{currentHouse.motto}&rdquo;
                  </motion.p>
                ) : null}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 280, damping: 26 }}
                className="space-y-3"
              >
                <p className="text-2xl font-bold text-amber-200 sm:text-3xl">No house assigned yet</p>
                <p className="text-base text-white/60 sm:text-lg">
                  Assign this student in Houses → Manage, then run the ceremony again.
                </p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-8 left-1/2 z-20 flex -translate-x-1/2 gap-3">
        {step === 'question' || step === 'name' ? (
          <Button
            type="button"
            size="lg"
            className="min-w-[12rem] rounded-full bg-violet-500 px-8 text-base font-bold text-white shadow-lg shadow-violet-900/40 hover:bg-violet-400"
            onClick={goToReveal}
          >
            Reveal house
          </Button>
        ) : (
          <Button
            type="button"
            size="lg"
            className="min-w-[12rem] rounded-full bg-white/15 px-8 text-base font-bold text-white shadow-lg backdrop-blur-sm hover:bg-white/25"
            onClick={advance}
          >
            {index + 1 >= queue.length ? 'Finish ceremony' : 'Next student'}
          </Button>
        )}
      </div>
    </div>
  );
}
