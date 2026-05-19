'use client';

import { LibraryManagementPanel } from '@/components/library/LibraryManagementPanel';
import { TabWalkthroughHeaderAction } from '@/components/tabWalkthrough/TabWalkthroughContext';
import type { Category, LibraryItem, LibraryItemInput } from '@/lib/types';

export function AdminLibraryTab({
  libraryItems,
  getStudentName,
  onAddLibraryItem,
  onEditLibraryItem,
  onDeleteLibraryItem,
  onReturnLibraryItem,
  onRegisterFromScan,
  upcTaken,
  categories,
}: {
  libraryItems: LibraryItem[] | null | undefined;
  getStudentName: (id?: string) => string;
  categories?: Category[] | null;
  onAddLibraryItem: () => void;
  onEditLibraryItem: (i: LibraryItem) => void;
  onDeleteLibraryItem: (id: string) => void;
  onReturnLibraryItem: (id: string) => void;
  onRegisterFromScan?: (data: LibraryItemInput) => Promise<void>;
  upcTaken?: (upc: string) => Promise<boolean>;
}) {
  return (
    <LibraryManagementPanel
      libraryItems={libraryItems}
      getStudentName={getStudentName}
      showIntakeScanner={!!onRegisterFromScan && !!upcTaken}
      onAddLibraryItem={onAddLibraryItem}
      onEditLibraryItem={onEditLibraryItem}
      onDeleteLibraryItem={onDeleteLibraryItem}
      onReturnLibraryItem={onReturnLibraryItem}
      onRegisterFromScan={onRegisterFromScan}
      upcTaken={upcTaken}
      categories={categories}
    />
  );
}
