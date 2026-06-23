'use client';

import { useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { collection } from 'firebase/firestore';
import { Sparkles } from 'lucide-react';
import { ClassroomRealmShell } from '@/components/classroom/ClassroomRealmShell';
import { ClassroomSetupWizardTrigger } from '@/app/[schoolId]/admin/sections/ClassroomSetupWizard';
import { useAppContext } from '@/components/AppProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { canAccessHallOfFameRoute } from '@/lib/hallOfFameAccess';
import { isClassroomPillarOn } from '@/lib/productPillars';
import { CLASSROOM_TAB_LABEL } from '@/lib/classroom/classroomTabSections';
import type { Class, Student } from '@/lib/types';

export default function ClassroomRealmSetupPage() {
  const params = useParams();
  const schoolId = String(params.schoolId || '');
  const firestore = useFirestore();
  const { settings, updateSettings } = useSettings();
  const { loginState } = useAppContext();
  const classroomOn = isClassroomPillarOn(settings);

  const classesQuery = useMemoFirebase(
    () => (firestore && schoolId ? collection(firestore, 'schools', schoolId, 'classes') : null),
    [firestore, schoolId],
  );
  const studentsQuery = useMemoFirebase(
    () => (firestore && schoolId ? collection(firestore, 'schools', schoolId, 'students') : null),
    [firestore, schoolId],
  );

  const { data: classes } = useCollection<Class>(classesQuery);
  const { data: students } = useCollection<Student>(studentsQuery);

  const sortedClasses = useMemo(
    () => (classes ?? []).slice().sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
    [classes],
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-classroom-realm', '');
    return () => document.documentElement.removeAttribute('data-classroom-realm');
  }, []);

  const staffOk = canAccessHallOfFameRoute(loginState);
  const isAdmin = loginState === 'admin' || loginState === 'developer';

  return (
    <ClassroomRealmShell schoolId={schoolId}>
      <div className="classroom-realm-manage mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-md">
          <div
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg"
            style={{
              backgroundImage: 'linear-gradient(135deg, var(--cr-accent-from), var(--cr-accent-to))',
            }}
          >
            <Sparkles className="h-8 w-8" style={{ color: 'var(--cr-on-accent)' }} aria-hidden />
          </div>
          <h1 className="classroom-realm-display mb-3 text-3xl font-bold text-white">
            Set up {CLASSROOM_TAB_LABEL}
          </h1>
          <p className="mb-8 text-sm leading-relaxed text-white/60">
            Turn on seating charts, pick a visual style, and configure quick awards for your classes.
          </p>

          {!classroomOn && isAdmin ? (
            <p className="mb-4 text-sm text-white/70">
              {CLASSROOM_TAB_LABEL} is off — the wizard will turn it on as part of setup.
            </p>
          ) : null}

          {!staffOk ? (
            <p className="text-sm text-white/50">Staff sign-in is required to run setup.</p>
          ) : (
            <ClassroomSetupWizardTrigger
              schoolId={schoolId}
              classes={sortedClasses}
              students={students ?? []}
              updateSettings={updateSettings}
              className="mx-auto border-white/20 bg-white/10 text-white hover:bg-white/15"
            />
          )}
        </div>
      </div>
    </ClassroomRealmShell>
  );
}
