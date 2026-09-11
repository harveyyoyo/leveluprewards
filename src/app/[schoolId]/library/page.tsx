import { Suspense } from 'react';
import { LibraryWorkspace } from '@/components/library/LibraryWorkspace';

/** useSearchParams() inside LibraryWorkspace (for ?tab= / ?library=) must sit under Suspense,
 * matching the admin dashboard's pattern, or dev error recovery can loop on a missing boundary. */
export default function LibraryPage() {
  return (
    <Suspense fallback={null}>
      <LibraryWorkspace />
    </Suspense>
  );
}
