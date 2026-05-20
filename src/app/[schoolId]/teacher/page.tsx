'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppContext } from '@/components/AppProvider';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { LogIn, LogOut, UserCheck, Loader2, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { cn } from '@/lib/utils';

const TeacherPrinterInner = dynamic(
    () =>
        import('./TeacherPrinterInner')
            .then((module) => module.TeacherPrinterInner)
            .catch((err) => {
                if (typeof window !== 'undefined' && (err.message?.includes('Loading chunk') || err.name === 'ChunkLoadError')) {
                    window.location.reload();
                }
                throw err;
            }),
    { ssr: false, loading: () => <TeacherPrinterSkeleton /> },
);

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

function staffLoginKey(option: StaffPortalLoginOption) {
    return option.id;
}

function roleLabel(type: StaffPortalLoginOption['type']) {
    if (type === 'teacher') return 'Teacher';
    if (type === 'secretary') return 'Coupon printing';
    if (type === 'prizeClerk') return 'Prize desk';
    if (type === 'librarian') return 'Library';
    if (type === 'office') return 'School Office';
    if (type === 'houseCoordinator') return 'Houses';
    return 'Reports';
}

function staffLandingPath(schoolId: string, type: StaffPortalLoginOption['type']) {
    if (type === 'secretary') return `/${schoolId}/secretary`;
    if (type === 'prizeClerk') return `/${schoolId}/admin`;
    if (type === 'reports') return `/${schoolId}/reports`;
    if (type === 'librarian') return `/${schoolId}/librarian`;
    if (type === 'office') return `/${schoolId}/office`;
    if (type === 'houseCoordinator') return `/${schoolId}/admin`;
    return `/${schoolId}/teacher`;
}

function TeacherPrinterSkeleton() {
    const { settings } = useSettings();
    const isGraphic = settings.graphicMode === 'graphics';
    return (
        <div
            className={cn(
                'min-h-screen flex items-center justify-center font-sans bg-background',
                isGraphic ? 'text-primary' : 'text-muted-foreground',
            )}
        >
            <Button disabled variant="ghost" size="lg" className="text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
                Loading Teacher Portal…
            </Button>
        </div>
    );
}

function TeacherPrinter(props: { teacherName: string; teacherId: string; onLogout: () => void }) {
    const { isAdmin, isTeacher, loginState } = useAppContext();
    const canOpenTeacherPortal =
        isAdmin ||
        isTeacher ||
        loginState === 'admin' ||
        loginState === 'developer' ||
        loginState === 'teacher';
    if (!canOpenTeacherPortal) {
        return <TeacherPrinterSkeleton />;
    }
    return (
        <ErrorBoundary name="TeacherPrinter">
            <TeacherPrinterInner {...props} />
        </ErrorBoundary>
    );
}

