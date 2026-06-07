'use client';

import { useCallback } from 'react';
import { ArrowUpRight } from 'lucide-react';
import {
  openClassroomFullscreenTab,
  type ClassroomFullscreenAudience,
} from '@/lib/classroomPointsUrl';
import {
  CLASS_AWARDS_LIVE_LAUNCH_LABEL,
  CLASS_AWARDS_STUDENT_LAUNCH_LABEL,
} from '@/lib/classroom/classroomTabSections';
import { Button } from '@/components/ui/button';
import type { Class } from '@/lib/types';
import { cn } from '@/lib/utils';

export function ClassroomLaunchMonitorButton({
  schoolId,
  seatingScope,
  classes,
  audience = 'teacher',
  className,
}: {
  schoolId: string;
  seatingScope: string;
  classes: Class[];
  audience?: ClassroomFullscreenAudience;
  className?: string;
}) {
  const isStudentAudience = audience === 'student';
  const label = isStudentAudience ? CLASS_AWARDS_STUDENT_LAUNCH_LABEL : CLASS_AWARDS_LIVE_LAUNCH_LABEL;

  const openMonitorDisplay = useCallback(() => {
    if (!classes.length) return;
    const saved =
      typeof window !== 'undefined' ? localStorage.getItem('defaultClassId')?.trim() : '';
    const classId =
      saved && classes.some((c) => c.id === saved) ? saved : (classes[0]?.id ?? '');
    if (!classId) return;
    openClassroomFullscreenTab({
      schoolId,
      classId,
      scope: seatingScope,
      audience,
    });
  }, [audience, classes, schoolId, seatingScope]);

  return (
    <Button
      type="button"
      variant={isStudentAudience ? 'outline' : 'default'}
      className={cn(
        isStudentAudience
          ? 'gap-2 rounded-xl border-violet-500/40 font-bold text-violet-700 hover:bg-violet-500/10 dark:text-violet-300'
          : 'gap-2 rounded-xl border-0 bg-gradient-to-r from-violet-500 to-violet-600 font-bold text-white shadow-md shadow-violet-500/25 transition-all hover:scale-[1.02] hover:from-violet-600 hover:to-violet-700 active:scale-[0.98]',
        className,
      )}
      disabled={!classes.length}
      onClick={openMonitorDisplay}
    >
      {label}
      <ArrowUpRight className="h-4 w-4" aria-hidden />
    </Button>
  );
}
