'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { collection, doc, setDoc } from 'firebase/firestore';
import { usePathname, useRouter } from 'next/navigation';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { LibraryLocation, LibraryLocationKind } from '@/lib/library/libraryLocations';
import {
  DEFAULT_LIBRARY_LOCATION_ID,
  DEFAULT_LIBRARY_LOCATION_NAME,
  activeLibraryLocations,
  defaultLibraryLocation,
  isValidLibraryLocationId,
  libraryLocationStorageKey,
  pickLibraryLocation,
  readStoredLibraryLocationId,
  suggestLibraryLocationId,
  writeStoredLibraryLocationId,
} from '@/lib/library/libraryLocations';

export function useLibraryLocations(schoolId: string | null | undefined) {
  const firestore = useFirestore();
  const ensuredRef = useRef(false);
  const queryRef = useMemoFirebase(
    () => (firestore && schoolId ? collection(firestore, 'schools', schoolId, 'libraries') : null),
    [firestore, schoolId],
  );
  const { data, isLoading, error } = useCollection<LibraryLocation>(queryRef);
  const locations = useMemo(() => activeLibraryLocations(data), [data]);

  useEffect(() => {
    if (!firestore || !schoolId || isLoading || ensuredRef.current) return;
    const hasMain = (data ?? []).some((location) => location.id === DEFAULT_LIBRARY_LOCATION_ID);
    ensuredRef.current = true;
    if (hasMain) return;
    void setDoc(
      doc(firestore, 'schools', schoolId, 'libraries', DEFAULT_LIBRARY_LOCATION_ID),
      {
        name: DEFAULT_LIBRARY_LOCATION_NAME,
        kind: 'school',
        createdAt: Date.now(),
      },
      { merge: true },
    ).catch(() => {
      ensuredRef.current = false;
    });
  }, [data, firestore, isLoading, schoolId]);

  const createLocation = useCallback(
    async (input: { name: string; kind: LibraryLocationKind; classId?: string | null }) => {
      if (!firestore || !schoolId) throw new Error('Library is not ready yet.');
      const name = input.name.trim();
      if (!name) throw new Error('Enter a library name.');
      const id = suggestLibraryLocationId(name, (data ?? []).map((location) => location.id));
      if (!isValidLibraryLocationId(id)) throw new Error('That library name cannot be used.');
      await setDoc(doc(firestore, 'schools', schoolId, 'libraries', id), {
        name,
        kind: input.kind,
        classId: input.classId?.trim() || null,
        createdAt: Date.now(),
      });
      return id;
    },
    [data, firestore, schoolId],
  );

  const renameLocation = useCallback(
    async (id: string, name: string, extras?: { kind?: LibraryLocationKind; classId?: string | null }) => {
      if (!firestore || !schoolId) throw new Error('Library is not ready yet.');
      const nextName = name.trim();
      if (!nextName) throw new Error('Enter a library name.');
      await setDoc(doc(firestore, 'schools', schoolId, 'libraries', id), {
        name: nextName,
        ...(extras?.kind ? { kind: extras.kind } : {}),
        ...(extras && 'classId' in extras ? { classId: extras.classId?.trim() || null } : {}),
      }, { merge: true });
    },
    [firestore, schoolId],
  );

  const archiveLocation = useCallback(
    async (id: string) => {
      if (!firestore || !schoolId) throw new Error('Library is not ready yet.');
      if (id === DEFAULT_LIBRARY_LOCATION_ID) {
        throw new Error('The school library cannot be hidden. Rename it if you like.');
      }
      await setDoc(doc(firestore, 'schools', schoolId, 'libraries', id), { archived: true }, { merge: true });
    },
    [firestore, schoolId],
  );

  const restoreLocation = useCallback(
    async (id: string) => {
      if (!firestore || !schoolId) throw new Error('Library is not ready yet.');
      await setDoc(doc(firestore, 'schools', schoolId, 'libraries', id), { archived: false }, { merge: true });
    },
    [firestore, schoolId],
  );

  return {
    locations,
    storedLocations: data ?? [],
    isLoading,
    error,
    createLocation,
    renameLocation,
    archiveLocation,
    restoreLocation,
  };
}

export function useActiveLibraryLocation(
  schoolId: string | null | undefined,
  locations: LibraryLocation[],
  options?: { requireExplicitChoice?: boolean },
) {
  const router = useRouter();
  const pathname = usePathname();
  const [urlId, setUrlId] = useState<string | null>(null);
  const [forcePick, setForcePick] = useState(false);
  useEffect(() => {
    const sync = () => {
      setUrlId(new URLSearchParams(window.location.search).get('library'));
    };
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, [pathname]);
  const storedId = schoolId ? readStoredLibraryLocationId(schoolId) : null;
  const requestedId = urlId || storedId;
  const hasExplicitChoice = Boolean(urlId || storedId);
  const needsChoice = Boolean(
    forcePick || (options?.requireExplicitChoice && locations.length > 1 && !hasExplicitChoice),
  );
  const active = needsChoice
    ? defaultLibraryLocation()
    : pickLibraryLocation(locations, requestedId);

  const setActive = useCallback(
    (id: string) => {
      setForcePick(false);
      if (schoolId) writeStoredLibraryLocationId(schoolId, id);
      const params = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);
      if (id === DEFAULT_LIBRARY_LOCATION_ID) params.delete('library');
      else params.set('library', id);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      setUrlId(id === DEFAULT_LIBRARY_LOCATION_ID ? null : id);
    },
    [pathname, router, schoolId],
  );

  const resetChoice = useCallback(() => {
    setForcePick(true);
    setUrlId(null);
    if (schoolId && typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(libraryLocationStorageKey(schoolId));
      } catch {
        // ignore
      }
    }
    router.replace(pathname, { scroll: false });
  }, [pathname, router, schoolId]);

  useEffect(() => {
    if (!schoolId || needsChoice || !hasExplicitChoice) return;
    writeStoredLibraryLocationId(schoolId, active.id);
  }, [active.id, hasExplicitChoice, needsChoice, schoolId]);

  return { active, setActive, resetChoice, needsChoice, hasExplicitChoice };
}
