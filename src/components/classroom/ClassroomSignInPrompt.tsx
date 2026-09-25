'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { doc } from 'firebase/firestore';
import { useAppContext } from '@/components/AppProvider';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { isPublicSampleSchoolId } from '@/lib/sampleSchools';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, LogIn, ShieldCheck, Sparkles, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

type StaffPortalLoginOption = {
  id: string;
  sourceId?: string;
  type: 'teacher' | 'secretary' | 'prizeClerk' | 'reports' | 'librarian' | 'office' | 'houseCoordinator';
  label: string;
  username: string;
};

type SchoolPublicStaffDirectory = {
  staffDirectory?: StaffPortalLoginOption[];
};

export function ClassroomSignInPrompt({
  schoolId,
  onSuccess,
}: {
  schoolId: string;
  onSuccess?: () => void;
}) {
  const { login } = useAppContext();
  const firestore = useFirestore();

  const [mode, setMode] = useState<'teacher' | 'admin'>('teacher');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('mrsmith');
  const [passcode, setPasscode] = useState<string>('1234');
  const [adminPasscode, setAdminPasscode] = useState<string>('1234');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isDemo = isPublicSampleSchoolId(schoolId);

  const schoolPublicRef = useMemoFirebase(
    () => (schoolId && firestore ? doc(firestore, 'schoolPublic', schoolId) : null),
    [firestore, schoolId],
  );

  const { data: schoolPublic, isLoading: optionsLoading } =
    useDoc<SchoolPublicStaffDirectory>(schoolPublicRef);

  const teachers = useMemo(() => {
    const list = (schoolPublic?.staffDirectory || []).filter(
      (opt) => opt?.id && opt?.username && opt.type === 'teacher',
    );
    if (list.length > 0) return list;
    // Fallback demo teachers if not yet loaded from firestore
    return [
      { id: 'st1', username: 'mrsmith', label: 'Mr. Smith', type: 'teacher' as const },
      { id: 'st2', username: 'mrsjones', label: 'Mrs. Jones', type: 'teacher' as const },
      { id: 'st3', username: 'msdavis', label: 'Ms. Davis', type: 'teacher' as const },
      { id: 'st4', username: 'mrbrown', label: 'Mr. Brown', type: 'teacher' as const },
      { id: 'st5', username: 'mrwilson', label: 'Mr. Wilson', type: 'teacher' as const },
    ];
  }, [schoolPublic]);

  const handleTeacherSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (submitting) return;

    const teacher =
      teachers.find((t) => t.username === selectedStaffId || t.id === selectedStaffId) ||
      teachers[0];

    if (!teacher) {
      setErrorMessage('Please select a teacher.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await login('teacher', {
        schoolId: schoolId.toLowerCase(),
        username: teacher.username,
        passcode: passcode.trim() || '1234',
        teacherName: teacher.label,
        teacherDocId: teacher.sourceId || teacher.id.replace(/^teacher:/, ''),
      });

      if (res.ok) {
        onSuccess?.();
      } else {
        setErrorMessage(res.message || 'Incorrect passcode. Please try again.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await login('admin', {
        schoolId: schoolId.toLowerCase(),
        passcode: adminPasscode.trim() || '1234',
      });

      if (res.ok) {
        onSuccess?.();
      } else {
        setErrorMessage(res.message || 'Incorrect admin passcode.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Admin sign in failed.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickDemoTeacher = async () => {
    if (submitting) return;
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await login('teacher', {
        schoolId: schoolId.toLowerCase(),
        username: 'mrsmith',
        passcode: '1234',
        teacherName: 'Mr. Smith',
        teacherDocId: 'st1',
      });

      if (res.ok) {
        onSuccess?.();
      } else {
        setErrorMessage(res.message || 'Demo teacher sign in failed.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Demo sign in failed.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/15 bg-black/60 p-6 shadow-2xl backdrop-blur-md sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-lime-500 to-emerald-400 text-black shadow-lg">
            <UserCheck className="h-7 w-7" aria-hidden />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Classroom Sign In</h1>
          <p className="mt-1 text-sm text-white/70">
            Sign in as a teacher or admin to open the live classroom board.
          </p>
        </div>

        {/* Quick Demo button for sample school */}
        {isDemo && (
          <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3.5 text-center">
            <p className="text-xs font-semibold text-emerald-300">Demo School Mode</p>
            <Button
              type="button"
              onClick={handleQuickDemoTeacher}
              disabled={submitting}
              className="mt-2 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-lime-600 font-bold text-white shadow-md hover:from-emerald-500 hover:to-lime-500"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Opening Classroom…
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  One-Click Enter (Mr. Smith)
                </>
              )}
            </Button>
          </div>
        )}

        {/* Mode switch: Teacher or Admin */}
        <div className="mb-4 flex rounded-lg bg-white/10 p-1">
          <button
            type="button"
            onClick={() => setMode('teacher')}
            className={cn(
              'flex-1 rounded-md py-1.5 text-xs font-bold transition-colors',
              mode === 'teacher' ? 'bg-white/20 text-white shadow-sm' : 'text-white/60 hover:text-white',
            )}
          >
            Teacher Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode('admin')}
            className={cn(
              'flex-1 rounded-md py-1.5 text-xs font-bold transition-colors',
              mode === 'admin' ? 'bg-white/20 text-white shadow-sm' : 'text-white/60 hover:text-white',
            )}
          >
            Admin Sign In
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-lg bg-red-500/20 border border-red-500/40 p-3 text-center text-xs font-semibold text-red-200">
            {errorMessage}
          </div>
        )}

        {mode === 'teacher' ? (
          <form onSubmit={handleTeacherSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-white/80">Select Teacher</Label>
              <Select
                value={selectedStaffId}
                onValueChange={(val) => setSelectedStaffId(val)}
                disabled={submitting || optionsLoading}
              >
                <SelectTrigger className="border-white/20 bg-white/10 text-white">
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {teachers.map((t) => (
                    <SelectItem key={t.id || t.username} value={t.username}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between">
                <Label className="text-xs font-bold text-white/80">Passcode</Label>
                {isDemo && <span className="text-[11px] text-emerald-400 font-mono">Demo: 1234</span>}
              </div>
              <Input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="1234"
                className="border-white/20 bg-white/10 text-white placeholder:text-white/40"
                disabled={submitting}
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-lime-600 font-bold text-white shadow-md hover:bg-lime-500"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entering Classroom…
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Enter Classroom
                </>
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleAdminSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <Label className="text-xs font-bold text-white/80">Admin Passcode</Label>
                {isDemo && <span className="text-[11px] text-emerald-400 font-mono">Demo: 1234</span>}
              </div>
              <Input
                type="password"
                value={adminPasscode}
                onChange={(e) => setAdminPasscode(e.target.value)}
                placeholder="1234"
                className="border-white/20 bg-white/10 text-white placeholder:text-white/40"
                disabled={submitting}
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-amber-600 font-bold text-white shadow-md hover:bg-amber-500"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying Admin…
                </>
              ) : (
                <>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Enter as Admin
                </>
              )}
            </Button>
          </form>
        )}

        <div className="mt-5 text-center">
          <Link
            href={schoolId ? `/${schoolId}/portal` : '/'}
            className="text-xs text-white/50 hover:text-white/80 transition-colors"
          >
            ← Back to School Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