export default function TeacherPage() {
    const { loginState, isInitialized, schoolId: activeSchoolId, login, logout, isAdmin, isTeacher, userName, userId, teacherDocId } = useAppContext();
    const params = useParams<{ schoolId: string }>();
    const router = useRouter();
    const searchParams = useSearchParams();
    const firestore = useFirestore();
    const { settings } = useSettings();
    const isGraphic = settings.graphicMode === 'graphics';
    const playSound = useArcadeSound();
    const { toast } = useToast();

    const [adminDialogOpen, setAdminDialogOpen] = useState(false);
    const [adminPasscode, setAdminPasscode] = useState('');
    const [adminSubmitting, setAdminSubmitting] = useState(false);
    const [selectedLoginKey, setSelectedLoginKey] = useState('');
    const [passcode, setPasscode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const passcodeRef = useRef<HTMLInputElement | null>(null);
    const directAccountKey = searchParams.get('account') || '';
    const adminTeacherBypass = searchParams.get('as') === 'admin';
    const schoolId = useMemo(
        () => (params.schoolId || activeSchoolId || '').trim().toLowerCase(),
        [activeSchoolId, params.schoolId],
    );

    const schoolPublicRef = useMemoFirebase(
        () => (schoolId ? doc(firestore, 'schoolPublic', schoolId) : null),
        [firestore, schoolId],
    );
    const {
        data: schoolPublic,
        isLoading: optionsLoading,
        error: optionsError,
    } = useDoc<SchoolPublicStaffDirectory>(schoolPublicRef);
    const staffOptions = useMemo(
        () =>
            (schoolPublic?.staffDirectory || []).filter(
                (option) =>
                    option?.id &&
                    option?.username &&
                    option?.label &&
                    (option.type === 'teacher' ||
                        option.type === 'secretary' ||
                        option.type === 'prizeClerk' ||
                        option.type === 'reports' ||
                        option.type === 'librarian' ||
                        option.type === 'office' ||
                        option.type === 'houseCoordinator'),
            ),
        [schoolPublic],
    );

    useEffect(() => {
        if (!isInitialized || !schoolId) return;
        if (directAccountKey) return;
        if (loginState === 'secretary') {
            router.replace(`/${schoolId}/secretary`);
        } else if (loginState === 'prizeClerk') {
            router.replace(`/${schoolId}/admin`);
        } else if (loginState === 'reports') {
            router.replace(`/${schoolId}/reports`);
        } else if (loginState === 'librarian') {
            router.replace(`/${schoolId}/librarian`);
        } else if (loginState === 'office') {
            router.replace(`/${schoolId}/office`);
        } else if (loginState === 'houseCoordinator') {
            router.replace(`/${schoolId}/admin`);
        }
    }, [directAccountKey, isInitialized, loginState, schoolId, router]);

    useEffect(() => {
        if (
            isInitialized &&
            !schoolId &&
            !['student', 'teacher', 'admin', 'school', 'developer', 'secretary', 'prizeClerk', 'reports', 'librarian', 'office', 'houseCoordinator'].includes(loginState)
        ) {
            router.replace('/');
        }
    }, [isInitialized, loginState, router, schoolId]);

    useEffect(() => {
        if (!optionsError) return;
        toast({
            variant: 'destructive',
            title: 'Could not load staff list',
            description: 'Open Admin > Staff once to publish the staff directory, then refresh this page.',
        });
    }, [optionsError, toast]);

    useEffect(() => {
        if (!directAccountKey || staffOptions.length === 0) return;
        const match = staffOptions.find((option) => staffLoginKey(option) === directAccountKey);
        if (match) {
            setSelectedLoginKey(staffLoginKey(match));
        }
    }, [directAccountKey, staffOptions]);

    useEffect(() => {
        // If a staff account was preselected (e.g. from sign-in chooser link),
        // focus the passcode so user can type immediately and hit Enter.
        if (!isInitialized) return;
        if (!selectedLoginKey) return;
        passcodeRef.current?.focus();
        passcodeRef.current?.select?.();
    }, [isInitialized, selectedLoginKey]);

    const handleLogin = async () => {
        if (isSubmitting) return;
        if (!schoolId || !selectedLoginKey || !passcode) {
            playSound('error');
            toast({ variant: 'destructive', title: 'Please select your name and enter a passcode.' });
            return;
        }

        const selected = staffOptions.find((option) => staffLoginKey(option) === selectedLoginKey);
        if (!selected) {
            playSound('error');
            toast({ variant: 'destructive', title: 'Choose a staff account from the list.' });
            return;
        }

        setIsSubmitting(true);
        try {
            const authResult = await login(selected.type, {
                schoolId: schoolId || undefined,
                username: selected.username,
                passcode,
                teacherName: selected.label,
                teacherDocId: selected.type === 'teacher' ? selected.sourceId || selected.id.replace(/^teacher:/, '') : undefined,
            });

            if (authResult.ok) {
                playSound('login');
                toast({ title: 'Logged in successfully.' });
                router.replace(staffLandingPath(schoolId, selected.type));
            } else {
                playSound('error');
                toast({ variant: 'destructive', title: 'Login failed', description: authResult.message });
                setPasscode('');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLogout = () => {
        playSound('swoosh');
        logout({ staffNavigateTo: 'teacher' });
    };

    if (!isInitialized || !schoolId) {
        return (
            <div className={`min-h-screen flex items-center justify-center font-sans ${isGraphic ? 'bg-background text-primary' : 'bg-background text-muted-foreground'}`}>
                <Button disabled variant="ghost" size="lg" className="text-muted-foreground">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Initializing Portal...
                </Button>
            </div>
        );
    }

    const canOpenTeacherTools =
        loginState === 'teacher' ||
        (adminTeacherBypass && (loginState === 'admin' || loginState === 'developer') && isAdmin);

    if (!directAccountKey && canOpenTeacherTools) {
        const displayName =
            userName || (loginState === 'admin' || loginState === 'developer' ? 'Admin' : 'Teacher');
        const validTeacherId = teacherDocId || userId || '';
        return <TeacherPrinter teacherName={displayName} teacherId={validTeacherId} onLogout={handleLogout} />;
    }

    const selectedOption = staffOptions.find((option) => staffLoginKey(option) === selectedLoginKey);
    const directAccountSelected = !!directAccountKey && !!selectedOption && staffLoginKey(selectedOption) === directAccountKey;

    return (
        <ErrorBoundary name="TeacherPage">
            <div className={`min-h-screen flex flex-col items-center justify-center transition-colors duration-500 py-10 px-4 ${isGraphic ? 'bg-gradient-to-br from-indigo-950/20 to-slate-900/20' : 'bg-slate-100'}`}>
                <Card className={`w-full max-w-md border-t-4 transition-all ${isGraphic
                    ? 'bg-card/80 backdrop-blur-xl border-primary shadow-[0_0_50px_hsl(var(--chart-1)/0.2)]'
                    : 'bg-white border-chart-1 shadow-2xl'
                    }`}>
                    <CardHeader className="text-center space-y-4">
                        <div className="w-20 h-20 mx-auto rounded-3xl flex items-center justify-center shadow-lg transition-transform hover:scale-105 duration-300 bg-primary text-primary-foreground">
                            <UserCheck className="w-10 h-10" />
                        </div>
                        <div>
                            <CardTitle className={`text-2xl font-black tracking-tight ${isGraphic ? 'text-foreground' : 'text-slate-800'}`}>Teacher Portal</CardTitle>
                            <CardDescription className={isGraphic ? 'text-muted-foreground' : ''}>
                                Print point coupons from the Points tab, use Manually Add or Deduct Points for direct changes, and manage reports and prizes.
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <form
                            className="space-y-6"
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (!isSubmitting) void handleLogin();
                            }}
                        >
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="staff-account" className={`text-xs font-semibold uppercase tracking-wide ${isGraphic ? 'text-muted-foreground' : 'text-slate-500'}`}>Staff member</Label>
                                    {directAccountSelected ? (
                                        <div className={`min-h-14 rounded-xl border px-4 py-3 ${isGraphic ? 'bg-foreground/5 border-border' : 'bg-slate-50'}`}>
                                            <p className="text-lg font-bold leading-tight">{selectedOption.label}</p>
                                            <p className="text-xs text-muted-foreground">{roleLabel(selectedOption.type)}</p>
                                        </div>
                                    ) : (
                                        <Select value={selectedLoginKey} onValueChange={setSelectedLoginKey} disabled={optionsLoading}>
                                            <SelectTrigger
                                                id="staff-account"
                                                className={`h-14 rounded-xl text-lg font-bold ${isGraphic ? 'bg-foreground/5 border-border' : 'bg-slate-50'}`}
                                            >
                                                <SelectValue
                                                    placeholder={
                                                        optionsLoading
                                                            ? 'Loading staff...'
                                                            : staffOptions.length === 0
                                                                ? 'No staff published yet'
                                                                : 'Select your name...'
                                                    }
                                                />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {staffOptions.map((option) => (
                                                    <SelectItem key={staffLoginKey(option)} value={staffLoginKey(option)}>
                                                        {option.label}{option.type === 'teacher' ? '' : ` - ${roleLabel(option.type)}`}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="teacher-passcode" className={`text-xs font-semibold uppercase tracking-wide ${isGraphic ? 'text-muted-foreground' : 'text-slate-500'}`}>Passcode</Label>
                                    <Input
                                        id="teacher-passcode"
                                        type="password"
                                        value={passcode}
                                        onChange={(e) => setPasscode(e.target.value)}
                                        ref={passcodeRef}
                                        className={`h-14 rounded-xl text-lg font-mono tracking-widest text-center ${isGraphic ? 'bg-foreground/5 border-border' : 'bg-slate-50'}`}
                                        autoComplete="current-password"
                                        autoFocus={!!directAccountKey}
                                    />
                                </div>
                            </div>

                            <Button type="submit" className="w-full h-16 rounded-2xl font-black text-lg uppercase tracking-widest shadow-xl transition-all active:scale-95 text-primary-foreground bg-primary hover:bg-primary/90 shadow-primary/20" disabled={optionsLoading || isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-3 w-6 h-6 animate-spin" aria-hidden />
                                        Signing in...
                                    </>
                                ) : (
                                    <>
                                        <LogIn className="mr-3 w-6 h-6" aria-hidden /> Login
                                    </>
                                )}
                            </Button>

                            {isAdmin && loginState === 'admin' && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full h-12 rounded-xl font-bold"
                                    onClick={() => {
                                        playSound('click');
                                        router.replace(`/${schoolId}/teacher?as=admin`);
                                    }}
                                    disabled={isSubmitting}
                                >
                                    <ShieldCheck className="mr-2 h-4 w-4" aria-hidden />
                                    Continue as admin
                                </Button>
                            )}

                            {!isAdmin && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full h-12 rounded-xl font-bold"
                                    onClick={() => {
                                        playSound('click');
                                        setAdminDialogOpen(true);
                                    }}
                                >
                                    <ShieldCheck className="mr-2 h-4 w-4" aria-hidden />
                                    Sign in as admin
                                </Button>
                            )}
                        </form>

                        <Dialog
                            open={adminDialogOpen}
                            onOpenChange={(open) => {
                                if (!open) {
                                    setAdminSubmitting(false);
                                    setAdminPasscode('');
                                }
                                setAdminDialogOpen(open);
                            }}
                        >
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle className="font-headline font-black tracking-tight">Admin passcode</DialogTitle>
                                    <DialogDescription>Enter the admin passcode for this school to open the teacher portal as admin.</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-2">
                                    <Label htmlFor="admin-passcode" className="text-xs font-semibold text-muted-foreground">
                                        Passcode
                                    </Label>
                                    <Input
                                        id="admin-passcode"
                                        type="password"
                                        value={adminPasscode}
                                        onChange={(e) => setAdminPasscode(e.target.value)}
                                        className="h-12 rounded-xl font-mono tracking-[0.35em] text-center"
                                        autoComplete="current-password"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key !== 'Enter') return;
                                            e.preventDefault();
                                            if (adminSubmitting) return;
                                            void (async () => {
                                                if (!adminPasscode.trim()) {
                                                    playSound('error');
                                                    toast({
                                                        variant: 'destructive',
                                                        title: 'Missing passcode',
                                                        description: 'Enter the admin passcode to continue.',
                                                    });
                                                    return;
                                                }
                                                setAdminSubmitting(true);
                                                const authResult = await login('admin', { schoolId, passcode: adminPasscode.trim() });
                                                if (!authResult.ok) {
                                                    setAdminSubmitting(false);
                                                    playSound('error');
                                                    toast({
                                                        variant: 'destructive',
                                                        title: 'Login failed',
                                                        description: authResult.message,
                                                    });
                                                    setAdminPasscode('');
                                                    return;
                                                }
                                                playSound('login');
                                                setAdminDialogOpen(false);
                                                router.replace(`/${schoolId}/teacher?as=admin`);
                                            })();
                                        }}
                                    />
                                </div>
                                <DialogFooter className="gap-2 sm:gap-0">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="rounded-xl font-bold"
                                        onClick={() => setAdminDialogOpen(false)}
                                        disabled={adminSubmitting}
                                    >
                                        Back
                                    </Button>
                                    <Button
                                        type="button"
                                        className="rounded-xl font-black"
                                        disabled={adminSubmitting}
                                        onClick={() => {
                                            if (adminSubmitting) return;
                                            void (async () => {
                                                if (!adminPasscode.trim()) {
                                                    playSound('error');
                                                    toast({
                                                        variant: 'destructive',
                                                        title: 'Missing passcode',
                                                        description: 'Enter the admin passcode to continue.',
                                                    });
                                                    return;
                                                }
                                                setAdminSubmitting(true);
                                                const authResult = await login('admin', { schoolId, passcode: adminPasscode.trim() });
                                                if (!authResult.ok) {
                                                    setAdminSubmitting(false);
                                                    playSound('error');
                                                    toast({
                                                        variant: 'destructive',
                                                        title: 'Login failed',
                                                        description: authResult.message,
                                                    });
                                                    setAdminPasscode('');
                                                    return;
                                                }
                                                playSound('login');
                                                setAdminDialogOpen(false);
                                                router.replace(`/${schoolId}/teacher?as=admin`);
                                            })();
                                        }}
                                    >
                                        {adminSubmitting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                                                Signing in...
                                            </>
                                        ) : (
                                            'Continue'
                                        )}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </CardContent>
                </Card>
            </div>
        </ErrorBoundary>
    );
}
