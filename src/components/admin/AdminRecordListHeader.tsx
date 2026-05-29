import type { CSSProperties } from 'react';
import {
  adminRecordListGridClassName,
  adminRecordListGridCompactGapClassName,
} from '@/components/admin/adminRecordListGrid';
import { cn } from '@/lib/utils';

export type AdminRecordListHeaderColumn = {
  /** Stable key when labels repeat */
  id?: string;
  label: string;
  className?: string;
};

export function AdminRecordListHeader({
  columns,
  gridClassName,
  gridColumns,
  className,
  style,
}: {
  columns: AdminRecordListHeaderColumn[];
  /** Tailwind grid-cols-* (legacy) */
  gridClassName?: string;
  /** CSS grid-template-columns value; preferred for wide scrollable lists */
  gridColumns?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const gridStyle: CSSProperties | undefined = gridColumns
    ? { ...style, ['--admin-list-cols' as string]: gridColumns }
    : style;

  return (
    <li
      className={cn(
        'sticky top-0 z-10 w-full min-w-0 rounded-xl border border-ring/30 bg-secondary px-2 py-1.5 shadow-sm backdrop-blur',
        className,
      )}
    >
      <div
        className={cn(
          'items-center text-[9px] font-black uppercase tracking-wide text-secondary-foreground/80',
          adminRecordListGridCompactGapClassName,
          gridColumns ? adminRecordListGridClassName : cn('grid w-full min-w-0', gridClassName),
        )}
        style={gridStyle}
      >
        {columns.map((column, idx) => (
          <span
            key={column.id ?? `${column.label}-${idx}`}
            className={cn('truncate', column.className)}
          >
            {column.label}
          </span>
        ))}
      </div>
    </li>
  );
}
