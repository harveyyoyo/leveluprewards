import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  getDocs,
  collection,
  type Firestore,
} from 'firebase/firestore';
import type { House, Student } from '../types';
import { reportFirestorePermissionError } from '@/firebase/error-emitter';
import { removeUndefined } from './helpers';
import {
  getHousePresetTheme,
  housePresetKeysFromDoc,
  type HousePresetThemeId,
} from '@/lib/houses/housePresets';

function newHouseId(): string {
  return `h_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export const addHouse = async (
  firestore: Firestore,
  schoolId: string,
  houseData: Omit<House, 'id'>,
) => {
  const newId = newHouseId();
  const newHouse: House = {
    points: 0,
    lifetimePoints: 0,
    ...houseData,
    id: newId,
  };
  const houseDocRef = doc(firestore, 'schools', schoolId, 'houses', newHouse.id);
  try {
    await setDoc(houseDocRef, removeUndefined(newHouse as unknown as Record<string, unknown>));
  } catch (error) {
    reportFirestorePermissionError(error, {
      path: houseDocRef.path,
      operation: 'create',
      requestResourceData: newHouse,
    });
    throw error;
  }
  return newHouse;
};

export const updateHouse = async (firestore: Firestore, schoolId: string, updatedHouse: House) => {
  const houseDocRef = doc(firestore, 'schools', schoolId, 'houses', updatedHouse.id);
  try {
    await updateDoc(
      houseDocRef,
      removeUndefined({ ...updatedHouse } as unknown as Record<string, unknown>),
    );
  } catch (error) {
    reportFirestorePermissionError(error, {
      path: houseDocRef.path,
      operation: 'update',
      requestResourceData: updatedHouse,
    });
    throw error;
  }
};

export const deleteHouse = async (
  firestore: Firestore,
  schoolId: string,
  houseId: string,
  students: Student[],
) => {
  // Stay under the 500 writes-per-batch limit; unassign students first so a
  // partial failure never leaves the house deleted with members still attached.
  const BATCH_LIMIT = 450;
  const studentsToUpdate = students.filter((s) => s.houseId === houseId);

  try {
    for (let i = 0; i < studentsToUpdate.length; i += BATCH_LIMIT) {
      const chunk = studentsToUpdate.slice(i, i + BATCH_LIMIT);
      const batch = writeBatch(firestore);
      chunk.forEach((student) => {
        const studentRef = doc(firestore, 'schools', schoolId, 'students', student.id);
        batch.update(studentRef, { houseId: '' });
      });
      await batch.commit();
    }

    const houseRef = doc(firestore, 'schools', schoolId, 'houses', houseId);
    await deleteDoc(houseRef);
  } catch (error) {
    reportFirestorePermissionError(error, {
      path: `schools/${schoolId}/houses`,
      operation: 'write',
    });
    throw error;
  }
};

/** Seed houses from a preset pack; skips duplicate names or preset keys. */
export const seedHousePresets = async (
  firestore: Firestore,
  schoolId: string,
  currentHouses: House[],
  presets: Omit<House, 'id' | 'points' | 'lifetimePoints'>[],
): Promise<{ created: number; skipped: number }> => {
  const existingLower = new Set(currentHouses.map((h) => h.name.trim().toLowerCase()));
  const existingPresetKeys = new Set(currentHouses.flatMap((h) => housePresetKeysFromDoc(h)));

  let created = 0;
  let skipped = 0;

  for (const preset of presets) {
    const key = preset.name.trim().toLowerCase();
    const presetId = preset.presetKey;
    if (existingLower.has(key) || (presetId && existingPresetKeys.has(presetId))) {
      skipped += 1;
      continue;
    }
    await addHouse(firestore, schoolId, preset);
    existingLower.add(key);
    if (presetId) existingPresetKeys.add(presetId);
    created += 1;
  }

  return { created, skipped };
};

/** Seed houses from a built-in theme pack. */
export const seedHouseThemePack = async (
  firestore: Firestore,
  schoolId: string,
  currentHouses: House[],
  themeId: HousePresetThemeId,
): Promise<{ created: number; skipped: number }> => {
  const theme = getHousePresetTheme(themeId);
  return seedHousePresets(firestore, schoolId, currentHouses, theme.houses);
};

/** Recompute each house's cached points from member student balances. */
export const syncHousePointsFromStudents = async (
  firestore: Firestore,
  schoolId: string,
  houses: House[],
  students: Student[],
  mode: 'current' | 'lifetime' | 'both' = 'both',
): Promise<void> => {
  const totals = new Map<string, { points: number; lifetime: number }>();
  for (const h of houses) {
    totals.set(h.id, { points: 0, lifetime: 0 });
  }
  for (const s of students) {
    const hid = s.houseId;
    if (!hid || !totals.has(hid)) continue;
    const row = totals.get(hid)!;
    row.points += s.points ?? 0;
    row.lifetime += s.lifetimePoints ?? s.points ?? 0;
  }

  const batch = writeBatch(firestore);
  for (const h of houses) {
    const row = totals.get(h.id) ?? { points: 0, lifetime: 0 };
    const patch: Partial<House> = {};
    if (mode === 'current' || mode === 'both') patch.points = row.points;
    if (mode === 'lifetime' || mode === 'both') patch.lifetimePoints = row.lifetime;
    const ref = doc(firestore, 'schools', schoolId, 'houses', h.id);
    batch.update(ref, removeUndefined(patch as Record<string, unknown>));
  }
  try {
    await batch.commit();
  } catch (error) {
    reportFirestorePermissionError(error, {
      path: `schools/${schoolId}/houses`,
      operation: 'write',
    });
    throw error;
  }
};

/** Assign many students to houses (balanced by current roster count per house). */
export const assignStudentsToHousesBalanced = async (
  firestore: Firestore,
  schoolId: string,
  studentIds: string[],
  houses: House[],
  currentStudents: Student[] = [],
): Promise<void> => {
  if (houses.length === 0 || studentIds.length === 0) return;

  const assigning = new Set(studentIds);
  const counts = new Map(houses.map((h) => [h.id, 0]));
  for (const s of currentStudents) {
    if (!s.houseId || assigning.has(s.id)) continue;
    const c = counts.get(s.houseId);
    if (c !== undefined) counts.set(s.houseId, c + 1);
  }

  const assignments: Array<{ studentId: string; houseId: string }> = [];
  for (const studentId of studentIds) {
    let pick = houses[0].id;
    let min = Number.POSITIVE_INFINITY;
    for (const h of houses) {
      const c = counts.get(h.id) ?? 0;
      if (c < min) {
        min = c;
        pick = h.id;
      }
    }
    counts.set(pick, (counts.get(pick) ?? 0) + 1);
    assignments.push({ studentId, houseId: pick });
  }

  // Stay under the 500 writes-per-batch limit.
  const BATCH_LIMIT = 450;
  try {
    for (let i = 0; i < assignments.length; i += BATCH_LIMIT) {
      const chunk = assignments.slice(i, i + BATCH_LIMIT);
      const batch = writeBatch(firestore);
      for (const a of chunk) {
        const studentRef = doc(firestore, 'schools', schoolId, 'students', a.studentId);
        batch.update(studentRef, { houseId: a.houseId, updatedAt: Date.now() });
      }
      await batch.commit();
    }
  } catch (error) {
    reportFirestorePermissionError(error, {
      path: `schools/${schoolId}/students`,
      operation: 'write',
    });
    throw error;
  }
};

/** Random assignment (shuffle students, round-robin across houses). */
export const assignStudentsToHousesRandom = async (
  firestore: Firestore,
  schoolId: string,
  studentIds: string[],
  houses: House[],
): Promise<void> => {
  if (houses.length === 0 || studentIds.length === 0) return;
  const shuffled = [...studentIds].sort(() => Math.random() - 0.5);
  // Stay under the 500 writes-per-batch limit.
  const BATCH_LIMIT = 450;
  try {
    for (let i = 0; i < shuffled.length; i += BATCH_LIMIT) {
      const chunk = shuffled.slice(i, i + BATCH_LIMIT);
      const batch = writeBatch(firestore);
      chunk.forEach((studentId, offset) => {
        const house = houses[(i + offset) % houses.length];
        const studentRef = doc(firestore, 'schools', schoolId, 'students', studentId);
        batch.update(studentRef, { houseId: house.id, updatedAt: Date.now() });
      });
      await batch.commit();
    }
  } catch (error) {
    reportFirestorePermissionError(error, {
      path: `schools/${schoolId}/students`,
      operation: 'write',
    });
    throw error;
  }
};

export async function listHouses(firestore: Firestore, schoolId: string): Promise<House[]> {
  const snap = await getDocs(collection(firestore, 'schools', schoolId, 'houses'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as House);
}
