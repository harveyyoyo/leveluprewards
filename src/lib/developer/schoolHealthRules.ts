import type { DeveloperFleetSchoolSummary, DeveloperSchoolUsageDetail } from '@/lib/developer/schoolUsageInsights';
import { isPublicSampleSchoolId } from '@/lib/sampleSchools';

export type SchoolHealthSeverity = 'critical' | 'warning' | 'info';
export type SchoolHealthCategory =
  | 'adoption'
  | 'engagement'
  | 'rewards'
  | 'attendance'
  | 'library'
  | 'setup'
  | 'data_safety'
  | 'efficiency';

export type SchoolHealthAlert = {
  id: string;
  schoolId: string;
  schoolName: string;
  severity: SchoolHealthSeverity;
  category: SchoolHealthCategory;
  title: string;
  message: string;
  recommendation: string;
  /** Lower = more urgent within the same severity. */
  priority: number;
  isDemoSchool?: boolean;
};

export type SchoolHealthReport = {
  alerts: SchoolHealthAlert[];
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  schoolsNeedingAttention: number;
  generatedAt: number;
};

const MS_DAY = 86_400_000;

function countOf(summary: DeveloperFleetSchoolSummary, key: string): number {
  return summary.counts[key] ?? 0;
}

type AlertDraft = Pick<
  SchoolHealthAlert,
  'id' | 'severity' | 'category' | 'title' | 'message' | 'recommendation' | 'priority'
>;

function pushAlert(
  alerts: SchoolHealthAlert[],
  partial: AlertDraft,
  summary: DeveloperFleetSchoolSummary,
) {
  const isDemo = isPublicSampleSchoolId(summary.schoolId);
  alerts.push({
    ...partial,
    schoolId: summary.schoolId,
    schoolName: summary.name || summary.schoolId,
    isDemoSchool: isDemo,
  });
}

