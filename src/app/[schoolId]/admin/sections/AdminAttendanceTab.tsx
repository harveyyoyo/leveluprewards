'use client';

import React from 'react';
import { Clock, Globe, History, Loader2, Trash2, Users, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { AttendanceRewardRule } from '@/lib/types';
import { AttendanceSetupWizard } from '@/components/attendance/AttendanceSetupWizard';
import { AttendanceTimeZoneField } from '@/components/attendance/AttendanceTimeZoneField';

export function AdminAttendanceTab(props: any) {
  const {
    schoolId,
    teachers,
    selectedAttendanceTeacherId,
    setSelectedAttendanceTeacherId,
    loadTeacherAttendanceLog,
    teacherAttendanceLogLoading,
    teacherAttendanceConfig,
    teacherAttendanceRewardsLoading,
    teacherAttendanceRewards,
    ruleDrafts,
    setRuleDrafts,
    savingRuleId,
    saveTeacherRewardRule,
    deleteTeacherRewardRule,
    classes,
    attendancePeriodsLoading,
    attendancePeriods,
    categories,
    handleSaveTeacherAttendanceConfig,
    teacherAttendanceSaving,
    teacherAttendanceLog,
    studentActivityLog,
    studentActivityLogLoading,
    loadStudentActivityLog,
    setTeacherAttendanceConfigState,
    UniversalPeriodsAdmin,
    attendanceConfig,
    setAttendanceConfigState,
    attendanceConfigSaving,
    handleSaveAttendanceConfig,
    getAttendanceConfig,
    setAttendanceConfig,
  } = props;

  const dayOptions = [
    { key: 'all', label: 'All days' },
    { key: 'mon', label: 'Monday' },
    { key: 'tue', label: 'Tuesday' },
    { key: 'wed', label: 'Wednesday' },
    { key: 'thu', label: 'Thursday' },
    { key: 'fri', label: 'Friday' },
    { key: 'sat', label: 'Saturday' },
    { key: 'sun', label: 'Sunday' },
  ] as const;

  const [selectedDayKey, setSelectedDayKey] = React.useState<string>(() => {
    const map = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    return map[new Date().getDay()] ?? 'mon';
  });

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

    // Store "__none__" so the day/class explicitly overrides legacy mappings.
    nextDayMap[classId] = !slotId || slotId === '__none__' ? '__none__' : slotId;
    nextByDay[selectedDayKey] = nextDayMap;

    setTeacherAttendanceConfigState({
      ...teacherAttendanceConfig,
      classPeriodAssignmentsByDay: Object.keys(nextByDay).length ? nextByDay : undefined,
    });
  };

  const formatHHmmToAmPm = (hhmm: string): string => {
    const s = (hhmm || '').trim();
    const m = s.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return s;
    let h = Number(m[1]);
    const mins = m[2];
    if (Number.isNaN(h)) return s;
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${mins} ${ap}`;
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-muted/30 px-4 py-3">
        <div className="max-w-prose">
          <p className="text-sm font-bold">Preferred setup: periods, primary teacher, teacher reward rule.</p>
          <p className="text-sm text-muted-foreground">
            Use legacy assignments only for older setups. New attendance rewards should live in each teacher&apos;s rules.
          </p>
        </div>
        <AttendanceSetupWizard variant="admin" />
      </div>
      <Card className="border-t-4 border-primary/60 shadow-md">
        <CardHeader className="py-6">
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" /> Default School-wide Points
          </CardTitle>
          <CardDescription>
            These values are used as a fallback if no specific teacher reward rules or class assignments exist.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="school-points-signin">Default Sign-in Points</Label>
              <Input
                id="school-points-signin"
                type="number"
                min={0}
                value={attendanceConfig?.pointsForSignIn ?? 1}
                onChange={(e) => setAttendanceConfigState({
                  ...(attendanceConfig || {}),
                  pointsForSignIn: parseInt(e.target.value, 10) || 0
                })}
              />
              <p className="text-xs text-muted-foreground">Standard points for showing up.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-points-ontime">Default On-time Bonus</Label>
              <Input
                id="school-points-ontime"
                type="number"
                min={0}
                value={attendanceConfig?.pointsForOnTime ?? 5}
                onChange={(e) => setAttendanceConfigState({
                  ...(attendanceConfig || {}),
                  pointsForOnTime: parseInt(e.target.value, 10) || 0
                })}
              />
              <p className="text-xs text-muted-foreground">Extra points for arriving early.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-ontime-window">On-time Window (min)</Label>
              <Input
                id="school-ontime-window"
                type="number"
                min={1}
                value={attendanceConfig?.onTimeWindowMinutes ?? 5}
                onChange={(e) => setAttendanceConfigState({
                  ...(attendanceConfig || {}),
                  onTimeWindowMinutes: parseInt(e.target.value, 10) || 1
                })}
              />
              <p className="text-xs text-muted-foreground">Minutes after start to count as on-time.</p>
            </div>
          </div>
          <div className="pt-2 border-t">
            <AttendanceTimeZoneField
              schoolId={schoolId}
              getAttendanceConfig={getAttendanceConfig}
              setAttendanceConfig={setAttendanceConfig}
            />
          </div>
          <Button 
            onClick={handleSaveAttendanceConfig} 
            disabled={attendanceConfigSaving}
            className="w-full md:w-auto"
          >
            {attendanceConfigSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save School Defaults
          </Button>
        </CardContent>
      </Card>

      <Card className="border-t-4 border-primary/60 shadow-md">
        <CardHeader className="py-6">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" /> Universal Periods
          </CardTitle>
          <CardDescription>Create and manage period time slots used by all teachers for on-time attendance.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <UniversalPeriodsAdmin schoolId={schoolId!} />
        </CardContent>
      </Card>

      <Card className="border-t-4 border-primary/60 shadow-md">
        <CardHeader className="py-6">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Teacher Attendance (per-teacher)
          </CardTitle>
          <CardDescription>
            View what each teacher created and edit attendance settings on their behalf. Teachers assign periods to their classes in Teacher Portal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label>Teacher</Label>
              <Select value={selectedAttendanceTeacherId || '__none__'} onValueChange={setSelectedAttendanceTeacherId}>
                <SelectTrigger className="w-[260px]">
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers?.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={loadTeacherAttendanceLog} disabled={teacherAttendanceLogLoading || !selectedAttendanceTeacherId}>
              {teacherAttendanceLogLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Refresh teacher log
            </Button>
          </div>

          {teacherAttendanceConfig && (
            <div className="space-y-6">
              <Card className="border-t-4 border-chart-2/70 shadow-sm">
                <CardHeader className="py-5">
                  <CardTitle className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-chart-2" /> In class now
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadTeacherAttendanceLog}
                      disabled={teacherAttendanceLogLoading || !selectedAttendanceTeacherId}
                    >
                      {teacherAttendanceLogLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                      Refresh
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    Students who signed in during the current universal period window for the selected teacher.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const slots = (attendancePeriods || []).slice();
                    const parse = (hhmm: string) => {
                      const m = String(hhmm || '').trim().match(/^(\d{1,2}):(\d{2})$/);
                      if (!m) return null;
                      const h = Number(m[1]);
                      const mm = Number(m[2]);
                      if (!Number.isFinite(h) || !Number.isFinite(mm)) return null;
                      return h * 60 + mm;
                    };
                    const now = new Date();
                    const nowMin = now.getHours() * 60 + now.getMinutes();
                    const active = slots.find((s: any) => {
                      const start = parse(s.startTime);
                      const end = parse(s.endTime);
                      if (start == null || end == null) return false;
                      return nowMin >= start && nowMin <= end;
                    });

                    if (!active) {
                      return (
                        <p className="text-sm text-muted-foreground">
                          No active period right now. When a period is active, sign-ins for that period will show here.
                        </p>
                      );
                    }

                    const startMs = (() => {
                      const startMin = parse(active.startTime) ?? 0;
                      const d = new Date(now);
                      d.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
                      return d.getTime();
                    })();
                    const endMs = (() => {
                      const endMin = parse(active.endTime) ?? 0;
                      const d = new Date(now);
                      d.setHours(Math.floor(endMin / 60), endMin % 60, 59, 999);
                      return d.getTime();
                    })();

                    const inClass = (teacherAttendanceLog || [])
                      .filter((e: any) => (e.signedInAt ?? 0) >= startMs && (e.signedInAt ?? 0) <= endMs)
                      .filter((e: any) => String(e.periodLabel || '').trim() === String(active.label || '').trim())
                      .slice()
                      .sort((a: any, b: any) => (b.signedInAt ?? 0) - (a.signedInAt ?? 0));

                    return (
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-bold">
                            Active: {active.label}{' '}
                            <span className="text-xs text-muted-foreground font-medium">
                              ({formatHHmmToAmPm(active.startTime)}–{formatHHmmToAmPm(active.endTime)})
                            </span>
                          </p>
                          <Badge variant="outline" className="font-black">
                            {inClass.length} present
                          </Badge>
                        </div>
                        {inClass.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No sign-ins recorded yet for this period.</p>
                        ) : (
                          <ScrollArea className="h-[220px] w-full pr-3">
                            <ul className="space-y-2">
                              {inClass.map((e: any) => (
                                <li
                                  key={e.id ?? `${e.studentId}_${e.signedInAt}`}
                                  className="flex items-center justify-between gap-3 rounded-xl border bg-muted/20 px-3 py-2"
                                >
                                  <div className="min-w-0">
                                    <p className="font-bold truncate">{e.studentName || e.studentId}</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {new Date(e.signedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  </div>
                                  <div className="text-right shrink-0 text-sm">
                                    <span className="text-muted-foreground">+{e.pointsAwarded}</span>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </ScrollArea>
                        )}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              <div className="space-y-2 rounded-2xl border-2 border-primary/30 bg-primary/[0.03] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Label className="text-sm font-bold">
                    Active reward rules for this teacher
                  </Label>
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-primary"
                    title="Per-class reward rules are the newer, more flexible way to configure attendance points."
                  >
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  These rules are the main attendance setup: class, period, points, and on-time bonus. Sign-ins only earn from a rule while its period is active.
                </p>
                {teacherAttendanceRewardsLoading ? (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading reward rules…
                  </p>
                ) : (teacherAttendanceRewards || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No reward rules found for this teacher yet.</p>
                ) : (
                  <div className="space-y-2">
                    {(teacherAttendanceRewards || []).map((rule: any) => {
                      const draft = ruleDrafts[rule.id] ?? {};
                      const effective: AttendanceRewardRule = { ...rule, ...draft };
                      const hasUnsaved = !!ruleDrafts[rule.id];

                      const className = (classes || []).find((c: any) => c.id === effective.classId)?.name ?? 'Unknown class';
                      const periodLabel =
                        effective.periodId
                          ? (attendancePeriods || []).find((p: any) => p.id === effective.periodId)?.label ?? 'Unknown period'
                          : effective.customPeriod?.label
                            ? effective.customPeriod.label
                            : 'From class assignment';

                      return (
                        <div key={rule.id} className="rounded-2xl border bg-muted/30 p-3 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="min-w-[260px]">
                              <p className="font-bold">{className}</p>
                              <p className="text-xs text-muted-foreground">Period: {periodLabel}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <Label className="text-xs">Enabled</Label>
                                <Switch
                                  checked={!!effective.enabled}
                                  onCheckedChange={(checked) => {
                                    setRuleDrafts((prev: any) => ({
                                      ...prev,
                                      [rule.id]: { ...(prev[rule.id] ?? {}), enabled: checked },
                                    }));
                                  }}
                                />
                              </div>
                              <Button size="sm" onClick={() => saveTeacherRewardRule(rule.id)} disabled={!hasUnsaved || savingRuleId === rule.id}>
                                {savingRuleId === rule.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:bg-destructive/10"
                                onClick={() => deleteTeacherRewardRule(rule.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
                            <div className="lg:col-span-2 space-y-1">
                              <Label className="text-xs">Class</Label>
                              <Select
                                value={effective.classId}
                                onValueChange={(v) =>
                                  setRuleDrafts((prev: any) => ({
                                    ...prev,
                                    [rule.id]: { ...(prev[rule.id] ?? {}), classId: v },
                                  }))
                                }
                              >
                                <SelectTrigger className="h-10 rounded-xl">
                                  <SelectValue placeholder="Select class" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(classes || []).map((c: any) => (
                                    <SelectItem key={c.id} value={c.id}>
                                      {c.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs">Sign-in points</Label>
                              <Input
                                type="number"
                                min={0}
                                value={effective.pointsForSignIn}
                                onChange={(e) =>
                                  setRuleDrafts((prev: any) => ({
                                    ...prev,
                                    [rule.id]: { ...(prev[rule.id] ?? {}), pointsForSignIn: parseInt(e.target.value, 10) || 0 },
                                  }))
                                }
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs">On-time bonus</Label>
                              <Input
                                type="number"
                                min={0}
                                value={effective.pointsForOnTime}
                                onChange={(e) =>
                                  setRuleDrafts((prev: any) => ({
                                    ...prev,
                                    [rule.id]: { ...(prev[rule.id] ?? {}), pointsForOnTime: parseInt(e.target.value, 10) || 0 },
                                  }))
                                }
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs">Window (min)</Label>
                              <Input
                                type="number"
                                min={1}
                                max={120}
                                value={effective.onTimeWindowMinutes}
                                onChange={(e) =>
                                  setRuleDrafts((prev: any) => ({
                                    ...prev,
                                    [rule.id]: { ...(prev[rule.id] ?? {}), onTimeWindowMinutes: parseInt(e.target.value, 10) || 3 },
                                  }))
                                }
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs">Category</Label>
                              <Select
                                value={effective.categoryId || '__none__'}
                                onValueChange={(v) =>
                                  setRuleDrafts((prev: any) => ({
                                    ...prev,
                                    [rule.id]: { ...(prev[rule.id] ?? {}), categoryId: v === '__none__' ? undefined : v },
                                  }))
                                }
                              >
                                <SelectTrigger className="h-10 rounded-xl">
                                  <SelectValue placeholder="None" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">None</SelectItem>
                                  {(categories || []).map((c: any) => (
                                    <SelectItem key={c.id} value={c.id}>
                                      {c.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Universal period override (optional)</Label>
                              <Select
                                value={effective.periodId || '__none__'}
                                onValueChange={(v) =>
                                  setRuleDrafts((prev: any) => ({
                                    ...prev,
                                    [rule.id]: { ...(prev[rule.id] ?? {}), periodId: v === '__none__' ? undefined : v, customPeriod: undefined },
                                  }))
                                }
                                disabled={attendancePeriodsLoading || (attendancePeriods || []).length === 0}
                              >
                                <SelectTrigger className="h-10 rounded-xl">
                                  <SelectValue placeholder="From class assignment" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">From class assignment</SelectItem>
                                  {(attendancePeriods || []).map((p: any) => (
                                    <SelectItem key={p.id} value={p.id}>
                                      {p.label} ({p.startTime}–{p.endTime})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs">Custom period (optional)</Label>
                              <div className="grid grid-cols-3 gap-2">
                                <Input
                                  value={effective.customPeriod?.label ?? ''}
                                  placeholder="Label"
                                  onChange={(e) => {
                                    const nextLabel = e.target.value;
                                    setRuleDrafts((prev: any) => ({
                                      ...prev,
                                      [rule.id]: {
                                        ...(prev[rule.id] ?? {}),
                                        customPeriod: nextLabel
                                          ? {
                                              label: nextLabel,
                                              startTime: effective.customPeriod?.startTime ?? '08:00',
                                              endTime: effective.customPeriod?.endTime ?? '08:45',
                                            }
                                          : undefined,
                                        periodId: undefined,
                                      },
                                    }));
                                  }}
                                />
                                <Input
                                  value={effective.customPeriod?.startTime ?? ''}
                                  placeholder="Start"
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setRuleDrafts((prev: any) => ({
                                      ...prev,
                                      [rule.id]: {
                                        ...(prev[rule.id] ?? {}),
                                        customPeriod: effective.customPeriod
                                          ? { ...effective.customPeriod, startTime: v }
                                          : v
                                            ? { label: 'Custom', startTime: v, endTime: '08:45' }
                                            : undefined,
                                        periodId: undefined,
                                      },
                                    }));
                                  }}
                                />
                                <Input
                                  value={effective.customPeriod?.endTime ?? ''}
                                  placeholder="End"
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setRuleDrafts((prev: any) => ({
                                      ...prev,
                                      [rule.id]: {
                                        ...(prev[rule.id] ?? {}),
                                        customPeriod: effective.customPeriod
                                          ? { ...effective.customPeriod, endTime: v }
                                          : v
                                            ? { label: 'Custom', startTime: '08:00', endTime: v }
                                            : undefined,
                                        periodId: undefined,
                                      },
                                    }));
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-2 rounded-2xl border border-dashed border-border bg-muted/20 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Label className="text-sm font-bold">Class → Universal period assignments</Label>
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                    title="Legacy fallback: used when a class has no matching reward rule for the current time."
                  >
                    Legacy fallback
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Only used when a sign-in doesn&rsquo;t hit a reward rule above. Prefer reward rules whenever possible.
                </p>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-end gap-3 pt-1">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Day</Label>
                      <Select value={selectedDayKey} onValueChange={setSelectedDayKey}>
                        <SelectTrigger className="h-10 w-[190px] rounded-xl">
                          <SelectValue placeholder="Select day..." />
                        </SelectTrigger>
                        <SelectContent>
                          {dayOptions.map((d) => (
                            <SelectItem key={d.key} value={d.key}>
                              {d.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {((classes || []).filter((c: any) => c.primaryTeacherId === selectedAttendanceTeacherId)).length === 0 ? (
                    <p className="text-sm text-muted-foreground">This teacher has no classes yet. Assign classes in the `Classes` tab.</p>
                  ) : (
                    (classes || [])
                      .filter((c: any) => c.primaryTeacherId === selectedAttendanceTeacherId)
                      .map((c: any) => {
                        const assignedPeriodId = getAssignedSlotId(c.id);
                        return (
                          <div key={c.id} className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-muted/50">
                            <div className="min-w-[200px]">
                              <p className="font-bold">{c.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {assignedPeriodId && assignedPeriodId !== '__none__'
                                  ? (attendancePeriods || []).find((p: any) => p.id === assignedPeriodId)?.label || 'Unknown period'
                                  : 'No period assigned'}
                              </p>
                            </div>
                            <Select
                              value={assignedPeriodId || '__none__'}
                              onValueChange={(v) => {
                                setAssignedSlotIdForDay(c.id, v);
                              }}
                              disabled={attendancePeriodsLoading || (attendancePeriods || []).length === 0}
                            >
                              <SelectTrigger className="h-10 w-[260px] rounded-xl">
                                <SelectValue placeholder="Select a period..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">No period</SelectItem>
                                {(attendancePeriods || []).map((p: any) => (
                                  <SelectItem key={p.id} value={p.id}>
                                      {p.label} ({formatHHmmToAmPm(p.startTime)}–{formatHHmmToAmPm(p.endTime)})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              <Button onClick={handleSaveTeacherAttendanceConfig} disabled={teacherAttendanceSaving}>
                {teacherAttendanceSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save class period assignments
              </Button>

              {teacherAttendanceLog.length > 0 && (
                <div className="space-y-2">
                  <Label>Recent sign-ins (teacher)</Label>
                  <ScrollArea className="h-[240px] w-full pr-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="py-2 font-bold">Student</th>
                          <th className="py-2 font-bold">Time</th>
                          <th className="py-2 font-bold">Points</th>
                          <th className="py-2 font-bold">Period</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teacherAttendanceLog.map((entry: any) => (
                          <tr key={entry.id ?? entry.signedInAt} className="border-b border-border/50">
                            <td className="py-2">{entry.studentName || entry.studentId}</td>
                            <td className="py-2 text-muted-foreground">{new Date(entry.signedInAt).toLocaleString()}</td>
                            <td className="py-2">+{entry.pointsAwarded}</td>
                            <td className="py-2 text-muted-foreground">{entry.periodLabel ?? '–'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-t-4 border-primary/60 shadow-md">
        <CardHeader className="py-6">
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" /> Student activity log (admin)
          </CardTitle>
          <CardDescription>
            Recent student actions across the school, including attendance sign-ins and point activity.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Label className="text-sm text-muted-foreground">Latest 300 actions</Label>
            <Button variant="outline" size="sm" onClick={loadStudentActivityLog} disabled={studentActivityLogLoading}>
              {studentActivityLogLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Refresh activity log
            </Button>
          </div>
          <ScrollArea className="h-[320px] w-full pr-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 font-bold">Student</th>
                  <th className="py-2 font-bold">Time</th>
                  <th className="py-2 font-bold">Action</th>
                  <th className="py-2 font-bold">Points</th>
                </tr>
              </thead>
              <tbody>
                {(studentActivityLog || []).map((entry: any) => (
                  <tr key={entry.id} className="border-b border-border/50">
                    <td className="py-2">{entry.studentName || entry.studentId}</td>
                    <td className="py-2 text-muted-foreground">{new Date(entry.date).toLocaleString()}</td>
                    <td className="py-2">{entry.desc || 'Activity'}</td>
                    <td className="py-2 text-muted-foreground">{entry.amount > 0 ? `+${entry.amount}` : entry.amount}</td>
                  </tr>
                ))}
                {(!studentActivityLog || studentActivityLog.length === 0) && !studentActivityLogLoading && (
                  <tr>
                    <td className="py-4 text-muted-foreground" colSpan={4}>
                      No activity found yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>
    </>
  );
}

