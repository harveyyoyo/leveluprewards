import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { writePasscodeSecret } from "./passcodeCredential";
import { staffPasscodeSecretId, teacherPasscodeSecretId } from "./passcodeSecrets";

import "./init";

async function hashTeacherPasscodeOnWrite(
  schoolId: string,
  teacherId: string,
  passcode: unknown,
): Promise<void> {
  const plain = passcode !== undefined && passcode !== null ? String(passcode).trim() : "";
  if (!plain) return;
  await writePasscodeSecret(schoolId, teacherPasscodeSecretId(teacherId), plain);
  await admin
    .firestore()
    .collection("schools")
    .doc(schoolId)
    .collection("teachers")
    .doc(teacherId)
    .update({ passcode: FieldValue.delete() });
}

async function hashStaffPasscodeOnWrite(
  schoolId: string,
  staffAccountId: string,
  passcode: unknown,
): Promise<void> {
  const plain = passcode !== undefined && passcode !== null ? String(passcode).trim() : "";
  if (!plain) return;
  await writePasscodeSecret(schoolId, staffPasscodeSecretId(staffAccountId), plain);
  await admin
    .firestore()
    .collection("schools")
    .doc(schoolId)
    .collection("staffAccounts")
    .doc(staffAccountId)
    .update({ passcode: FieldValue.delete() });
}

exports.onTeacherPasscodeWrite = functions.firestore
  .document("schools/{schoolId}/teachers/{teacherId}")
  .onWrite(async (change, context) => {
    const after = change.after.exists ? change.after.data() : null;
    if (!after || after.passcode === undefined) return;
    await hashTeacherPasscodeOnWrite(context.params.schoolId, context.params.teacherId, after.passcode);
  });

exports.onStaffAccountPasscodeWrite = functions.firestore
  .document("schools/{schoolId}/staffAccounts/{staffAccountId}")
  .onWrite(async (change, context) => {
    const after = change.after.exists ? change.after.data() : null;
    if (!after || after.passcode === undefined) return;
    await hashStaffPasscodeOnWrite(
      context.params.schoolId,
      context.params.staffAccountId,
      after.passcode,
    );
  });
