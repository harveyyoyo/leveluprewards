'use client';

import { useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { collection } from 'firebase/firestore';
import { useAppContext } from '@/components/AppProvider';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useSettings } from '@/components/providers/SettingsProvider';
import { isLibraryStandaloneSelfCheckoutEnabled } from '@/lib/library/libraryPolicy';
import { LibraryStudentSelfCheckoutPortal } from '@/components/library/LibraryStudentSelfCheckoutPortal';
import type { Category, Student } from '@/lib/types';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function LibrarySelfCheckoutPage() {
  const params = useParams<{ schoolId: string }>();
  const schoolId = (params.schoolId || '').trim().toLowerCase();
  const router = useRouter();
  const { settings } = useSettings();
  const { isInitialized, loginState } = useAppContext();
  const firestore = useFirestore();

  const categoriesQuery = useMemoFirebase(
    () => (firestore && schoolId ? collection(firestore, 'schools', schoolId, 'categories') : null),
    [firestore, schoolId],
  );
  const { data: categories } = useCollection<Category>(categoriesQuery);

  const studentsQuery = useMemoFirebase(
    () => (firestore && schoolId ? collection(firestore, 'schools', schoolId, 'students') : null),
    [firestore, schoolId],
  );
  const { data: students } = useCollection<Student>(studentsQuery);

  const getStudentName = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of students ?? []) {
      map.set(s.id, `${s.firstName} ${s.lastName}`.trim());
    }
    return (id?: string) => (id ? map.get(id) ?? 'Student' : 'Student');
  }, [students]);

  useEffect(() => {
    if (!isInitialized || !schoolId) return;
    if (loginState === 'teacher') router.replace(`/${schoolId}/teacher`);
    else if (loginState === 'secretary') router.replace(`/${schoolId}/secretary`);
  }, [isInitialized, loginState, schoolId, router]);

  if (settings.payLibrary === false) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground text-center">Library is not enabled for this school.</p>
        <Button variant="outline" className="rounded-xl" asChild>
          <Link href={`/${schoolId}/portal`}>Back to portal</Link>
        </Button>
      </div>
    );
  }

  if (!isLibraryStandaloneSelfCheckoutEnabled(settings)) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 p-6 max-w-md mx-auto text-center">
        <p className="text-muted-foreground">
          Student library self-checkout station is turned off. Enable{' '}
          <strong className="text-foreground">Library station (shared device)</strong> under Library → Settings, or
          use the student kiosk coupon scanner when that option is on.
        </p>
        <Button variant="outline" className="rounded-xl" asChild>
          <Link href={`/${schoolId}/portal`}>Back to portal</Link>
        </Button>
      </div>
    );
  }

  if (!schoolId) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <LibraryStudentSelfCheckoutPortal
      schoolId={schoolId}
      categories={categories}
      getStudentName={getStudentName}
    />
  );
}
