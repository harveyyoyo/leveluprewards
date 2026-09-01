'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { collection } from 'firebase/firestore';
import { Palette, Sparkles } from 'lucide-react';
import { ClassroomRealmShell } from '@/components/classroom/ClassroomRealmShell';
import {
  CLASSROOM_REALM_ACCENT_BUTTON,
  ClassroomRealmPageHeader,
  ClassroomRealmPanel,
} from '@/components/classroom/ClassroomRealmChrome';
import { ClassroomRealmThemePicker } from '@/components/classroom/ClassroomRealmThemePicker';
import { ClassroomSetupWizardTrigger } from '@/app/[schoolId]/admin/sections/ClassroomSetupWizard';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/components/AppProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { useCanReadSchoolRoster } from '@/hooks/useCanReadSchoolRoster';
import { canAccessHallOfFameRoute } from '@/lib/hallOfFameAccess';
import { isClassroomPillarOn } from '@/lib/productPillars';
import {
  resolveClassroomRealmTheme,
  type ClassroomRealmThemeId,
} from '@/lib/classroom/classroomRealmThemes';
import { CLASSROOM_TAB_LABEL } from '@/lib/classroom/classroomTabSections';
import type { Class, Student } from '@/lib/types';

export default function ClassroomRealmSetupPage() {
  const params = useParams();
  const schoolId = String(params.schoolId || '');
  const firestore = useFirestore();
  const { settings, updateSettings } = useSettings();
  const { loginState } = useAppContext();
  const classroomOn = isClassroomPillarOn(settings);
  const activeTheme = resolveClassroomRealmTheme(settings.classroomRealmTheme);
  const staffOk = canAccessHallOfFameRoute(loginState);
  const canReadRoster = useCanReadSchoolRoster();

  const classesQuery = useMemoFirebase(
    () =>
      firestore && schoolId && canReadRoster
        ? collection(firestore, 'schools', schoolId, 'classes')
        : null,
    [firestore, schoolId, canReadRoster],
  );
  const studentsQuery = useMemoFirebase(
    () =>
      firestore && schoolId && canReadRoster
        ? collection(firestore, 'schools', schoolId, 'students')
        : null,
    [firestore, schoolId, canReadRoster],
  );

  const { data: classes } = useCollection<Class>(classesQuery);
  const { data: students } = useCollection<Student>(studentsQuery);

  const sortedClasses = useMemo(
    () => (classes ?? []).slice().sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
    [classes],
  );

  const isAdmin = loginState === 'admin' || loginState === 'developer';

  function selectTheme(id: ClassroomRealmThemeId) {
    updateSettings({ classroomRealmTheme: id });
  }

  return (
    <ClassroomRealmShell schoolId={schoolId}>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <ClassroomRealmPageHeader
          eyebrow="Change look"
          title="Change the classroom look"
          subtitle="Tap a color card to restyle this space. The setup wizard below is only if you still need seating and awards."
          icon={Palette}
        />

        {!classroomOn ? (
          <ClassroomRealmPanel className="mb-6 text-center">
            <p className="mb-4 text-sm text-white/70">
              {CLASSROOM_TAB_LABEL} is off for this school.
              {isAdmin ? ' Turn it on to use seating charts and live awards.' : ' Ask an admin to turn it on.'}
            </p>
            {isAdmin ? (
              <Button
                type="button"
                size="lg"
                onClick={() => updateSettings({ payClassroom: true })}
                className="rounded-full border-0 px-8 font-bold shadow-lg shadow-black/30"
                style={CLASSROOM_REALM_ACCENT_BUTTON}
              >
                <Sparkles className="mr-2 h-5 w-5" aria-hidden />
                Enable Classroom
              </Button>
            ) : null}
          </ClassroomRealmPanel>
        ) : null}

        {!staffOk ? (
          <p className="text-sm text-white/50">Staff sign-in is required to change the look.</p>
        ) : (
          <div className="space-y-6">
            <ClassroomRealmPanel>
              <div className="mb-5">
                <h2 className="font-serif text-xl font-bold text-white">Classroom look</h2>
                <p className="mt-1 text-sm text-white/55">
                  This changes the background and colors for every teacher in Classroom. Current look:{' '}
                  <span style={{ color: 'var(--cr-accent-text)' }}>
                    {activeTheme.icon} {activeTheme.label}
                  </span>
                </p>
              </div>
              <ClassroomRealmThemePicker value={activeTheme.id} onSelect={selectTheme} />
            </ClassroomRealmPanel>

            <ClassroomRealmPanel className="text-center">
              <h2 className="mb-2 font-serif text-xl font-bold text-white">Finish seating & awards</h2>
              <p className="mb-6 text-sm leading-relaxed text-white/55">
                The setup wizard walks through seating charts, quick awards, and classroom options.
                {!classroomOn && isAdmin ? ' It will also turn Classroom on.' : null}
              </p>
              {canReadRoster ? (
                <ClassroomSetupWizardTrigger
                  schoolId={schoolId}
                  classes={sortedClasses}
                  students={students ?? []}
                  updateSettings={updateSettings}
                  className="mx-auto border-white/20 bg-white/10 text-white hover:bg-white/15"
                />
              ) : (
                <p className="text-sm text-white/50">
                  Sign in with the teacher or admin passcode to load the class list.
                </p>
              )}
            </ClassroomRealmPanel>
          </div>
        )}
      </div>
    </ClassroomRealmShell>
  );
}