function evaluateSummaryRules(
  summary: DeveloperFleetSchoolSummary,
  now: number,
): SchoolHealthAlert[] {
  const alerts: SchoolHealthAlert[] = [];
  const students = summary.students.count;
  const activeRatio = students > 0 ? summary.students.activeStudents30d / students : 0;
  const couponUseRate =
    summary.coupons.total > 0 ? summary.coupons.used / summary.coupons.total : 0;
  const classes = countOf(summary, 'classes');
  const teachers = countOf(summary, 'teachers');
  const prizes = countOf(summary, 'prizes');
  const categories = countOf(summary, 'categories');
  const staffAccounts = countOf(summary, 'staffAccounts');
  const daysSinceBackup =
    summary.backup.lastBackupAt != null
      ? (now - summary.backup.lastBackupAt) / MS_DAY
      : null;

  if (students >= 5 && summary.engagementScore < 15) {
    pushAlert(
      alerts,
      {
        id: `${summary.schoolId}:dormant`,
        severity: 'critical',
        category: 'engagement',
        title: 'School looks dormant',
        message: `Engagement score is ${summary.engagementScore}/100 with ${students} students but almost no recent usage.`,
        recommendation:
          'Confirm the school is live, run a teacher training, and verify kiosk/portal links. Check passcodes and that teachers know how to award points.',
        priority: 10,
      },
      summary,
    );
  }

  if (students >= 10 && activeRatio < 0.08) {
    pushAlert(
      alerts,
      {
        id: `${summary.schoolId}:low_active_students`,
        severity: 'warning',
        category: 'engagement',
        title: 'Few students active in 30 days',
        message: `Only ${summary.students.activeStudents30d} of ${students} students (${Math.round(activeRatio * 100)}%) had activity in the last 30 days.`,
        recommendation:
          'Encourage daily kiosk sign-in or classroom awards. Inactive roster may mean wrong class assignments or students not using the kiosk.',
        priority: 20,
      },
      summary,
    );
  }

  if (summary.pillars.payAttendance && students >= 5 && summary.attendance.last30d === 0) {
    pushAlert(
      alerts,
      {
        id: `${summary.schoolId}:attendance_unused`,
        severity: 'warning',
        category: 'attendance',
        title: 'Attendance pillar enabled but unused',
        message: 'No attendance sign-ins were recorded in the last 30 days.',
        recommendation:
          'Turn on class sign-in in teacher portal, verify attendance periods/schedules, and demo sign-in during staff onboarding.',
        priority: 15,
      },
      summary,
    );
  }

  if (summary.pillars.payAttendance && students >= 5 && countOf(summary, 'attendanceLog') === 0) {
    pushAlert(
      alerts,
      {
        id: `${summary.schoolId}:attendance_never`,
        severity: 'info',
        category: 'attendance',
        title: 'No attendance history yet',
        message: 'Attendance is on the plan but the attendance log collection is empty.',
        recommendation: 'Walk the school through first-week sign-in setup and a pilot class.',
        priority: 40,
      },
      summary,
    );
  }

  if (summary.coupons.total >= 15 && summary.coupons.usedLast30d === 0) {
    pushAlert(
      alerts,
      {
        id: `${summary.schoolId}:coupons_not_redeemed`,
        severity: 'warning',
        category: 'rewards',
        title: 'Coupons printed but not redeemed',
        message: `${summary.coupons.total} coupons exist but none were redeemed in the last 30 days.`,
        recommendation:
          'Teachers may be printing coupons without students redeeming at the kiosk. Train on kiosk coupon flow and check redemption scope rules.',
        priority: 18,
      },
      summary,
    );
  }

  if (summary.coupons.total >= 40 && couponUseRate < 0.08) {
    pushAlert(
      alerts,
      {
        id: `${summary.schoolId}:coupon_hoarding`,
        severity: 'warning',
        category: 'efficiency',
        title: 'Large unused coupon inventory',
        message: `Only ${Math.round(couponUseRate * 100)}% of coupons have ever been used (${summary.coupons.used}/${summary.coupons.total}).`,
        recommendation:
          'Review whether teachers over-print coupons, expiration settings, or kiosk access. Consider smaller batch printing.',
        priority: 25,
      },
      summary,
    );
  }

  if (summary.pillars.payLibrary && students >= 10 && summary.library.total === 0) {
    pushAlert(
      alerts,
      {
        id: `${summary.schoolId}:library_empty`,
        severity: 'warning',
        category: 'library',
        title: 'Library enabled but empty catalog',
        message: 'Library pillar is on but no titles are cataloged.',
        recommendation: 'Import or scan books in librarian tools, or turn off the library pillar until ready.',
        priority: 22,
      },
      summary,
    );
  }

  if (
    summary.pillars.payLibrary &&
    summary.library.total >= 5 &&
    summary.library.checkedOut === 0 &&
    summary.attendance.last30d > 0
  ) {
    pushAlert(
      alerts,
      {
        id: `${summary.schoolId}:library_not_circulating`,
        severity: 'info',
        category: 'library',
        title: 'Library catalog not circulating',
        message: `${summary.library.total} titles on shelf but none checked out while rewards activity exists.`,
        recommendation:
          'Train librarians on checkout/return and student self-checkout kiosk. Tie library points to categories.',
        priority: 35,
      },
      summary,
    );
  }

  if (students >= 10 && teachers === 0) {
    pushAlert(
      alerts,
      {
        id: `${summary.schoolId}:no_teachers`,
        severity: 'critical',
        category: 'setup',
        title: 'No teachers configured',
        message: `${students} students exist but there are zero teacher accounts.`,
        recommendation: 'Add teachers in Admin and assign classes before expecting point awards.',
        priority: 5,
      },
      summary,
    );
  }

  if (students >= 5 && classes === 0) {
    pushAlert(
      alerts,
      {
        id: `${summary.schoolId}:no_classes`,
        severity: 'critical',
        category: 'setup',
        title: 'No classes configured',
        message: 'Students are loaded without class structure.',
        recommendation: 'Create classes and assign students for attendance, coupons, and reporting to work.',
        priority: 6,
      },
      summary,
    );
  }

  if (students >= 5 && prizes === 0) {
    pushAlert(
      alerts,
      {
        id: `${summary.schoolId}:no_prizes`,
        severity: 'warning',
        category: 'rewards',
        title: 'No prize catalog',
        message: 'Students cannot redeem rewards without prize items.',
        recommendation: 'Seed the prize desk with items and point costs aligned to your economy.',
        priority: 16,
      },
      summary,
    );
  }

  if (students >= 5 && categories === 0) {
    pushAlert(
      alerts,
      {
        id: `${summary.schoolId}:no_categories`,
        severity: 'warning',
        category: 'setup',
        title: 'No point categories',
        message: 'Categories drive teacher awards and coupon labeling.',
        recommendation: 'Add behavior/academic categories so staff awards are consistent.',
        priority: 17,
      },
      summary,
    );
  }

  if (teachers >= 2 && staffAccounts === 0) {
    pushAlert(
      alerts,
      {
        id: `${summary.schoolId}:no_staff_portal`,
        severity: 'info',
        category: 'adoption',
        title: 'No staff portal accounts',
        message: 'Teachers exist but no secretary/prize-clerk/librarian staff logins were created.',
        recommendation:
          'Add staff accounts if the school uses prize desk, library, or secretary workflows beyond teacher login.',
        priority: 45,
      },
      summary,
    );
  }

  if (daysSinceBackup == null && students >= 3) {
    pushAlert(
      alerts,
      {
        id: `${summary.schoolId}:no_backup`,
        severity: 'critical',
        category: 'data_safety',
        title: 'No backup on record',
        message: 'This school has no completed backup metadata in Firestore.',
        recommendation: 'Run a manual backup from Developer tools or verify the daily scheduler.',
        priority: 8,
      },
      summary,
    );
  } else if (daysSinceBackup != null && daysSinceBackup > 45 && students >= 3) {
    pushAlert(
      alerts,
      {
        id: `${summary.schoolId}:stale_backup`,
        severity: 'warning',
        category: 'data_safety',
        title: 'Backup is stale',
        message: `Last backup was ${Math.floor(daysSinceBackup)} days ago.`,
        recommendation: 'Trigger backup now and confirm Cloud Scheduler daily jobs are healthy.',
        priority: 12,
      },
      summary,
    );
  }

  if (
    students >= 15 &&
    summary.students.totalLifetimePoints > students * 200 &&
    summary.students.activeStudents30d < Math.max(3, Math.floor(students * 0.15))
  ) {
    pushAlert(
      alerts,
      {
        id: `${summary.schoolId}:points_hoarding`,
        severity: 'warning',
        category: 'efficiency',
        title: 'Points accumulating without redemption',
        message: `High lifetime points (${summary.students.totalLifetimePoints.toLocaleString()}) but low active students (${summary.students.activeStudents30d}).`,
        recommendation:
          'Review prize affordability, kiosk redemption training, and whether students know how to spend points.',
        priority: 24,
      },
      summary,
    );
  }

  if (summary.pillars.payOffice && countOf(summary, 'officeStudents') === 0 && students >= 5) {
    pushAlert(
      alerts,
      {
        id: `${summary.schoolId}:office_empty`,
        severity: 'info',
        category: 'adoption',
        title: 'School Office enabled but empty',
        message: 'Office pillar is on but no office student roster exists.',
        recommendation: 'Seed office roster or disable payOffice until the school is ready for billing/grades.',
        priority: 42,
      },
      summary,
    );
  }

  return alerts;
}

