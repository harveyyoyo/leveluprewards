/**
 * Keep evaluate rules in sync with `src/lib/developer/schoolHealthRules.ts` (summary rules).
 */
import * as crypto from "crypto";

const MS_DAY = 86_400_000;
const DEMO_SCHOOL_IDS = new Set(["schoolabc", "yeshiva"]);

export type HealthSeverity = "critical" | "warning" | "info";

export type FleetSchoolSummary = {
  schoolId: string;
  name: string;
  engagementScore: number;
  pillars: {
    payClassroom: boolean;
    payAttendance: boolean;
    payLibrary: boolean;
    payHomework: boolean;
    payOffice: boolean;
  };
  counts: Record<string, number>;
  coupons: { total: number; used: number; usedLast30d: number };
  library: { total: number; checkedOut: number };
  attendance: { last30d: number };
  students: {
    count: number;
    totalLifetimePoints: number;
    activeStudents30d: number;
  };
  backup: { lastBackupAt: number | null };
};

export type HealthAlert = {
  id: string;
  schoolId: string;
  schoolName: string;
  severity: HealthSeverity;
  title: string;
  message: string;
  recommendation: string;
  priority: number;
  isDemoSchool?: boolean;
};

export type HealthReport = {
  alerts: HealthAlert[];
  criticalCount: number;
  warningCount: number;
  schoolsNeedingAttention: number;
  generatedAt: number;
  fingerprint: string;
};

function countOf(summary: FleetSchoolSummary, key: string): number {
  return summary.counts[key] ?? 0;
}

function pushAlert(alerts: HealthAlert[], draft: Omit<HealthAlert, "schoolId" | "schoolName" | "isDemoSchool">, summary: FleetSchoolSummary) {
  alerts.push({
    ...draft,
    schoolId: summary.schoolId,
    schoolName: summary.name || summary.schoolId,
    isDemoSchool: DEMO_SCHOOL_IDS.has(summary.schoolId),
  });
}

function evaluateSummaryRules(summary: FleetSchoolSummary, now: number): HealthAlert[] {
  const alerts: HealthAlert[] = [];
  const students = summary.students.count;
  const activeRatio = students > 0 ? summary.students.activeStudents30d / students : 0;
  const couponUseRate = summary.coupons.total > 0 ? summary.coupons.used / summary.coupons.total : 0;
  const daysSinceBackup =
    summary.backup.lastBackupAt != null ? (now - summary.backup.lastBackupAt) / MS_DAY : null;

  if (students >= 5 && summary.engagementScore < 15) {
    pushAlert(alerts, {
      id: `${summary.schoolId}:dormant`,
      severity: "critical",
      title: "School looks dormant",
      message: `Engagement ${summary.engagementScore}/100 with ${students} students.`,
      recommendation: "Confirm the school is live and run teacher/kiosk onboarding.",
      priority: 10,
    }, summary);
  }
  if (students >= 10 && activeRatio < 0.08) {
    pushAlert(alerts, {
      id: `${summary.schoolId}:low_active_students`,
      severity: "warning",
      title: "Few students active in 30 days",
      message: `${summary.students.activeStudents30d}/${students} students active (${Math.round(activeRatio * 100)}%).`,
      recommendation: "Encourage kiosk sign-in and classroom point awards.",
      priority: 20,
    }, summary);
  }
  if (summary.pillars.payAttendance && students >= 5 && summary.attendance.last30d === 0) {
    pushAlert(alerts, {
      id: `${summary.schoolId}:attendance_unused`,
      severity: "warning",
      title: "Attendance enabled but unused",
      message: "No sign-ins in the last 30 days.",
      recommendation: "Enable teacher sign-in and verify attendance periods.",
      priority: 15,
    }, summary);
  }
  if (summary.coupons.total >= 15 && summary.coupons.usedLast30d === 0) {
    pushAlert(alerts, {
      id: `${summary.schoolId}:coupons_not_redeemed`,
      severity: "warning",
      title: "Coupons not redeemed",
      message: `${summary.coupons.total} coupons; none redeemed in 30 days.`,
      recommendation: "Train kiosk coupon redemption for teachers and students.",
      priority: 18,
    }, summary);
  }
  if (students >= 10 && countOf(summary, "teachers") === 0) {
    pushAlert(alerts, {
      id: `${summary.schoolId}:no_teachers`,
      severity: "critical",
      title: "No teachers configured",
      message: `${students} students but zero teachers.`,
      recommendation: "Add teachers and assign classes in Admin.",
      priority: 5,
    }, summary);
  }
  if (students >= 5 && countOf(summary, "classes") === 0) {
    pushAlert(alerts, {
      id: `${summary.schoolId}:no_classes`,
      severity: "critical",
      title: "No classes configured",
      message: "Students exist without class structure.",
      recommendation: "Create classes and assign students.",
      priority: 6,
    }, summary);
  }
  if (students >= 5 && countOf(summary, "prizes") === 0) {
    pushAlert(alerts, {
      id: `${summary.schoolId}:no_prizes`,
      severity: "warning",
      title: "No prize catalog",
      message: "Students cannot redeem rewards.",
      recommendation: "Add prize desk items with point costs.",
      priority: 16,
    }, summary);
  }
  if (daysSinceBackup == null && students >= 3) {
    pushAlert(alerts, {
      id: `${summary.schoolId}:no_backup`,
      severity: "critical",
      title: "No backup on record",
      message: "No completed backup metadata found.",
      recommendation: "Run Developer backup or verify the scheduler.",
      priority: 8,
    }, summary);
  } else if (daysSinceBackup != null && daysSinceBackup > 45 && students >= 3) {
    pushAlert(alerts, {
      id: `${summary.schoolId}:stale_backup`,
      severity: "warning",
      title: "Backup is stale",
      message: `Last backup ${Math.floor(daysSinceBackup)} days ago.`,
      recommendation: "Trigger a backup now.",
      priority: 12,
    }, summary);
  }
  if (summary.coupons.total >= 40 && couponUseRate < 0.08) {
    pushAlert(alerts, {
      id: `${summary.schoolId}:coupon_hoarding`,
      severity: "warning",
      title: "Large unused coupon inventory",
      message: `${Math.round(couponUseRate * 100)}% of coupons ever used.`,
      recommendation: "Review coupon printing practices and kiosk access.",
      priority: 25,
    }, summary);
  }
  if (summary.pillars.payLibrary && students >= 10 && summary.library.total === 0) {
    pushAlert(alerts, {
      id: `${summary.schoolId}:library_empty`,
      severity: "warning",
      title: "Library enabled but empty",
      message: "No catalog titles.",
      recommendation: "Import library titles or disable library pillar.",
      priority: 22,
    }, summary);
  }
  void now;
  return alerts;
}

