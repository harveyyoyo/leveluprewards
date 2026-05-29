import { useEffect, useMemo, useState } from 'react';
import { doc } from 'firebase/firestore';
import { useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/components/providers/AuthProvider';
import { schoolPublicDocRef } from '@/lib/schoolPublic';

function schoolNameCacheKey(schoolId: string) {
  return `levelup_school_name_${schoolId.trim().toLowerCase()}`;
}

function readCachedSchoolName(schoolId: string | null): string | null {
  if (!schoolId || typeof window === 'undefined') return null;
  try {
    const value = sessionStorage.getItem(schoolNameCacheKey(schoolId));
    return value?.trim() || null;
  } catch {
    return null;
  }
}

function writeCachedSchoolName(schoolId: string, name: string) {
  try {
    sessionStorage.setItem(schoolNameCacheKey(schoolId), name.trim());
  } catch {
    // ignore quota / private mode
  }
}

export function formatSchoolIdSlug(schoolId: string) {
  return schoolId.replace(/-/g, ' ').replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

/** Firestore `name`, then session cache, then title-cased slug (e.g. yeshiva → Yeshiva). */
export function useSchoolDisplayName(explicitSchoolId?: string | null) {
  const { firestore } = useFirebase();
  const { schoolId: authSchoolId, loginState } = useAuth();
  const schoolId = (explicitSchoolId ?? authSchoolId)?.trim().toLowerCase() || null;

  const isStaff =
    loginState === 'admin' ||
    loginState === 'developer' ||
    loginState === 'teacher' ||
    loginState === 'secretary' ||
    loginState === 'prizeClerk' ||
    loginState === 'reports' ||
    loginState === 'librarian' ||
    loginState === 'office' ||
    loginState === 'houseCoordinator';

  const schoolDocRef = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    if (isStaff) return doc(firestore, 'schools', schoolId);
    return schoolPublicDocRef(firestore, schoolId);
  }, [firestore, schoolId, isStaff]);

  const { data: schoolData, isLoading } = useDoc<{ name?: string }>(schoolDocRef);
  const [cachedSchoolName, setCachedSchoolName] = useState<string | null>(() => readCachedSchoolName(schoolId));

  useEffect(() => {
    setCachedSchoolName(readCachedSchoolName(schoolId));
  }, [schoolId]);

  useEffect(() => {
    const name = schoolData?.name?.trim();
    if (!name || !schoolId) return;
    writeCachedSchoolName(schoolId, name);
    setCachedSchoolName(name);
  }, [schoolData?.name, schoolId]);

  return useMemo(() => {
    const fromDoc = schoolData?.name?.trim();
    if (fromDoc) return fromDoc;
    if (isLoading) return cachedSchoolName ?? '';
    if (cachedSchoolName) return cachedSchoolName;
    return schoolId ? formatSchoolIdSlug(schoolId) : '';
  }, [schoolData?.name, isLoading, cachedSchoolName, schoolId]);
}
