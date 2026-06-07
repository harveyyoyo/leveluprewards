'use client';

import { useCallback } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { openClassroomFullscreenTab } from '@/lib/classroomPointsUrl';
import { Button } from '@/components/ui/button';
import type { Class } from '@/lib/types';
import { cn } from '@/lib/utils';

export function ClassroomLaunchMonitorButton({
  schoolId,
  seatingScope,
  classes,
  className,
}: {
  schoolId: string;
  seatingScope: string;
  classes: Class[];
  className?: string;
}) {
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
    });
  }, [classes, schoolId, seatingScope]);

  return (
    <Button
      type="button"
      className={cn(
        'gap-2 rounded-xl border-0 bg-gradient-to-r from-violet-500 to-violet-600 font-bold text-white shadow-md shadow-violet-500/25 transition-all hover:scale-[1.02] hover:from-violet-600 hover:to-violet-700 active:scale-[0.98]',
        className,
      )}
      disabled={!classes.length}
      onClick={openMonitorDisplay}
    >
      Launch Monitor Display
      <ArrowUpRight className="h-4 w-4" aria-hidden />
    </Button>
  );
}
