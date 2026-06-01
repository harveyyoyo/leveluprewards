'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { collection } from 'firebase/firestore';
import { useAppContext } from '@/components/AppProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { ClassroomRoomDisplayView } from '@/components/points/ClassroomRoomDisplayView';
import { isClassroomPillarOn } from '@/lib/productPillars';
import type { Class } from '@/lib/types';

export default function ClassroomScreenPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const schoolId = typeof params.schoolId === 'string' ? params.schoolId : '';
  const classId = (searchParams?.get('classId') || '').trim();
  const scope = (searchParams?.get('scope') || 'admin').trim();

  const { isInitialized } = useAppContext();
  const { settings } = useSettings();
  const classroomOn = isClassroomPillarOn(settings);

  const firestore = useFirestore();
  const classesQuery = useMemoFirebase(
    () => (schoolId && firestore ? collection(firestore, 'schools', schoolId, 'classes') : null),
    [firestore, schoolId],
  );
  const { data: classes, isLoading: classesLoading } = useCollection<Class>(classesQuery);

  const classMeta = classes?.find((c) => c.id === classId);

  if (!isInitialized || classesLoading) {
    return (
      <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950 text-white">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!classroomOn) {
    return (
      <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950 p-6 text-center text-white">
        <p className="text-lg font-bold">Classroom Management is not enabled for this school.</p>
      </div>
    );
  }

  if (!classId) {
    return (
      <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950 p-6 text-center text-white">
        <p className="text-white/80">Open room display from the seating chart (Room display button).</p>
      </div>
    );
  }

  return (
    <ClassroomRoomDisplayView
      schoolId={schoolId}
      scope={scope}
      classId={classId}
      classLabel={classMeta?.name}
    />
  );
}
