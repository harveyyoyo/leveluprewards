'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';
import { useCollection, useMemoFirebase } from '@/firebase';
import { getReadableErrorMessage } from '@/lib/errorMessage';
import type { SoundEffect } from '@/hooks/useArcadeSound';
import type { useToast } from '@/hooks/use-toast';
import type {
  AttendanceLogEntry,
  AttendanceRewardRule,
  AttendanceScheduleSlot,
  AttendanceSettings,
  Teacher,
} from '@/lib/types';

const DEFAULT_CONFIG: AttendanceSettings = {
  pointsForSignIn: 1,
  pointsForOnTime: 5,
  onTimeWindowMinutes: 5,
  schedule: [],
};

// Use the exact `toast` signature exposed by `useToast()` so callers don't
// have to re-type inline shapes, and the `playSound` union stays in sync with
// `useArcadeSound`.
type ToastFn = ReturnType<typeof useToast>['toast'];
type PlaySoundFn = (sound: SoundEffect) => void;

export interface AdminAttendanceDeps {
  enabled: boolean;
  schoolId: string | null;
  firestore: Firestore;
  teachers: Teacher[] | null | undefined;
  toast: ToastFn;
  playSound: PlaySoundFn;
  // AppContext-supplied methods
  getAttendanceConfig?: () => Promise<AttendanceSettings | null>;
  setAttendanceConfig?: (settings: AttendanceSettings) => Promise<void>;
  listAttendanceLog?: (limitCount?: number) => Promise<AttendanceLogEntry[]>;
  getTeacherAttendanceConfig?: (teacherId: string) => Promise<AttendanceSettings | null>;
  setTeacherAttendanceConfig?: (teacherId: string, settings: AttendanceSettings) => Promise<void>;
  listTeacherAttendanceLog?: (teacherId: string, limitCount?: number) => Promise<AttendanceLogEntry[]>;
}

/**
 * Owns every bit of admin-dashboard attendance state and the async
 * orchestration around it — school-level config/log, per-teacher
 * config/log, and reward-rule drafts.
 *
 * The admin page used to hold ~15 pieces of state, 4 useEffects, and 10
 * handlers for this area inline. Pulling it behind one hook keeps the page
 * readable and makes the attendance flow easier to reason about on its own.
 */
