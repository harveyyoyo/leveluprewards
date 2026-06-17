import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { isAllowedGoogleEmailOnAllowlist } from '../googleAllowlist';

function requireAuth(context: functions.https.CallableContext): void {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }
}

async function requireSchoolAdmin(
  schoolId: string,
  context: functions.https.CallableContext
): Promise<void> {
  requireAuth(context);
  requireString(schoolId, "schoolId");

  const db = admin.firestore();
  const roleSnap = await db
    .collection("schools")
    .doc(schoolId)
    .collection("roles_admin")
    .doc(context.auth!.uid)
    .get();

  if (!roleSnap.exists || roleSnap.data()?.role !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Admin privileges required for this school."
    );
  }
}

function requireString(value: unknown, name: string): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `A valid ${name} is required.`
    );
  }
}

function trimmedString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function maskRecipient(to: unknown): string {
  const s = typeof to === "string" ? to.trim() : "";
  if (!s) return "—";
  const at = s.indexOf("@");
  if (at < 1) return `${s.slice(0, 3)}…`;
  return `${s.slice(0, 2)}***${s.slice(at)}`;
}

/**
 * Timing-safe string comparison to prevent side-channel attacks on passcodes.
 * Returns true if `a` and `b` are non-empty and equal, without leaking length
 * or character-position information through timing differences.
 */
function safeEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    // Still run timingSafeEqual against bufA to avoid leaking length info via timing.
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function schoolAccessPasscodeFrom(data: Record<string, any>): string {
  return trimmedString(data.schoolAccessPasscode) || trimmedString(data.passcode) || "";
}

function adminPasscodeFrom(data: Record<string, any>): string {
  return trimmedString(data.adminPasscode) || trimmedString(data.passcode) || "";
}

function developerGoogleEmailAllowlist(): string[] {
  const allowlistStr =
    process.env.DEVELOPER_GOOGLE_EMAIL_ALLOWLIST ||
    process.env.NEXT_PUBLIC_DEVELOPER_GOOGLE_EMAIL_ALLOWLIST ||
    "";
  return allowlistStr
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Allowed Google accounts may provision school admin without the admin passcode. */
function isAllowedGoogleAdminBypass(context: functions.https.CallableContext): boolean {
  const email = (context.auth?.token?.email ?? "").trim().toLowerCase();
  if (!email || !isGoogleAuthenticated(context)) return false;
  return isAllowedGoogleEmailOnAllowlist(email, developerGoogleEmailAllowlist());
}

// Demo schools should authenticate like any other school (no passcode bypass).

function isGoogleAuthenticated(context: functions.https.CallableContext): boolean {
  const token = context.auth?.token as any;
  const provider = String(token?.firebase?.sign_in_provider ?? "");
  if (provider === "google.com") return true;

  // When an anonymous Firebase user is linked to Google, `sign_in_provider` may remain "anonymous".
  // The ID token still includes Google identities when the account is linked.
  const identities = token?.firebase?.identities;
  return Boolean(identities && (identities["google.com"] || identities.google));
}

async function isDeveloper(context: functions.https.CallableContext): Promise<boolean> {
  if (!context.auth?.uid) return false;
  const db = admin.firestore();
  try {
    const doc = await db.collection("appConfig").doc("developerAllowlist").get();
    if (!doc.exists) return false;
    const data = doc.data();
    return Array.isArray(data?.uids) && data!.uids.includes(context.auth.uid);
  } catch {
    return false;
  }
}

async function hasExistingSchoolPortalAccess(
  schoolId: string,
  uid: string,
  context: functions.https.CallableContext
): Promise<boolean> {
  const db = admin.firestore();
  if (
    await hasSchoolRole(schoolId, uid, [
      "admin",
      "teacher",
      "secretary",
      "prizeClerk",
      "reports",
      "librarian",
      "office",
      "houseCoordinator",
    ])
  ) {
    return true;
  }
  const portalSnap = await db
    .collection("schools")
    .doc(schoolId)
    .collection("anonymousPortalSessions")
    .doc(uid)
    .get();
  if (portalSnap.exists) return true;
  // Allowlisted Google dev/owner accounts may enter any school without the access passcode
  // (same bypass used for admin passcode login).
  if (isAllowedGoogleAdminBypass(context)) return true;
  return await isDeveloper(context);
}

async function ensureAnonymousPortalSession(schoolId: string, uid: string): Promise<void> {
  const db = admin.firestore();
  await db
    .collection("schools")
    .doc(schoolId)
    .collection("anonymousPortalSessions")
    .doc(uid)
    .set({ grantedAt: FieldValue.serverTimestamp() }, { merge: true });
}

async function hasSchoolRole(
  schoolId: string,
  uid: string,
  roles: Array<"admin" | "teacher" | "secretary" | "prizeClerk" | "reports" | "librarian" | "office" | "houseCoordinator">
): Promise<boolean> {
  const db = admin.firestore();
  const roleCollections: Record<string, string> = {
    admin: "roles_admin",
    teacher: "roles_teacher",
    secretary: "roles_secretary",
    prizeClerk: "roles_prizeClerk",
    reports: "roles_reports",
    librarian: "roles_librarian",
    office: "roles_office",
    houseCoordinator: "roles_houseCoordinator",
  };
  const snaps = await Promise.all(
    roles.map((role) =>
      db.collection("schools").doc(schoolId).collection(roleCollections[role]).doc(uid).get()
    )
  );
  return snaps.some((snap, index) => snap.exists && snap.data()?.role === roles[index]);
}

async function hasKioskMembershipOrStaff(
  schoolId: string,
  context: functions.https.CallableContext,
  roles: Array<"admin" | "teacher" | "secretary" | "prizeClerk" | "reports" | "librarian" | "houseCoordinator"> = ["admin", "teacher", "secretary", "prizeClerk", "librarian"]
): Promise<boolean> {
  requireAuth(context);
  const uid = context.auth!.uid;
  const db = admin.firestore();
  const memberSnap = await db.collection("schools").doc(schoolId).collection("kioskMembers").doc(uid).get();
  if (memberSnap.exists) return true;
  if (await hasSchoolRole(schoolId, uid, roles)) return true;
  return await isDeveloper(context);
}

async function schoolEntryCodeIsRequired(
  db: admin.firestore.Firestore,
  schoolId: string
): Promise<boolean> {
  const secretSnap = await db.collection("schools").doc(schoolId).collection("secrets").doc("entry").get();
  const code = secretSnap.exists ? String(secretSnap.data()?.code ?? "").trim() : "";
  return code.length > 0;
}

async function schoolAccessPasscodeIsRequired(
  db: admin.firestore.Firestore,
  schoolId: string
): Promise<boolean> {
  const schoolSnap = await db.collection("schools").doc(schoolId).get();
  if (!schoolSnap.exists) return false;
  return schoolAccessPasscodeFrom(schoolSnap.data() || {}).length > 0;
}

