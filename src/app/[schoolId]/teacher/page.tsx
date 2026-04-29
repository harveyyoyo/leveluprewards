
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppContext } from '@/components/AppProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Teacher } from '@/lib/types';
import { LogIn, LogOut, UserCheck, Loader2 } from 'lucide-react';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { TeacherPrinterInner } from './TeacherPrinterInner';

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
    const { loginState, isInitialized, schoolId, login, logout, isAdmin, isTeacher, userName, userId, teacherDocId } = useAppContext();
    const router = useRouter();
    const firestore = useFirestore();
    const { settings } = useSettings();
    const isGraphic = settings.graphicMode === 'graphics';
    const playSound = useArcadeSound();
    const { toast } = useToast();

    const [selectedLoginName, setSelectedLoginName] = useState('');
    const [passcode, setPasscode] = useState('');

    const teachersQuery = useMemoFirebase(() => (schoolId ? collection(firestore, 'schools', schoolId, 'teachers') : null), [firestore, schoolId]);
    const { data: teachers, isLoading: teachersLoading } = useCollection<Teacher>(teachersQuery);

    useEffect(() => {
        if (!isInitialized || !schoolId) return;
        if (loginState === 'secretary') {
            router.replace(`/${schoolId}/secretary`);
        } else if (loginState === 'prizeClerk') {
            router.replace(`/${schoolId}/prize-clerk`);
        }
    }, [isInitialized, loginState, schoolId, router]);

    useEffect(() => {
        if (isInitialized && !['student', 'teacher', 'admin', 'school', 'developer', 'secretary', 'prizeClerk'].includes(loginState)) {
            router.replace('/');
        }
    }, [isInitialized, loginState, router]);

    const handleLogin = async () => {
        if (!selectedLoginName || !passcode) {
            playSound('error');
            toast({ variant: 'destructive', title: 'Please select your name and enter a passcode.' });
            return;
        }

        const teacher = teachers?.find((t) => (t.username || t.id) === selectedLoginName);
        const result = await login('teacher', {
            schoolId: schoolId || undefined,
            username: selectedLoginName,
            passcode,
            teacherName: teacher?.name,
            teacherDocId: teacher?.id,
        });
        if (result) {
            playSound('login');
            toast({ title: 'Logged in successfully.' });
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

    if (loginState === 'teacher' || loginState === 'admin' || loginState === 'developer') {
        const displayName = userName || (loginState === 'admin' || loginState === 'developer' ? 'Admin' : 'Teacher');
        const validTeacherId = teacherDocId || userId || '';
        return <TeacherPrinter teacherName={displayName} teacherId={validTeacherId} onLogout={handleLogout} />;
    }

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
                            <CardDescription className={isGraphic ? 'text-muted-foreground' : ''}>Login to grant rewards and print coupons.</CardDescription>
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
                                    <Label htmlFor="teacher-username" className={`text-xs font-semibold uppercase tracking-wide ${isGraphic ? 'text-muted-foreground' : 'text-slate-500'}`}>Teacher Name</Label>
                                    <Select value={selectedLoginName} onValueChange={setSelectedLoginName}>
                                        <SelectTrigger
                                            id="teacher-username"
                                            className={`h-14 rounded-xl text-lg font-bold ${isGraphic ? 'bg-foreground/5 border-border' : 'bg-slate-50'}`}
                                        >
                                            <SelectValue placeholder="Select your name..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {teachers?.map((t) => (
                                                <SelectItem key={t.id} value={t.username || t.id}>
                                                    {t.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
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

                            <Button type="submit" className="w-full h-16 rounded-2xl font-black text-lg uppercase tracking-widest shadow-xl transition-all active:scale-95 text-primary-foreground bg-primary hover:bg-primary/90 shadow-primary/20" disabled={teachersLoading}>
                                <LogIn className="mr-3 w-6 h-6" /> Login
                            </Button>
                        </form>

                        <div className="text-center pt-4 border-t border-dashed border-border/50 space-y-2 text-xs text-muted-foreground">
                            <p>Other staff sign-in:</p>
                            <div className="flex flex-col sm:flex-row gap-2 justify-center">
                                <Button variant="link" className="h-auto p-0 text-xs" asChild>
                                    <Link href={`/${schoolId}/secretary`}>Secretary (print coupons)</Link>
                                </Button>
                                <span className="hidden sm:inline" aria-hidden="true">
                                    ·
                                </span>
                                <Button variant="link" className="h-auto p-0 text-xs" asChild>
                                    <Link href={`/${schoolId}/prize-clerk`}>Prize desk</Link>
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </ErrorBoundary>
    );
}
