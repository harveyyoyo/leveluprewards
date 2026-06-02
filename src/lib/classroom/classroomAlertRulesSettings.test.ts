import { describe, expect, it } from 'vitest';
import {
  formatAlertNoteTemplate,
  normalizeClassroomAlertRules,
  ruleAppliesToEvent,
  triggerSummaryForRule,
  createDefaultClassroomAlertRule,
} from '@/lib/classroom/classroomAlertRulesSettings';

describe('classroomAlertRulesSettings', () => {
  it('normalizes a valid rule', () => {
    const rules = normalizeClassroomAlertRules([
      {
        id: 'r1',
        name: 'Test',
        enabled: true,
        windowHours: 48,
        trigger: { type: 'classroom_points_total', minPoints: 10 },
        action: {
          type: 'create_behavior_note',
          noteKind: 'concern',
          noteTemplate: 'Hi {studentName}',
          visibleToParent: false,
        },
      },
    ]);
    expect(rules).toHaveLength(1);
    expect(rules[0]?.windowHours).toBe(48);
    expect(rules[0]?.trigger.minPoints).toBe(10);
  });

  it('rejects invalid triggers', () => {
    expect(normalizeClassroomAlertRules([{ trigger: { type: 'nope' } }])).toHaveLength(0);
  });

  it('formats templates and summaries', () => {
    const rule = createDefaultClassroomAlertRule();
    const summary = triggerSummaryForRule(rule, { pointsTotal: 30 });
    expect(summary).toContain('30');
    const note = formatAlertNoteTemplate('Hello {studentName} — {summary}', {
      studentName: 'Alex',
      summary,
      windowHours: 24,
    });
    expect(note).toContain('Alex');
    expect(note).toContain('30');
  });

  it('maps events to trigger types', () => {
    const rule = createDefaultClassroomAlertRule();
    expect(ruleAppliesToEvent(rule.trigger, 'award')).toBe(true);
    expect(ruleAppliesToEvent(rule.trigger, 'note')).toBe(false);
    const noteRule = normalizeClassroomAlertRules([
      {
        ...createDefaultClassroomAlertRule(),
        trigger: { type: 'behavior_note_count', minCount: 2, noteKind: 'concern' },
      },
    ])[0]!;
    expect(ruleAppliesToEvent(noteRule.trigger, 'note')).toBe(true);
    expect(ruleAppliesToEvent(noteRule.trigger, 'award')).toBe(false);
  });
});
