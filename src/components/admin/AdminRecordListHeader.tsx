import type { CSSProperties } from 'react';
import {
  adminRecordListGridClassName,
  adminRecordListGridCompactGapClassName,
} from '@/components/admin/adminRecordListGrid';
import { staffPortalRecordListHeaderClassName } from '@/components/staff/staffPortalNavStyles';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export type AdminRecordListHeaderColumn = {
  /** Stable key when labels repeat */
  id?: string;
  label: string;
  /** Shown in a popup on hover/focus — use to explain an abbreviated label. */
  hint?: string;
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
    ? {
        ...style,
        gridTemplateColumns: gridColumns,
        ['--admin-list-cols' as string]: gridColumns,
      }
    : style;

  return (
    <li
      className={cn(
        'w-full min-w-0',
        staffPortalRecordListHeaderClassName(),
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
        {columns.map((column, idx) =>
          column.hint ? (
            <Tooltip key={column.id ?? `${column.label}-${idx}`}>
              <TooltipTrigger asChild>
                <span
                  tabIndex={0}
                  className={cn(
                    'cursor-help underline decoration-dotted decoration-1 underline-offset-2',
                    column.className,
                  )}
                >
                  {column.label}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-56 text-xs font-medium normal-case tracking-normal">
                {column.hint}
              </TooltipContent>
            </Tooltip>
          ) : (
            <span
              key={column.id ?? `${column.label}-${idx}`}
              className={column.className}
            >
              {column.label}
            </span>
          ),
        )}
      </div>
    </li>
  );
}
