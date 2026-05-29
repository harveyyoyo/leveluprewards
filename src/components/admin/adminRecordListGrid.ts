import type { CSSProperties } from 'react';

/** Shared grid templates — fluid columns that fit the panel (no horizontal scroll). */
export const TEACHERS_LIST_GRID_COLS =
  '2.25rem minmax(0, 0.85fr) minmax(0, 1fr) minmax(2.25rem, 0.65fr) minmax(2.25rem, 0.65fr) minmax(3.5rem, 0.7fr)';

export const DESK_STAFF_LIST_GRID_COLS =
  '2.25rem minmax(0, 0.85fr) minmax(0, 1fr) minmax(3.5rem, 0.7fr)';

/** Prizes shop — 10 columns (icon shown in name cell only). */
export const PRIZES_LIST_GRID_COLS =
  '1.5rem 2.25rem minmax(0, 1.15fr) 2rem 2rem minmax(2.5rem, 0.7fr) minmax(2.25rem, 0.55fr) minmax(2.25rem, 0.55fr) 1.5rem 1.5rem';

export const adminRecordListGridClassName =
  'grid w-full min-w-0 [grid-template-columns:var(--admin-list-cols)] [&>*]:min-w-0';

export const adminRecordListGridCompactGapClassName = 'gap-1';

export function adminRecordListGridStyle(columns: string): CSSProperties {
  return { ['--admin-list-cols' as string]: columns };
}

/** Students roster — select, edit, name, then compact action columns. */
export function studentsListGridColumns(actionColumnCount: number) {
  return `1.75rem 1.75rem minmax(0, 1.2fr) repeat(${actionColumnCount}, 1.65rem)`;
}
