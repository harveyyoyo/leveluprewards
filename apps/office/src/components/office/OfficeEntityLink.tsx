'use client';

import { cn } from '@/lib/utils';
import { useOfficeEntityNav } from '@/components/office/OfficeEntityNavProvider';

type OfficeEntityLinkProps = {
  kind: 'student' | 'teacher' | 'class';
  id: string;
  label: string;
  className?: string;
  muted?: boolean;
};

export function OfficeEntityLink({ kind, id, label, className, muted }: OfficeEntityLinkProps) {
  const { openStudent, openTeacher, openClass } = useOfficeEntityNav();

  if (!id?.trim() || !label?.trim()) {
    return <span className={cn(muted && 'text-muted-foreground', className)}>—</span>;
  }

  return (
    <button
      type="button"
      className={cn(
        'rounded-sm text-left font-medium underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40',
        muted ? 'text-muted-foreground hover:text-teal-800 dark:hover:text-teal-300' : 'text-teal-800 dark:text-teal-300',
        className,
      )}
      onClick={(event) => {
        event.stopPropagation();
        if (kind === 'student') openStudent(id);
        else if (kind === 'teacher') openTeacher(id);
        else openClass(id);
      }}
    >
      {label}
    </button>
  );
}
