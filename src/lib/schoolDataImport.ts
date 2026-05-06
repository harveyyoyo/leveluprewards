import { doc, setDoc, Firestore } from 'firebase/firestore';
import type {
  AttendanceScheduleSlot,
  Category,
  Class,
  Prize,
  StaffAccount,
  Student,
  Teacher,
} from '@/lib/types';
import { importClassNames } from '@/lib/db/classes';
import { importTeachersFromParsedRows } from '@/lib/db/teachers';
import { importStudentsFromParsedRows } from '@/lib/db/students';
import { addCategory } from '@/lib/db/categories';
import { addPrize } from '@/lib/db/prizes';
import { addStaffAccount } from '@/lib/db/staffAccounts';
import { normalizeTimeToHHMM } from '@/lib/normalizeScheduleTime';

export type ParsedSchoolSnapshot = {
  classes?: { name: string }[];
  teachers?: { name: string; username?: string; passcode?: string }[];
  students?: { firstName: string; lastName: string; className?: string }[];
  periods?: { label: string; startTime: string; endTime: string }[];
  categories?: { name: string; points?: number }[];
  prizes?: { name: string; points?: number }[];
  staffAccounts?: {
    displayName: string;
    username: string;
    passcode: string;
    role?: 'secretary' | 'prizeClerk' | 'reports';
  }[];
};

export type SchoolImportContext = {
  classes: Class[];
  teachers: Teacher[];
  students: Student[];
  periods: AttendanceScheduleSlot[];
  categories: Category[];
  prizes: Prize[];
  staffAccounts: StaffAccount[];
};

export type ImportChunkReport = { success: number; failed: number; errors: string[] };

export type SchoolSnapshotImportResult = {
  classes?: ImportChunkReport;
  teachers?: ImportChunkReport;
  students?: ImportChunkReport;
  periods?: ImportChunkReport;
  categories?: ImportChunkReport;
  prizes?: ImportChunkReport;
  staffAccounts?: ImportChunkReport;
};

export async function importParsedSchoolSnapshot(
  firestore: Firestore,
  schoolId: string,
  snapshot: ParsedSchoolSnapshot,
  ctx: SchoolImportContext,
): Promise<SchoolSnapshotImportResult> {
  const out: SchoolSnapshotImportResult = {};

  if (snapshot.classes?.length) {
    const names = snapshot.classes.map((c) => c.name).filter(Boolean);
    out.classes = await importClassNames(firestore, schoolId, names, ctx.classes);
  }

  if (snapshot.teachers?.length) {
    out.teachers = await importTeachersFromParsedRows(firestore, schoolId, snapshot.teachers, ctx.teachers);
  }

  if (snapshot.students?.length) {
    out.students = await importStudentsFromParsedRows(
      firestore,
      schoolId,
      snapshot.students,
      ctx.students,
      ctx.classes,
    );
  }

  if (snapshot.periods?.length) {
    const existingLabels = new Set((ctx.periods || []).map((p) => p.label.trim().toLowerCase()));
    const errors: string[] = [];
    let success = 0;
    for (let i = 0; i < snapshot.periods.length; i++) {
      const raw = snapshot.periods[i];
      const label = (raw.label || '').trim();
      const start = normalizeTimeToHHMM(raw.startTime);
      const end = normalizeTimeToHHMM(raw.endTime);
      if (!label || !start || !end) {
        errors.push(`Period ${i + 1}: needs label, start, and end times.`);
        continue;
      }
      const lk = label.toLowerCase();
      if (existingLabels.has(lk)) continue;
      existingLabels.add(lk);
      const id = `p_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 8)}`;
      const slot: AttendanceScheduleSlot = { id, label, startTime: start, endTime: end };
      await setDoc(doc(firestore, 'schools', schoolId, 'periods', id), {
        id: slot.id,
        label: slot.label,
        startTime: slot.startTime,
        endTime: slot.endTime,
      });
      success++;
    }
    const attempted = snapshot.periods.filter((p) => (p.label || '').trim()).length;
    out.periods = { success, failed: Math.max(0, attempted - success), errors };
  }

  if (snapshot.categories?.length) {
    const errors: string[] = [];
    let success = 0;
    const namesLower = new Set((ctx.categories || []).map((c) => c.name.trim().toLowerCase()));
    const { pickDistinctCategoryColor } = await import('@/lib/utils');
    const usedColors = new Set((ctx.categories || []).map((c) => (c.color || '').trim().toLowerCase()).filter(Boolean));
    for (let i = 0; i < snapshot.categories.length; i++) {
      const c = snapshot.categories[i];
      const name = (c.name || '').trim();
      if (!name) {
        errors.push(`Category ${i + 1}: missing name.`);
        continue;
      }
      if (namesLower.has(name.toLowerCase())) continue;
      namesLower.add(name.toLowerCase());
      const pts = typeof c.points === 'number' && Number.isFinite(c.points) ? Math.round(c.points) : 1;
      const color = pickDistinctCategoryColor(Array.from(usedColors));
      usedColors.add(color.trim().toLowerCase());
      await addCategory(firestore, schoolId, { name, points: Math.max(1, pts), color });
      success++;
    }
    const attempted = snapshot.categories.filter((c) => (c.name || '').trim()).length;
    out.categories = { success, failed: Math.max(0, attempted - success), errors };
  }

  if (snapshot.prizes?.length) {
    const errors: string[] = [];
    let success = 0;
    const namesLower = new Set((ctx.prizes || []).map((p) => p.name.trim().toLowerCase()));
    for (let i = 0; i < snapshot.prizes.length; i++) {
      const p = snapshot.prizes[i];
      const name = (p.name || '').trim();
      if (!name) {
        errors.push(`Reward item ${i + 1}: missing name.`);
        continue;
      }
      if (namesLower.has(name.toLowerCase())) continue;
      namesLower.add(name.toLowerCase());
      const pts = typeof p.points === 'number' && Number.isFinite(p.points) ? Math.round(p.points) : 1;
      await addPrize(firestore, schoolId, {
        name,
        points: Math.max(1, pts),
        icon: 'Gift',
        inStock: true,
      });
      success++;
    }
    const attempted = snapshot.prizes.filter((p) => (p.name || '').trim()).length;
    out.prizes = { success, failed: Math.max(0, attempted - success), errors };
  }

  if (snapshot.staffAccounts?.length) {
    const errors: string[] = [];
    let success = 0;
    const takenUser = new Set((ctx.staffAccounts || []).map((a) => a.username.trim().toLowerCase()));
    for (let i = 0; i < snapshot.staffAccounts.length; i++) {
      const s = snapshot.staffAccounts[i];
      const displayName = (s.displayName || '').trim();
      const username = (s.username || '').trim();
      const passcode = (s.passcode || '').trim();
      if (!displayName || !username || !passcode) {
        errors.push(`Staff ${i + 1}: needs display name, username, and passcode.`);
        continue;
      }
      const uk = username.toLowerCase();
      if (takenUser.has(uk)) continue;
      takenUser.add(uk);
      const role = s.role === 'prizeClerk' || s.role === 'reports' ? s.role : 'secretary';
      await addStaffAccount(firestore, schoolId, {
        displayName,
        username,
        passcode,
        role,
      });
      success++;
    }
    const attempted = snapshot.staffAccounts.filter(
      (s) => (s.displayName || '').trim() && (s.username || '').trim() && (s.passcode || '').trim(),
    ).length;
    out.staffAccounts = { success, failed: Math.max(0, attempted - success), errors };
  }

  return out;
}
