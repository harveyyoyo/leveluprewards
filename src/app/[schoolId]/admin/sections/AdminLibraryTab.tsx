'use client';

import { useAppContext } from '@/components/AppProvider';
import { LibraryWorkspace } from '@/components/library/LibraryWorkspace';
import type { Category, LibraryItem, LibraryItemInput, Student } from '@/lib/types';

export function AdminLibraryTab({
  schoolId,
  categories,
}: {
  schoolId?: string | null;
  categories?: Category[] | null;
  libraryItems?: LibraryItem[] | null | undefined;
  getStudentName?: (id?: string) => string;
  students?: Student[] | null;
  onAddLibraryItem?: () => void;
  onEditLibraryItem?: (i: LibraryItem) => void;
  onDeleteLibraryItem?: (id: string) => void;
  onReturnLibraryItem?: (id: string) => void;
  onRegisterFromScan?: (data: LibraryItemInput) => Promise<void>;
  upcTaken?: (upc: string) => Promise<boolean>;
}) {
  const { schoolId: contextSchoolId } = useAppContext();
  const resolvedSchoolId = schoolId || contextSchoolId;

  return (
    <LibraryWorkspace
      embedded
      schoolId={resolvedSchoolId}
      categories={categories}
    />
  );
}
