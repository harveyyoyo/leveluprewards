'use client';

import type { House, Student, Teacher } from '@/lib/types';
import { HousesTabLauncher } from '@/components/houses/HousesTabLauncher';

/** Rewards admin tab — launcher only. Full houses UI lives in /houses-realm (new tab). */
export function AdminHousesTab({
  schoolId,
}: {
  schoolId: string;
  houses?: House[] | null;
  students?: Student[] | null;
  teachers?: Teacher[] | null;
  onAddHouse?: (data: Omit<House, 'id' | 'points' | 'lifetimePoints'>) => Promise<House>;
  onUpdateHouse?: (house: House) => Promise<void>;
  onDeleteHouse?: (houseId: string, houseStudents: Student[]) => Promise<void>;
  onUpdateStudent?: (student: Student) => Promise<void> | void;
  onUpdateTeacher?: (teacher: Teacher) => Promise<void> | void;
}) {
  return <HousesTabLauncher schoolId={schoolId} />;
}
