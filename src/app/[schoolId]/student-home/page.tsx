'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useAppContext } from '@/components/AppProvider';
import { useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, doc, where } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Student, Prize, HistoryItem, Category } from '@/lib/types';
import DynamicIcon from '@/components/DynamicIcon';
import { cn, getStudentNickname } from '@/lib/utils';
import { normalizeStudentTheme } from '@/lib/themeContrast';
import { prizeIsListed } from '@/lib/prize-utils';
import { motion } from 'framer-motion';
import {
    Star,
    Award,
    LogOut,
    ChevronRight,
    GraduationCap,
    Loader2,
    Clock,
    School,
    IdCard,
    LogIn,
    Camera,
    Ticket,
    Gift,
    CheckCircle2
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { BadgeShowcase } from '@/components/BadgeShowcase';
import { EarnedBadgesShowcase } from '@/components/EarnedBadgesShowcase';
import { ErrorBoundary } from '@/components/ErrorBoundary';

function StudentActivityList({ schoolId, studentId }: { schoolId: string; studentId: string }) {
    const firestore = useFirestore();
    const activitiesQuery = useMemoFirebase(() => (
        query(
            collection(firestore, `schools/${schoolId}/students/${studentId}/activities`),
            orderBy('date', 'desc'),
            limit(20)
        )
    ), [firestore, schoolId, studentId]);
    const { data: history, isLoading } = useCollection<HistoryItem>(activitiesQuery);

    if (isLoading) {
        return (
            <div className="space-y-3 p-4" role="status" aria-live="polite" aria-label="Loading activity">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex justify-between items-center py-3 border-b border-border/50">
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-16" />
                        </div>
                        <Skeleton className="h-6 w-12 rounded-full" />
                    </div>
                ))}
                <span className="sr-only">Loading activity…</span>
            </div>
        );
    }

    return (
        <ScrollArea className="h-[400px] w-full pr-4">
            <ul className="space-y-3">
                {history && history.length > 0 ? (
                    history.map((item, index) => {
                        const isRedemption = item.desc.startsWith('Redeemed:');
                        const isPointGain = item.amount > 0;

                        return (
                            <li
                                key={index}
                                className="group p-4 rounded-2xl border border-slate-50 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all duration-300"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex gap-3">
                                        <div className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                                            isRedemption ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" :
                                                (item.desc.toLowerCase().includes('attendance') || item.desc.toLowerCase().includes('sign-in')) ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" :
                                                    "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                        )}>
                                            {isRedemption ? <Gift className="w-4 h-4" /> :
                                                (item.desc.toLowerCase().includes('attendance') || item.desc.toLowerCase().includes('sign-in')) ? <CheckCircle2 className="w-4 h-4" /> :
                                                    <Ticket className="w-4 h-4" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 dark:text-slate-200 leading-tight">
                                                {item.desc}
                                            </p>
                                            <div className="flex items-center gap-1.5 opacity-40 mt-1">
                                                <Clock className="w-3 h-3" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">
                                                    {item.date ? format(new Date(item.date), 'MMM d, h:mm a') : 'Recently'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <Badge
                                        variant={isPointGain ? 'default' : 'secondary'}
                                        className={cn(
                                            "font-black text-[10px] px-2 py-0.5 rounded-full tracking-tighter shrink-0",
                                            isPointGain ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                                        )}
                                    >
                                        {isPointGain ? `+${item.amount}` : item.amount} PTS
                                    </Badge>
                                </div>
                                <div className="flex justify-between items-center mt-1">
                                    <div />
                                    {isRedemption && (
                                        <div className={cn(
                                            "flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter",
                                            item.fulfilled
                                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                        )}>
                                            {item.fulfilled ? 'Delivered' : 'Pending'}
                                        </div>
                                    )}
                                </div>
                            </li>
                        );
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                            <Clock className="w-6 h-6 text-slate-300" />
                        </div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">No activity found</p>
                    </div>
                )}
            </ul>
        </ScrollArea>
    );
}

function StudentHomeDashboardInner({
    studentId,
    schoolId,
    onLogout
}: {
    studentId: string;
    schoolId: string;
    onLogout: () => void;
}) {
    const firestore = useFirestore();
    const { settings } = useSettings();
    const { achievements, badges } = useAppContext();
    const isGraphic = settings.graphicMode === 'graphics';
    const { toast } = useToast();
    const playSound = useArcadeSound();
    const [celebrationMessage, setCelebrationMessage] = useState<string | null>(null);

    const studentDocRef = useMemoFirebase(() => schoolId ? doc(firestore, 'schools', schoolId, 'students', studentId) : null, [firestore, schoolId, studentId]);
    const { data: student, isLoading: studentLoading } = useDoc<Student>(studentDocRef);

    const prizesQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'prizes') : null, [firestore, schoolId]);
    const { data: prizes, isLoading: prizesLoading } = useCollection<Prize>(prizesQuery);

    const categoriesQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'categories') : null, [firestore, schoolId]);
    const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(categoriesQuery);

    // Celebrate on login if new badges / bonus milestones were earned since last
    // time this student opened the portal. Kept *above* the early-return below
    // so hook order stays stable across renders (rules-of-hooks).
    useEffect(() => {
        if (!student || !schoolId) return;
        try {
            const key = `arcade:lastSeenCelebrations:${schoolId}:${student.id}`;
            const prev = JSON.parse(localStorage.getItem(key) || '{}') as { badgeAt?: number; bonusAt?: number };

            const latestBadgeAt = Math.max(0, ...(student.earnedBadges || []).map((e) => e.earnedAt || 0));
            const latestBonusAt = Math.max(
                0,
                ...(student.earnedAchievements || [])
                    .map((e) => {
                        const ach = (achievements || []).find((a) => a.id === e.achievementId);
                        const isBonus = (ach?.bonusPoints ?? 0) > 0;
                        return isBonus ? (e.earnedAt || 0) : 0;
                    })
            );

            const newBadge = latestBadgeAt > (prev.badgeAt || 0);
            const newBonus = latestBonusAt > (prev.bonusAt || 0);

            if (newBadge || newBonus) {
                playSound('success');
                const parts: string[] = [];
                if (newBadge) parts.push('a new badge');
                if (newBonus) parts.push('new bonus points');
                setCelebrationMessage(`You earned ${parts.join(' and ')}!`);
                setTimeout(() => setCelebrationMessage(null), 2200);
            }

            localStorage.setItem(key, JSON.stringify({ badgeAt: latestBadgeAt, bonusAt: latestBonusAt }));
        } catch {
            // ignore storage / JSON errors
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [student?.id, schoolId]);

    if (studentLoading || !student || !schoolId) {
        return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>
    }

    // Normalize so the decorative orbs derived from primary/accent always
    // pair readably with any text rendered on top of them.
    const activeTheme = normalizeStudentTheme(student.theme);
    const themeFont = activeTheme?.fontFamily;
    const fontScale = activeTheme?.fontScale ?? 1;

    return (
        <div
            className={cn(
                `space-y-6 relative max-w-5xl mx-auto px-4 py-8 ${isGraphic ? 'animate-in fade-in duration-500' : ''}`,
                settings.displayMode === 'app' && 'pb-24'
            )}
            style={{
                ...(themeFont ? { fontFamily: `"${themeFont}", sans-serif` } : {}),
                ...(fontScale !== 1 ? { fontSize: `${fontScale}em` } : {}),
            }}
        >
            {celebrationMessage && (
                <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center">
                    <div className="pointer-events-auto bg-black/70 text-white px-8 py-5 rounded-3xl shadow-2xl border border-white/20 flex flex-col items-center gap-2 animate-in fade-in zoom-in duration-300">
                        <span className="text-3xl font-black tracking-widest uppercase">Yay!</span>
                        <span className="text-sm font-medium text-center max-w-xs">{celebrationMessage}</span>
                    </div>
                </div>
            )}
            {/* Dynamic Font Loader */}
            {themeFont && (
                <style dangerouslySetInnerHTML={{
                    __html: `@import url('https://fonts.googleapis.com/css2?family=${themeFont.replace(/\s+/g, '+')}&display=swap');`
                }} />
            )}
            {isGraphic && (
                <div className="absolute -top-12 right-0 w-32 h-32 opacity-20 pointer-events-none z-0">
                    <Star className="w-full h-full text-amber-400 fill-amber-400 animate-pulse" />
                </div>
            )}

            {/* Theme background orbs and emoji watermark when a custom theme is set */}
            {activeTheme && (
                <>
                    <div
                        className="absolute -top-32 -left-16 w-64 h-64 rounded-full blur-3xl opacity-40 pointer-events-none z-0"
                        style={{
                            background: `radial-gradient(circle at center, ${activeTheme.primary || '#0ea5e9'} 0%, transparent 60%)`,
                        }}
                    />
                    <div
                        className="absolute top-40 -right-24 w-72 h-72 rounded-full blur-3xl opacity-30 pointer-events-none z-0"
                        style={{
                            background: `radial-gradient(circle at center, ${activeTheme.accent || '#22c55e'} 0%, transparent 60%)`,
                        }}
                    />
                    {activeTheme.emoji && (
                        <div className="absolute inset-x-0 -bottom-10 flex justify-center pointer-events-none z-0 opacity-10">
                            <span className="text-[160px] leading-none">
                                {activeTheme.emoji}
                            </span>
                        </div>
                    )}
                </>
            )}

            {/* Hero Welcome Section */}
            <Card className={cn("overflow-hidden shadow-xl border-t-8 border-chart-1", isGraphic ? 'bg-gradient-to-br from-indigo-100/50 to-indigo-50/30 dark:from-indigo-950/40 dark:to-slate-900/40' : 'bg-card dark:bg-slate-800')}>
                <CardContent className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="space-y-1 text-center md:text-left">
                        <p className="text-sm md:text-base font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Welcome back,</p>
                        <h2 className="text-4xl md:text-6xl font-black text-slate-800 dark:text-white">
                            {student.firstName} {student.lastName}
                        </h2>
                        {student.nickname?.trim() ? (
                            <p className="text-xs md:text-sm font-black uppercase tracking-[0.25em] opacity-70 mt-2">
                                {student.nickname.trim()}
                            </p>
                        ) : null}
                    </div>
                    <div className="text-center md:text-right">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Current Balance</p>
                        <div className="flex items-baseline gap-1.5">
                            <motion.span
                                key={student.points}
                                initial={{ scale: 1.5, color: '#10b981' }}
                                animate={{ scale: 1, color: 'inherit' }}
                                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                                className="text-5xl md:text-7xl font-black text-foreground leading-none inline-block relative"
                            >
                                {(student.points || 0).toLocaleString()}
                            </motion.span>
                            <span className="text-xl md:text-2xl font-bold text-muted-foreground uppercase tracking-widest">pts</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
                <div className="lg:col-span-2 space-y-5">
                    {/* Eligible Rewards */}
                    <Card className="border-none shadow-lg bg-card text-card-foreground">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                    <Award className="w-4 h-4 text-chart-1" />
                                </div>
                                <div>
                                    <CardTitle className="text-base font-black text-foreground">Eligible Rewards</CardTitle>
                                    <CardDescription className="text-xs font-medium text-muted-foreground">You have enough points for these items! Ask your teacher to redeem.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {prizesLoading ? (
                                    [...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)
                                ) : (prizes || [])
                                    .filter(p => prizeIsListed(p) && p.points <= student.points && (!p.teacherId || (student.teacherIds || []).includes(p.teacherId)) && (!p.classId || student.classId === p.classId))
                                    .sort((a, b) => b.points - a.points)
                                    .slice(0, 6)
                                    .map((reward) => (
                                        <div key={reward.id} className="p-4 rounded-xl border border-border transition-all flex flex-col items-center text-center gap-2 bg-muted/20 shadow-sm hover:shadow-md hover:-translate-y-0.5 transform duration-300 group">
                                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                                                <DynamicIcon name={reward.icon} className="w-6 h-6 text-primary" />
                                            </div>
                                            <p className="text-xs font-black text-foreground leading-tight line-clamp-1">{reward.name}</p>
                                            <Badge variant="secondary" className="font-black text-[9px] tracking-widest rounded-md px-2 py-0.5 bg-muted text-muted-foreground">
                                                {(reward.points || 0).toLocaleString()} PTS
                                            </Badge>
                                        </div>
                                    ))}
                                {!prizesLoading && (prizes || []).filter(p => prizeIsListed(p) && p.points <= student.points).length === 0 && (
                                    <div className="col-span-full py-8 flex flex-col items-center justify-center text-center space-y-3 bg-muted/20 rounded-xl border border-dashed border-border mx-2 mb-2">
                                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                            <Star className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-foreground">Almost there!</p>
                                            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mt-1">Keep earning points to unlock rewards</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <BadgeShowcase
                        student={student}
                        achievements={achievements || []}
                        enableAchievements={settings.enableAchievements}
                        theme={activeTheme}
                    />
                    <EarnedBadgesShowcase
                        student={student}
                        badges={badges || []}
                        enableBadges={settings.enableBadges}
                        theme={activeTheme}
                    />
                </div>

                {/* Right Section: Activity */}
                <Card className="lg:col-span-1 border-none shadow-lg bg-card text-card-foreground flex flex-col">
                    <CardHeader className="pb-3 border-b border-border">
                        <CardTitle className="text-base font-black flex items-center gap-2 text-foreground">
                            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                                <ChevronRight className="w-5 h-5 text-chart-1" />
                            </div>
                            Activity
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 pt-4">
                        <StudentActivityList schoolId={schoolId} studentId={student.id} />
                    </CardContent>
                    <div className="p-4 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                        <Button variant="outline" onClick={onLogout} className="w-full h-11 font-black uppercase tracking-widest border-2 border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all flex items-center justify-center gap-2 text-sm">
                            <LogOut className="h-4 w-4" /> Log Out
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
}

export default function StudentHomePortal() {
    const { isInitialized, loginState, schoolId, userId, login, logout } = useAppContext();
    const router = useRouter();
    const { settings } = useSettings();
    const isGraphic = settings.graphicMode === 'graphics';
    const { toast } = useToast();
    const playSound = useArcadeSound();

    const [inputSchoolId, setInputSchoolId] = useState('');
    const [inputStudentId, setInputStudentId] = useState('');
    const [scannerInput, setScannerInput] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [loginTab, setLoginTab] = useState('manual');
    const scannerInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!settings.enableStudentPortal) {
            router.replace('/portal');
        }
    }, [settings.enableStudentPortal, router]);

    // Focus the scanner input when the tab is selected
    useEffect(() => {
        if (loginTab === 'scanner') {
            const timer = setTimeout(() => scannerInputRef.current?.focus(), 100);
            return () => clearTimeout(timer);
        }
    }, [loginTab]);

    const executeLogin = async (school: string, nfc: string) => {
        if (!school.trim() || !nfc.trim()) {
            playSound('error');
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please enter both School ID and your Badge Number.' });
            return;
        }

        setIsLoggingIn(true);
        const result = await login('student', { schoolId: school.trim(), nfcId: nfc.trim() } as any);
        if (result) {
            playSound('login');
            toast({ title: 'Welcome back!' });
        } else {
            playSound('error');
            toast({ variant: 'destructive', title: 'Login Failed', description: 'Could not log in with that card.' });
        }
        setIsLoggingIn(false);
    };

    const handleLogin = () => executeLogin(inputSchoolId, inputStudentId);

    const handleScannerLogin = () => {
        executeLogin(inputSchoolId, scannerInput);
        setScannerInput(''); // Reset for next scan
    };

    const handleLogout = () => {
        playSound('swoosh');
        logout();
        setInputSchoolId('');
        setInputStudentId('');
    };

    if (!isInitialized) {
        return <div className="min-h-screen flex items-center justify-center p-8 bg-background">
            <div className="text-center space-y-4">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                <p className="text-muted-foreground font-medium animate-pulse">Loading Portal...</p>
            </div>
        </div>;
    }

    if (loginState === 'student' && userId && schoolId) {
        return (
            <ErrorBoundary name="StudentHomeDashboard">
                <StudentHomeDashboardInner studentId={userId} schoolId={schoolId} onLogout={handleLogout} />
            </ErrorBoundary>
        );
    }

    return (
        <ErrorBoundary name="StudentHomeLogin">
            <div className={cn(
                "flex flex-col items-center justify-center min-h-[80vh] py-8 px-4 font-sans",
                isGraphic ? 'animate-in fade-in zoom-in-95 duration-500' : '',
                settings.displayMode === 'app' && 'pb-24'
            )}>
                <Card className={cn(
                    "w-full max-w-md border-t-8 transition-all overflow-hidden",
                    isGraphic ? 'bg-card/80 backdrop-blur-xl border-chart-4 shadow-[0_0_50px_hsl(var(--chart-4)/0.2)]' : 'bg-white border-chart-4 shadow-2xl'
                )}>
                    <CardHeader className="text-center space-y-4">
                        <div className={cn(
                            "w-20 h-20 mx-auto rounded-3xl flex items-center justify-center shadow-lg transition-transform",
                            isGraphic ? 'bg-chart-4 text-white' : 'bg-slate-800 text-white'
                        )}>
                            <GraduationCap className="w-10 h-10" />
                        </div>
                        <div>
                            <CardTitle className={cn("text-2xl font-black tracking-tight", isGraphic ? 'text-foreground' : 'text-slate-800')}>Student Login</CardTitle>
                            <CardDescription className={isGraphic ? 'text-muted-foreground' : ''}>Access your points and rewards from home.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="school-id" className={cn("text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5", isGraphic ? 'text-muted-foreground' : 'text-muted-foreground')}>
                                    <School className="w-3.5 h-3.5" /> School ID
                                </Label>
                                <Input
                                    id="school-id"
                                    value={inputSchoolId}
                                    onChange={e => setInputSchoolId(e.target.value)}
                                    placeholder="e.g. springfield_elementary"
                                    className={cn("h-14 rounded-xl text-lg font-mono tracking-widest text-center", isGraphic ? 'bg-foreground/5 border-border' : 'bg-muted/30')}
                                />
                            </div>

                            <Tabs defaultValue="manual" value={loginTab} onValueChange={setLoginTab} className="w-full pt-2">
                                <TabsList className={cn("grid w-full grid-cols-2 p-1 rounded-xl mb-6", isGraphic ? 'bg-foreground/5' : 'bg-muted/50')}>
                                    <TabsTrigger value="manual" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:shadow-md transition-all">
                                        <IdCard className="mr-2 h-4 w-4" /> Type ID
                                    </TabsTrigger>
                                    <TabsTrigger value="scanner" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:shadow-md transition-all">
                                        <Camera className="mr-2 h-4 w-4" /> Scan Badge
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="manual" className="space-y-6">
                                    <form
                                        className="space-y-6"
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            void handleLogin();
                                        }}
                                    >
                                        <div className="space-y-2">
                                            <Label htmlFor="student-badge" className={cn("text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5", isGraphic ? 'text-muted-foreground' : 'text-muted-foreground')}>
                                                <IdCard className="w-3.5 h-3.5" /> Badge Number
                                            </Label>
                                            <Input
                                                id="student-badge"
                                                value={inputStudentId}
                                                onChange={e => setInputStudentId(e.target.value)}
                                                placeholder="Enter the number on your badge"
                                                className={cn("h-14 rounded-xl text-lg font-mono tracking-widest text-center", isGraphic ? 'bg-foreground/5 border-border' : 'bg-muted/30')}
                                                autoComplete="one-time-code"
                                            />
                                        </div>
                                        <Button type="submit" disabled={isLoggingIn} className={cn(
                                            "w-full h-16 rounded-2xl font-black text-lg uppercase tracking-widest shadow-xl transition-all active:scale-95 text-primary-foreground",
                                            isGraphic ? 'bg-primary hover:bg-primary/90 shadow-primary/20' : 'bg-primary hover:bg-primary/90'
                                        )}>
                                            {isLoggingIn ? <Loader2 className="mr-3 w-6 h-6 animate-spin" /> : <LogIn className="mr-3 w-6 h-6" />}
                                            {isLoggingIn ? 'Logging In...' : 'Login'}
                                        </Button>
                                    </form>
                                </TabsContent>

                                <TabsContent value="scanner" className="space-y-6 text-center">
                                    <form
                                        className="py-8 space-y-6"
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            handleScannerLogin();
                                        }}
                                    >
                                        <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                                            <div className="absolute inset-0 rounded-full animate-ping opacity-25 bg-primary"></div>
                                            <div className={cn("w-20 h-20 rounded-full flex items-center justify-center border-4 relative z-10 shadow-lg", isGraphic ? 'bg-background border-primary text-primary' : 'bg-card border-slate-800 dark:border-slate-200 text-slate-800 dark:text-slate-200')}>
                                                <Camera className="w-10 h-10" />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <p className="font-black text-lg text-foreground">Waiting for Scanner...</p>
                                            <p className="text-muted-foreground text-xs font-medium px-4">Ensure your School ID is typed above, then place your cursor in the box below and scan your badge.</p>
                                        </div>

                                        <div className="px-6">
                                            <Input
                                                ref={scannerInputRef}
                                                value={scannerInput}
                                                onChange={e => setScannerInput(e.target.value)}
                                                placeholder="Scan barcode here"
                                                className={cn("h-16 text-2xl font-black text-center tracking-[0.2em] rounded-xl transition-all shadow-inner", isGraphic ? 'bg-foreground/5 border-border text-foreground focus-visible:ring-primary' : 'bg-muted/50 border-border text-foreground focus-visible:ring-primary')}
                                                autoComplete="one-time-code"
                                            />
                                        </div>

                                        <Button type="submit" disabled={isLoggingIn || !scannerInput} variant="secondary" className="w-2/3 mx-auto h-12 rounded-xl font-black text-sm uppercase tracking-widest transition-all">
                                            {isLoggingIn ? <Loader2 className="mr-2 w-5 h-5 animate-spin" /> : null}
                                            Manual Submit
                                        </Button>
                                    </form>
                                </TabsContent>
                            </Tabs>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </ErrorBoundary>
    );
}
