import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { buildDeveloperFleetSummaries } from "./developerSchoolInsights";
import {
  evaluateFleetHealthFromSummaries,
  fleetSummaryFromRaw,
  type HealthAlert,
  type HealthReport,
} from "./developerSchoolHealthRules";
import { GOOGLE_OWNER_EMAILS } from "./googleAllowlist";

const APP_CONFIG_GLOBAL = "global";
const FROM_EMAIL = '"LevelUp Developer Alerts" <alerts@levelup-edu.com>';

export type DeveloperHealthEmailSettings = {
  enabled: boolean;
  dailyDigest: boolean;
  includeWarnings: boolean;
  emails: string[];
  emailOnCritical: boolean;
  lastSentAt?: number;
  lastFingerprint?: string;
};

async function isDeveloper(context: functions.https.CallableContext): Promise<boolean> {
  if (!context.auth?.uid) return false;
  const snap = await admin.firestore().collection("appConfig").doc(APP_CONFIG_GLOBAL).get();
  const list = snap.exists ? (snap.data()?.developerUids as string[] | undefined) : undefined;
  return Array.isArray(list) && list.includes(context.auth.uid);
}

function requireAuth(context: functions.https.CallableContext): void {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Sign in as a developer first.");
  }
}

async function requireDeveloper(context: functions.https.CallableContext): Promise<void> {
  requireAuth(context);
  if (!(await isDeveloper(context))) {
    throw new functions.https.HttpsError("permission-denied", "Developer access is required.");
  }
}

function parseAllowlistEmails(): string[] {
  const raw =
    process.env.DEVELOPER_GOOGLE_EMAIL_ALLOWLIST ||
    process.env.NEXT_PUBLIC_DEVELOPER_GOOGLE_EMAIL_ALLOWLIST ||
    "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));
}

function normalizeEmails(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    if (typeof item !== "string") continue;
    const e = item.trim().toLowerCase();
    if (!e.includes("@") || seen.has(e)) continue;
    seen.add(e);
    out.push(e);
  }
  return out;
}

export async function readDeveloperHealthEmailSettings(): Promise<DeveloperHealthEmailSettings> {
  const snap = await admin.firestore().collection("appConfig").doc(APP_CONFIG_GLOBAL).get();
  const raw = snap.data()?.developerHealthAlerts as Partial<DeveloperHealthEmailSettings> | undefined;
  const emails =
    normalizeEmails(raw?.emails).length > 0
      ? normalizeEmails(raw?.emails)
      : [...new Set([...GOOGLE_OWNER_EMAILS.map((e) => e.toLowerCase()), ...parseAllowlistEmails()])];

  return {
    enabled: raw?.enabled !== false,
    dailyDigest: raw?.dailyDigest !== false,
    includeWarnings: raw?.includeWarnings !== false,
    emailOnCritical: raw?.emailOnCritical !== false,
    emails,
    lastSentAt: typeof raw?.lastSentAt === "number" ? raw.lastSentAt : undefined,
    lastFingerprint: typeof raw?.lastFingerprint === "string" ? raw.lastFingerprint : undefined,
  };
}

async function writeDeveloperHealthEmailSettings(
  patch: Partial<DeveloperHealthEmailSettings>
): Promise<DeveloperHealthEmailSettings> {
  const ref = admin.firestore().collection("appConfig").doc(APP_CONFIG_GLOBAL);
  const current = await readDeveloperHealthEmailSettings();
  const next: DeveloperHealthEmailSettings = {
    ...current,
    ...patch,
    emails: patch.emails != null ? normalizeEmails(patch.emails) : current.emails,
  };
  await ref.set({ developerHealthAlerts: next }, { merge: true });
  return next;
}

export async function buildDeveloperHealthReport(): Promise<HealthReport> {
  const rawFleet = await buildDeveloperFleetSummaries();
  const fleet = rawFleet.map((row) => fleetSummaryFromRaw(row));
  return evaluateFleetHealthFromSummaries(fleet);
}

