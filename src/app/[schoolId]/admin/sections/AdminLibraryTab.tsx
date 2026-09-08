'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppContext } from '@/components/AppProvider';
import { TabWalkthroughHeaderAction } from '@/components/tabWalkthrough/TabWalkthroughContext';
import type { Category, LibraryItem, LibraryItemInput, Student } from '@/lib/types';

export function AdminLibraryTab({
  libraryItems,
  getStudentName,
  schoolId,
  onAddLibraryItem,
  onEditLibraryItem,
  onDeleteLibraryItem,
  onReturnLibraryItem,
  onRegisterFromScan,
  upcTaken,
  categories,
  students,
}: {
  libraryItems: LibraryItem[] | null | undefined;
  getStudentName: (id?: string) => string;
  schoolId?: string | null;
  students?: Student[] | null;
  categories?: Category[] | null;
  onAddLibraryItem: () => void;
  onEditLibraryItem: (i: LibraryItem) => void;
  onDeleteLibraryItem: (id: string) => void;
  onReturnLibraryItem: (id: string) => void;
  onRegisterFromScan?: (data: LibraryItemInput) => Promise<void>;
  upcTaken?: (upc: string) => Promise<boolean>;
}) {
  const router = useRouter();
  const { schoolId: contextSchoolId } = useAppContext();
  const resolvedSchoolId = schoolId || contextSchoolId;
  const href = resolvedSchoolId ? `/${resolvedSchoolId}/library` : '';
  useEffect(() => { if (href) router.push(href); }, [href, router]);
  return href ? <p className="p-6">Opening Library… <Link className="underline" href={href}>Open library</Link></p> : null;
}
