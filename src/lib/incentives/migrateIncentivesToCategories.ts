import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  type Firestore,
} from 'firebase/firestore';
import { addCategory } from '@/lib/db/categories';
import type { Category } from '@/lib/types';

/**
 * Moves display-only incentive catalog docs onto categories.
 * Never reads, writes, or deletes printed / redeemable coupons (kind omitted or `redeemable`).
 */
export async function migrateIncentivesToCategoriesClient(
  firestore: Firestore,
  schoolId: string,
): Promise<number> {
  const categoriesRef = collection(firestore, 'schools', schoolId, 'categories');
  const [categoriesSnap, incentiveCouponsSnap, legacySnap] = await Promise.all([
    getDocs(categoriesRef),
    getDocs(query(collection(firestore, 'schools', schoolId, 'coupons'), where('kind', '==', 'incentive'))),
    getDocs(collection(firestore, 'schools', schoolId, 'bulletinBoardIncentives')),
  ]);

  const byName = new Map<string, { id: string; data: Category }>();
  categoriesSnap.forEach((snap) => {
    const data = { id: snap.id, ...(snap.data() as Category) };
    const name = String(data.name || '').trim().toLowerCase();
    if (name) byName.set(name, { id: snap.id, data });
  });

  const sources = [
    ...incentiveCouponsSnap.docs.map((snap) => ({ ref: snap.ref, data: snap.data() })),
    ...legacySnap.docs.map((snap) => ({ ref: snap.ref, data: snap.data() })),
  ];

  let moved = 0;
  for (const source of sources) {
    const title = String(source.data.title || source.data.name || '').trim() || 'Incentive';
    const key = title.toLowerCase();
    const existing = byName.get(key);
    const surfaces =
      (source.data.displaySurfaces as Category['displaySurfaces']) ||
      (source.data.surfaces as Category['displaySurfaces']) ||
      {};
    const description = String(source.data.description || existing?.data.description || '').trim();
    const icon = String(source.data.icon || existing?.data.icon || '🎉');

    if (existing) {
      await updateDoc(doc(firestore, 'schools', schoolId, 'categories', existing.id), {
        description: description || existing.data.description || '',
        icon: icon || existing.data.icon,
        showAsIncentive: true,
        displaySurfaces: surfaces,
      });
    } else {
      const created = await addCategory(firestore, schoolId, {
        name: title,
        points: Number(source.data.value ?? source.data.points) || 0,
        description,
        icon,
        showAsIncentive: true,
        displaySurfaces: surfaces,
      });
      byName.set(key, { id: created.id, data: created });
    }

    await deleteDoc(source.ref);
    moved += 1;
  }

  await updateDoc(doc(firestore, 'schools', schoolId), {
    hasMigratedIncentivesToCategories: true,
    hasMigratedIncentivesToCoupons: true,
  });

  return moved;
}
