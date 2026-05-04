'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { doc } from 'firebase/firestore';
import { GraduationCap, ShieldCheck, Users, ChevronRight, Loader2 } from 'lucide-react';

import { useAppContext } from '@/components/AppProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
      <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center p-8">
        <Button disabled variant="ghost" size="lg" className="text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
          Loading...
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-4xl border-t-8 border-primary shadow-lg">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-black tracking-tight">Sign in</CardTitle>
          <CardDescription>Choose how you want to sign in for this school.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Link
              href={`/${schoolId}/admin-signin`}
              onClick={() => {
                playSound('click');
                setFacultyStepActive(false);
                setStaffAccount('');
              }}
              className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <div className="group relative flex h-full min-h-[8.5rem] flex-col justify-between rounded-2xl border bg-card px-4 py-4 transition-all hover:shadow-md hover:-translate-y-0.5 sm:px-5">
                <div className="flex flex-col gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-border/60">
                    <ShieldCheck className="h-6 w-6" aria-hidden />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="font-black text-lg leading-tight truncate">Admin</p>
                    <p className="text-sm text-muted-foreground leading-snug">Passcode sign-in for school setup.</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 self-end text-muted-foreground/60 group-hover:text-muted-foreground transition-colors" aria-hidden />
              </div>
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
              className={cn(
                'text-left rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                facultyStepActive && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
              )}
            >
              <div className="group relative flex h-full min-h-[8.5rem] flex-col justify-between rounded-2xl border bg-card px-4 py-4 transition-all hover:shadow-md hover:-translate-y-0.5 sm:px-5">
                <div className="flex flex-col gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-border/60">
                    <Users className="h-6 w-6" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-lg leading-tight truncate">Faculty</p>
                    <p className="text-sm text-muted-foreground leading-snug">
                      Teachers and office staff — tap here, then pick your name below.
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 self-end text-muted-foreground/60 group-hover:text-muted-foreground transition-colors" aria-hidden />
              </div>
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
              className="text-left rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-80"
            >
              <div
                className={cn(
                  'group relative flex h-full min-h-[8.5rem] flex-col justify-between rounded-2xl border bg-card px-4 py-4 transition-all',
                  loadingId === 'student' ? 'opacity-80' : 'hover:shadow-md hover:-translate-y-0.5',
                )}
              >
                <div className="flex flex-col gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-border/60">
                    {loadingId === 'student' ? (
                      <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
                    ) : (
                      <GraduationCap className="h-6 w-6" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-lg leading-tight truncate">Students</p>
                    <p className="text-sm text-muted-foreground leading-snug">Kiosk: scan a badge to open the student dashboard.</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 self-end text-muted-foreground/60 group-hover:text-muted-foreground transition-colors" aria-hidden />
              </div>
            </button>
          </div>

          {facultyStepActive && (
            <div
              id="faculty-staff-select-panel"
              className="rounded-2xl border bg-muted/30 px-4 py-4 sm:px-5"
            >
              <Label htmlFor="staff-account" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Staff account
              </Label>
              <Select
                value={staffAccount || undefined}
                onValueChange={handleStaffPick}
                disabled={staffLoading || allStaffForDropdown.length === 0}
              >
                <SelectTrigger id="staff-account" className="mt-2 h-12 rounded-xl font-bold bg-card">
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

          <div className="pt-3">
            <Button
              variant="outline"
              className="w-full h-12 rounded-xl font-bold"
              asChild
            >
              <Link href={`/${schoolId}/portal`} onClick={() => playSound('click')}>
                Back to portal
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