export function useAdminAttendance(deps: AdminAttendanceDeps) {
  const {
    enabled, schoolId, firestore, teachers,
    toast, playSound,
    getAttendanceConfig, setAttendanceConfig, listAttendanceLog,
    getTeacherAttendanceConfig, setTeacherAttendanceConfig, listTeacherAttendanceLog,
  } = deps;

  // ---- School-level state --------------------------------------------
  const [attendanceConfig, setAttendanceConfigState] = useState<AttendanceSettings | null>(null);
  const [attendanceLog, setAttendanceLogState] = useState<AttendanceLogEntry[]>([]);
  const [attendanceConfigSaving, setAttendanceConfigSaving] = useState(false);
  const [attendanceLogLoading, setAttendanceLogLoading] = useState(false);

  // ---- Teacher-level state -------------------------------------------
  const [selectedAttendanceTeacherId, setSelectedAttendanceTeacherId] = useState<string>('');
  const [teacherAttendanceConfig, setTeacherAttendanceConfigState] = useState<AttendanceSettings | null>(null);
  const [teacherAttendanceSaving, setTeacherAttendanceSaving] = useState(false);
  const [teacherAttendanceLog, setTeacherAttendanceLogState] = useState<AttendanceLogEntry[]>([]);
  const [teacherAttendanceLogLoading, setTeacherAttendanceLogLoading] = useState(false);

  // ---- Reward rule drafts --------------------------------------------
  const [ruleDrafts, setRuleDrafts] = useState<Record<string, Partial<AttendanceRewardRule>>>({});
  const [savingRuleId, setSavingRuleId] = useState<string | null>(null);

  // ---- Live teacher-rewards subscription -----------------------------
  const teacherAttendanceRewardsQuery = useMemoFirebase(
    () => (schoolId && selectedAttendanceTeacherId
      ? collection(firestore, 'schools', schoolId, 'teachers', selectedAttendanceTeacherId, 'attendanceRewards')
      : null),
    [firestore, schoolId, selectedAttendanceTeacherId],
  );
  const {
    data: teacherAttendanceRewards,
    isLoading: teacherAttendanceRewardsLoading,
  } = useCollection<AttendanceRewardRule>(teacherAttendanceRewardsQuery);

  // Clear draft edits whenever the selected teacher flips.
  useEffect(() => {
    setRuleDrafts({});
  }, [selectedAttendanceTeacherId]);

  // Load school-level config once attendance is enabled + we have a school.
  useEffect(() => {
    if (!enabled || !schoolId || !getAttendanceConfig) return;
    getAttendanceConfig()
      .then((c) => setAttendanceConfigState(c ?? DEFAULT_CONFIG))
      .catch(() => setAttendanceConfigState(DEFAULT_CONFIG));
  }, [enabled, schoolId, getAttendanceConfig]);

  // Auto-select first teacher if none picked yet.
  useEffect(() => {
    if (!teachers?.length) return;
    setSelectedAttendanceTeacherId((prev) => (prev ? prev : teachers[0].id));
  }, [teachers]);

  // Load teacher-level config when selection (or enablement) changes.
  useEffect(() => {
    if (!enabled || !schoolId || !selectedAttendanceTeacherId || !getTeacherAttendanceConfig) return;
    const fallback: AttendanceSettings = {
      ...DEFAULT_CONFIG,
      teacherId: selectedAttendanceTeacherId,
    };
    getTeacherAttendanceConfig(selectedAttendanceTeacherId)
      .then((cfg) => setTeacherAttendanceConfigState(cfg ?? fallback))
      .catch(() => setTeacherAttendanceConfigState(fallback));
  }, [enabled, schoolId, selectedAttendanceTeacherId, getTeacherAttendanceConfig]);

  // ---- Log loaders ---------------------------------------------------
  const loadAttendanceLog = useCallback(() => {
    if (!listAttendanceLog) return;
    setAttendanceLogLoading(true);
    listAttendanceLog(80)
      .then(setAttendanceLogState)
      .catch((error: unknown) => {
        setAttendanceLogState([]);
        toast({
          variant: 'destructive',
          title: 'Failed to load attendance log',
          description: getReadableErrorMessage(error, 'Could not load attendance sign-ins.'),
        });
      })
      .finally(() => setAttendanceLogLoading(false));
  }, [listAttendanceLog, toast]);

  const loadTeacherAttendanceLog = useCallback(() => {
    if (!selectedAttendanceTeacherId || !listTeacherAttendanceLog) return;
    setTeacherAttendanceLogLoading(true);
    listTeacherAttendanceLog(selectedAttendanceTeacherId, 80)
      .then(setTeacherAttendanceLogState)
      .catch((error: unknown) => {
        setTeacherAttendanceLogState([]);
        toast({
          variant: 'destructive',
          title: 'Failed to load teacher log',
          description: getReadableErrorMessage(error, 'Could not load teacher attendance log.'),
        });
      })
      .finally(() => setTeacherAttendanceLogLoading(false));
  }, [selectedAttendanceTeacherId, listTeacherAttendanceLog, toast]);

  // ---- Save handlers -------------------------------------------------
  const handleSaveAttendanceConfig = useCallback(async () => {
    if (!attendanceConfig || !setAttendanceConfig) return;
    setAttendanceConfigSaving(true);
    try {
      await setAttendanceConfig(attendanceConfig);
      playSound('success');
      toast({ title: 'Attendance settings saved.' });
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      let description = err?.message ?? String(error);
      if (description === 'internal' || err?.code?.includes('internal')) {
        description =
          'Redeploy Cloud Functions (firebase deploy --only functions). Sign in at /developer with your allowed Google account so addDeveloperMe can register your UID. Check Firebase Console → Functions → Logs for details.';
      }
      toast({ variant: 'destructive', title: 'Failed to save', description });
    } finally {
      setAttendanceConfigSaving(false);
    }
  }, [attendanceConfig, setAttendanceConfig, playSound, toast]);

  const handleSaveTeacherAttendanceConfig = useCallback(async () => {
    if (!teacherAttendanceConfig || !selectedAttendanceTeacherId || !setTeacherAttendanceConfig) return;
    setTeacherAttendanceSaving(true);
    try {
      await setTeacherAttendanceConfig(selectedAttendanceTeacherId, {
        ...teacherAttendanceConfig,
        teacherId: selectedAttendanceTeacherId,
      });
      playSound('success');
      toast({ title: 'Teacher attendance settings saved.' });
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Failed to save',
        description: getReadableErrorMessage(error, 'Could not save teacher attendance settings.'),
      });
    } finally {
      setTeacherAttendanceSaving(false);
    }
  }, [teacherAttendanceConfig, selectedAttendanceTeacherId, setTeacherAttendanceConfig, playSound, toast]);

  const saveTeacherRewardRule = useCallback(
    async (ruleId: string) => {
      if (!schoolId || !selectedAttendanceTeacherId) return;
      const draft = ruleDrafts[ruleId];
      if (!draft) return;
      setSavingRuleId(ruleId);
      try {
        const ref = doc(firestore, 'schools', schoolId, 'teachers', selectedAttendanceTeacherId, 'attendanceRewards', ruleId);
        await updateDoc(ref, {
          ...draft,
          // never write undefined to Firestore
          periodId: draft.periodId ?? null,
          customPeriod: draft.customPeriod ?? null,
          categoryId: draft.categoryId ?? null,
        });
        playSound('success');
        setRuleDrafts((prev) => {
          const next = { ...prev };
          delete next[ruleId];
          return next;
        });
        toast({ title: 'Reward rule updated.' });
      } catch (error: unknown) {
        toast({
          variant: 'destructive',
          title: 'Failed to update rule',
          description: getReadableErrorMessage(error, 'Could not update this rule.'),
        });
      } finally {
        setSavingRuleId(null);
      }
    },
    [schoolId, selectedAttendanceTeacherId, ruleDrafts, firestore, playSound, toast],
  );

  const deleteTeacherRewardRule = useCallback(
    async (ruleId: string) => {
      if (!schoolId || !selectedAttendanceTeacherId) return;
      try {
        await deleteDoc(doc(firestore, 'schools', schoolId, 'teachers', selectedAttendanceTeacherId, 'attendanceRewards', ruleId));
        playSound('swoosh');
        toast({ title: 'Reward rule deleted.' });
      } catch (error: unknown) {
        toast({
          variant: 'destructive',
          title: 'Failed to delete rule',
          description: getReadableErrorMessage(error, 'Could not delete this rule.'),
        });
      }
    },
    [schoolId, selectedAttendanceTeacherId, firestore, playSound, toast],
  );

  // ---- Schedule slot mutators (school-level config) -------------------
  const addScheduleSlot = useCallback(() => {
    setAttendanceConfigState((prev) => ({
      ...(prev ?? DEFAULT_CONFIG),
      schedule: [
        ...(prev?.schedule ?? []),
        {
          id: `slot_${Date.now()}`,
          label: `Period ${(prev?.schedule?.length ?? 0) + 1}`,
          startTime: '08:00',
          endTime: '08:45',
        },
      ],
    }));
  }, []);

  const updateScheduleSlot = useCallback(
    (index: number, field: keyof AttendanceScheduleSlot, value: string) => {
      setAttendanceConfigState((prev) => {
        if (!prev?.schedule) return prev;
        const next = [...prev.schedule];
        next[index] = { ...next[index], [field]: value };
        return { ...prev, schedule: next };
      });
    },
    [],
  );

  const removeScheduleSlot = useCallback((index: number) => {
    setAttendanceConfigState((prev) => ({
      ...(prev ?? DEFAULT_CONFIG),
      schedule: prev?.schedule?.filter((_, i) => i !== index) ?? [],
    }));
  }, []);

  return {
    // School-level
    attendanceConfig,
    setAttendanceConfigState,
    attendanceLog,
    attendanceConfigSaving,
    attendanceLogLoading,
    loadAttendanceLog,
    handleSaveAttendanceConfig,
    addScheduleSlot,
    updateScheduleSlot,
    removeScheduleSlot,

    // Teacher-level
    selectedAttendanceTeacherId,
    setSelectedAttendanceTeacherId,
    teacherAttendanceConfig,
    setTeacherAttendanceConfigState,
    teacherAttendanceSaving,
    teacherAttendanceLog,
    teacherAttendanceLogLoading,
    loadTeacherAttendanceLog,
    handleSaveTeacherAttendanceConfig,
    teacherAttendanceRewards,
    teacherAttendanceRewardsLoading,
    ruleDrafts,
    setRuleDrafts,
    savingRuleId,
    saveTeacherRewardRule,
    deleteTeacherRewardRule,
  } as const;
}
