'use client';

import { useDeferredValue, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ExternalLink, Loader2, QrCode, Tv } from 'lucide-react';
import { ClassroomRealmShell } from '@/components/classroom/ClassroomRealmShell';
import { ClassroomRealmPageHeader } from '@/components/classroom/ClassroomRealmChrome';
import { ClassroomRoomDisplaySection } from '@/components/classroom/ClassroomRoomDisplaySection';
import { ClassroomScreenPairModal } from '@/components/classroom/ClassroomScreenPairModal';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useClassroomRealmRoster } from '@/hooks/useClassroomRealmRoster';
import { isClassroomPillarOn } from '@/lib/productPillars';
import { classroomRealmManageHref } from '@/lib/classroomRealmUrl';
import { openClassroomScreenTab } from '@/lib/classroomScreen';

export default function ClassroomRealmClassScreenPage() {
  const params = useParams();
  const schoolId = String(params.schoolId || '');
  const { settings } = useSettings();
  const classroomOn = isClassroomPillarOn(settings);
  const roster = useClassroomRealmRoster(schoolId);
  const deferredStudents = useDeferredValue(roster.students);
  const [pairOpen, setPairOpen] = useState(false);
  const firstClass = roster.classes[0];

  if (!classroomOn) {
    return (
      <ClassroomRealmShell schoolId={schoolId}>
        <p className="p-8 text-center text-white/70">Classroom is not enabled for this school.</p>
      </ClassroomRealmShell>
    );
  }

  if (!roster.staffOk || !roster.canReadRoster) {
    return (
      <ClassroomRealmShell schoolId={schoolId}>
        <p className="p-8 text-center text-white/70">Sign in as teacher or admin to open this screen.</p>
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
    <ClassroomRealmShell schoolId={schoolId}>
      <div className="classroom-realm-manage mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <ClassroomRealmPageHeader
          eyebrow="Display"
          title="Class screen"
          subtitle="Student-facing mirror of the live chart — no behavior notes on this view."
          icon={Tv}
          iconLayoutId="classroom-realm-launch-screen"
        >
          <Button
            type="button"
            size="lg"
            disabled={!firstClass}
            onClick={() =>
              firstClass
                ? openClassroomScreenTab({
                    schoolId,
                    classId: firstClass.id,
                    scope: roster.seatingScope,
                  })
                : undefined
            }
            className="rounded-full border-0 font-bold text-[var(--cr-on-accent)]"
            style={{
              backgroundImage: 'linear-gradient(135deg, var(--cr-accent-from), var(--cr-accent-to))',
            }}
          >
            <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
            Open on TV
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setPairOpen(true)}
            disabled={!firstClass}
            className="border-white/20 text-white hover:bg-white/10 hover:text-white"
          >
            <QrCode className="mr-2 h-4 w-4" aria-hidden />
            Pair TV
          </Button>
          <Button
            type="button"
            variant="outline"
            asChild
            className="border-white/20 text-white hover:bg-white/10 hover:text-white"
          >
            <Link href={classroomRealmManageHref(schoolId, 'room-display')}>
              Full room display settings
            </Link>
          </Button>
        </ClassroomRealmPageHeader>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 26 }}
          className="mb-5 text-sm text-white/55"
        >
          Preview and tune the room view below. Use Open on TV when the projector or smart board is ready.
        </motion.p>

        <ClassroomRoomDisplaySection
          schoolId={schoolId}
          scope={roster.seatingScope}
          classes={roster.classes}
          students={deferredStudents}
        />
      </div>
      <ClassroomScreenPairModal
        isOpen={pairOpen}
        onClose={() => setPairOpen(false)}
        schoolId={schoolId}
        classId={firstClass?.id || ''}
        classNameLabel={firstClass?.name || 'Classroom'}
        scope={roster.seatingScope}
      />
    </ClassroomRealmShell>
  );
}
