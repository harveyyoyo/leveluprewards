'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { doc } from 'firebase/firestore';
import { Building2, GraduationCap, ShieldCheck, Users, ChevronRight, Loader2 } from 'lucide-react';

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

type EntryCard = {
  id: 'student' | 'admin';
  title: string;
  description: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
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
  const [loadingId, setLoadingId] = useState<EntryCard['id'] | null>(null);
  const [facultyAccount, setFacultyAccount] = useState('');
  const [officeAccount, setOfficeAccount] = useState('');

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
  const facultyOptions = useMemo(() => staffOptions.filter((option) => option.type === 'teacher'), [staffOptions]);
  const officeOptions = useMemo(() => staffOptions.filter((option) => option.type !== 'teacher'), [staffOptions]);

  const goToStaffLogin = useCallback(
    (accountKey: string) => {
      if (!schoolId || !accountKey) return;
      playSound('click');
      router.push(`/${schoolId}/teacher?account=${encodeURIComponent(accountKey)}`);
    },
    [playSound, router, schoolId],
  );

  useEffect(() => {
    if (!facultyAccount) return;
    goToStaffLogin(facultyAccount);
  }, [facultyAccount, goToStaffLogin]);

  useEffect(() => {
    if (!officeAccount) return;
    goToStaffLogin(officeAccount);
  }, [officeAccount, goToStaffLogin]);

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

  const cards: EntryCard[] = useMemo(
    () => [
      {
        id: 'admin',
        title: 'Admin',
        description: 'Admin passcode sign-in.',
        icon: ShieldCheck,
        href: `/${schoolId}/admin-signin`,
      },
      {
        id: 'student',
        title: 'Student kiosk',
        description: 'No passcode needed. Scan a badge to open the student dashboard.',
        icon: GraduationCap,
        onClick: enterStudentKiosk,
      },
    ],
    [enterStudentKiosk, schoolId],
  );

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
      <Card className="w-full max-w-xl border-t-8 border-primary shadow-lg">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-black tracking-tight">Sign in</CardTitle>
          <CardDescription>Choose how you want to sign in for this school.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border bg-card px-5 py-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-border/60">
                  <Users className="h-6 w-6" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="font-black text-lg leading-tight truncate">Faculty</p>
                  <p className="text-sm text-muted-foreground leading-snug">Select your name.</p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <Label htmlFor="faculty-account" className="sr-only">Faculty member</Label>
                <Select
                  value={facultyAccount}
                  onValueChange={setFacultyAccount}
                  disabled={staffLoading || facultyOptions.length === 0}
                >
                  <SelectTrigger id="faculty-account" className="h-12 rounded-xl font-bold">
                    <SelectValue placeholder={staffLoading ? 'Loading...' : facultyOptions.length ? 'Choose faculty' : 'No faculty listed'} />
                  </SelectTrigger>
                  <SelectContent>
                    {facultyOptions.map((option) => (
                      <SelectItem key={staffLoginKey(option)} value={staffLoginKey(option)}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-2xl border bg-card px-5 py-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-border/60">
                  <Building2 className="h-6 w-6" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="font-black text-lg leading-tight truncate">Office staff</p>
                  <p className="text-sm text-muted-foreground leading-snug">Select your desk login.</p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <Label htmlFor="office-account" className="sr-only">Office staff member</Label>
                <Select
                  value={officeAccount}
                  onValueChange={setOfficeAccount}
                  disabled={staffLoading || officeOptions.length === 0}
                >
                  <SelectTrigger id="office-account" className="h-12 rounded-xl font-bold">
                    <SelectValue placeholder={staffLoading ? 'Loading...' : officeOptions.length ? 'Choose office staff' : 'No office staff listed'} />
                  </SelectTrigger>
                  <SelectContent>
                    {officeOptions.map((option) => (
                      <SelectItem key={staffLoginKey(option)} value={staffLoginKey(option)}>
                        {option.label} - {officeRoleLabel(option.type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {cards.map((c) => {
            const Icon = c.icon;
            const isBusy = loadingId === c.id;
            const cardInner = (
              <div
                className={cn(
                  'group relative flex items-center justify-between rounded-2xl border bg-card px-5 py-4 transition-all',
                  isBusy ? 'opacity-80' : 'hover:shadow-md hover:-translate-y-0.5',
                )}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-border/60">
                    <Icon className="h-6 w-6" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-black text-lg leading-tight truncate">{c.title}</p>
                      {isBusy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />}
                    </div>
                    <p className="text-sm text-muted-foreground leading-snug">{c.description}</p>
                  </div>
                </div>
                <ChevronRight className="h-6 w-6 text-muted-foreground/60 group-hover:text-muted-foreground transition-colors" aria-hidden />
              </div>
            );

            if (c.href) {
              return (
                <Link
                  key={c.id}
                  href={c.href}
                  onClick={() => playSound('click')}
                  className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {cardInner}
                </Link>
              );
            }

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  playSound('click');
                  c.onClick?.();
                }}
                disabled={!!loadingId}
                className="w-full text-left rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed"
              >
                {cardInner}
              </button>
            );
          })}

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
