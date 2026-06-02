'use client';

import { BellRing, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Settings } from '@/components/providers/SettingsProvider';
import {
  MAX_ALERT_WINDOW_HOURS,
  MAX_CLASSROOM_ALERT_RULES,
  MIN_ALERT_WINDOW_HOURS,
  createDefaultClassroomAlertRule,
  normalizeClassroomAlertRules,
  newClassroomAlertRuleId,
  type ClassroomAlertRule,
  type ClassroomAlertRuleTrigger,
  type ClassroomAlertTriggerType,
} from '@/lib/classroom/classroomAlertRulesSettings';
import type { BehaviorNoteKind } from '@/lib/types';

type ClassroomAlertRulesSectionProps = {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  disabled?: boolean;
};

const TRIGGER_LABELS: Record<ClassroomAlertTriggerType, string> = {
  classroom_points_total: 'Total classroom points',
  classroom_award_count: 'Number of classroom awards',
  behavior_note_count: 'Number of behavior notes',
};

const NOTE_KIND_OPTIONS: { value: BehaviorNoteKind | 'any'; label: string }[] = [
  { value: 'any', label: 'Any kind' },
  { value: 'positive', label: 'Positive' },
  { value: 'concern', label: 'Concern' },
  { value: 'incident', label: 'Incident' },
];

const ACTION_KIND_OPTIONS: { value: BehaviorNoteKind; label: string }[] = [
  { value: 'concern', label: 'Concern (staff + principal)' },
  { value: 'positive', label: 'Positive' },
  { value: 'incident', label: 'Incident' },
];

function patchTrigger(
  trigger: ClassroomAlertRuleTrigger,
  patch: Partial<ClassroomAlertRuleTrigger>,
): ClassroomAlertRuleTrigger {
  if (patch.type && patch.type !== trigger.type) {
    if (patch.type === 'classroom_points_total') {
      return { type: 'classroom_points_total', minPoints: 25 };
    }
    if (patch.type === 'classroom_award_count') {
      return { type: 'classroom_award_count', minCount: 5 };
    }
    return { type: 'behavior_note_count', minCount: 3, noteKind: 'concern' };
  }
  return { ...trigger, ...patch } as ClassroomAlertRuleTrigger;
}

