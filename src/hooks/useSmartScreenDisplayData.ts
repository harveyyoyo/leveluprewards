'use client';

import { useEffect, useState } from 'react';
import { collection, query, limit } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { useSchoolMetadataDocRef } from '@/hooks/useSchoolMetadataDocRef';
import type { Class, House, Prize, Student } from '@/lib/types';

export type BulletinIncentive = {
  id: string;
  title: string;
  description?: string;
  points?: number;
  icon?: string;
  active?: boolean;
  createdAt?: number;
};

export type SmartScreenLocationInfo = {
  ok: boolean;
  source?: 'zip' | 'ip';
  locationName?: string;
  timeZone?: string;
  temperatureF?: number | null;
  condition?: string;
};

export function useSmartScreenDisplayData(schoolId: string | null | undefined, configuredZip: string) {
  const firestore = useFirestore();
  const [now, setNow] = useState(() => new Date());
  const [locationInfo, setLocationInfo] = useState<SmartScreenLocationInfo | null>(null);

  const schoolDocRef = useSchoolMetadataDocRef();
  const { data: schoolMeta } = useDoc<{ logoUrl?: string; name?: string }>(schoolDocRef);

  const studentsQuery = useMemoFirebase(
    () => (schoolId ? query(collection(firestore, 'schools', schoolId, 'students'), limit(250)) : null),
    [firestore, schoolId],
  );
  const { data: students } = useCollection<Student>(studentsQuery);

  const classesQuery = useMemoFirebase(
    () => (schoolId ? query(collection(firestore, 'schools', schoolId, 'classes'), limit(120)) : null),
    [firestore, schoolId],
  );
  const { data: classes } = useCollection<Class>(classesQuery);

  const housesQuery = useMemoFirebase(
    () => (schoolId ? query(collection(firestore, 'schools', schoolId, 'houses'), limit(24)) : null),
    [firestore, schoolId],
  );
  const { data: houses } = useCollection<House>(housesQuery);

  const prizesQuery = useMemoFirebase(
    () => (schoolId ? query(collection(firestore, 'schools', schoolId, 'prizes'), limit(80)) : null),
    [firestore, schoolId],
  );
  const { data: prizes } = useCollection<Prize>(prizesQuery);

  const bulletinQuery = useMemoFirebase(
    () =>
      schoolId
        ? query(collection(firestore, 'schools', schoolId, 'bulletinBoardIncentives'), limit(40))
        : null,
    [firestore, schoolId],
  );
  const { data: bulletinItems } = useCollection<BulletinIncentive>(bulletinQuery);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const zip = (configuredZip || '').trim();

    const loadLocation = async () => {
      try {
        const params = new URLSearchParams();
        if (/^\d{5}$/.test(zip)) params.set('zip', zip);
        const response = await fetch(`/api/smart-screen/location?${params.toString()}`, {
          cache: 'no-store',
        });
        const data = (await response.json()) as SmartScreenLocationInfo;
        if (!cancelled) setLocationInfo(data);
      } catch {
        if (!cancelled) setLocationInfo({ ok: false });
      }
    };

    void loadLocation();
    const id = window.setInterval(loadLocation, 10 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [configuredZip]);

  return {
    now,
    locationInfo,
    schoolMeta,
    students,
    classes,
    houses,
    prizes,
    bulletinItems,
  };
}
