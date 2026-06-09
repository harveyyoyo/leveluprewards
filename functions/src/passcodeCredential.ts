import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import {
  buildPasscodeSecretDoc,
  safeEqualPlaintext,
  verifyHashedPasscode,
  type PasscodeSecretDoc,
} from "./passcodeSecrets";

export async function readPasscodeSecret(
  schoolId: string,
  secretId: string,
): Promise<PasscodeSecretDoc | null> {
  const snap = await admin
    .firestore()
    .collection("schools")
    .doc(schoolId)
    .collection("secrets")
    .doc(secretId)
    .get();
  if (!snap.exists) return null;
  const data = snap.data() as { salt?: string; hash?: string };
  if (typeof data.salt !== "string" || typeof data.hash !== "string") return null;
  return { salt: data.salt, hash: data.hash };
}

export async function writePasscodeSecret(
  schoolId: string,
  secretId: string,
  passcode: string,
): Promise<void> {
  const secret = buildPasscodeSecretDoc(passcode);
  await admin
    .firestore()
    .collection("schools")
    .doc(schoolId)
    .collection("secrets")
    .doc(secretId)
    .set(secret);
}

type LegacyPasscodeCleanup =
  | { kind: "school"; fields: string[] }
  | { kind: "teacher"; teacherId: string }
  | { kind: "staff"; staffAccountId: string };

export async function verifyPasscodeCredential(
  schoolId: string,
  secretId: string,
  passcode: string,
  legacyPlaintext?: string,
  cleanup?: LegacyPasscodeCleanup,
): Promise<boolean> {
  const normalized = passcode.trim();
  if (!normalized) return false;

  const secret = await readPasscodeSecret(schoolId, secretId);
  if (secret && verifyHashedPasscode(normalized, secret.salt, secret.hash)) {
    return true;
  }

  const legacy = (legacyPlaintext ?? "").trim();
  if (!legacy || !safeEqualPlaintext(legacy, normalized)) {
    return false;
  }

  await writePasscodeSecret(schoolId, secretId, normalized);
  const db = admin.firestore();
  if (cleanup?.kind === "school" && cleanup.fields.length > 0) {
    const patch: Record<string, unknown> = {};
    for (const field of cleanup.fields) {
      patch[field] = FieldValue.delete();
    }
    await db.collection("schools").doc(schoolId).update(patch);
  } else if (cleanup?.kind === "teacher") {
    await db
      .collection("schools")
      .doc(schoolId)
      .collection("teachers")
      .doc(cleanup.teacherId)
      .update({ passcode: FieldValue.delete() });
  } else if (cleanup?.kind === "staff") {
    await db
      .collection("schools")
      .doc(schoolId)
      .collection("staffAccounts")
      .doc(cleanup.staffAccountId)
      .update({ passcode: FieldValue.delete() });
  }

  return true;
}

export async function schoolPasscodeConfigured(
  schoolId: string,
  secretId: string,
  legacyPlaintext?: string,
): Promise<boolean> {
  const secret = await readPasscodeSecret(schoolId, secretId);
  if (secret) return true;
  return Boolean((legacyPlaintext ?? "").trim());
}
