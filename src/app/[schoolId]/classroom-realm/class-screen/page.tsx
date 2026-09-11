'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ExternalLink, LayoutGrid, Loader2, Tv } from 'lucide-react';
import { ClassroomRealmShell } from '@/components/classroom/ClassroomRealmShell';
import { ClassroomRealmPageHeader } from '@/components/classroom/ClassroomRealmChrome';
import { ClassroomRoomDisplaySection } from '@/components/classroom/ClassroomRoomDisplaySection';
import { ClassroomPointsPanel } from '@/components/points/ClassroomPointsPanel';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useClassroomRealmRoster } from '@/hooks/useClassroomRealmRoster';
import { isClassroomPillarOn } from '@/lib/productPillars';
import { classroomRealmManageHref } from '@/lib/classroomRealmUrl';
import { openClassroomScreenTab } from '@/lib/classroomScreen';
import { openClassroomFullscreenTab } from '@/lib/classroomPointsUrl';
import { pickClassroomActiveClass, rememberClassroomActiveClass } from '@/lib/classroom/classroomActiveClass';
import { cn } from '@/lib/utils';

const spring = { type: 'spring' as const, stiffness: 280, damping: 26 };

type ScreenMode = 'poster' | 'seats';

export default function ClassroomRealmClassScreenPage() {
  const params = useParams();
  const schoolId = String(params.schoolId || '');
  const { settings } = useSettings();
  const classroomOn = isClassroomPillarOn(settings);
  const roster = useClassroomRealmRoster(schoolId, { includeCategories: true });
  const deferredStudents = useDeferredValue(roster.students);
  const [mode, setMode] = useState<ScreenMode>('poster');
  const [classId, setClassId] = useState(() => pickClassroomActiveClass(roster.classes));

  const effectiveClassId = useMemo(
    () => pickClassroomActiveClass(roster.classes, classId),
    [roster.classes, classId],
  );
  const handleClassChange = (next: string) => {
    setClassId(next);
    rememberClassroomActiveClass(next);
  };

  const openTv = () => {
    if (!effectiveClassId) return;
    if (mode === 'seats') {
      openClassroomFullscreenTab({
        schoolId,
        classId: effectiveClassId,
        scope: roster.seatingScope,
        audience: 'student',
      });
      return;
    }
    openClassroomScreenTab({
      schoolId,
      classId: effectiveClassId,
      scope: roster.seatingScope,
    });
  };

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
          subtitle="This is the student TV — a clean poster or the seating board, with no behavior notes."
          icon={Tv}
          iconLayoutId="classroom-realm-launch-screen"
        >
          <Button
            type="button"
            size="lg"
            disabled={!effectiveClassId}
            onClick={openTv}
            className="rounded-full border-0 font-bold text-[var(--cr-on-accent)]"
            style={{
              backgroundImage: 'linear-gradient(135deg, var(--cr-accent-from), var(--cr-accent-to))',
            }}
          >
            <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
            Open class screen
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

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="mb-5 flex flex-wrap items-center gap-2"
          role="tablist"
          aria-label="Class screen mode"
        >
          {(
            [
              { id: 'poster', label: 'Poster TV', icon: Tv },
              { id: 'seats', label: 'Seating board', icon: LayoutGrid },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const active = mode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setMode(item.id)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold',
                  active
                    ? 'border-white/30 bg-white/12 text-white'
                    : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white',
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {item.label}
              </button>
            );
          })}
        </motion.div>

        {mode === 'poster' ? (
          <ClassroomRoomDisplaySection
            layout="tv"
            schoolId={schoolId}
            scope={roster.seatingScope}
            classes={roster.classes}
            students={deferredStudents}
            classId={effectiveClassId}
            onClassIdChange={handleClassChange}
          />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring}
            className="overflow-hidden rounded-3xl border border-white/15 bg-black/25 shadow-2xl shadow-black/40"
          >
            <div className="h-[min(75vh,820px)] min-h-[28rem]">
              <ClassroomPointsPanel
                variant="fullscreen"
                audience="student"
                schoolId={schoolId}
                students={deferredStudents}
                classes={roster.classes}
                categories={roster.categories ?? []}
                storageScope={roster.seatingScope}
                initialClassId={effectiveClassId}
                onClassIdChange={handleClassChange}
              />
            </div>
          </motion.div>
        )}
      </div>
    </ClassroomRealmShell>
  );
}
