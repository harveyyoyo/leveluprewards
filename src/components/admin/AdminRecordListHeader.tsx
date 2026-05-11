import type { CSSProperties } from 'react';
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
  style,
}: {
  columns: AdminRecordListHeaderColumn[];
  gridClassName: string;
  style?: CSSProperties;
}) {
  return (
    <li className="sticky top-0 z-10 rounded-xl border border-ring/30 bg-secondary px-3 py-2 shadow-sm backdrop-blur">
      <div
        className={cn(
          'grid items-center gap-3 text-[10px] font-black uppercase tracking-[0.1em] text-secondary-foreground/80',
          gridClassName,
        )}
        style={style}
      >
        {columns.map((column, idx) => (
          <span key={column.id ?? `${column.label}-${idx}`} className={column.className}>
            {column.label}
          </span>
        ))}
      </div>
    </li>
  );
}