export function ClassroomAlertRulesSection({
  settings,
  updateSettings,
  disabled = false,
}: ClassroomAlertRulesSectionProps) {
  const rules = normalizeClassroomAlertRules(settings.classroomAlertRules);

  const setRules = (next: ClassroomAlertRule[]) => {
    updateSettings({ classroomAlertRules: next });
  };

  const patchRule = (index: number, patch: Partial<ClassroomAlertRule>) => {
    setRules(
      rules.map((r, i) => {
        if (i !== index) return r;
        const merged = { ...r, ...patch };
        if (patch.trigger) {
          merged.trigger = patchTrigger(r.trigger, patch.trigger);
        }
        if (patch.action) {
          merged.action = { ...r.action, ...patch.action };
        }
        return merged;
      }),
    );
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const addRule = () => {
    if (rules.length >= MAX_CLASSROOM_ALERT_RULES) return;
    setRules([...rules, createDefaultClassroomAlertRule()]);
  };

  const duplicateRule = (index: number) => {
    if (rules.length >= MAX_CLASSROOM_ALERT_RULES) return;
    const source = rules[index];
    if (!source) return;
    setRules([
      ...rules,
      {
        ...source,
        id: newClassroomAlertRuleId(),
        name: `${source.name} (copy)`,
      },
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
        <div className="mb-3 flex items-start gap-2">
          <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" aria-hidden />
          <div>
            <p className="text-sm font-bold">If / then alerts</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              When a student hits a threshold in a time window, the system can auto-create a behavior
              note for principals and families (based on note kind and parent visibility). Rules run
              when classroom awards or notes are saved.
            </p>
          </div>
        </div>

        {rules.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No rules yet. Add one to flag repeated awards or behavior patterns.
          </p>
        ) : (
          <ul className="space-y-4">
            {rules.map((rule, index) => (
              <li
                key={rule.id}
                className="rounded-xl border border-border/50 bg-background/80 p-3 shadow-sm"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Input
                    className="h-9 min-w-[10rem] flex-1 rounded-xl font-semibold"
                    value={rule.name}
                    disabled={disabled}
                    onChange={(e) => patchRule(index, { name: e.target.value })}
                    aria-label="Rule name"
                  />
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`alert-enabled-${rule.id}`}
                      checked={rule.enabled}
                      disabled={disabled}
                      onCheckedChange={(v) => patchRule(index, { enabled: v })}
                    />
                    <Label htmlFor={`alert-enabled-${rule.id}`} className="text-xs font-semibold">
                      On
                    </Label>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-destructive"
                    disabled={disabled}
                    onClick={() => removeRule(index)}
                    aria-label="Delete rule"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">When (trigger)</Label>
                    <Select
                      value={rule.trigger.type}
                      disabled={disabled}
                      onValueChange={(v) =>
                        patchRule(index, {
                          trigger: patchTrigger(rule.trigger, {
                            type: v as ClassroomAlertTriggerType,
                          }),
                        })
                      }
                    >
                      <SelectTrigger className="h-9 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(TRIGGER_LABELS) as ClassroomAlertTriggerType[]).map((t) => (
                          <SelectItem key={t} value={t}>
                            {TRIGGER_LABELS[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Threshold</Label>
                    {rule.trigger.type === 'classroom_points_total' ? (
                      <Input
                        type="number"
                        min={1}
                        className="h-9 rounded-xl"
                        disabled={disabled}
                        value={rule.trigger.minPoints ?? 25}
                        onChange={(e) =>
                          patchRule(index, {
                            trigger: {
                              ...rule.trigger,
                              minPoints: Math.max(1, parseInt(e.target.value, 10) || 1),
                            },
                          })
                        }
                      />
                    ) : (
                      <Input
                        type="number"
                        min={1}
                        className="h-9 rounded-xl"
                        disabled={disabled}
                        value={rule.trigger.minCount ?? 1}
                        onChange={(e) =>
                          patchRule(index, {
                            trigger: {
                              ...rule.trigger,
                              minCount: Math.max(1, parseInt(e.target.value, 10) || 1),
                            },
                          })
                        }
                      />
                    )}
                  </div>

                  {rule.trigger.type === 'behavior_note_count' ? (
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs font-semibold">Note kind</Label>
                      <Select
                        value={rule.trigger.noteKind ?? 'any'}
                        disabled={disabled}
                        onValueChange={(v) =>
                          patchRule(index, {
                            trigger: {
                              ...rule.trigger,
                              noteKind: v as BehaviorNoteKind | 'any',
                            },
                          })
                        }
                      >
                        <SelectTrigger className="h-9 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {NOTE_KIND_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Time window (hours)</Label>
                    <Input
                      type="number"
                      min={MIN_ALERT_WINDOW_HOURS}
                      max={MAX_ALERT_WINDOW_HOURS}
                      className="h-9 rounded-xl"
                      disabled={disabled}
                      value={rule.windowHours}
                      onChange={(e) =>
                        patchRule(index, {
                          windowHours: Math.max(
                            MIN_ALERT_WINDOW_HOURS,
                            Math.min(
                              MAX_ALERT_WINDOW_HOURS,
                              parseInt(e.target.value, 10) || MIN_ALERT_WINDOW_HOURS,
                            ),
                          ),
                        })
                      }
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Then — note kind</Label>
                    <Select
                      value={rule.action.noteKind}
                      disabled={disabled}
                      onValueChange={(v) =>
                        patchRule(index, {
                          action: { ...rule.action, noteKind: v as BehaviorNoteKind },
                        })
                      }
                    >
                      <SelectTrigger className="h-9 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTION_KIND_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2 sm:col-span-2">
                    <Switch
                      id={`alert-parent-${rule.id}`}
                      checked={rule.action.visibleToParent}
                      disabled={disabled}
                      onCheckedChange={(v) =>
                        patchRule(index, { action: { ...rule.action, visibleToParent: v } })
                      }
                    />
                    <Label htmlFor={`alert-parent-${rule.id}`} className="text-xs">
                      Visible on parent portal (when parent portal is on)
                    </Label>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold">Auto-note message</Label>
                    <Textarea
                      className="min-h-[72px] rounded-xl text-sm"
                      disabled={disabled}
                      value={rule.action.noteTemplate}
                      onChange={(e) =>
                        patchRule(index, {
                          action: { ...rule.action, noteTemplate: e.target.value },
                        })
                      }
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Placeholders: {'{studentName}'}, {'{summary}'}, {'{windowHours}'}
                    </p>
                  </div>
                </div>

                <div className="mt-2 flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-xs"
                    disabled={disabled || rules.length >= MAX_CLASSROOM_ALERT_RULES}
                    onClick={() => duplicateRule(index)}
                  >
                    Duplicate
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap gap-2 border-t border-border/40 pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            disabled={disabled || rules.length >= MAX_CLASSROOM_ALERT_RULES}
            onClick={addRule}
          >
            <Plus className="mr-2 h-3.5 w-3.5" aria-hidden />
            Add rule
          </Button>
          {rules.length >= MAX_CLASSROOM_ALERT_RULES ? (
            <p className="self-center text-xs text-muted-foreground">
              Maximum {MAX_CLASSROOM_ALERT_RULES} rules per school.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
