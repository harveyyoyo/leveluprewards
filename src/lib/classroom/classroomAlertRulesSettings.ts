import type { BehaviorNoteKind } from '@/lib/types';

export const MAX_CLASSROOM_ALERT_RULES = 20;
export const MIN_ALERT_WINDOW_HOURS = 1;
export const MAX_ALERT_WINDOW_HOURS = 24 * 30;

export type ClassroomAlertTriggerType =
  | 'classroom_points_total'
  | 'classroom_award_count'
  | 'behavior_note_count';

export type ClassroomAlertRuleTrigger = {
  type: ClassroomAlertTriggerType;
  /** Sum of positive classroom award points in the window (points_total). */
  minPoints?: number;
  /** Number of matching events in the window (award_count / note_count). */
  minCount?: number;
  /** For behavior_note_count — filter by kind; omit or `any` for all kinds. */
  noteKind?: BehaviorNoteKind | 'any';
};

export type ClassroomAlertRuleAction = {
  type: 'create_behavior_note';
  noteKind: BehaviorNoteKind;
  /** Supports {studentName}, {summary}, {windowHours}. */
  noteTemplate: string;
  visibleToParent: boolean;
};

export type ClassroomAlertRule = {
  id: string;
  name: string;
  enabled: boolean;
  windowHours: number;
  trigger: ClassroomAlertRuleTrigger;
  action: ClassroomAlertRuleAction;
};

export type ClassroomAlertRulesSettings = {
  classroomAlertRules?: unknown;
};

const NOTE_KINDS = new Set<BehaviorNoteKind>(['positive', 'concern', 'incident']);
const TRIGGER_TYPES = new Set<ClassroomAlertTriggerType>([
  'classroom_points_total',
  'classroom_award_count',
  'behavior_note_count',
]);

export function newClassroomAlertRuleId(): string {
  return `alert-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function clampWindowHours(hours: unknown): number {
  const n = Number(hours);
  if (!Number.isFinite(n) || n <= 0) return 24;
  return Math.max(MIN_ALERT_WINDOW_HOURS, Math.min(MAX_ALERT_WINDOW_HOURS, Math.round(n)));
}

function normalizeNoteKind(raw: unknown): BehaviorNoteKind | 'any' {
  if (raw === 'any') return 'any';
  return NOTE_KINDS.has(raw as BehaviorNoteKind) ? (raw as BehaviorNoteKind) : 'any';
}

function normalizeTrigger(raw: unknown): ClassroomAlertRuleTrigger | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Partial<ClassroomAlertRuleTrigger>;
  if (!TRIGGER_TYPES.has(row.type as ClassroomAlertTriggerType)) return null;

  if (row.type === 'classroom_points_total') {
    const minPoints = Number(row.minPoints);
    if (!Number.isFinite(minPoints) || minPoints <= 0) return null;
    return { type: 'classroom_points_total', minPoints: Math.round(minPoints) };
  }

  if (row.type === 'classroom_award_count') {
    const minCount = Number(row.minCount);
    if (!Number.isFinite(minCount) || minCount <= 0) return null;
    return { type: 'classroom_award_count', minCount: Math.round(minCount) };
  }

  const minCount = Number(row.minCount);
  if (!Number.isFinite(minCount) || minCount <= 0) return null;
  return {
    type: 'behavior_note_count',
    minCount: Math.round(minCount),
    noteKind: normalizeNoteKind(row.noteKind),
  };
}

function normalizeAction(raw: unknown): ClassroomAlertRuleAction | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Partial<ClassroomAlertRuleAction>;
  if (row.type !== 'create_behavior_note') return null;
  const noteKind = NOTE_KINDS.has(row.noteKind as BehaviorNoteKind)
    ? (row.noteKind as BehaviorNoteKind)
    : 'concern';
  const noteTemplate =
    typeof row.noteTemplate === 'string' && row.noteTemplate.trim()
      ? row.noteTemplate.trim()
      : 'Alert: {studentName} met the rule threshold ({summary}) in the last {windowHours} hours.';
  return {
    type: 'create_behavior_note',
    noteKind,
    noteTemplate,
    visibleToParent: row.visibleToParent === true,
  };
}

function normalizeOneRule(raw: unknown, index: number): ClassroomAlertRule | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Partial<ClassroomAlertRule>;
  const trigger = normalizeTrigger(row.trigger);
  const action = normalizeAction(row.action);
  if (!trigger || !action) return null;
  const name =
    typeof row.name === 'string' && row.name.trim() ? row.name.trim() : `Rule ${index + 1}`;
  const id =
    typeof row.id === 'string' && row.id.trim()
      ? row.id.trim()
      : `alert-${index}-${name.toLowerCase().replace(/\s+/g, '-')}`;
  return {
    id,
    name,
    enabled: row.enabled !== false,
    windowHours: clampWindowHours(row.windowHours),
    trigger,
    action,
  };
}

export function normalizeClassroomAlertRules(input: unknown): ClassroomAlertRule[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((row, i) => normalizeOneRule(row, i))
    .filter((r): r is ClassroomAlertRule => r != null)
    .slice(0, MAX_CLASSROOM_ALERT_RULES);
}

export function resolveClassroomAlertRules(
  settings?: ClassroomAlertRulesSettings | null,
): ClassroomAlertRule[] {
  return normalizeClassroomAlertRules(settings?.classroomAlertRules);
}

export function createDefaultClassroomAlertRule(): ClassroomAlertRule {
  return {
    id: newClassroomAlertRuleId(),
    name: 'High classroom points',
    enabled: true,
    windowHours: 24,
    trigger: { type: 'classroom_points_total', minPoints: 25 },
    action: {
      type: 'create_behavior_note',
      noteKind: 'concern',
      noteTemplate:
        'Auto-alert: {studentName} earned {summary} in the last {windowHours} hours. Please review.',
      visibleToParent: false,
    },
  };
}

export function triggerSummaryForRule(
  rule: ClassroomAlertRule,
  metrics: { pointsTotal?: number; awardCount?: number; noteCount?: number },
): string {
  const t = rule.trigger;
  if (t.type === 'classroom_points_total') {
    return `${metrics.pointsTotal ?? 0} classroom points (threshold ${t.minPoints})`;
  }
  if (t.type === 'classroom_award_count') {
    return `${metrics.awardCount ?? 0} classroom awards (threshold ${t.minCount})`;
  }
  const kindLabel = t.noteKind && t.noteKind !== 'any' ? t.noteKind : 'behavior';
  return `${metrics.noteCount ?? 0} ${kindLabel} notes (threshold ${t.minCount})`;
}

export function formatAlertNoteTemplate(
  template: string,
  vars: { studentName: string; summary: string; windowHours: number },
): string {
  return template
    .replace(/\{studentName\}/g, vars.studentName)
    .replace(/\{summary\}/g, vars.summary)
    .replace(/\{windowHours\}/g, String(vars.windowHours));
}

export function ruleAppliesToEvent(
  trigger: ClassroomAlertRuleTrigger,
  event: 'award' | 'note',
): boolean {
  if (trigger.type === 'behavior_note_count') return event === 'note';
  return event === 'award';
}
