'use client';

import { Suspense, useCallback, useEffect, useState, type CSSProperties } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/components/AppProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { Loader2, LogIn, LogOut, Gift } from 'lucide-react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { rainbowTripletForNavId, complementTripletForNavId } from '@/lib/rainbowNav';
import { PrizeDashboard } from '@/app/[schoolId]/prize/PrizeDashboard';
import type { StudentFoundMeta } from '@/components/StudentScanner';

const StudentScanner = dynamic(
    () => import('@/components/StudentScanner').then((m) => m.StudentScanner),
    { ssr: false },
);

export default function PrizeClerkPage() {
    const { loginState, isInitialized, schoolId, login, logout, userName } = useAppContext();
    const router = useRouter();
    const { settings } = useSettings();
    const isGraphic = settings.graphicMode === 'graphics';
    const playSound = useArcadeSound();
    const { toast } = useToast();
    const [username, setUsername] = useState('');
    const [passcode, setPasscode] = useState('');
    const [deskStudentId, setDeskStudentId] = useState<string | null>(null);

    useEffect(() => {
        if (!isInitialized || !schoolId) return;
        if (loginState === 'secretary') {
            router.replace(`/${schoolId}/secretary`);
        } else if (loginState === 'admin' || loginState === 'developer') {
            router.replace(`/${schoolId}/admin`);
        } else if (loginState === 'teacher') {
            router.replace(`/${schoolId}/teacher`);
        }
    }, [isInitialized, loginState, schoolId, router]);

    const onScannerStudent = useCallback((id: string, _meta?: StudentFoundMeta) => {
        setDeskStudentId(id);
    }, []);

    const handleDone = useCallback(() => {
        setDeskStudentId(null);
    }, []);

    const handlePrizeSessionExit = useCallback(() => {
        playSound('swoosh');
        handleDone();
        toast({ title: 'Session cleared', description: 'Scan the next student when ready.' });
    }, [handleDone, playSound, toast]);

    const handleLogin = async () => {
        if (!schoolId || !username.trim() || !passcode) {
            playSound('error');
            toast({ variant: 'destructive', title: 'Enter username and passcode.' });
            return;
        }
        const ok = await login('prizeClerk', {
            schoolId,
            username: username.trim(),
            passcode,
        });
        if (ok) {
            playSound('login');
            toast({ title: 'Signed in' });
        } else {
            playSound('error');
            toast({
                variant: 'destructive',
                title: 'Login failed',
                description: 'Check credentials or ask an admin to add this account under Desk staff.',
            });
            setPasscode('');
        }
    };

    const handleStaffLogout = () => {
        playSound('swoosh');
        handleDone();
        logout({ staffNavigateTo: 'portal' });
    };

    if (!isInitialized || !schoolId) {
        return (
            <div className={`min-h-screen flex items-center justify-center font-sans ${isGraphic ? 'bg-background text-primary' : 'bg-background text-muted-foreground'}`}>
                <Button disabled variant="ghost" size="lg" className="text-muted-foreground">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Loading…
                </Button>
            </div>
        );
    }

    if (loginState === 'prizeClerk') {
        if (deskStudentId) {
            return (
                <ErrorBoundary name="PrizeClerkDesk">
                    <Suspense
                        fallback={
                            <div className="min-h-[40vh] flex items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        }
                    >
                        <PrizeDashboard
                            studentId={deskStudentId}
                            onDone={handleDone}
                            onRequestExit={handlePrizeSessionExit}
                        />
                    </Suspense>
                </ErrorBoundary>
            );
        }
        return (
            <ErrorBoundary name="PrizeClerkScanner">
                <TooltipProvider>
                    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 pb-24">
                        <div className="w-full max-w-2xl flex justify-end mb-2">
                            <Button variant="outline" size="sm" onClick={handleStaffLogout} className="gap-2">
                                <LogOut className="w-4 h-4" />
                                End desk shift
                            </Button>
                        </div>
                        <div
                            className="w-full max-w-2xl rounded-2xl border bg-card/80 p-4 shadow-sm"
                            style={
                                {
                                    ['--primary' as string]: rainbowTripletForNavId('prize', settings.colorScheme),
                                    ['--chart-1' as string]: rainbowTripletForNavId('prize', settings.colorScheme),
                                    ['--chart-2' as string]: complementTripletForNavId('prize', settings.colorScheme),
                                    ['--ring' as string]: complementTripletForNavId('prize', settings.colorScheme),
                                } as CSSProperties
                            }
                        >
                            <p className="text-center text-sm text-muted-foreground mb-2">
                                Signed in as <span className="font-semibold text-foreground">{userName || 'Prize desk'}</span>
                            </p>
                            <StudentScanner
                                onStudentFound={onScannerStudent}
                                title="Prize desk"
                                description="Identify the student, then redeem prizes on their behalf."
                                icon={<Gift className="w-10 h-10" />}
                            />
                        </div>
                    </div>
                </TooltipProvider>
            </ErrorBoundary>
        );
    }

    return (
        <ErrorBoundary name="PrizeClerkLogin">
            <div className={cn('min-h-screen flex flex-col items-center justify-center py-10 px-4', isGraphic ? 'bg-gradient-to-br from-indigo-950/20 to-slate-900/20' : 'bg-slate-100')}>
                <Card className={`w-full max-w-md border-t-4 ${isGraphic ? 'bg-card/80 backdrop-blur-xl border-primary shadow-lg' : 'bg-white border-chart-1 shadow-2xl'}`}>
                    <CardHeader className="text-center space-y-4">
                        <div className="w-20 h-20 mx-auto rounded-3xl flex items-center justify-center shadow-lg bg-primary text-primary-foreground">
                            <Gift className="w-10 h-10" />
                        </div>
                        <div>
                            <CardTitle className={`text-2xl font-black tracking-tight ${isGraphic ? 'text-foreground' : 'text-slate-800'}`}>Prize desk</CardTitle>
                            <CardDescription className={isGraphic ? 'text-muted-foreground' : ''}>
                                Scan students and redeem prizes from the school catalog. An admin must create your desk account first.
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <form
                            className="space-y-4"
                            onSubmit={(e) => {
                                e.preventDefault();
                                void handleLogin();
                            }}
                        >
                            <div className="space-y-2">
                                <Label htmlFor="pc-user">Username</Label>
                                <Input
                                    id="pc-user"
                                    autoComplete="username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="h-12 rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="pc-pass">Passcode</Label>
                                <Input
                                    id="pc-pass"
                                    type="password"
                                    autoComplete="current-password"
                                    value={passcode}
                                    onChange={(e) => setPasscode(e.target.value)}
                                    className="h-12 rounded-xl font-mono tracking-widest text-center"
                                />
                            </div>
                            <Button type="submit" className="w-full h-14 rounded-2xl font-black gap-2">
                                <LogIn className="w-5 h-5" />
                                Sign in
                            </Button>
                        </form>
                        <div className="text-center text-xs text-muted-foreground border-t pt-4">
                            <Button variant="link" className="text-xs h-auto p-0" type="button" onClick={() => router.push(`/${schoolId}/portal`)}>
                                <LogOut className="w-3 h-3 mr-1" />
                                Back to portal
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </ErrorBoundary>
    );
}
