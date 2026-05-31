import type { Category } from '@/lib/types';

/** Categories visible in teacher portal / classroom (school-wide + own). */
export function filterCategoriesForStaffPortal(
  categories: Category[] | null | undefined,
  options: {
    schoolWideAccess?: boolean;
    managerTeacherId?: string;
    printOnly?: boolean;
  },
): Category[] {
  const list = categories ?? [];
  if (options.schoolWideAccess) return list;
  if (options.printOnly) {
    return list.filter((c) => !c.teacherId);
  }
  return list.filter(
    (c) => !c.teacherId || (options.managerTeacherId && c.teacherId === options.managerTeacherId),
  );
}
