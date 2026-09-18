'use client';

import React, { useState } from 'react';
import {
  Clock,
  Loader2,
  Save,
  Trash2,
  Users,
  Zap,
  Sliders,
} from 'lucide-react';
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
import { AttendanceTimeZoneField } from '@/components/attendance/AttendanceTimeZoneField';
import type { AttendanceRewardRule, AttendanceScheduleSlot, AttendanceSettings, Category, Class, Teacher } from '@/lib/types';

export interface AttendanceRulesSectionProps {
  schoolId: string;
  teachers: Teacher[];
  selectedAttendanceTeacherId: string;
  setSelectedAttendanceTeacherId: (id: string) => void;
  teacherAttendanceConfig: AttendanceSettings | null;
  teacherAttendanceRewardsLoading: boolean;
  teacherAttendanceRewards: AttendanceRewardRule[];
  ruleDrafts: Record<string, Partial<AttendanceRewardRule>>;
  setRuleDrafts: React.Dispatch<React.SetStateAction<Record<string, Partial<AttendanceRewardRule>>>>;
  savingRuleId: string | null;
  saveTeacherRewardRule: (ruleId: string) => void;
  deleteTeacherRewardRule: (ruleId: string) => void;
  classes: Class[];
  attendancePeriodsLoading: boolean;
  attendancePeriods: AttendanceScheduleSlot[];
  categories: Category[];
  handleSaveTeacherAttendanceConfig: () => void;
  teacherAttendanceSaving: boolean;
  setTeacherAttendanceConfigState: React.Dispatch<React.SetStateAction<AttendanceSettings | null>>;
  attendanceConfig: AttendanceSettings | null;
  setAttendanceConfigState: React.Dispatch<React.SetStateAction<AttendanceSettings | null>>;
  attendanceConfigSaving: boolean;
  handleSaveAttendanceConfig: () => void;
  getAttendanceConfig?: () => Promise<AttendanceSettings | null>;
  setAttendanceConfig?: (s: AttendanceSettings) => Promise<void>;
}

