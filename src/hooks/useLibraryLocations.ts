'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, limit, query, setDoc, where } from 'firebase/firestore';
import { usePathname, useRouter } from 'next/navigation';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { LibraryLocation, LibraryLocationKind } from '@/lib/library/libraryLocations';
import {
  DEFAULT_LIBRARY_LOCATION_ID,
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
  const queryRef = useMemoFirebase(
    () => (firestore && schoolId ? collection(firestore, 'schools', schoolId, 'libraries') : null),
    [firestore, schoolId],
  );
  const { data, isLoading, error } = useCollection<LibraryLocation>(queryRef);
  const locations = useMemo(() => activeLibraryLocations(data), [data]);
  const storedLocations = useMemo(() => data ?? [], [data]);
  // useCollection's `isLoading` starts out false and only flips true once its effect runs, so the
  // very first render (before that effect fires) looks identical to "confirmed empty" — latch once
  // we've actually seen a real loading pass, so that first render can never look like first-run.
  const hasSeenLoadingRef = useRef(false);
  if (isLoading) hasSeenLoadingRef.current = true;
  /** True once we know for certain this school has never named a library yet (no docs at all).
   * Requires a real, error-free query that has actually started — a permission hiccup, a
   * not-yet-initialized Firestore client, or the transient pre-effect render must never be
   * mistaken for "no libraries yet". */
  const isFirstLibrary =
    Boolean(firestore && schoolId) && hasSeenLoadingRef.current && !isLoading && !error && storedLocations.length === 0;

  /** First-run only: name the school's very first library instead of silently calling it "School Library". */
  const createFirstLibrary = useCallback(
    async (name: string) => {
      if (!firestore || !schoolId) throw new Error('Library is not ready yet.');
      const trimmed = name.trim();
      if (!trimmed) throw new Error('Enter a library name.');
      // merge:true so a stale/false-positive first-run state can never wipe out a library that
      // already exists — worst case it just relabels it instead of losing its other fields.
      await setDoc(
        doc(firestore, 'schools', schoolId, 'libraries', DEFAULT_LIBRARY_LOCATION_ID),
        { name: trimmed, kind: 'school', createdAt: Date.now() },
        { merge: true },
      );
    },
    [firestore, schoolId],
  );

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

  /** Permanently remove a hidden library. Only allowed once it's already hidden and empty, as a safety rail. */
  const deleteLocation = useCallback(
    async (id: string) => {
      if (!firestore || !schoolId) throw new Error('Library is not ready yet.');
      if (id === DEFAULT_LIBRARY_LOCATION_ID) {
        throw new Error('The school library cannot be deleted.');
      }
      const current = (data ?? []).find((location) => location.id === id);
      if (!current?.archived) {
        throw new Error('Hide a library before deleting it.');
      }
      const catalogQuery = query(
        collection(firestore, 'schools', schoolId, 'library'),
        where('libraryLocationId', '==', id),
        limit(1),
      );
      const catalogSnapshot = await getDocs(catalogQuery);
      if (!catalogSnapshot.empty) {
        throw new Error('This library still has books in it. Move them to another library first.');
      }
      await deleteDoc(doc(firestore, 'schools', schoolId, 'libraries', id));
    },
    [data, firestore, schoolId],
  );

  return {
    locations,
    storedLocations,
    isLoading,
    isFirstLibrary,
    error,
    createFirstLibrary,
    createLocation,
    renameLocation,
    archiveLocation,
    restoreLocation,
    deleteLocation,
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
