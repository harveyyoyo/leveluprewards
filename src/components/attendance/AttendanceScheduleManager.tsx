'use client';

import React, { useMemo, useState } from 'react';
import {
  Clock,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
  Zap,
  Loader2,
  Layers,
  ChevronDown,
  Calendar,
} from 'lucide-react';
import {
  collection,
  deleteDoc,
  doc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { AttendanceScheduleSlot } from '@/lib/types';
import { ensureDefaultAttendanceRules } from '@/lib/db/attendance';
import { useToast } from '@/hooks/use-toast';
import { useConfirm } from '@/components/providers/ConfirmProvider';
import { useAuthFetch } from '@/lib/authFetch';
import { getArcadeAiModelFromStorage } from '@/lib/aiModelPreference';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

export interface AttendanceScheduleManagerProps {
  schoolId: string;
}

const SCHEDULE_PRESETS = [
  {
    name: 'Standard 6-Period Day',
    description: '6 class periods with a midday break',
    periods: [
      { label: 'Period 1', startTime: '08:00', endTime: '08:45' },
      { label: 'Period 2', startTime: '08:50', endTime: '09:35' },
      { label: 'Period 3', startTime: '09:40', endTime: '10:25' },
      { label: 'Period 4', startTime: '10:30', endTime: '11:15' },
      { label: 'Period 5', startTime: '12:00', endTime: '12:45' },
      { label: 'Period 6', startTime: '12:50', endTime: '13:35' },
    ],
  },
  {
    name: 'Standard 7-Period Day',
    description: '7 traditional class periods',
    periods: [
      { label: 'Period 1', startTime: '08:00', endTime: '08:45' },
      { label: 'Period 2', startTime: '08:50', endTime: '09:35' },
      { label: 'Period 3', startTime: '09:40', endTime: '10:25' },
      { label: 'Period 4', startTime: '10:30', endTime: '11:15' },
      { label: 'Period 5', startTime: '11:20', endTime: '12:05' },
      { label: 'Period 6', startTime: '12:50', endTime: '13:35' },
      { label: 'Period 7', startTime: '13:40', endTime: '14:25' },
    ],
  },
  {
    name: 'Block Schedule (4 Blocks)',
    description: '90-minute extended block classes',
    periods: [
      { label: 'Block 1', startTime: '08:00', endTime: '09:30' },
      { label: 'Block 2', startTime: '09:40', endTime: '11:10' },
      { label: 'Block 3', startTime: '12:00', endTime: '13:30' },
      { label: 'Block 4', startTime: '13:40', endTime: '15:10' },
    ],
  },
  {
    name: 'Homeroom + 4 Core Periods',
    description: 'Morning advisory / homeroom plus 4 periods',
    periods: [
      { label: 'Homeroom', startTime: '08:00', endTime: '08:25' },
      { label: 'Period 1', startTime: '08:30', endTime: '09:45' },
      { label: 'Period 2', startTime: '09:50', endTime: '11:05' },
      { label: 'Period 3', startTime: '12:00', endTime: '13:15' },
      { label: 'Period 4', startTime: '13:20', endTime: '14:35' },
    ],
  },
];

export function AttendanceScheduleManager({ schoolId }: AttendanceScheduleManagerProps) {
  const firestore = useFirestore();
  const authFetch = useAuthFetch();
  const { toast } = useToast();
  const confirm = useConfirm();

  const periodsQuery = useMemoFirebase(
    () => (schoolId ? collection(firestore, 'schools', schoolId, 'periods') : null),
    [firestore, schoolId]
  );
  const { data: rawPeriods, isLoading } = useCollection<AttendanceScheduleSlot>(periodsQuery);

  const periods = useMemo(() => {
    return (rawPeriods || []).slice().sort((a, b) => {
      const aTime = (a.startTime || '').localeCompare(b.startTime || '');
      return aTime !== 0 ? aTime : (a.label || '').localeCompare(b.label || '');
    });
  }, [rawPeriods]);

  // Form states for manual period creation
  const [label, setLabel] = useState('Period 1');
  const [startTime, setStartTime] = useState('8:00 AM');
  const [endTime, setEndTime] = useState('8:45 AM');
  const [isAddingPeriod, setIsAddingPeriod] = useState(false);

  // AI Import State
  const [showAiImport, setShowAiImport] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiImporting, setAiImporting] = useState(false);
  const [aiImportModeOpen, setAiImportModeOpen] = useState(false);

  // Syncing state
  const [syncingRules, setSyncingRules] = useState(false);

  const normalizeTime = (raw: string): string | null => {
    const s = (raw || '').trim();
    if (!s) return null;

    const m24 = s.match(/^(\d{1,2}):(\d{2})$/);
    if (m24) {
      const h = Number(m24[1]);
      const m = Number(m24[2]);
      if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    const m12 = s.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
    if (m12) {
      let h = Number(m12[1]);
      const m = Number(m12[2]);
      const ap = String(m12[3]).toLowerCase();
      if (Number.isNaN(h) || Number.isNaN(m)) return null;
      if (ap === 'pm' && h !== 12) h += 12;
      if (ap === 'am' && h === 12) h = 0;
      if (h < 0 || h > 23 || m < 0 || m > 59) return null;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    return null;
  };

  const formatTimeToAmPm = (hhmm: string): string => {
    const s = (hhmm || '').trim();
    const m24 = s.match(/^(\d{1,2}):(\d{2})$/);
    if (!m24) return hhmm;
    let h = Number(m24[1]);
    const mins = m24[2];
    if (Number.isNaN(h)) return hhmm;
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${mins} ${ap}`;
  };

  // Check currently active period
  const activePeriod = useMemo(() => {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    return periods.find((p) => {
      const parse = (t: string) => {
        const [h, m] = (t || '').split(':').map(Number);
        return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
      };
      const s = parse(p.startTime);
      const e = parse(p.endTime);
      return s !== null && e !== null && nowMin >= s && nowMin <= e;
    });
  }, [periods]);

  // Apply a 1-click schedule preset
  const handleApplyPreset = async (preset: (typeof SCHEDULE_PRESETS)[0]) => {
    if (!schoolId) return;
    const ok = await confirm({
      title: `Apply "${preset.name}"?`,
      description: `This will create ${preset.periods.length} periods for your school schedule. Existing periods will be kept.`,
      confirmLabel: 'Apply Template',
    });
    if (!ok) return;

    try {
      const createdIds: string[] = [];
      for (const p of preset.periods) {
        const id = `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        await setDoc(doc(firestore, 'schools', schoolId, 'periods', id), {
          id,
          label: p.label,
          startTime: p.startTime,
          endTime: p.endTime,
        });
        createdIds.push(id);
      }
      await ensureDefaultAttendanceRules(firestore, schoolId, createdIds);
      toast({
        title: 'Schedule template applied!',
        description: `Created ${preset.periods.length} periods and synced attendance rules.`,
      });
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to apply template',
        description: e?.message || 'Could not save periods.',
      });
    }
  };

  // Add individual period
  const handleAddPeriod = async () => {
    if (!schoolId) return;
    const start = normalizeTime(startTime);
    const end = normalizeTime(endTime);
    if (!start || !end) {
      toast({
        variant: 'destructive',
        title: 'Invalid start or end time',
        description: 'Please type times like 8:00 AM and 8:45 AM.',
      });
      return;
    }

    setIsAddingPeriod(true);
    try {
      const id = `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await setDoc(doc(firestore, 'schools', schoolId, 'periods', id), {
        id,
        label: label.trim() || 'Period',
        startTime: start,
        endTime: end,
      });
      await ensureDefaultAttendanceRules(firestore, schoolId, [id]);
      toast({ title: 'Period added!', description: `"${label}" is ready for attendance.` });
      // Bump period number suggestion
      const numMatch = label.match(/\d+/);
      if (numMatch) {
        setLabel(`Period ${Number(numMatch[0]) + 1}`);
      }
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to add period',
        description: e?.message || 'Could not save period.',
      });
    } finally {
      setIsAddingPeriod(false);
    }
  };

  const handleUpdatePeriod = async (p: AttendanceScheduleSlot) => {
    if (!schoolId) return;
    try {
      const start = normalizeTime(p.startTime);
      const end = normalizeTime(p.endTime);
      if (!start || !end) {
        toast({ variant: 'destructive', title: 'Invalid time', description: 'Use formats like 8:00 AM.' });
        return;
      }
      await updateDoc(doc(firestore, 'schools', schoolId, 'periods', p.id), {
        label: p.label,
        startTime: start,
        endTime: end,
      });
      toast({ title: 'Period updated' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed to update', description: e?.message });
    }
  };

  const handleRemovePeriod = async (id: string, periodLabel: string) => {
    const ok = await confirm({
      title: `Delete ${periodLabel}?`,
      description: 'Classes assigned to this period will lose their period link. You can recreate it anytime.',
      confirmLabel: 'Delete Period',
      destructive: true,
    });
    if (!ok) return;

    try {
      await deleteDoc(doc(firestore, 'schools', schoolId, 'periods', id));
      toast({ title: 'Period deleted' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed to delete', description: e?.message });
    }
  };

  const handleSyncDefaultRules = async () => {
    if (!schoolId || !periods.length) return;
    setSyncingRules(true);
    try {
      const { created, skipped } = await ensureDefaultAttendanceRules(
        firestore,
        schoolId,
        periods.map((p) => p.id)
      );
      toast({
        title: 'Attendance rules synced!',
        description: `Created ${created} new default rules. ${skipped} rules already existed.`,
      });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Sync failed', description: e?.message });
    } finally {
      setSyncingRules(false);
    }
  };

  // AI Import actions
  const requestAiPeriodImport = () => {
    if (!schoolId) return;
    if (!aiPrompt.trim()) {
      toast({ variant: 'destructive', title: 'Paste schedule text first' });
      return;
    }
    if (periods.length > 0) {
      setAiImportModeOpen(true);
    } else {
      void runAiPeriodImport('add');
    }
  };

  const runAiPeriodImport = async (mode: 'add' | 'replace') => {
    if (!schoolId || !aiPrompt.trim()) return;
    setAiImporting(true);
    try {
      if (mode === 'replace' && periods.length > 0) {
        for (const p of periods) {
          await deleteDoc(doc(firestore, 'schools', schoolId, 'periods', p.id));
        }
      }

      const model = getArcadeAiModelFromStorage();
      const res = await authFetch('/api/parse-schedule', {
        method: 'POST',
        body: JSON.stringify({ prompt: aiPrompt, model, schoolId }),
      });

      if (!res.ok) throw new Error(`AI import failed (${res.status}).`);

      const data = await res.json();
      const items = Array.isArray(data) ? data : [];
      if (!items.length) {
        toast({
          variant: 'destructive',
          title: 'No periods found from AI',
          description: 'Try pasting with clearer time ranges like "Period 1: 8:00 AM - 8:45 AM".',
        });
        return;
      }

      const mapped = items
        .map((it: any, i: number) => {
          const start = normalizeTime(String(it?.startTime || ''));
          const end = normalizeTime(String(it?.endTime || ''));
          if (!start || !end) return null;
          const nextLabel = String(it?.className || '').trim() || `Period ${i + 1}`;
          return {
            id: `p_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
            label: nextLabel,
            startTime: start,
            endTime: end,
          } as AttendanceScheduleSlot;
        })
        .filter(Boolean) as AttendanceScheduleSlot[];

      if (!mapped.length) {
        toast({ variant: 'destructive', title: 'AI response had no valid times' });
        return;
      }

      for (const p of mapped) {
        await setDoc(doc(firestore, 'schools', schoolId, 'periods', p.id), {
          id: p.id,
          label: p.label,
          startTime: p.startTime,
          endTime: p.endTime,
        });
      }

      await ensureDefaultAttendanceRules(firestore, schoolId, mapped.map((p) => p.id));
      toast({
        title: 'Periods imported successfully!',
        description:
          mode === 'replace'
            ? `Replaced schedule with ${mapped.length} period(s).`
            : `Added ${mapped.length} period(s) alongside existing schedule.`,
      });
      setAiPrompt('');
      setShowAiImport(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Import error', description: e?.message });
    } finally {
      setAiImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Preset Templates & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl border bg-card shadow-sm">
        <div>
          <h3 className="text-base font-black flex items-center gap-2">
            <Clock className="w-5 h-5 text-ring" /> School Bell Schedule
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure the class periods for your school day. Students earn on-time attendance bonuses during these windows.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Schedule Presets Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-xl font-bold gap-2">
                <Layers className="w-4 h-4 text-primary" />
                Schedule Templates
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                One-Click Starter Schedules
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {SCHEDULE_PRESETS.map((preset) => (
                <DropdownMenuItem
                  key={preset.name}
                  onClick={() => handleApplyPreset(preset)}
                  className="flex flex-col items-start py-2 cursor-pointer"
                >
                  <span className="font-bold text-sm">{preset.name}</span>
                  <span className="text-[11px] text-muted-foreground">{preset.description}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAiImport(!showAiImport)}
            className="rounded-xl font-bold gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            AI Paste Schedule
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncDefaultRules}
            disabled={syncingRules || periods.length === 0}
            className="rounded-xl font-bold gap-2"
          >
            {syncingRules ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-ring" />}
            Sync Rules
          </Button>
        </div>
      </div>

      {/* AI Paste Importer Collapsible Card */}
      {showAiImport && (
        <div className="rounded-2xl border-2 border-primary/30 bg-primary/[0.02] p-5 space-y-3 animate-in fade-in-50 duration-200">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-black flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-primary" /> Paste Your School Schedule
            </Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAiImport(false)}
              className="text-xs text-muted-foreground h-7"
            >
              Close
            </Button>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Copy and paste your bell times or daily schedule text here. Our assistant will extract the period names, start times, and end times automatically.
          </p>
          <textarea
            className="w-full rounded-xl border border-input bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Example: Period 1 8:00 AM - 8:45 AM, Period 2 8:50 AM - 9:35 AM, Period 3 9:40 AM - 10:25 AM ..."
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            rows={4}
          />
          <div className="flex items-center justify-between gap-3">
            <Button
              onClick={requestAiPeriodImport}
              disabled={aiImporting || !aiPrompt.trim()}
              className="rounded-xl font-black uppercase tracking-widest gap-2"
            >
              {aiImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Import Periods
            </Button>
            <span className="text-xs text-muted-foreground">
              {periods.length > 0 ? 'You can add to your current periods or replace them.' : ''}
            </span>
          </div>
        </div>
      )}

      {/* AI Import Confirmation Dialog */}
      <AlertDialog open={aiImportModeOpen} onOpenChange={setAiImportModeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import AI Schedule</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  You already have <strong className="text-foreground">{periods.length}</strong> period(s) configured.
                  How would you like to apply the imported schedule?
                </p>
                <ul className="list-disc pl-4 space-y-1 text-xs">
                  <li><strong>Add to existing</strong>: Keep your current periods and append the new ones.</li>
                  <li><strong>Replace all</strong>: Clear all existing periods and save only what was pasted.</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:justify-end">
            <AlertDialogCancel disabled={aiImporting}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="secondary"
              disabled={aiImporting}
              onClick={() => {
                setAiImportModeOpen(false);
                void runAiPeriodImport('add');
              }}
            >
              Add to existing
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={aiImporting}
              onClick={() => {
                setAiImportModeOpen(false);
                void runAiPeriodImport('replace');
              }}
            >
              Replace all
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add New Period Form */}
      <div className="rounded-2xl border bg-muted/20 p-4 space-y-3">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Add Single Period
        </Label>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5 flex-1 min-w-[150px]">
            <Label className="text-xs">Period Name</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Period 1"
              className="rounded-xl h-10"
            />
          </div>

          <div className="space-y-1.5 w-[120px]">
            <Label className="text-xs">Start Time</Label>
            <Input
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              placeholder="8:00 AM"
              className="rounded-xl h-10 font-mono"
            />
          </div>

          <div className="space-y-1.5 w-[120px]">
            <Label className="text-xs">End Time</Label>
            <Input
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              placeholder="8:45 AM"
              className="rounded-xl h-10 font-mono"
            />
          </div>

          <Button
            onClick={handleAddPeriod}
            disabled={isAddingPeriod || !label.trim()}
            className="rounded-xl h-10 px-5 font-bold gap-2"
          >
            {isAddingPeriod ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add Period
          </Button>
        </div>
      </div>

      {/* Period List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
            Current Schedule ({periods.length} periods)
          </Label>
          <span className="text-xs text-muted-foreground">Times format automatically (AM/PM)</span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
            Loading periods...
          </div>
        ) : periods.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-10 text-center space-y-3 bg-muted/10">
            <Clock className="w-8 h-8 text-muted-foreground/40 mx-auto" />
            <div>
              <p className="font-bold text-sm">No periods created yet</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Click a template above or type a period name and times to get started.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-2">
            {periods.map((p, idx) => {
              const isActive = activePeriod?.id === p.id;
              return (
                <div
                  key={p.id}
                  className={cn(
                    'flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border transition-all',
                    isActive
                      ? 'border-emerald-500/50 bg-emerald-500/[0.06] shadow-sm'
                      : 'bg-card hover:bg-muted/20'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-[200px] flex-1">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-black text-muted-foreground">
                      {idx + 1}
                    </span>
                    <Input
                      value={p.label}
                      onChange={(e) => handleUpdatePeriod({ ...p, label: e.target.value })}
                      className="h-9 font-bold rounded-xl max-w-[180px]"
                    />
                    {isActive && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active Now
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border">
                      <Input
                        value={formatTimeToAmPm(p.startTime)}
                        onChange={(e) => {
                          const norm = normalizeTime(e.target.value);
                          if (norm) void handleUpdatePeriod({ ...p, startTime: norm });
                        }}
                        className="h-8 w-24 text-center font-mono text-xs rounded-lg border-0 bg-transparent focus-visible:bg-background"
                      />
                      <span className="text-muted-foreground text-xs">–</span>
                      <Input
                        value={formatTimeToAmPm(p.endTime)}
                        onChange={(e) => {
                          const norm = normalizeTime(e.target.value);
                          if (norm) void handleUpdatePeriod({ ...p, endTime: norm });
                        }}
                        className="h-8 w-24 text-center font-mono text-xs rounded-lg border-0 bg-transparent focus-visible:bg-background"
                      />
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-destructive hover:bg-destructive/10 rounded-xl"
                      onClick={() => handleRemovePeriod(p.id, p.label)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
