'use client';

import { Info } from 'lucide-react';
import { staffPortalSchoolwideTeacherNote } from '@/lib/staffPortal';

type StaffPortalSchoolwideFeatureNoticeProps = {
  activeTab: string;
};

/** Shown at the top of teacher portal panels for school-wide add-ons (e.g. Houses). */
export function StaffPortalSchoolwideFeatureNotice({ activeTab }: StaffPortalSchoolwideFeatureNoticeProps) {
  const message = staffPortalSchoolwideTeacherNote(activeTab);
  if (!message) return null;

  return (
    <div
      role="note"
      className="mb-4 flex gap-2.5 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3.5 py-3 text-sm"
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-700 dark:text-sky-400" aria-hidden />
      <p className="leading-relaxed text-muted-foreground">{message}</p>
    </div>
  );
}