function alertsForEmail(report: HealthReport, includeWarnings: boolean): HealthAlert[] {
  return report.alerts.filter((a) => {
    if (a.isDemoSchool) return false;
    if (a.severity === "critical") return true;
    return includeWarnings && a.severity === "warning";
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHealthEmailHtml(report: HealthReport, items: HealthAlert[]): { subject: string; html: string; text: string } {
  const subject =
    report.criticalCount > 0
      ? `[LevelUp] ${report.criticalCount} critical school health alert${report.criticalCount === 1 ? "" : "s"}`
      : `[LevelUp] School health digest — ${report.warningCount} warning${report.warningCount === 1 ? "" : "s"}`;

  const rows = items
    .slice(0, 40)
    .map(
      (a) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-family:monospace;font-size:12px;">${escapeHtml(a.schoolId)}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;">
          <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;${
            a.severity === "critical"
              ? "background:#fef2f2;color:#b91c1c;"
              : "background:#fffbeb;color:#b45309;"
          }">${escapeHtml(a.severity)}</span>
        </td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;">
          <strong>${escapeHtml(a.title)}</strong><br/>
          <span style="color:#4b5563;font-size:13px;">${escapeHtml(a.message)}</span><br/>
          <span style="color:#111827;font-size:12px;"><em>Fix:</em> ${escapeHtml(a.recommendation)}</span>
        </td>
      </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#111827;max-width:720px;margin:0 auto;padding:24px;">
    <h1 style="font-size:20px;margin:0 0 8px;">School Arcade — Developer health report</h1>
    <p style="color:#4b5563;margin:0 0 16px;">
      ${report.criticalCount} critical · ${report.warningCount} warning · ${report.schoolsNeedingAttention} schools need attention
      · ${new Date(report.generatedAt).toLocaleString()}
    </p>
    <p style="margin:0 0 16px;"><a href="https://levelup-edu.com/developer">Open developer console</a></p>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      <thead><tr style="background:#f9fafb;text-align:left;">
        <th style="padding:8px;font-size:11px;text-transform:uppercase;">School</th>
        <th style="padding:8px;font-size:11px;text-transform:uppercase;">Level</th>
        <th style="padding:8px;font-size:11px;text-transform:uppercase;">Issue</th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="3" style="padding:16px;">No actionable alerts.</td></tr>'}</tbody>
    </table>
    <p style="color:#6b7280;font-size:12px;margin-top:24px;">Automated developer health monitor. Adjust recipients in Developer → Email alerts.</p>
  </body></html>`;

  const text = items
    .slice(0, 40)
    .map((a) => `[${a.severity}] ${a.schoolId}: ${a.title} — ${a.message} (Fix: ${a.recommendation})`)
    .join("\n");

  return { subject, html, text: `${subject}\n\n${text}\n\nDeveloper: /developer` };
}

export type SendHealthEmailResult = {
  sent: boolean;
  reason: string;
  recipientCount: number;
  alertCount: number;
  fingerprint: string;
};

export async function sendDeveloperHealthAlertEmail(options: {
  force?: boolean;
  settings?: DeveloperHealthEmailSettings;
}): Promise<SendHealthEmailResult> {
  const settings = options.settings ?? (await readDeveloperHealthEmailSettings());
  if (!settings.enabled) {
    return { sent: false, reason: "disabled", recipientCount: 0, alertCount: 0, fingerprint: "" };
  }

  const report = await buildDeveloperHealthReport();
  const items = alertsForEmail(report, settings.includeWarnings);
  if (items.length === 0) {
    return {
      sent: false,
      reason: "no_actionable_alerts",
      recipientCount: 0,
      alertCount: 0,
      fingerprint: report.fingerprint,
    };
  }

  const recipients = settings.emails;
  if (recipients.length === 0) {
    return {
      sent: false,
      reason: "no_recipients",
      recipientCount: 0,
      alertCount: items.length,
      fingerprint: report.fingerprint,
    };
  }

  const now = Date.now();
  const fingerprint = report.fingerprint;
  const fingerprintChanged = fingerprint !== settings.lastFingerprint;
  const hoursSinceLast =
    settings.lastSentAt != null ? (now - settings.lastSentAt) / (3600 * 1000) : Number.POSITIVE_INFINITY;
  const hasCritical = report.criticalCount > 0;

  let shouldSend = Boolean(options.force);
  if (!shouldSend && settings.dailyDigest && hoursSinceLast >= 20) {
    shouldSend = true;
  }
  if (!shouldSend && settings.emailOnCritical && hasCritical && fingerprintChanged) {
    shouldSend = true;
  }
  if (!shouldSend && fingerprintChanged && hasCritical) {
    shouldSend = true;
  }

  if (!shouldSend) {
    return {
      sent: false,
      reason: "deduped",
      recipientCount: recipients.length,
      alertCount: items.length,
      fingerprint,
    };
  }

  const { subject, html, text } = buildHealthEmailHtml(report, items);
  const db = admin.firestore();
  const batch = recipients.map((to) =>
    db.collection("mail").add({
      to,
      from: FROM_EMAIL,
      message: { subject, text, html },
      developerHealthAlert: true,
      createdAt: FieldValue.serverTimestamp(),
      alertCount: items.length,
      criticalCount: report.criticalCount,
      fingerprint,
    })
  );
  await Promise.all(batch);

  await writeDeveloperHealthEmailSettings({
    lastSentAt: now,
    lastFingerprint: fingerprint,
  });

  functions.logger.info(
    `Developer health email queued for ${recipients.length} recipients (${items.length} alerts).`
  );

  return {
    sent: true,
    reason: options.force ? "forced" : hasCritical ? "critical_change" : "daily_digest",
    recipientCount: recipients.length,
    alertCount: items.length,
    fingerprint,
  };
}

/** Callable: read developer health email settings. */
export const getDeveloperHealthAlertSettings = functions.https.onCall(
  async (_data: unknown, context: functions.https.CallableContext) => {
    await requireDeveloper(context);
    return readDeveloperHealthEmailSettings();
  }
);

/** Callable: update developer health email settings. */
export const updateDeveloperHealthAlertSettings = functions.https.onCall(
  async (data: Record<string, unknown> | null, context: functions.https.CallableContext) => {
    await requireDeveloper(context);
    const patch: Partial<DeveloperHealthEmailSettings> = {};
    if (typeof data?.enabled === "boolean") patch.enabled = data.enabled;
    if (typeof data?.dailyDigest === "boolean") patch.dailyDigest = data.dailyDigest;
    if (typeof data?.includeWarnings === "boolean") patch.includeWarnings = data.includeWarnings;
    if (typeof data?.emailOnCritical === "boolean") patch.emailOnCritical = data.emailOnCritical;
    if (data?.emails != null) patch.emails = normalizeEmails(data.emails);
    return writeDeveloperHealthEmailSettings(patch);
  }
);

/** Callable: queue health alert email now (developer). */
export const sendDeveloperHealthAlertEmailNow = functions.https.onCall(
  async (data: { force?: boolean } | null, context: functions.https.CallableContext) => {
    await requireDeveloper(context);
    const force = data?.force === true;
    return sendDeveloperHealthAlertEmail({ force: force || true });
  }
);

/** Scheduled: daily developer health digest (7:00 America/New_York). */
export const scheduledDeveloperHealthAlertEmail = functions
  .runWith({ timeoutSeconds: 300, memory: "512MB" })
  .pubsub.schedule("0 7 * * *")
  .timeZone("America/New_York")
  .onRun(async () => {
    const settings = await readDeveloperHealthEmailSettings();
    if (!settings.enabled || !settings.dailyDigest) {
      functions.logger.info("Developer health email skipped (disabled or daily digest off).");
      return null;
    }
    const result = await sendDeveloperHealthAlertEmail({ settings, force: false });
    functions.logger.info("Scheduled developer health email", result);
    return null;
  });
