'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ClipboardList, Clock3, ExternalLink } from 'lucide-react';
import {
  StaffPortalSectionCard,
  StaffPortalSectionCardContent,
} from '@/components/staff/StaffPortalSection';
import { StaffPortalTabPanel } from '@/components/staff/StaffPortalTabHeader';
import { AttendanceSetupWizard } from '@/components/attendance/AttendanceSetupWizard';
import { AttendanceClockBar } from '@/components/attendance/AttendanceClockBar';
import { TabWalkthroughHeaderAction } from '@/components/tabWalkthrough/TabWalkthroughContext';
import { Button } from '@/components/ui/button';
import { openStandalonePage } from '@/lib/openStandalonePage';

/**
 * Attendance runs as its own full-screen page (like Classroom and Library).
 * This tab is the launcher, with the clock and class period for a quick look.
 */
export function AdminAttendanceTab(props: any) {
  const { schoolId, attendancePeriods, attendanceConfig } = props;
  const attendanceUrl = `/${schoolId}/attendance`;

  return (
    <StaffPortalTabPanel
      tabValue="attendance"
      trailing={
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <TabWalkthroughHeaderAction />
          {/* Opens in its own tab so the link can be shared with other staff and printed. */}
          <Button asChild variant="outline" size="sm" className="h-10 shrink-0 gap-2 rounded-xl px-3.5 font-bold">
            <Link href={`/${schoolId}/attendance-roster`} target="_blank" rel="noopener">
              <ClipboardList className="h-4 w-4 text-primary" aria-hidden="true" />
              Daily Headcount
            </Link>
          </Button>
          <AttendanceSetupWizard variant="admin" />
        </div>
      }
    >
      <StaffPortalSectionCard className="w-full overflow-hidden bg-background/95 backdrop-blur-md">
        <StaffPortalSectionCardContent className="space-y-6 p-4 md:p-6">
          {schoolId && (
            <AttendanceClockBar
              schoolId={schoolId}
              periods={attendancePeriods}
              timeZone={attendanceConfig ? attendanceConfig.attendanceTimeZone ?? null : undefined}
            />
          )}
          <div className="flex min-h-[min(50vh,480px)] flex-col items-center justify-center gap-7 px-6 py-10 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 to-sky-600 shadow-2xl shadow-emerald-900/20"
            >
              <Clock3 className="h-10 w-10 text-white" aria-hidden />
            </motion.div>
            <div className="max-w-md space-y-3">
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Attendance</h2>
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                Today&apos;s board, bell schedule, points, room passes, and history — on a full screen.
              </p>
            </div>
            <Button
              asChild
              size="lg"
              className="min-w-[14rem] rounded-full bg-gradient-to-r from-emerald-600 to-sky-600 px-8 text-base font-bold shadow-lg hover:from-emerald-500 hover:to-sky-500"
            >
              <a href={attendanceUrl} onClick={(event) => openStandalonePage(attendanceUrl, event)}>
                <ExternalLink className="mr-2 h-5 w-5" aria-hidden />
                Open Attendance
              </a>
            </Button>
            <p className="text-xs text-muted-foreground">Opens as its own page</p>
          </div>
        </StaffPortalSectionCardContent>
      </StaffPortalSectionCard>
    </StaffPortalTabPanel>
  );
}
