'use client';

import React from 'react';
import { ContentSectionTreeNav } from '@/components/ui/content-section-tree-nav';
import {
  StaffPortalSectionCard,
  StaffPortalSectionCardContent,
} from '@/components/staff/StaffPortalSection';
import { StaffPortalTabPanel } from '@/components/staff/StaffPortalTabHeader';
import { AttendanceSetupWizard } from '@/components/attendance/AttendanceSetupWizard';
import { AttendanceHeadcountPrintDialog } from '@/components/attendance/AttendanceHeadcountPrintDialog';
import { RecessAttendanceSection } from '@/components/recess/RecessAttendanceSection';
import { TabWalkthroughHeaderAction } from '@/components/tabWalkthrough/TabWalkthroughContext';
import { AttendanceTodayBoard } from '@/components/attendance/AttendanceTodayBoard';
import { AttendanceScheduleManager } from '@/components/attendance/AttendanceScheduleManager';
import { AttendanceRulesSection } from '@/components/attendance/AttendanceRulesSection';
import { AttendanceHistorySection } from '@/components/attendance/AttendanceHistorySection';

export function AdminAttendanceTab(props: any) {
  const {
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
    schoolName,
    settings,
    updateSettings,
  } = props;

  const [mainSection, setMainSection] = React.useState<'today' | 'periods' | 'rules' | 'recess' | 'history'>('today');

  return (
    <StaffPortalTabPanel
      tabValue="attendance"
      trailing={
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <TabWalkthroughHeaderAction />
          <AttendanceHeadcountPrintDialog
            schoolName={schoolName || 'School'}
            students={students || []}
            classes={classes || []}
          />
          <AttendanceSetupWizard variant="admin" />
        </div>
      }
    >
      <StaffPortalSectionCard className="w-full overflow-hidden bg-background/95 backdrop-blur-md">
        <StaffPortalSectionCardContent className="p-4 md:p-6 space-y-6">
          <ContentSectionTreeNav
            items={[
              { id: 'today', label: "Today's Board" },
              { id: 'periods', label: 'Bell Schedule' },
              { id: 'rules', label: 'Points & Rules' },
              { id: 'recess', label: 'Room Passes' },
              { id: 'history', label: 'History & Reports' },
            ]}
            value={mainSection}
            onValueChange={(id) =>
              setMainSection(id as 'today' | 'periods' | 'rules' | 'recess' | 'history')
            }
            className="mb-2"
          />

          {/* 1. Today's Live Board */}
          {mainSection === 'today' && (
            <div className="animate-in fade-in-50 duration-200">
              <AttendanceTodayBoard
                schoolId={schoolId}
                students={students}
                classes={classes}
                teachers={teachers}
                periods={attendancePeriods}
                attendanceConfig={attendanceConfig}
                variant="admin"
              />
            </div>
          )}

          {/* 2. Bell Schedule & Periods */}
          {mainSection === 'periods' && schoolId && (
            <div className="animate-in fade-in-50 duration-200">
              <AttendanceScheduleManager schoolId={schoolId} />
            </div>
          )}

          {/* 3. Points & Rules */}
          {mainSection === 'rules' && (
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

          {/* 4. Room Passes */}
          {mainSection === 'recess' && schoolId && (
            <div className="animate-in fade-in-50 duration-200">
              <RecessAttendanceSection schoolId={schoolId} variant="admin" />
            </div>
          )}

          {/* 5. History & Reports */}
          {mainSection === 'history' && schoolId && (
            <div className="animate-in fade-in-50 duration-200">
              <AttendanceHistorySection
                schoolId={schoolId}
                students={students}
                classes={classes}
                teachers={teachers}
              />
            </div>
          )}
        </StaffPortalSectionCardContent>
      </StaffPortalSectionCard>
    </StaffPortalTabPanel>
  );
}