function evaluateDetailRules(
  detail: DeveloperSchoolUsageDetail,
  now: number,
): SchoolHealthAlert[] {
  const alerts: SchoolHealthAlert[] = [];
  const summary = detail as DeveloperFleetSchoolSummary;

  if (detail.enabledFeatures.includes('face_login') && detail.faceEnrollments === 0 && detail.students.count >= 10) {
    pushAlert(
      alerts,
      {
        id: `${detail.schoolId}:face_no_enrollments`,
        severity: 'info',
        category: 'adoption',
        title: 'Face login on, no enrollments',
        message: 'Face login is enabled but no students are enrolled in faceAuth.',
        recommendation: 'Run a pilot enrollment session or disable face login until staff are trained.',
        priority: 38,
      },
      summary,
    );
  }

  if (
    detail.activities.earnedLast30d >= 25 &&
    detail.activities.redeemedLast30d === 0 &&
    countOf(summary, 'prizes') > 0
  ) {
    pushAlert(
      alerts,
      {
        id: `${detail.schoolId}:earn_no_redeem`,
        severity: 'warning',
        category: 'efficiency',
        title: 'Earning points but not redeeming prizes',
        message: `${detail.activities.earnedLast30d} earn events in 30 days (sampled) but zero redemptions.`,
        recommendation:
          'Check prize desk hours, kiosk prize flow, and whether prize costs are too high for balances.',
        priority: 19,
      },
      summary,
    );
  }

  const redemptionShare =
    detail.activities.totalSampled > 0
      ? detail.activities.byCategory.find((c) => c.label === 'redemption')?.count ?? 0
      : 0;
  const earnCount = detail.activities.earnedLast30d + detail.activities.redeemedLast30d;
  if (earnCount > 30 && redemptionShare === 0 && countOf(summary, 'prizes') >= 3) {
    pushAlert(
      alerts,
      {
        id: `${detail.schoolId}:no_redemption_activity`,
        severity: 'warning',
        category: 'rewards',
        title: 'Reward economy may be one-sided',
        message: 'Sampled activity shows awards but no prize redemptions.',
        recommendation: 'Visit prize desk with the school and verify students can reach the redeem screen.',
        priority: 21,
      },
      summary,
    );
  }

  if (detail.enabledFeatures.includes('notifications') && detail.engagementScore < 30) {
    pushAlert(
      alerts,
      {
        id: `${summary.schoolId}:notifications_low_usage`,
        severity: 'info',
        category: 'efficiency',
        title: 'Notifications on, low engagement',
        message: 'Parent notifications are enabled but overall usage is still low.',
        recommendation:
          'Low usage may mean missing parent emails/phones on students, or staff not awarding enough to trigger notifications.',
        priority: 44,
      },
      summary,
    );
  }

  void now;
  return alerts;
}

