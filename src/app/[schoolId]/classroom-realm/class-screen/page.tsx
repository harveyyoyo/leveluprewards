'use client';

import { useDeferredValue } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Tv } from 'lucide-react';
import { ClassroomRealmShell } from '@/components/classroom/ClassroomRealmShell';
import { ClassroomRealmPageHeader } from '@/components/classroom/ClassroomRealmChrome';
import { ClassroomRoomDisplaySection } from '@/components/classroom/ClassroomRoomDisplaySection';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useClassroomRealmRoster } from '@/hooks/useClassroomRealmRoster';
import { isClassroomPillarOn } from '@/lib/productPillars';
import { classroomRealmManageHref } from '@/lib/classroomRealmUrl';

export default function ClassroomRealmClassScreenPage() {
  const params = useParams();
  const schoolId = String(params.schoolId || '');
  const { settings } = useSettings();
  const classroomOn = isClassroomPillarOn(settings);
  const roster = useClassroomRealmRoster(schoolId);
  const deferredStudents = useDeferredValue(roster.students);

  if (!classroomOn) {
    return (
      <ClassroomRealmShell schoolId={schoolId}>
        <p className="p-8 text-center text-white/70">Classroom is not enabled for this school.</p>
      </ClassroomRealmShell>
    );
  }

  if (!roster.staffOk) {
    return (
      <ClassroomRealmShell schoolId={schoolId}>
        <p className="p-8 text-center text-white/70">Staff sign-in is required.</p>
      </ClassroomRealmShell>
    );
  }

  return (
    <ClassroomRealmShell schoolId={schoolId}>
      <div className="classroom-realm-manage mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <ClassroomRealmPageHeader
          eyebrow="Display"
          title="Class screen"
          subtitle="Student-facing mirror of the live chart — no behavior notes on this view."
          icon={Tv}
        >
          <Button
            type="button"
            variant="outline"
            asChild
            className="border-white/20 text-white hover:bg-white/10"
          >
            <Link href={classroomRealmManageHref(schoolId, 'room-display')}>
              Full room display settings
            </Link>
          </Button>
        </ClassroomRealmPageHeader>

        <ClassroomRoomDisplaySection
          schoolId={schoolId}
          scope={roster.seatingScope}
          classes={roster.classes}
          students={deferredStudents}
        />
      </div>
    </ClassroomRealmShell>
  );
}
