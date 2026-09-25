'use client';

import React from 'react';
import { ContentSectionTreeNav } from '@/components/ui/content-section-tree-nav';
import { RecessAttendanceSection } from '@/components/recess/RecessAttendanceSection';
import { AttendanceTodayBoard } from '@/components/attendance/AttendanceTodayBoard';
import { AttendanceScheduleManager } from '@/components/attendance/AttendanceScheduleManager';
import { AttendanceRulesSection } from '@/components/attendance/AttendanceRulesSection';
import { AttendanceHistorySection } from '@/components/attendance/AttendanceHistorySection';
import { AttendanceClockBar } from '@/components/attendance/AttendanceClockBar';

export const ATTENDANCE_SECTIONS = [
  { id: 'today', label: "Today's Board" },
  { id: 'periods', label: 'Bell Schedule' },
  { id: 'rules', label: 'Points & Rules' },
  { id: 'recess', label: 'Room Passes' },
  { id: 'history', label: 'History & Reports' },
] as const;
export type AttendanceSectionId = (typeof ATTENDANCE_SECTIONS)[number]['id'];

export function isAttendanceSectionId(v: string | null | undefined): v is AttendanceSectionId {
  return ATTENDANCE_SECTIONS.some((s) => s.id === v);
}

/**
 * The attendance workspace body: live clock + period, section picker, and the chosen section.
 * Props are the admin attendance state from `useAdminAttendance` plus the school's lists.
 */
export function AttendanceSections(props: any & { section: AttendanceSectionId; onSectionChange: (id: AttendanceSectionId) => void }) {
  const {
    section,
    onSectionChange,
    schoolId,
    students = [],
    teachers = [],
    selectedAttendanceTeacherId,
    setSelectedAttendanceTeacherId,
    teacherAttendanceConfig,
    teacherAttendanceRewardsLoading,
    teacherAttendanceRewards,
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
    settings,
    updateSettings,
  } = props;

  return (
    <div className="space-y-6">
      {schoolId && (
        <AttendanceClockBar
          schoolId={schoolId}
          periods={attendancePeriods}
          timeZone={attendanceConfig ? attendanceConfig.attendanceTimeZone ?? null : undefined}
        />
      )}

      <ContentSectionTreeNav
        items={ATTENDANCE_SECTIONS.map((s) => ({ id: s.id, label: s.label }))}
        value={section}
        onValueChange={(id) => onSectionChange(id as AttendanceSectionId)}
        className="mb-2"
      />

      {section === 'today' && (
        <div className="animate-in fade-in-50 duration-200">
          <AttendanceTodayBoard
            schoolId={schoolId}
            students={students}
            classes={classes}
            teachers={teachers}
            periods={attendancePeriods}
            attendanceConfig={attendanceConfig}
            variant="admin"
            hidePeriodInfo
          />
        </div>
      )}

      {section === 'periods' && schoolId && (
        <div className="animate-in fade-in-50 duration-200">
          <AttendanceScheduleManager schoolId={schoolId} />
        </div>
      )}

      {section === 'rules' && (
        <div className="animate-in fade-in-50 duration-200">
          <AttendanceRulesSection
            schoolId={schoolId}
            teachers={teachers}
            selectedAttendanceTeacherId={selectedAttendanceTeacherId}
            setSelectedAttendanceTeacherId={setSelectedAttendanceTeacherId}
            teacherAttendanceConfig={teacherAttendanceConfig}
            teacherAttendanceRewardsLoading={teacherAttendanceRewardsLoading}
            teacherAttendanceRewards={teacherAttendanceRewards}
            ruleDrafts={ruleDrafts}
            setRuleDrafts={setRuleDrafts}
            savingRuleId={savingRuleId}
            saveTeacherRewardRule={saveTeacherRewardRule}
            deleteTeacherRewardRule={deleteTeacherRewardRule}
            classes={classes}
            attendancePeriodsLoading={attendancePeriodsLoading}
            attendancePeriods={attendancePeriods}
            categories={categories}
            handleSaveTeacherAttendanceConfig={handleSaveTeacherAttendanceConfig}
            teacherAttendanceSaving={teacherAttendanceSaving}
            setTeacherAttendanceConfigState={setTeacherAttendanceConfigState}
            attendanceConfig={attendanceConfig}
            setAttendanceConfigState={setAttendanceConfigState}
            attendanceConfigSaving={attendanceConfigSaving}
            handleSaveAttendanceConfig={handleSaveAttendanceConfig}
            getAttendanceConfig={getAttendanceConfig}
            setAttendanceConfig={setAttendanceConfig}
            settings={settings}
            updateSettings={updateSettings}
          />
        </div>
      )}

      {section === 'recess' && schoolId && (
        <div className="animate-in fade-in-50 duration-200">
          <RecessAttendanceSection schoolId={schoolId} variant="admin" />
        </div>
      )}

      {section === 'history' && schoolId && (
        <div className="animate-in fade-in-50 duration-200">
          <AttendanceHistorySection schoolId={schoolId} students={students} classes={classes} teachers={teachers} />
        </div>
      )}
    </div>
  );
}
