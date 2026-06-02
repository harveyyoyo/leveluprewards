import type { Category } from './types';
import { pickDistinctCategoryColor } from './utils';

type CategorySeed = Pick<Category, 'id' | 'name' | 'points'> &
  Partial<Pick<Category, 'color' | 'teacherId' | 'rubricLevels'>>;

/** Assign distinct palette colors to demo/sample categories that omit `color`. */
export function withSampleCategoryColors(categories: CategorySeed[]): Category[] {
  const used: string[] = [];
  return categories.map((cat) => {
    if (cat.color?.trim()) {
      used.push(cat.color);
      return cat as Category;
    }
    const color = pickDistinctCategoryColor(used);
    used.push(color);
    return { ...cat, color };
  });
}
