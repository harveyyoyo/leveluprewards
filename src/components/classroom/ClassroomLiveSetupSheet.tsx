'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpenCheck,
  Dices,
  Monitor,
  Palette,
  Settings2,
  Sparkles,
} from 'lucide-react';
import { AdminRaffleTab } from '@/app/[schoolId]/admin/sections/AdminRaffleTab';
import { ClassroomSetupWizardTrigger } from '@/app/[schoolId]/admin/sections/ClassroomSetupWizard';
import { BehaviorTimelinePanel } from '@/components/classroom/BehaviorTimelinePanel';
import { ClassAwardsLiveSettingsSection } from '@/components/classroom/ClassAwardsLiveSettingsSection';
import { ClassroomLiveToolSheet } from '@/components/classroom/ClassroomLiveToolSheet';
import { ClassroomRealmThemePicker } from '@/components/classroom/ClassroomRealmThemePicker';
import { ClassroomRoomDisplaySection } from '@/components/classroom/ClassroomRoomDisplaySection';
import { useSettings } from '@/components/providers/SettingsProvider';
import { isClassroomPillarOn, isParentPortalOn } from '@/lib/productPillars';
import {
  resolveClassroomRealmTheme,
  type ClassroomRealmThemeId,
} from '@/lib/classroom/classroomRealmThemes';
import type { Class, Student } from '@/lib/types';
import { cn } from '@/lib/utils';

const spring = { type: 'spring' as const, stiffness: 280, damping: 26 };

export type ClassroomLiveSetupTab =
  | 'setup'
  | 'rules'
  | 'raffle'
  | 'behavior'
  | 'poster'
  | 'look';

const TAB_META: {
  id: ClassroomLiveSetupTab;
  label: string;
  icon: typeof Settings2;
}[] = [
  { id: 'setup', label: 'Setup', icon: Sparkles },
  { id: 'rules', label: 'Rules', icon: Settings2 },
  { id: 'raffle', label: 'Raffle', icon: Dices },
  { id: 'behavior', label: 'Log', icon: BookOpenCheck },
  { id: 'poster', label: 'Poster TV', icon: Monitor },
  { id: 'look', label: 'School look', icon: Palette },
];

export function ClassroomLiveSetupSheet({
  open,
  onClose,
  initialTab = 'setup',
  schoolId,
  storageScope,
  classes,
  students,
  classId,
  canEditSettings,
  canEditRaffleSettings,
  operatorName,
}: {
  open: boolean;
  onClose: () => void;
  initialTab?: ClassroomLiveSetupTab;
  schoolId: string;
  storageScope: string;
  classes: Class[];
  students: Student[];
  classId?: string;
  canEditSettings: boolean;
  canEditRaffleSettings: boolean;
  operatorName?: string;
}) {
  const { settings, updateSettings } = useSettings();
  const classroomOn = isClassroomPillarOn(settings);
  const parentPortalOn = isParentPortalOn(settings);
  const principalTimelineOn = settings.enablePrincipalBehaviorTimeline === true;
  const realmTheme = resolveClassroomRealmTheme(settings.classroomRealmTheme);
  const [tab, setTab] = useState<ClassroomLiveSetupTab>(initialTab);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  const activeTab = tab;

  return (
    <ClassroomLiveToolSheet
      open={open}
      title="Classroom setup"
      layoutId="classroom-live-setup"
      onClose={onClose}
      extraWide
    >
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { ...spring, staggerChildren: 0.04 } },
        }}
        className="flex min-h-0 flex-col gap-3"
      >
        <nav
          aria-label="Setup sections"
          className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-2"
        >
          {TAB_META.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition-colors',
                activeTab === id
                  ? 'border-violet-400 bg-violet-100 text-violet-950'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100',
              )}
              aria-current={activeTab === id ? 'page' : undefined}
              onClick={() => setTab(id)}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {label}
            </button>
          ))}
        </nav>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="min-h-0 flex-1"
        >
          {activeTab === 'setup' ? (
            <section className="space-y-3">
              <p className="text-sm text-slate-700">
                First-time setup walks you through turning on classroom tools, quick awards, and display
                options for your school.
              </p>
              {!classroomOn ? (
                <ClassroomSetupWizardTrigger
                  schoolId={schoolId}
                  classes={classes}
                  students={students}
                  updateSettings={updateSettings}
                />
              ) : (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
                  <p className="font-bold">Classroom is already on for your school.</p>
                  <p className="mt-1 text-emerald-900/80">
                    Use the Rules tab for timers, parent view, and desk display defaults. Desk colors for
                    your teaching board stay in the Appearance button on the top bar.
                  </p>
                  <ClassroomSetupWizardTrigger
                    schoolId={schoolId}
                    classes={classes}
                    students={students}
                    updateSettings={updateSettings}
                    className="mt-3"
                  />
                </div>
              )}
            </section>
          ) : null}

          {activeTab === 'rules' ? (
            <ClassAwardsLiveSettingsSection
              embeddedLive
              schoolId={schoolId}
              seatingScope={storageScope}
              classes={classes}
              settings={settings}
              updateSettings={updateSettings}
              canEdit={canEditSettings}
              parentPortalOn={parentPortalOn}
              principalTimelineOn={principalTimelineOn}
            />
          ) : null}

          {activeTab === 'raffle' ? (
            <AdminRaffleTab
              embedded
              schoolId={schoolId}
              students={students}
              classes={classes}
              canEditSettings={canEditRaffleSettings}
              operatorName={operatorName}
              initialClassFilter={classId || 'all'}
              sessionScope={storageScope}
              sessionClassId={classId}
            />
          ) : null}

          {activeTab === 'behavior' ? (
            <BehaviorTimelinePanel schoolId={schoolId} embedded liveLog mode="behavior" />
          ) : null}

          {activeTab === 'poster' ? (
            <ClassroomRoomDisplaySection
              layout="tv"
              schoolId={schoolId}
              scope={storageScope}
              classes={classes}
              students={students}
              classId={classId}
            />
          ) : null}

          {activeTab === 'look' ? (
            <section className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">
                <p className="font-bold text-slate-900">Two ways to change the look</p>
                <p className="mt-1">
                  <span className="font-semibold">School look</span> below sets the chalkboard background for
                  the whole classroom page.{' '}
                  <span className="font-semibold">Appearance</span> on the top bar is just for your desk
                  cards during teaching (Playful, Clean, Dark).
                </p>
              </div>
              <ClassroomRealmThemePicker
                value={realmTheme.id}
                onSelect={(id: ClassroomRealmThemeId) => updateSettings({ classroomRealmTheme: id })}
              />
            </section>
          ) : null}
        </motion.div>
      </motion.div>
    </ClassroomLiveToolSheet>
  );
}