export function AttendanceRulesSection(props: AttendanceRulesSectionProps) {
  const {
    schoolId,
    teachers = [],
    selectedAttendanceTeacherId,
    setSelectedAttendanceTeacherId,
    teacherAttendanceConfig,
    teacherAttendanceRewardsLoading,
    teacherAttendanceRewards = [],
    ruleDrafts,
    setRuleDrafts,
    savingRuleId,
    saveTeacherRewardRule,
    deleteTeacherRewardRule,
    classes = [],
    attendancePeriodsLoading,
    attendancePeriods = [],
    categories = [],
    handleSaveTeacherAttendanceConfig,
    teacherAttendanceSaving,
    setTeacherAttendanceConfigState,
    attendanceConfig,
    setAttendanceConfigState,
    attendanceConfigSaving,
    handleSaveAttendanceConfig,
    getAttendanceConfig,
    setAttendanceConfig,
  } = props;

  const [activeTab, setActiveTab] = useState<'defaults' | 'teacher'>('defaults');

  const dayOptions = [
    { key: 'all', label: 'All days' },
    { key: 'mon', label: 'Monday' },
    { key: 'tue', label: 'Tuesday' },
    { key: 'wed', label: 'Wednesday' },
    { key: 'thu', label: 'Thursday' },
    { key: 'fri', label: 'Friday' },
  ] as const;

  const [selectedDayKey, setSelectedDayKey] = useState<string>('all');

  const getAssignedSlotId = (classId: string): string => {
    const byDay = teacherAttendanceConfig?.classPeriodAssignmentsByDay;
    const dayMap = byDay?.[selectedDayKey];
    if (dayMap && Object.prototype.hasOwnProperty.call(dayMap, classId)) {
      return dayMap[classId] || '__none__';
    }
    if (selectedDayKey !== 'all') {
      const allMap = byDay?.['all'];
      if (allMap && Object.prototype.hasOwnProperty.call(allMap, classId)) {
        return allMap[classId] || '__none__';
      }
    }
    return teacherAttendanceConfig?.classPeriodAssignments?.[classId] || '__none__';
  };

  const setAssignedSlotIdForDay = (classId: string, slotId: string) => {
    if (!teacherAttendanceConfig) return;
    const nextByDay: Record<string, Record<string, string>> = {
      ...(teacherAttendanceConfig.classPeriodAssignmentsByDay || {}),
    };
    const nextDayMap: Record<string, string> = { ...(nextByDay[selectedDayKey] || {}) };
    nextDayMap[classId] = !slotId || slotId === '__none__' ? '__none__' : slotId;
    nextByDay[selectedDayKey] = nextDayMap;

    setTeacherAttendanceConfigState({
      ...teacherAttendanceConfig,
      classPeriodAssignmentsByDay: Object.keys(nextByDay).length ? nextByDay : undefined,
    });
  };

  const updateSchoolConfig = (patch: Partial<AttendanceSettings>) => {
    const base: AttendanceSettings = attendanceConfig ?? {
      pointsForSignIn: 1,
      pointsForOnTime: 5,
      onTimeWindowMinutes: 5,
      schedule: [],
    };
    setAttendanceConfigState({
      ...base,
      ...patch,
    });
  };

  return (
    <div className="space-y-6">
      {/* Sub-tab switcher */}
      <div className="flex items-center gap-2 border-b pb-3">
        <Button
          type="button"
          variant={activeTab === 'defaults' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('defaults')}
          className="rounded-xl font-bold gap-2"
        >
          <Zap className="w-4 h-4" /> School-Wide Defaults
        </Button>
        <Button
          type="button"
          variant={activeTab === 'teacher' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('teacher')}
          className="rounded-xl font-bold gap-2"
        >
          <Users className="w-4 h-4" /> Class-Specific Rules
        </Button>
      </div>

      {/* School Defaults Tab */}
      {activeTab === 'defaults' && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          <div className="rounded-2xl border bg-card p-5 space-y-4 shadow-sm">
            <div>
              <h4 className="font-black text-base flex items-center gap-2">
                <Zap className="w-4 h-4 text-ring" /> Standard Attendance Points
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                These points apply to all students whenever they check in at the kiosk or are marked present.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Base Sign-In Points</Label>
                <Input
                  type="number"
                  min={0}
                  value={attendanceConfig?.pointsForSignIn ?? 1}
                  onChange={(e) =>
                    updateSchoolConfig({
                      pointsForSignIn: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="rounded-xl font-black h-11"
                />
                <p className="text-[11px] text-muted-foreground">Points for showing up to school.</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">On-Time Bonus Points</Label>
                <Input
                  type="number"
                  min={0}
                  value={attendanceConfig?.pointsForOnTime ?? 5}
                  onChange={(e) =>
                    updateSchoolConfig({
                      pointsForOnTime: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="rounded-xl font-black h-11"
                />
                <p className="text-[11px] text-muted-foreground">Extra reward for arriving on time.</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">On-Time Window (Minutes)</Label>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={attendanceConfig?.onTimeWindowMinutes ?? 5}
                  onChange={(e) =>
                    updateSchoolConfig({
                      onTimeWindowMinutes: parseInt(e.target.value, 10) || 1,
                    })
                  }
                  className="rounded-xl font-black h-11"
                />
                <p className="text-[11px] text-muted-foreground">
                  Grace period after period start to count as on-time.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Points Category</Label>
                <Select
                  value={attendanceConfig?.categoryId || '__none__'}
                  onValueChange={(v) =>
                    updateSchoolConfig({
                      categoryId: v === '__none__' ? undefined : v,
                    })
                  }
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Tag attendance points with a category like &quot;Punctuality&quot;.
                </p>
              </div>

              {getAttendanceConfig && setAttendanceConfig && (
                <div className="space-y-1.5">
                  <AttendanceTimeZoneField
                    schoolId={schoolId}
                    getAttendanceConfig={getAttendanceConfig}
                    setAttendanceConfig={setAttendanceConfig}
                  />
                </div>
              )}
            </div>

            <div className="pt-3">
              <Button
                onClick={handleSaveAttendanceConfig}
                disabled={attendanceConfigSaving}
                className="rounded-xl font-bold gap-2"
              >
                {attendanceConfigSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save School Defaults
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Class-Specific Rules Tab */}
      {activeTab === 'teacher' && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          <div className="flex flex-wrap items-end gap-3 p-4 rounded-2xl border bg-muted/20">
            <div className="space-y-1.5 min-w-[240px]">
              <Label className="text-xs font-bold">Select Teacher to View Class Rules</Label>
              <Select
                value={selectedAttendanceTeacherId || '__none__'}
                onValueChange={setSelectedAttendanceTeacherId}
              >
                <SelectTrigger className="rounded-xl h-10 bg-background">
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {teacherAttendanceRewardsLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              Loading rules...
            </div>
          ) : teacherAttendanceRewards.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center space-y-2 bg-muted/10">
              <p className="font-bold text-sm">No special class rules for this teacher</p>
              <p className="text-xs text-muted-foreground">
                This teacher is using the standard school-wide points. Teachers can also create custom rules in their Teacher Portal.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {teacherAttendanceRewards.map((rule) => {
                const draft = ruleDrafts[rule.id] ?? {};
                const effective: AttendanceRewardRule = { ...rule, ...draft };
                const hasUnsaved = Boolean(ruleDrafts[rule.id]);
                const className = classes.find((c) => c.id === effective.classId)?.name || 'Unknown class';

                return (
                  <div key={rule.id} className="rounded-2xl border bg-card p-4 space-y-3 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                      <div>
                        <p className="font-black text-sm">{className}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Period:{' '}
                          <span className="font-semibold">
                            {effective.periodId
                              ? attendancePeriods.find((p) => p.id === effective.periodId)?.label || 'Linked Period'
                              : 'Automatic from class'}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-muted/40 px-3 py-1.5 rounded-xl border">
                          <Label className="text-xs font-semibold">Active</Label>
                          <Switch
                            checked={Boolean(effective.enabled)}
                            onCheckedChange={(checked) =>
                              setRuleDrafts((prev) => ({
                                ...prev,
                                [rule.id]: { ...(prev[rule.id] ?? {}), enabled: checked },
                              }))
                            }
                          />
                        </div>

                        <Button
                          size="sm"
                          className="rounded-xl font-bold"
                          onClick={() => saveTeacherRewardRule(rule.id)}
                          disabled={!hasUnsaved || savingRuleId === rule.id}
                        >
                          {savingRuleId === rule.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                          Save
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10 rounded-xl"
                          onClick={() => deleteTeacherRewardRule(rule.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Sign-In Points</Label>
                        <Input
                          type="number"
                          value={effective.pointsForSignIn}
                          onChange={(e) =>
                            setRuleDrafts((prev) => ({
                              ...prev,
                              [rule.id]: {
                                ...(prev[rule.id] ?? {}),
                                pointsForSignIn: parseInt(e.target.value, 10) || 0,
                              },
                            }))
                          }
                          className="rounded-xl h-9 font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">On-Time Bonus</Label>
                        <Input
                          type="number"
                          value={effective.pointsForOnTime}
                          onChange={(e) =>
                            setRuleDrafts((prev) => ({
                              ...prev,
                              [rule.id]: {
                                ...(prev[rule.id] ?? {}),
                                pointsForOnTime: parseInt(e.target.value, 10) || 0,
                              },
                            }))
                          }
                          className="rounded-xl h-9 font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Grace Window (min)</Label>
                        <Input
                          type="number"
                          value={effective.onTimeWindowMinutes ?? 5}
                          onChange={(e) =>
                            setRuleDrafts((prev) => ({
                              ...prev,
                              [rule.id]: {
                                ...(prev[rule.id] ?? {}),
                                onTimeWindowMinutes: parseInt(e.target.value, 10) || 1,
                              },
                            }))
                          }
                          className="rounded-xl h-9 font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Category</Label>
                        <Select
                          value={effective.categoryId || '__none__'}
                          onValueChange={(v) =>
                            setRuleDrafts((prev) => ({
                              ...prev,
                              [rule.id]: {
                                ...(prev[rule.id] ?? {}),
                                categoryId: v === '__none__' ? undefined : v,
                              },
                            }))
                          }
                        >
                          <SelectTrigger className="rounded-xl h-9">
                            <SelectValue placeholder="None" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">None</SelectItem>
                            {categories.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
