'use client';

import { useParams } from 'next/navigation';
import { Loader2, Sparkles } from 'lucide-react';
import { ClassroomRealmShell } from '@/components/classroom/ClassroomRealmShell';
import { ClassroomCommandCenter } from '@/components/classroom/ClassroomCommandCenter';
import { CLASSROOM_REALM_ACCENT_BUTTON } from '@/components/classroom/ClassroomRealmChrome';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useAppContext } from '@/components/AppProvider';
import { useClassroomRealmRoster } from '@/hooks/useClassroomRealmRoster';
import { isClassroomPillarOn } from '@/lib/productPillars';
import { canAccessHallOfFameRoute } from '@/lib/hallOfFameAccess';
import { CLASSROOM_TAB_LABEL } from '@/lib/classroom/classroomTabSections';
import { Button } from '@/components/ui/button';

/** Standalone Classroom page — same command center as the admin tab, without the staff sidebar. */
export default function ClassroomRealmHomePage() {
  const params = useParams();
  const schoolId = String(params.schoolId || '');
  const { settings, updateSettings } = useSettings();
  const { loginState } = useAppContext();
  const classroomOn = isClassroomPillarOn(settings);
  const isStaff = canAccessHallOfFameRoute(loginState);
  const roster = useClassroomRealmRoster(schoolId, { includeCategories: true });

  if (!classroomOn) {
    return (
      <ClassroomRealmShell schoolId={schoolId}>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="max-w-md text-white/70">
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
            <p className="text-sm text-white/50">Ask an admin to turn Classroom on.</p>
          )}
        </div>
      </ClassroomRealmShell>
    );
  }

  if (!roster.staffOk || !roster.canReadRoster) {
    return (
      <ClassroomRealmShell schoolId={schoolId}>
        <p className="p-8 text-center text-white/70">
          Sign in as teacher or admin to open Classroom.
        </p>
      </ClassroomRealmShell>
    );
  }

  if (roster.studentsLoading || roster.classesLoading) {
    return (
      <ClassroomRealmShell schoolId={schoolId}>
        <div className="flex items-center justify-center p-16">
          <Loader2 className="h-6 w-6 animate-spin text-white/60" aria-hidden />
        </div>
      </ClassroomRealmShell>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <ClassroomCommandCenter
          schoolId={schoolId}
          categories={roster.categories}
          classes={roster.classes}
          students={roster.students}
          variant={roster.variant}
          activeTeacherId={roster.managerTeacherId}
        />
      </div>
    </div>
  );
}
