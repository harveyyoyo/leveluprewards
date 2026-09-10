import { Suspense } from 'react';
import { LibraryWorkspace } from '@/components/library/LibraryWorkspace';

/** useSearchParams() inside LibraryWorkspace (for ?tab= deep-linking) must sit under Suspense. */
export default function LibrarianPage() {
  return (
    <Suspense fallback={null}>
      <LibraryWorkspace />
    </Suspense>
  );
}
