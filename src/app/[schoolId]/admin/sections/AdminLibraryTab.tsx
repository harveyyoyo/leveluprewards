'use client';

import { useAppContext } from '@/components/AppProvider';
import { LibraryTabLauncher } from '@/components/library/LibraryTabLauncher';
import type { Category, Class, LibraryItem, LibraryItemInput, Student } from '@/lib/types';

/** Rewards admin tab — launcher only. Full library UI lives in /librarian (new tab). */
export function AdminLibraryTab({
  schoolId,
  classes,
}: {
  schoolId?: string | null;
  categories?: Category[] | null;
  libraryItems?: LibraryItem[] | null | undefined;
  getStudentName?: (id?: string) => string;
  students?: Student[] | null;
  classes?: Class[] | null;
  onAddLibraryItem?: () => void;
  onEditLibraryItem?: (i: LibraryItem) => void;
  onDeleteLibraryItem?: (id: string) => void;
  onReturnLibraryItem?: (id: string) => void;
  onRegisterFromScan?: (data: LibraryItemInput) => Promise<void>;
  upcTaken?: (upc: string) => Promise<boolean>;
}) {
  const { schoolId: contextSchoolId } = useAppContext();
  const resolvedSchoolId = schoolId || contextSchoolId;

  if (!resolvedSchoolId) return null;

  return <LibraryTabLauncher schoolId={resolvedSchoolId} classes={classes} />;
}
