import type { CSSProperties } from 'react';

/** Shared grid templates — fluid columns that fit the panel (no horizontal scroll). */
export const TEACHERS_LIST_GRID_COLS =
  '2.25rem minmax(0, 0.85fr) minmax(0, 1fr) minmax(2.25rem, 0.65fr) minmax(2.25rem, 0.65fr) minmax(3.5rem, 0.7fr)';

export const DESK_STAFF_LIST_GRID_COLS =
  '2.25rem minmax(0, 0.85fr) minmax(0, 1fr) minmax(3.5rem, 0.7fr)';

/** Prizes shop — act, name, then one column per inline setting. */
export function prizesListGridColumns(options: { vendingEnabled: boolean }) {
  const base =
    '4.25rem minmax(0, 1fr) 3rem 3rem 1.75rem 1.75rem 1.75rem 4.25rem';
  const motor = options.vendingEnabled ? ' 1.75rem' : '';
  return `${base}${motor} minmax(2.5rem, 3.5rem)`;
}

/** @deprecated Prefer `prizesListGridColumns({ vendingEnabled })`. */
export const PRIZES_LIST_GRID_COLS = prizesListGridColumns({ vendingEnabled: false });

export const adminRecordListGridClassName =
  'grid w-full min-w-0 [&>*]:min-w-0 [&_button]:min-h-0 [&_button]:min-w-0';

/** Name column — may shrink/truncate. */
export const adminRecordListGridNameCellClassName = 'min-w-0 overflow-hidden';

/** Actions/settings toolbar — wrap inside the cell instead of overlapping icons. */
export const adminRecordListGridActionsCellClassName =
  'min-w-0 max-w-full flex flex-wrap items-center justify-end gap-0.5 justify-self-end';

export const adminRecordListGridCompactGapClassName = 'gap-1.5';

export function adminRecordListGridStyle(columns: string): CSSProperties {
  return {
    gridTemplateColumns: columns,
    ['--admin-list-cols' as string]: columns,
  };
}

/** Students roster — select, edit, name, then compact action columns. */
export function studentsListGridColumns(actionColumnCount: number) {
  return `1.5rem 1.75rem minmax(0, 1fr) repeat(${actionColumnCount}, 2.35rem)`;
}
