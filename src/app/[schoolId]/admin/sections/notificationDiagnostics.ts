import type { Settings } from '@/components/providers/SettingsProvider';

export type DiagnosticLevel = 'pass' | 'warn' | 'fail' | 'info';

export type DiagnosticLine = { level: DiagnosticLevel; text: string };

export type ActiveNotificationRow = {
  id: string;
  label: string;
  trigger: string;
  /** Whether Cloud Functions will enqueue parent/guardian alerts when gates pass (still needs contact on student). */
  parentQueue: boolean;
  studentQueue: boolean;
  staffQueue: boolean;
  /** Short explanation of gating. */
  gateNote: string;
};

function milestonesGloballyOff(settings: Settings): boolean {
  return settings.notificationMilestonesEnabled === false;
}

/**
 * Mirrors the high-level gates in `functions/src/index.ts` for
 * `onStudentActivityCreated` and `onAttendanceLogCreated`.
 */
export function buildNotificationDiagnostics(args: {
  settings: Settings;
  notificationsPlanOk: boolean;
  planLabel: string;
}): { lines: DiagnosticLine[]; activeRows: ActiveNotificationRow[]; headlineStatus: 'blocked' | 'limited' | 'active' } {
  const { settings, notificationsPlanOk, planLabel } = args;

  const lines: DiagnosticLine[] = [];

  if (!notificationsPlanOk) {
    lines.push({
      level: 'fail',
      text: `Plan (${planLabel}): the Notifications feature is not included. Cloud Functions skip all parent/student/staff mail for this school until the plan is upgraded or a developer grants the feature.`,
    });
  } else {
    lines.push({
      level: 'pass',
      text: `Plan (${planLabel}): Notifications feature is allowed for this school.`,
    });
  }

  if (!settings.enableNotifications) {
    lines.push({
      level: 'fail',
      text: 'Master switch appSettings.enableNotifications is off (or was forced off by plan). No alert documents are written to mail/sms/whatsapp.',
    });
  } else {
    lines.push({
      level: 'pass',
      text: 'Master switch enableNotifications is on in the settings saved for this school.',
    });
  }

  if (!settings.notificationRewardsEnabled) {
    lines.push({
      level: 'warn',
      text: 'Reward redemptions and ordinary point awards (non-milestone activity) will NOT enqueue mail — "Reward Redemptions" is off.',
    });
  } else if (settings.enableNotifications && notificationsPlanOk) {
    lines.push({
      level: 'pass',
      text: 'Reward redemptions and point-award activities will enqueue parent alerts (when parent email/phone exists on the student).',
    });
  }

  if (milestonesGloballyOff(settings)) {
    lines.push({
      level: 'warn',
      text: 'Milestones & badges: toggle is off — only descriptions starting with "Achievement earned:" or "Badge earned:" are treated as milestones; those will not notify.',
    });
  } else if (settings.enableNotifications && notificationsPlanOk) {
    lines.push({
      level: 'pass',
      text: 'Milestone/badge activities (description prefix "Achievement earned:" or "Badge earned:") will enqueue parent alerts.',
    });
  }

  lines.push({
    level: 'info',
    text: 'Some point flows use the description "Achievement Unlocked:" — the Cloud Function treats those like ordinary point activities, so they follow the Reward Redemptions toggle, not the milestone toggle.',
  });

  if (!settings.notificationAttendanceEnabled) {
    lines.push({
      level: 'warn',
      text: 'Attendance sign-ins will NOT notify — "Attendance Sign-ins" is off (separate Cloud Function on attendanceLog).',
    });
  } else if (settings.enableNotifications && notificationsPlanOk) {
    lines.push({
      level: 'pass',
      text: 'Attendance sign-ins will enqueue parent alerts when a kiosk/CF writes attendanceLog (students are notified only if "Students" is on; staff are not emailed for attendance in current code).',
    });
  }

  if (!settings.notificationStudentsEnabled) {
    lines.push({
      level: 'info',
      text: 'Students toggle is off — student email/phone will not receive copies (parents still do when the event path above is active).',
    });
  } else {
    lines.push({
      level: 'info',
      text: 'Students toggle is on — copies go to student email/phone when present on the student record.',
    });
  }

  if (!settings.notificationStaffAlertsEnabled) {
    lines.push({
      level: 'info',
      text: 'Staff alerts are off — assigned teachers will not get activity-based staff emails (attendance path never emails staff).',
    });
  } else {
    lines.push({
      level: 'info',
      text: 'Staff alerts are on — assigned teachers receive activity-based emails when their teacher record has email/phone.',
    });
  }

  lines.push({
    level: 'info',
    text: 'Delivery: Cloud Functions only add documents to Firestore collections mail, sms, and whatsapp. Real email/SMS requires the Trigger Email / Twilio (or equivalent) extensions configured in Firebase — check the Firebase Console and extension logs if the queue fills but nothing arrives.',
  });

  lines.push({
    level: 'info',
    text: 'If the mail queue is empty right after a redemption, the Cloud Function may not be deployed to this project, or an earlier gate stopped the run — use Firebase Functions logs for onStudentActivityCreated.',
  });

  const redemptionOpen =
    notificationsPlanOk && settings.enableNotifications && settings.notificationRewardsEnabled;
  const pointsNonMilestoneOpen = redemptionOpen;
  const milestoneOpen =
    notificationsPlanOk && settings.enableNotifications && !milestonesGloballyOff(settings);
  const attendanceOpen =
    notificationsPlanOk &&
    settings.enableNotifications &&
    settings.notificationAttendanceEnabled;

  const activeRows: ActiveNotificationRow[] = [
    {
      id: 'redeem',
      label: 'Prize / reward redemption',
      trigger: 'New student activities document with negative points (redeem)',
      parentQueue: redemptionOpen,
      studentQueue: redemptionOpen && settings.notificationStudentsEnabled,
      staffQueue: redemptionOpen && settings.notificationStaffAlertsEnabled,
      gateNote: redemptionOpen
        ? 'Uses Reward Redemptions toggle + master switch + plan.'
        : 'Blocked by plan, master switch, or Reward Redemptions toggle.',
    },
    {
      id: 'points',
      label: 'Point awards (non-milestone)',
      trigger: 'Student activities with positive points and normal descriptions',
      parentQueue: pointsNonMilestoneOpen,
      studentQueue: pointsNonMilestoneOpen && settings.notificationStudentsEnabled,
      staffQueue: pointsNonMilestoneOpen && settings.notificationStaffAlertsEnabled,
      gateNote: pointsNonMilestoneOpen
        ? 'Same gate as redemptions (Reward Redemptions toggle).'
        : 'Blocked by plan, master switch, or Reward Redemptions toggle.',
    },
    {
      id: 'milestone',
      label: 'Milestones & badges (strict prefixes)',
      trigger: 'Activity desc starts with "Achievement earned:" or "Badge earned:"',
      parentQueue: milestoneOpen,
      studentQueue: milestoneOpen && settings.notificationStudentsEnabled,
      staffQueue: milestoneOpen && settings.notificationStaffAlertsEnabled,
      gateNote: milestoneOpen
        ? 'Uses Milestones toggle + master switch + plan.'
        : 'Milestones toggle is off, or plan/master switch blocks.',
    },
    {
      id: 'attendance',
      label: 'Attendance sign-in',
      trigger: 'New document in schools/{schoolId}/attendanceLog',
      parentQueue: attendanceOpen,
      studentQueue: attendanceOpen && settings.notificationStudentsEnabled,
      staffQueue: false,
      gateNote: attendanceOpen
        ? 'Uses Attendance Sign-ins toggle. Staff path not implemented for attendance.'
        : 'Blocked by plan, master switch, or Attendance Sign-ins toggle.',
    },
  ];

  let headlineStatus: 'blocked' | 'limited' | 'active' = 'active';
  if (!notificationsPlanOk || !settings.enableNotifications) {
    headlineStatus = 'blocked';
  } else if (
    !settings.notificationRewardsEnabled &&
    !settings.notificationAttendanceEnabled &&
    milestonesGloballyOff(settings)
  ) {
    headlineStatus = 'limited';
  }

  return { lines, activeRows, headlineStatus };
}

export function maskRecipient(to: unknown): string {
  const s = typeof to === 'string' ? to.trim() : '';
  if (!s) return '—';
  const at = s.indexOf('@');
  if (at < 1) return `${s.slice(0, 3)}…`;
  return `${s.slice(0, 2)}***${s.slice(at)}`;
}
