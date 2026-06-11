'use client';

import { History, Loader2 } from 'lucide-react';
import { StaffPortalTabInfoPopover, staffPortalTabInfoSection } from '@/components/staff/StaffPortalTabInfoPopover';
import { Button } from '@/components/ui/button';
import type { StudentActivityRow } from '@/hooks/useStudentActivityLog';

type StudentActivityLogSectionProps = {
  entries: StudentActivityRow[];
  loading: boolean;
  onRefresh: () => void;
};

export function StudentActivityLogSection({ entries, loading, onRefresh }: StudentActivityLogSectionProps) {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5">
          <h3 className="flex items-center gap-2 text-lg font-black tracking-tight">
            <History className="h-5 w-5 text-ring" aria-hidden />
            Student activity log
          </h3>
          <StaffPortalTabInfoPopover
            sections={[
              staffPortalTabInfoSection(
                'Recent student actions across the school — attendance sign-ins, point awards, and other kiosk activity.',
              ),
            ]}
            ariaLabel="About student activity log"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-10 shrink-0 rounded-xl px-4"
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden /> : null}
          Refresh activity log
        </Button>
      </div>

      <div className="w-full overflow-x-auto rounded-2xl border bg-muted/10 p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs font-black uppercase tracking-wider text-muted-foreground">
              <th className="py-2 pb-3">Student</th>
              <th className="py-2 pb-3">Time</th>
              <th className="py-2 pb-3">Action</th>
              <th className="py-2 pb-3">Points</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className="border-b border-border/50 transition-colors hover:bg-muted/30"
              >
                <td className="py-3 font-semibold">{entry.studentName || entry.studentId}</td>
                <td className="py-3 text-muted-foreground">{new Date(entry.date).toLocaleString()}</td>
                <td className="py-3 font-medium">{entry.desc || 'Activity'}</td>
                <td className="py-3 font-bold text-foreground">
                  {entry.amount > 0 ? (
                    <span className="text-primary">+{entry.amount}</span>
                  ) : entry.amount < 0 ? (
                    <span className="text-destructive">{entry.amount}</span>
                  ) : (
                    entry.amount
                  )}
                </td>
              </tr>
            ))}
            {entries.length === 0 && !loading ? (
              <tr>
                <td className="py-8 text-center font-medium text-muted-foreground" colSpan={4}>
                  No activity found yet. Click &quot;Refresh activity log&quot; to load.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
