import { cn } from '@/lib/utils';

export type AdminRecordListHeaderColumn = {
  label: string;
  className?: string;
};

export function AdminRecordListHeader({
  columns,
  gridClassName,
}: {
  columns: AdminRecordListHeaderColumn[];
  gridClassName: string;
}) {
  return (
    <li className="sticky top-0 z-10 rounded-xl border bg-background/95 px-3 py-2 shadow-sm backdrop-blur">
      <div
        className={cn(
          'grid items-center gap-3 text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground',
          gridClassName,
        )}
      >
        {columns.map((column) => (
          <span key={column.label} className={column.className}>
            {column.label}
          </span>
        ))}
      </div>
    </li>
  );
}
