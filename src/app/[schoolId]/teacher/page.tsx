'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { LogIn, LogOut, UserCheck, Loader2 } from 'lucide-react';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { ErrorBoundary } from '@/components/ErrorBoundary';

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

function roleLabel(type: StaffPortalLoginOption['type']) {
    if (type === 'teacher') return 'Teacher';
    if (type === 'secretary') return 'Coupon printing';
    if (type === 'prizeClerk') return 'Prize desk';
    return 'Reports';
}

function staffLandingPath(schoolId: string, type: StaffPortalLoginOption['type']) {
    if (type === 'secretary') return `/${schoolId}/secretary`;
    if (type === 'prizeClerk') return `/${schoolId}/prize-clerk`;
    if (type === 'reports') return `/${schoolId}/reports`;
    return `/${schoolId}/teacher`;
}

function TeacherPrinterSkeleton() {
    return (
        <div className="max-w-full mx-auto px-4 md:px-6 -mt-6 animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="border-t-8 border-primary">
                    <CardHeader>
                        <div className="h-6 w-32 bg-muted rounded" />
                        <div className="h-4 w-48 bg-muted rounded" />
                    </CardHeader>
                    <CardContent>
                        <div className="h-48 w-full rounded-xl bg-muted" />
                    </CardContent>
                </Card>
                <Card className="border-t-8 border-chart-2">
                    <CardHeader>
                        <div className="h-6 w-32 bg-muted rounded" />
                        <div className="h-4 w-48 bg-muted rounded" />
                    </CardHeader>
                    <CardContent>
                        <div className="h-48 w-full rounded-xl bg-muted" />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function TeacherPrinter(props: { teacherName: string; teacherId: string; onLogout: () => void }) {
    const { isAdmin, isTeacher } = useAppContext();
    if (!isAdmin && !isTeacher) {
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

    const [selectedLoginKey, setSelectedLoginKey] = useState('');
    const [passcode, setPasscode] = useState('');
    const directAccountKey = searchParams.get('account') || '';
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
                    (option.type === 'teacher' || option.type === 'secretary' || option.type === 'prizeClerk' || option.type === 'reports'),
            ),
        [schoolPublic],
    );

    useEffect(() => {
        if (!isInitialized || !schoolId) return;
        if (directAccountKey) return;
        if (loginState === 'secretary') {
            router.replace(`/${schoolId}/secretary`);
        } else if (loginState === 'prizeClerk') {
            router.replace(`/${schoolId}/prize-clerk`);
        } else if (loginState === 'reports') {
            router.replace(`/${schoolId}/reports`);
        }
    }, [directAccountKey, isInitialized, loginState, schoolId, router]);

    useEffect(() => {
        if (isInitialized && !schoolId && !['student', 'teacher', 'admin', 'school', 'developer', 'secretary', 'prizeClerk', 'reports'].includes(loginState)) {
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

    const handleLogin = async () => {
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

        const result = await login(selected.type, {
            schoolId: schoolId || undefined,
            username: selected.username,
            passcode,
            teacherName: selected.label,
            teacherDocId: selected.type === 'teacher' ? selected.sourceId || selected.id.replace(/^teacher:/, '') : undefined,
        });

        if (result) {
            playSound('login');
            toast({ title: 'Logged in successfully.' });
            router.replace(staffLandingPath(schoolId, selected.type));
        } else {
            playSound('error');
            toast({ variant: 'destructive', title: 'Login failed', description: 'Check your passcode and try again.' });
            setPasscode('');
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

    if (!directAccountKey && (loginState === 'teacher' || loginState === 'admin' || loginState === 'developer')) {
        const displayName = userName || (loginState === 'admin' || loginState === 'developer' ? 'Admin' : 'Teacher');
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
                            <CardTitle className={`text-2xl font-black tracking-tight ${isGraphic ? 'text-foreground' : 'text-slate-800'}`}>Teacher & Faculty Portal</CardTitle>
                            <CardDescription className={isGraphic ? 'text-muted-foreground' : ''}>Login to use your school faculty tools.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <form
                            className="space-y-6"
                            onSubmit={(e) => {
                                e.preventDefault();
                                void handleLogin();
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
                                        className={`h-14 rounded-xl text-lg font-mono tracking-widest text-center ${isGraphic ? 'bg-foreground/5 border-border' : 'bg-slate-50'}`}
                                        autoComplete="current-password"
                                    />
                                </div>
                            </div>

                            <Button type="submit" className="w-full h-16 rounded-2xl font-black text-lg uppercase tracking-widest shadow-xl transition-all active:scale-95 text-primary-foreground bg-primary hover:bg-primary/90 shadow-primary/20" disabled={optionsLoading}>
                                <LogIn className="mr-3 w-6 h-6" /> Login
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </ErrorBoundary>
    );
}
