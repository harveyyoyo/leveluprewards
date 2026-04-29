'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/components/AppProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { Loader2, LogIn, LogOut, Printer } from 'lucide-react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { TeacherPrinterInner } from '@/app/[schoolId]/teacher/TeacherPrinterInner';

export default function SecretaryPage() {
    const { loginState, isInitialized, schoolId, login, logout, userName } = useAppContext();
    const router = useRouter();
    const { settings } = useSettings();
    const isGraphic = settings.graphicMode === 'graphics';
    const playSound = useArcadeSound();
    const { toast } = useToast();
    const [username, setUsername] = useState('');
    const [passcode, setPasscode] = useState('');

    useEffect(() => {
        if (isInitialized && loginState === 'teacher') {
            router.replace(`/${schoolId}/teacher`);
        }
    }, [isInitialized, loginState, schoolId, router]);

    useEffect(() => {
        if (!isInitialized || !schoolId) return;
        if (loginState === 'prizeClerk') {
            router.replace(`/${schoolId}/prize-clerk`);
        } else if (loginState === 'admin' || loginState === 'developer') {
            router.replace(`/${schoolId}/admin`);
        }
    }, [isInitialized, loginState, schoolId, router]);

    const handleLogin = async () => {
        if (!schoolId || !username.trim() || !passcode) {
            playSound('error');
            toast({ variant: 'destructive', title: 'Enter username and passcode.' });
            return;
        }
        const ok = await login('secretary', {
            schoolId,
            username: username.trim(),
            passcode,
        });
        if (ok) {
            playSound('login');
            toast({ title: 'Signed in' });
        } else {
            playSound('error');
            toast({ variant: 'destructive', title: 'Login failed', description: 'Check credentials or ask an admin to add this account under Desk staff.' });
            setPasscode('');
        }
    };

    const handleLogout = () => {
        playSound('swoosh');
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

    if (loginState === 'secretary') {
        return (
            <ErrorBoundary name="SecretarySession">
                <TeacherPrinterInner
                    secretaryMode
                    teacherName={userName || 'Secretary'}
                    teacherId=""
                    onLogout={handleLogout}
                />
            </ErrorBoundary>
        );
    }

    return (
        <ErrorBoundary name="SecretaryLogin">
            <div className={`min-h-screen flex flex-col items-center justify-center py-10 px-4 ${isGraphic ? 'bg-gradient-to-br from-indigo-950/20 to-slate-900/20' : 'bg-slate-100'}`}>
                <Card className={`w-full max-w-md border-t-4 ${isGraphic ? 'bg-card/80 backdrop-blur-xl border-primary shadow-lg' : 'bg-white border-chart-1 shadow-2xl'}`}>
                    <CardHeader className="text-center space-y-4">
                        <div className="w-20 h-20 mx-auto rounded-3xl flex items-center justify-center shadow-lg bg-primary text-primary-foreground">
                            <Printer className="w-10 h-10" />
                        </div>
                        <div>
                            <CardTitle className={`text-2xl font-black tracking-tight ${isGraphic ? 'text-foreground' : 'text-slate-800'}`}>Secretary — coupons</CardTitle>
                            <CardDescription className={isGraphic ? 'text-muted-foreground' : ''}>
                                Print coupon sheets only. An admin must create your desk account first.
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
                                <Label htmlFor="sec-user">Username</Label>
                                <Input
                                    id="sec-user"
                                    autoComplete="username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="h-12 rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sec-pass">Passcode</Label>
                                <Input
                                    id="sec-pass"
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
