import type { Firestore } from 'firebase-admin/firestore';
import type { BehaviorNoteKind } from '@/lib/types';
import {
  formatAlertNoteTemplate,
  normalizeClassroomAlertRules,
  resolveClassroomAlertRules,
  ruleAppliesToEvent,
  triggerSummaryForRule,
  type ClassroomAlertRule,
  type ClassroomAlertRulesSettings,
} from '@/lib/classroom/classroomAlertRulesSettings';

export type AlertRuleEvalContext = {
  event: 'award' | 'note';
  studentId: string;
  studentName: string;
  classId?: string;
  className?: string;
  teacherId: string;
  teacherName: string;
  noteKind?: BehaviorNoteKind;
};

type StudentMetrics = {
  pointsTotal: number;
  awardCount: number;
  noteCount: number;
};

const NOTE_KINDS = new Set<BehaviorNoteKind>(['positive', 'concern', 'incident']);

function windowStartMs(windowHours: number, now: number): number {
  return now - windowHours * 60 * 60 * 1000;
}

async function loadAwardMetrics(
  db: Firestore,
  schoolId: string,
  studentId: string,
  since: number,
): Promise<Pick<StudentMetrics, 'pointsTotal' | 'awardCount'>> {
  const snap = await db
    .collection('schools')
    .doc(schoolId)
    .collection('classroomAwards')
    .where('studentId', '==', studentId)
    .orderBy('createdAt', 'desc')
    .limit(120)
    .get();

  let pointsTotal = 0;
  let awardCount = 0;
  for (const doc of snap.docs) {
    const row = doc.data();
    const createdAt = Number(row.createdAt ?? 0);
    if (createdAt < since) continue;
    const points = Number(row.points ?? 0);
    if (points > 0) {
      awardCount += 1;
      pointsTotal += points;
    }
  }
  return { pointsTotal, awardCount };
}

async function loadNoteMetrics(
  db: Firestore,
  schoolId: string,
  studentId: string,
  since: number,
  noteKind?: BehaviorNoteKind | 'any',
): Promise<number> {
  const snap = await db
    .collection('schools')
    .doc(schoolId)
    .collection('behaviorNotes')
    .where('studentId', '==', studentId)
    .orderBy('createdAt', 'desc')
    .limit(120)
    .get();

  let count = 0;
  for (const doc of snap.docs) {
    const row = doc.data();
    const createdAt = Number(row.createdAt ?? 0);
    if (createdAt < since) continue;
    const kind = NOTE_KINDS.has(row.kind as BehaviorNoteKind) ? row.kind : 'concern';
    if (noteKind && noteKind !== 'any' && kind !== noteKind) continue;
    count += 1;
  }
  return count;
}

function triggerMet(rule: ClassroomAlertRule, metrics: StudentMetrics): boolean {
  const t = rule.trigger;
  if (t.type === 'classroom_points_total') {
    return metrics.pointsTotal >= (t.minPoints ?? 0);
  }
  if (t.type === 'classroom_award_count') {
    return metrics.awardCount >= (t.minCount ?? 0);
  }
  return metrics.noteCount >= (t.minCount ?? 0);
}

async function alreadyFiredInWindow(
  db: Firestore,
  schoolId: string,
  studentId: string,
  ruleId: string,
  since: number,
): Promise<boolean> {
  const snap = await db
    .collection('schools')
    .doc(schoolId)
    .collection('behaviorNotes')
    .where('studentId', '==', studentId)
    .orderBy('createdAt', 'desc')
    .limit(40)
    .get();
  return snap.docs.some((d) => {
    const row = d.data();
    return row.autoAlertRuleId === ruleId && Number(row.createdAt ?? 0) >= since;
  });
}

