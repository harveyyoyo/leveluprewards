'use client';

import { useAppContext } from '@/components/AppProvider';
import { useDoc } from '@/firebase';
import { useSchoolMetadataDocRef } from '@/hooks/useSchoolMetadataDocRef';
import {
  isJewishOrthodoxSchool,
  normalizeSchoolProfile,
  type SchoolProfileType,
} from '@/lib/schoolProfile';

type SchoolProfileDoc = {
  schoolProfile?: SchoolProfileType;
};

export function useSchoolProfile() {
  const { schoolId } = useAppContext();
  const schoolDocRef = useSchoolMetadataDocRef();
  const { data, isLoading } = useDoc<SchoolProfileDoc>(schoolDocRef);

  const schoolProfile = normalizeSchoolProfile(data?.schoolProfile);
  const isJewishOrthodox = isJewishOrthodoxSchool(data, schoolId);

  return {
    schoolProfile,
    isJewishOrthodox,
    isLoading,
  };
}
