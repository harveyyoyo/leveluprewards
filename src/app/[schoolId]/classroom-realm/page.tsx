'use client';

import { useRef } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, Sparkles } from 'lucide-react';
import { ClassroomCommandCenter } from '@/components/classroom/ClassroomCommandCenter';
import { CLASSROOM_REALM_ACCENT_BUTTON } from '@/components/classroom/ClassroomRealmChrome';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useAppContext } from '@/components/AppProvider';
import { useClassroomRealmRoster } from '@/hooks/useClassroomRealmRoster';
import { isClassroomPillarOn } from '@/lib/productPillars';
import { canAccessHallOfFameRoute } from '@/lib/hallOfFameAccess';
import { CLASSROOM_TAB_LABEL } from '@/lib/classroom/classroomTabSections';
import {
  classroomRealmHomePhase,
  shouldLatchClassroomCommandCenter,
} from '@/lib/classroom/classroomRealmHomeView';
import { Button } from '@/components/ui/button';

const enter = { type: 'spring' as const, stiffness: 280, damping: 26 };

function CommandCenterChrome({ children }: { children: React.ReactNode }) {
  return (
    <div data-classroom-home="command-center" className="min-h-dvh bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</div>
    </div>
  );
}

/** Standalone Classroom page — command center only. Do not remount the older realm hub. */
export default function ClassroomRealmHomePage() {
  const params = useParams();
  const schoolId = String(params.schoolId || '');
  const { settings, updateSettings } = useSettings();
  const { loginState } = useAppContext();
  const classroomOn = isClassroomPillarOn(settings);
  const isStaff = canAccessHallOfFameRoute(loginState);
  const roster = useClassroomRealmRoster(schoolId, { includeCategories: true });
  const keepReadyRef = useRef(false);

  if (
    shouldLatchClassroomCommandCenter({
      classroomOn,
      staffOk: roster.staffOk,
      canReadRoster: roster.canReadRoster,
      studentsLoading: roster.studentsLoading,
      classesLoading: roster.classesLoading,
    })
  ) {
    keepReadyRef.current = true;
  }

  const phase = classroomRealmHomePhase({
    classroomOn,
    staffOk: roster.staffOk,
    canReadRoster: roster.canReadRoster,
    studentsLoading: roster.studentsLoading,
    classesLoading: roster.classesLoading,
    keepReady: keepReadyRef.current,
  });

  if (phase === 'off') {
    return (
      <CommandCenterChrome>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="max-w-md text-muted-foreground">
            {CLASSROOM_TAB_LABEL} isn&apos;t turned on for this school yet.
          </p>
          {isStaff && loginState === 'admin' ? (
            <Button
              type="button"
              size="lg"
              onClick={() => updateSettings({ payClassroom: true })}
              className="rounded-full border-0 px-8 font-bold shadow-xl shadow-black/30"
              style={CLASSROOM_REALM_ACCENT_BUTTON}
            >
              <Sparkles className="mr-2 h-5 w-5" aria-hidden />
              Enable Classroom
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">Ask an admin to turn Classroom on.</p>
          )}
        </div>
      </CommandCenterChrome>
    );
  }

  if (phase === 'need-sign-in') {
    return (
      <CommandCenterChrome>
        <p className="p-8 text-center text-muted-foreground">
          Sign in as teacher or admin to open Classroom.
        </p>
      </CommandCenterChrome>
    );
  }

  if (phase === 'loading') {
    return (
      <CommandCenterChrome>
        <div className="flex items-center justify-center p-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
        </div>
      </CommandCenterChrome>
    );
  }

  return (
    <CommandCenterChrome>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={enter}
      >
        <ClassroomCommandCenter
          schoolId={schoolId}
          categories={roster.categories}
          classes={roster.classes}
          students={roster.students}
          variant={roster.variant}
          activeTeacherId={roster.managerTeacherId}
        />
      </motion.div>
    </CommandCenterChrome>
  );
}
