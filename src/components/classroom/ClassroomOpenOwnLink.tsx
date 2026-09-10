'use client';

import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { classroomRealmOpenHref } from '@/lib/classroomRealmUrl';

/** Leftover from ClassroomTabLauncher / Library "open in full" — opens Classroom as its own page. */
export function ClassroomOpenOwnLink({
  schoolId,
  className,
}: {
  schoolId: string;
  className?: string;
}) {
  const classroomUrl = classroomRealmOpenHref(schoolId);

  return (
    <Button
      asChild
      size="sm"
      className={
        className ??
        'gap-1.5 rounded-xl bg-gradient-to-r from-lime-700 to-amber-600 px-4 text-xs font-black text-white shadow-md hover:from-lime-600 hover:to-amber-500'
      }
    >
      <a href={classroomUrl} target="_blank" rel="noopener noreferrer">
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        Open Classroom
      </a>
    </Button>
  );
}
