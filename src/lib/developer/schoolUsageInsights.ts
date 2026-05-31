export type DeveloperSchoolPillars = {
  payClassroom: boolean;
  payAttendance: boolean;
  payLibrary: boolean;
  payHomework: boolean;
  payOffice: boolean;
};

export type DeveloperSchoolCounts = Record<string, number>;

export type DeveloperFleetSchoolSummary = {
  schoolId: string;
  name: string;
  updatedAt: number | null;
  pillars: DeveloperSchoolPillars;
  counts: DeveloperSchoolCounts;
  coupons: {
    total: number;
    used: number;
    usedLast30d: number;
    pointsFromCoupons: number;
  };
  library: {
    total: number;
    checkedOut: number;
    available: number;
  };
  attendance: {
    total: number;
    last7d: number;
    last30d: number;
    lastSignInAt: number | null;
  };
  students: {
    count: number;
    totalLifetimePoints: number;
    activeStudents30d: number;
    studentsWithPoints: number;
  };
  backup: {
    lastBackupAt: number | null;
    lastBackupType: string | null;
  };
  engagementScore: number;
};

export type DeveloperSchoolUsageDetail = DeveloperFleetSchoolSummary & {
  appSettings: Record<string, unknown>;
  staffByRole: Record<string, number>;
  teachersCount: number;
  activities: {
    sampledStudents: number;
    totalSampled: number;
    earnedLast30d: number;
    redeemedLast30d: number;
    byCategory: Array<{ label: string; count: number; points: number }>;
    recentActivities: Array<{
      studentId: string;
      studentName: string;
      desc: string;
      amount: number;
      date: number;
      kind: string;
    }>;
  };
  enabledFeatures: string[];
  faceEnrollments: number;
  recentSupportSessions: Array<{
    id: string;
    startedAt: number | null;
    developerUid: string | null;
  }>;
  generatedAt: number;
};

export type DeveloperUsageInsightsResponse =
  | { mode: 'fleet'; fleet: DeveloperFleetSchoolSummary[]; schoolCount: number; generatedAt: number }
  | { mode: 'detail'; detail: DeveloperSchoolUsageDetail; generatedAt: number };

export function formatRelativeTime(ms: number | null | undefined, now = Date.now()): string {
  if (ms == null || !Number.isFinite(ms)) return 'Never';
  const diff = now - ms;
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 30 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(ms).toLocaleDateString();
}

export function engagementLabel(score: number): { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' } {
  if (score >= 70) return { label: 'Active', variant: 'default' };
  if (score >= 40) return { label: 'Moderate', variant: 'secondary' };
  if (score > 0) return { label: 'Light', variant: 'outline' };
  return { label: 'Dormant', variant: 'destructive' };
}