export function evaluateFleetHealth(
  fleet: DeveloperFleetSchoolSummary[],
  detailsBySchoolId?: Record<string, DeveloperSchoolUsageDetail>,
  now = Date.now(),
): SchoolHealthReport {
  const byId = new Map<string, SchoolHealthAlert>();

  for (const summary of fleet) {
    for (const alert of evaluateSummaryRules(summary, now)) {
      byId.set(alert.id, alert);
    }
    const detail = detailsBySchoolId?.[summary.schoolId];
    if (detail) {
      for (const alert of evaluateDetailRules(detail, now)) {
        byId.set(alert.id, alert);
      }
    }
  }

  const alerts = [...byId.values()].sort((a, b) => {
    const sev = { critical: 0, warning: 1, info: 2 };
    const d = sev[a.severity] - sev[b.severity];
    if (d !== 0) return d;
    return a.priority - b.priority;
  });

  const schoolsNeedingAttention = new Set(
    alerts.filter((a) => a.severity !== 'info' && !a.isDemoSchool).map((a) => a.schoolId),
  ).size;

  return {
    alerts,
    criticalCount: alerts.filter((a) => a.severity === 'critical').length,
    warningCount: alerts.filter((a) => a.severity === 'warning').length,
    infoCount: alerts.filter((a) => a.severity === 'info').length,
    schoolsNeedingAttention,
    generatedAt: now,
  };
}

export function compactFleetForAi(fleet: DeveloperFleetSchoolSummary[]) {
  return fleet.map((s) => ({
    schoolId: s.schoolId,
    name: s.name,
    engagementScore: s.engagementScore,
    students: s.students.count,
    active30d: s.students.activeStudents30d,
    signIns30d: s.attendance.last30d,
    coupons30d: s.coupons.usedLast30d,
    pillars: s.pillars,
    prizes: s.counts.prizes ?? 0,
    teachers: s.counts.teachers ?? 0,
  }));
}

export function compactAlertsForAi(alerts: SchoolHealthAlert[]) {
  return alerts
    .filter((a) => !a.isDemoSchool)
    .slice(0, 24)
    .map((a) => ({
      schoolId: a.schoolId,
      severity: a.severity,
      category: a.category,
      title: a.title,
      message: a.message,
    }));
}
