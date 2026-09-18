'use client';

import { useState } from 'react';
import { Settings } from 'lucide-react';
import { AdminRaffleTab } from '@/app/[schoolId]/admin/sections/AdminRaffleTab';
import { ClassroomLiveToolSheet } from '@/components/classroom/ClassroomLiveToolSheet';
import { RaffleAnimationNotice } from '@/components/raffle/RaffleAnimationNotice';
import type { Class, Student } from '@/lib/types';

export function ClassroomLiveRafflePanel({
  open,
  onClose,
  schoolId,
  students,
  classes,
  classId,
  storageScope,
  canEditSettings,
  operatorName,
}: {
  open: boolean;
  onClose: () => void;
  schoolId: string;
  students: Student[];
  classes: Class[];
  classId?: string;
  storageScope?: string;
  canEditSettings: boolean;
  operatorName?: string;
}) {
  const [rulesOpen, setRulesOpen] = useState(false);

  return (
    <ClassroomLiveToolSheet
      open={open}
      title="Classroom Raffle"
      layoutId="classroom-live-raffle"
      onClose={onClose}
      wide
      extraWide
      tone="raffle"
      headerActions={
        <>
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1 rounded-xl border border-white/25 bg-white/15 px-2.5 text-xs font-black text-white hover:bg-white/25"
            onClick={() => setRulesOpen((openRules) => !openRules)}
          >
            <Settings className="h-3.5 w-3.5" aria-hidden />
            Rules
          </button>
          <RaffleAnimationNotice variant="helpButton" />
        </>
      }
    >
      <AdminRaffleTab
        embedded
        livePlay
        schoolId={schoolId}
        students={students}
        classes={classes}
        canEditSettings={canEditSettings}
        operatorName={operatorName}
        initialClassFilter={classId || 'all'}
        rulesOpen={rulesOpen}
        onRulesOpenChange={setRulesOpen}
        sessionScope={storageScope}
        sessionClassId={classId}
      />
    </ClassroomLiveToolSheet>
  );
}
