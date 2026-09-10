'use client';

import { useEffect, useMemo, useState } from 'react';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, limit, orderBy, query } from 'firebase/firestore';
import type { Class, Goal, House, Prize, Student } from '@/lib/types';
import { useSchoolMetadataDocRef } from '@/hooks/useSchoolMetadataDocRef';
import { useSchoolProfile } from '@/hooks/useSchoolProfile';
import { useSmartScreenDisplayData, type SmartScreenLocationInfo } from '@/hooks/useSmartScreenDisplayData';
import { incentivesForSurface } from '@/lib/incentives/incentiveSurfaces';

export type BulletinIncentive = {
  id: string;
  title: string;
  description?: string;
  points?: number;
  icon?: string;
  category?: string;
  surfaces?: Record<string, boolean>;
};

export type BulletinPost = {
  id: string;
  title?: string;
  message?: string;
  emoji?: string;
  createdAt?: number;
};

export interface DisplaysLiveFeed {
  schoolId: string;
  now: Date;
  schoolMeta: { logoUrl?: string; name?: string } | null;
  students: Student[];
  classes: Class[];
  houses: House[];
  prizes: Prize[];
  goals: Goal[];
  bulletinIncentives: BulletinIncentive[];
  bulletinPosts: BulletinPost[];
  locationInfo: SmartScreenLocationInfo | null;
  isJewishOrthodox: boolean;
  isLoading: boolean;
}

export function useDisplaysLiveFeed(schoolId: string, configuredZip?: string): DisplaysLiveFeed {
  const firestore = useFirestore();
  const [now, setNow] = useState<Date>(() => new Date());

  // Clock tick every 10 seconds for live screens
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(timer);
  }, []);

  // School Profile & Metadata
  const { isJewishOrthodox } = useSchoolProfile();
  const schoolDocRef = useSchoolMetadataDocRef();
  const { data: schoolMeta } = useDoc<{ logoUrl?: string; name?: string }>(schoolDocRef);

  // Firestore Queries
  const studentsQuery = useMemoFirebase(
    () => (schoolId ? query(collection(firestore, 'schools', schoolId, 'students'), limit(250)) : null),
    [firestore, schoolId],
  );
  const { data: rawStudents, isLoading: studentsLoading } = useCollection<Student>(studentsQuery);

  const classesQuery = useMemoFirebase(
    () => (schoolId ? collection(firestore, 'schools', schoolId, 'classes') : null),
    [firestore, schoolId],
  );
  const { data: rawClasses } = useCollection<Class>(classesQuery);

  const housesQuery = useMemoFirebase(
    () => (schoolId ? collection(firestore, 'schools', schoolId, 'houses') : null),
    [firestore, schoolId],
  );
  const { data: rawHouses } = useCollection<House>(housesQuery);

  const prizesQuery = useMemoFirebase(
    () => (schoolId ? collection(firestore, 'schools', schoolId, 'prizes') : null),
    [firestore, schoolId],
  );
  const { data: rawPrizes } = useCollection<Prize>(prizesQuery);

  const goalsQuery = useMemoFirebase(
    () => (schoolId ? collection(firestore, 'schools', schoolId, 'goals') : null),
    [firestore, schoolId],
  );
  const { data: rawGoals } = useCollection<Goal>(goalsQuery);

  const postsQuery = useMemoFirebase(
    () =>
      schoolId
        ? query(
            collection(firestore, 'schools', schoolId, 'bulletinBoardPosts'),
            orderBy('createdAt', 'desc'),
            limit(15),
          )
        : null,
    [firestore, schoolId],
  );
  const { data: rawPosts } = useCollection<BulletinPost>(postsQuery);

  const incentivesQuery = useMemoFirebase(
    () => (schoolId ? collection(firestore, 'schools', schoolId, 'bulletinBoardIncentives') : null),
    [firestore, schoolId],
  );
  const { data: rawIncentives } = useCollection<BulletinIncentive>(incentivesQuery);

  // Weather & Geo Data
  const smartScreenData = useSmartScreenDisplayData(schoolId, configuredZip || '');

  // Memoized collections
  const students = useMemo(() => rawStudents || [], [rawStudents]);
  const classes = useMemo(() => rawClasses || [], [rawClasses]);
  const houses = useMemo(() => rawHouses || [], [rawHouses]);
  const prizes = useMemo(() => rawPrizes || [], [rawPrizes]);
  const goals = useMemo(() => rawGoals || [], [rawGoals]);
  const bulletinPosts = useMemo(() => rawPosts || [], [rawPosts]);
  const bulletinIncentives = useMemo(() => incentivesForSurface(rawIncentives, 'bulletinBoard'), [rawIncentives]);

  return {
    schoolId,
    now,
    schoolMeta: schoolMeta || null,
    students,
    classes,
    houses,
    prizes,
    goals,
    bulletinIncentives,
    bulletinPosts,
    locationInfo: smartScreenData.locationInfo,
    isJewishOrthodox,
    isLoading: studentsLoading,
  };
}
