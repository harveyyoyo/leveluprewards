'use client';

import { Info } from 'lucide-react';
import { staffPortalTeacherOperatedAdminNote } from '@/lib/staffPortal';

type StaffPortalTeacherToolNoticeProps = {
  activeTab: string;
};

/** Shown at the top of admin portal panels that mirror teacher classroom tools. */
export function StaffPortalTeacherToolNotice({ activeTab }: StaffPortalTeacherToolNoticeProps) {
  const message = staffPortalTeacherOperatedAdminNote(activeTab);
  if (!message) return null;

  return (
    <div
      role="note"
      className="mb-4 flex gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-3 text-sm"
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden />
      <p className="leading-relaxed text-muted-foreground">{message}</p>
    </div>
  );
}
