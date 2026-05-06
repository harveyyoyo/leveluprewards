'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { doc } from 'firebase/firestore';
import { GraduationCap, Shield, User, ChevronRight, Loader2 } from 'lucide-react';

import { useAppContext } from '@/components/AppProvider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type StaffPortalLoginOption = {
  id: string;
  sourceId?: string;
  type: 'teacher' | 'secretary' | 'prizeClerk' | 'reports';
  label: string;
  username: string;
};

type SchoolPublicStaffDirectory = {
  name?: string;
  logoUrl?: string;
  staffDirectory?: StaffPortalLoginOption[];
};

function staffLoginKey(option: StaffPortalLoginOption) {
  return option.id;
}

function officeRoleLabel(type: StaffPortalLoginOption['type']) {
  if (type === 'secretary') return 'Coupon printing';
  if (type === 'prizeClerk') return 'Prize desk';
  return 'Reports';
}

const rowButtonClass =
  'group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-slate-900 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2';

export default function SchoolSignInChooserPage() {
  const params = useParams<{ schoolId: string }>();
  const router = useRouter();
  const playSound = useArcadeSound();
  const { toast } = useToast();
  const { login, isInitialized, schoolId: activeSchoolId } = useAppContext();
  const firestore = useFirestore();
  const [loadingId, setLoadingId] = useState<'student' | null>(null);
  const [facultyStepActive, setFacultyStepActive] = useState(false);
  const [staffAccount, setStaffAccount] = useState('');

  const schoolId = useMemo(() => (params.schoolId || activeSchoolId || '').trim().toLowerCase(), [activeSchoolId, params.schoolId]);
  const schoolPublicRef = useMemoFirebase(
    () => (schoolId ? doc(firestore, 'schoolPublic', schoolId) : null),
    [firestore, schoolId],
  );
  const { data: schoolPublic, isLoading: staffLoading } = useDoc<SchoolPublicStaffDirectory>(schoolPublicRef);
  const staffOptions = useMemo(
    () =>
      (schoolPublic?.staffDirectory || []).filter(
        (option) =>
          option?.id &&
          option?.username &&
          option?.label &&
          (option.type === 'teacher' || option.type === 'secretary' || option.type === 'prizeClerk' || option.type === 'reports'),
      ),
    [schoolPublic],
  );
  const allStaffForDropdown = useMemo(() => {
    const list = [...staffOptions];
    list.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
    return list;
  }, [staffOptions]);

  const displaySchoolName = (schoolPublic?.name ?? '').trim() || schoolId || 'School';
  const welcomeTitle = `Welcome to ${displaySchoolName}`;
  const logoInitial = displaySchoolName.charAt(0).toUpperCase() || 'S';
  const logoUrl = (schoolPublic?.logoUrl ?? '').trim();

  const goToStaffLogin = useCallback(
    (accountKey: string) => {
      if (!schoolId || !accountKey) return;
      playSound('click');
      router.push(`/${schoolId}/teacher?account=${encodeURIComponent(accountKey)}`);
    },
    [playSound, router, schoolId],
  );

  const handleStaffPick = useCallback(
    (accountKey: string) => {
      if (!accountKey) return;
      setStaffAccount(accountKey);
      goToStaffLogin(accountKey);
    },
    [goToStaffLogin],
  );

  const enterStudentKiosk = useCallback(async () => {
    if (!schoolId) return;
    setLoadingId('student');
    try {
      const ok = await login('student', { schoolId });
      if (!ok) throw new Error('Student kiosk login failed.');
      playSound('login');
      router.replace(`/${schoolId}/student`);
    } catch {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Could not open student kiosk',
        description: 'Check your connection and try again.',
      });
    } finally {
      setLoadingId(null);
    }
  }, [login, playSound, router, schoolId, toast]);

  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f9fafb] p-8">
        <Button disabled variant="ghost" size="lg" className="text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
          Loading...
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f9fafb] px-4 py-10 font-sans">
      <div className="w-full max-w-md">
        <div className="rounded-[28px] border border-slate-200/80 bg-white p-8 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.12)]">
          <div className="flex flex-col items-center text-center">
            <div className="mb-5 flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-900 text-xl font-bold text-white shadow-inner">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- school branding URLs from Firestore (same pattern as Header)
                <img src={logoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                logoInitial
              )}
            </div>
            <h1 className="text-balance text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{welcomeTitle}</h1>
            <p className="mt-1.5 text-sm text-slate-500">Choose your sign-in</p>
          </div>

          <div className="mt-8 space-y-3">
            <Link
              href={`/${schoolId}/admin-signin`}
              onClick={() => {
                playSound('click');
                setFacultyStepActive(false);
                setStaffAccount('');
              }}
              className={rowButtonClass}
            >
              <Shield className="h-5 w-5 shrink-0 text-slate-600" aria-hidden />
              <span className="min-w-0 flex-1 text-center text-base font-semibold text-slate-900">Admin</span>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>

            <button
              type="button"
              onClick={() => {
                playSound('click');
                setFacultyStepActive(true);
                setStaffAccount('');
              }}
              aria-expanded={facultyStepActive}
              aria-controls="faculty-staff-select-panel"
              className={cn(rowButtonClass, facultyStepActive && 'ring-2 ring-slate-300 ring-offset-2 ring-offset-white')}
            >
              <User className="h-5 w-5 shrink-0 text-slate-600" aria-hidden />
              <span className="min-w-0 flex-1 text-center text-base font-semibold text-slate-900">Faculty</span>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </button>

            <button
              type="button"
              onClick={() => {
                playSound('click');
                setFacultyStepActive(false);
                setStaffAccount('');
                void enterStudentKiosk();
              }}
              disabled={!!loadingId}
              className={cn(rowButtonClass, 'disabled:pointer-events-none disabled:opacity-70')}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center text-slate-600">
                {loadingId === 'student' ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                ) : (
                  <GraduationCap className="h-5 w-5" aria-hidden />
                )}
              </span>
              <span className="min-w-0 flex-1 text-center text-base font-semibold text-slate-900">Students</span>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </button>
          </div>

          {facultyStepActive && (
            <div id="faculty-staff-select-panel" className="mt-4 rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-4">
              <Label htmlFor="staff-account" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Staff account
              </Label>
              <Select
                value={staffAccount || undefined}
                onValueChange={handleStaffPick}
                disabled={staffLoading || allStaffForDropdown.length === 0}
              >
                <SelectTrigger id="staff-account" className="mt-2 h-12 rounded-xl border-slate-200 bg-white font-semibold text-slate-900">
                  <SelectValue
                    placeholder={
                      staffLoading
                        ? 'Loading staff…'
                        : allStaffForDropdown.length
                          ? 'Choose your name'
                          : 'No staff accounts listed yet'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {allStaffForDropdown.map((option) => (
                    <SelectItem key={staffLoginKey(option)} value={staffLoginKey(option)}>
                      {option.type === 'teacher'
                        ? option.label
                        : `${option.label} — ${officeRoleLabel(option.type)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="mt-6 border-t border-slate-100 pt-6 text-center">
            <Link
              href={`/${schoolId}/portal`}
              onClick={() => playSound('click')}
              className="text-sm font-medium text-slate-500 underline-offset-4 transition-colors hover:text-slate-800 hover:underline"
            >
              Back to portal
            </Link>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">{displaySchoolName}</p>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">By continuing you agree to the school IT policy.</p>
      </div>
    </div>
  );
}