export function evaluateFleetHealthFromSummaries(
  fleet: FleetSchoolSummary[],
  now = Date.now()
): HealthReport {
  const byId = new Map<string, HealthAlert>();
  for (const summary of fleet) {
    for (const alert of evaluateSummaryRules(summary, now)) {
      byId.set(alert.id, alert);
    }
  }
  const alerts = [...byId.values()].sort((a, b) => {
    const sev = { critical: 0, warning: 1, info: 2 };
    const d = sev[a.severity] - sev[b.severity];
    return d !== 0 ? d : a.priority - b.priority;
  });
  const actionable = alerts.filter((a) => !a.isDemoSchool && a.severity !== "info");
  const fingerprint = crypto
    .createHash("sha256")
    .update(actionable.map((a) => `${a.severity}:${a.id}`).sort().join("|"))
    .digest("hex");

  return {
    alerts,
    criticalCount: alerts.filter((a) => a.severity === "critical" && !a.isDemoSchool).length,
    warningCount: alerts.filter((a) => a.severity === "warning" && !a.isDemoSchool).length,
    schoolsNeedingAttention: new Set(actionable.map((a) => a.schoolId)).size,
    generatedAt: now,
    fingerprint,
  };
}

export function fleetSummaryFromRaw(raw: Record<string, unknown>): FleetSchoolSummary {
  const counts = (raw.counts ?? {}) as Record<string, number>;
  const pillars = (raw.pillars ?? {}) as FleetSchoolSummary["pillars"];
  const students = (raw.students ?? {}) as FleetSchoolSummary["students"];
  return {
    schoolId: String(raw.schoolId ?? ""),
    name: String(raw.name ?? raw.schoolId ?? ""),
    engagementScore: typeof raw.engagementScore === "number" ? raw.engagementScore : 0,
    pillars: {
      payClassroom: pillars.payClassroom !== false,
      payAttendance: pillars.payAttendance !== false,
      payLibrary: pillars.payLibrary !== false,
      payHomework: pillars.payHomework !== false,
      payOffice: pillars.payOffice === true,
    },
    counts,
    coupons: (raw.coupons ?? { total: 0, used: 0, usedLast30d: 0 }) as FleetSchoolSummary["coupons"],
    library: (raw.library ?? { total: 0, checkedOut: 0 }) as FleetSchoolSummary["library"],
    attendance: (raw.attendance ?? { last30d: 0 }) as FleetSchoolSummary["attendance"],
    students: {
      count: typeof students.count === "number" ? students.count : 0,
      totalLifetimePoints: typeof students.totalLifetimePoints === "number" ? students.totalLifetimePoints : 0,
      activeStudents30d: typeof students.activeStudents30d === "number" ? students.activeStudents30d : 0,
    },
    backup: (raw.backup ?? { lastBackupAt: null }) as FleetSchoolSummary["backup"],
  };
}