async function createAutoAlertNote(
  db: Firestore,
  schoolId: string,
  rule: ClassroomAlertRule,
  ctx: AlertRuleEvalContext,
  metrics: StudentMetrics,
  now: number,
): Promise<void> {
  const action = rule.action;
  if (action.type !== 'create_behavior_note') return;

  const summary = triggerSummaryForRule(rule, metrics);
  const note = formatAlertNoteTemplate(action.noteTemplate, {
    studentName: ctx.studentName,
    summary,
    windowHours: rule.windowHours,
  });

  await db.collection('schools').doc(schoolId).collection('behaviorNotes').add({
    studentId: ctx.studentId,
    studentName: ctx.studentName,
    classId: ctx.classId ?? null,
    className: ctx.className ?? null,
    teacherId: 'classroom-alerts',
    teacherName: 'Classroom alerts',
    kind: action.noteKind,
    note,
    createdAt: now,
    visibleToParent: action.visibleToParent,
    pointsAmount: null,
    pointsLabel: null,
    autoAlertRuleId: rule.id,
    autoAlert: true,
  });
}

async function metricsForRule(
  db: Firestore,
  schoolId: string,
  studentId: string,
  rule: ClassroomAlertRule,
  since: number,
): Promise<StudentMetrics> {
  const t = rule.trigger;
  if (t.type === 'behavior_note_count') {
    const noteCount = await loadNoteMetrics(db, schoolId, studentId, since, t.noteKind);
    return { pointsTotal: 0, awardCount: 0, noteCount };
  }
  const awards = await loadAwardMetrics(db, schoolId, studentId, since);
  return { pointsTotal: awards.pointsTotal, awardCount: awards.awardCount, noteCount: 0 };
}

/**
 * After a classroom award or behavior note is saved, evaluate school if/then alert rules.
 * Failures are logged but do not block the primary save.
 */
export async function evaluateClassroomAlertRulesForStudent(
  db: Firestore,
  schoolId: string,
  appSettings: ClassroomAlertRulesSettings | Record<string, unknown> | undefined,
  ctx: AlertRuleEvalContext,
): Promise<void> {
  const rules = resolveClassroomAlertRules(
    appSettings as ClassroomAlertRulesSettings | undefined,
  ).filter((r) => r.enabled && ruleAppliesToEvent(r.trigger, ctx.event));

  if (rules.length === 0) return;

  const now = Date.now();

  for (const rule of rules) {
    try {
      const since = windowStartMs(rule.windowHours, now);
      const metrics = await metricsForRule(db, schoolId, ctx.studentId, rule, since);
      if (!triggerMet(rule, metrics)) continue;
      if (await alreadyFiredInWindow(db, schoolId, ctx.studentId, rule.id, since)) continue;
      await createAutoAlertNote(db, schoolId, rule, ctx, metrics, now);
    } catch (e) {
      console.error(
        `[classroomAlertRules] rule ${rule.id} failed for ${ctx.studentId}:`,
        e,
      );
    }
  }
}

/** Batch evaluate after multi-student classroom awards. */
export async function evaluateClassroomAlertRulesAfterAward(
  db: Firestore,
  schoolId: string,
  appSettings: Record<string, unknown> | undefined,
  studentIds: string[],
  studentNames: Map<string, string> | Record<string, string>,
  meta: {
    classId?: string;
    className?: string;
    teacherId: string;
    teacherName: string;
  },
): Promise<void> {
  const rules = normalizeClassroomAlertRules(
    (appSettings as ClassroomAlertRulesSettings)?.classroomAlertRules,
  ).filter((r) => r.enabled && r.trigger.type !== 'behavior_note_count');

  if (rules.length === 0) return;

  const nameMap =
    studentNames instanceof Map
      ? studentNames
      : new Map(Object.entries(studentNames));

  for (const studentId of studentIds) {
    const studentName = nameMap.get(studentId) || studentId;
    await evaluateClassroomAlertRulesForStudent(db, schoolId, appSettings, {
      event: 'award',
      studentId,
      studentName,
      classId: meta.classId,
      className: meta.className,
      teacherId: meta.teacherId,
      teacherName: meta.teacherName,
    });
  }
}
