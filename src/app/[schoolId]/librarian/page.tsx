import { Suspense } from 'react';
import { LibraryWorkspace } from '@/components/library/LibraryWorkspace';

export default function LibrarianPage() {
  return (
    <Suspense fallback={null}>
      <LibraryWorkspace />
    </Suspense>
  );
}
