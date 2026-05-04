'use client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppContext } from '@/components/AppProvider';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { ArrowLeft, Trophy, Crown, Medal, ChevronRight, Settings, Cpu, Target } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { Student, Class, Category, Goal } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useSettings } from '@/components/providers/SettingsProvider';
import { cn, getStudentNickname } from '@/lib/utils';
import { computeGoalProgress } from '@/lib/goalsProgress';
import { getPeriodKeys } from '@/lib/db/helpers';
import { globalAnimatedBackdropActive } from '@/lib/animatedBackdrop';
import { rainbowTripletForNavId, complementTripletForNavId } from '@/lib/rainbowNav';
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

function HallOfFameSkeleton({ animBackdrop }: { animBackdrop: boolean }) {
    return (
        <div
            className={cn(
                "min-h-screen p-4 sm:p-8 md:p-12 flex flex-col items-center",
                animBackdrop ? "bg-transparent" : "bg-background",
            )}
        >
            <Skeleton className="h-16 w-64 mb-16 rounded-2xl" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-full items-end mb-12">
                <Skeleton className="h-64 w-full rounded-3xl" />
                <Skeleton className="h-80 w-full rounded-3xl" />
                <Skeleton className="h-56 w-full rounded-3xl" />
            </div>
            <div className="w-full max-w-full space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
            </div>
        </div>
    );
}

export default function HallOfFamePage() {
    const { loginState, isInitialized, schoolId } = useAppContext();
    const firestore = useFirestore();
    const router = useRouter();
    const { settings } = useSettings();
    const [hoveredIndex, setHoveredIndex] = useState<string | null>(null);

    const [rankType, setRankType] = useState<'students' | 'classes' | 'goals'>('students');
    const [sortBy, setSortBy] = useState<string>('lifetimePoints');
    const [scope, setScope] = useState<'all' | string>('all');
    const [isOptionsOpen, setIsOptionsOpen] = useState(false);
    const [limit, setLimit] = useState<number>(50);
    const [podiumSize, setPodiumSize] = useState<number>(3);
    const [autoScroll, setAutoScroll] = useState<boolean>(false);
    const [gridLayout, setGridLayout] = useState<boolean>(true);
    const [goalsProgressMap, setGoalsProgressMap] = useState<Record<string, number>>({});

    // Load persisted settings; optional URL overrides (e.g. ?view=class-standings).
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const view = (params.get('view') || params.get('rank') || '').trim().toLowerCase();
            if (view === 'class-standings' || view === 'classes' || view === 'class_standings') {
                setRankType('classes');
                setSortBy('points');
                return;
            }
            if (view === 'goals' || view === 'school-goals' || view === 'school_goals') {
                setRankType('goals');
                setSortBy('lifetimePoints');
                return;
            }
        }
        const saved = localStorage.getItem('hall_of_fame_settings');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.rankType) setRankType(parsed.rankType);
                if (parsed.sortBy) setSortBy(parsed.sortBy);
                if (parsed.scope) setScope(parsed.scope);
                if (parsed.limit) setLimit(parsed.limit);
                if (parsed.podiumSize !== undefined) setPodiumSize(parsed.podiumSize);
                if (parsed.autoScroll !== undefined) setAutoScroll(parsed.autoScroll);
                if (parsed.gridLayout !== undefined) setGridLayout(parsed.gridLayout);
            } catch (e) {
                console.error("Failed to parse persisted Hall of Fame settings", e);
            }
        }
    }, []);

    useEffect(() => {
        const settingsToSave = { rankType, sortBy, scope, limit, podiumSize, autoScroll, gridLayout };
        localStorage.setItem('hall_of_fame_settings', JSON.stringify(settingsToSave));
    }, [rankType, sortBy, scope, limit, podiumSize, autoScroll, gridLayout]);

    useEffect(() => {
        if (isInitialized && !['student', 'teacher', 'admin', 'school', 'developer'].includes(loginState)) {
            router.replace('/login');
        }
    }, [isInitialized, loginState, router]);

    const currentPeriodKeys = useMemo(() => getPeriodKeys(Date.now()), []);

    const studentsQuery = useMemoFirebase(() => {
        if (!schoolId) return null;
        let orderByField = 'lifetimePoints';
        if (sortBy === 'points') orderByField = 'points';
        else if (sortBy === 'period_day') orderByField = `pointsByPeriod.${currentPeriodKeys.day}`;
        else if (sortBy === 'period_week') orderByField = `pointsByPeriod.${currentPeriodKeys.week}`;
        else if (sortBy === 'period_month') orderByField = `pointsByPeriod.${currentPeriodKeys.month}`;
        
        return query(
            collection(firestore, 'schools', schoolId, 'students'),
            orderBy(orderByField, 'desc'),
            firestoreLimit(200) // Fetch more for client-side category sorting
        );
    }, [firestore, schoolId, sortBy, currentPeriodKeys]);
    const { data: allTopStudents, isLoading: studentsLoading } = useCollection<Student>(studentsQuery);

    const classesQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'classes') : null, [firestore, schoolId]);
    const { data: classes, isLoading: classesLoading } = useCollection<Class>(classesQuery);

    const categoriesQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'categories') : null, [firestore, schoolId]);
    const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(categoriesQuery);

    const goalsQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'goals') : null, [firestore, schoolId]);
    const { data: allGoals, isLoading: goalsLoading } = useCollection<Goal>(goalsQuery);

    useEffect(() => {
        if (!firestore || !schoolId || !allGoals || allGoals.length === 0 || !categories?.length) {
            setGoalsProgressMap({});
            return;
        }
        let cancelled = false;
        (async () => {
            const out: Record<string, number> = {};
            for (const g of allGoals) {
                let viewer = allTopStudents?.find(s => s.id === g.studentId);
                if (!viewer) {
                    viewer = allTopStudents?.[0];
                }
                if (!viewer) continue;
                
                let roster = [viewer];
                if (g.type === 'class' && g.classId) {
                    roster = allTopStudents?.filter(s => s.classId === g.classId) || [];
                }

                const p = await computeGoalProgress(firestore, schoolId, g, viewer, roster, categories);
                out[g.id] = p;
            }
            if (!cancelled) {
                setGoalsProgressMap(out);
            }
        })().catch(() => {});

        return () => {
            cancelled = true;
        };
    }, [firestore, schoolId, allGoals, allTopStudents, categories]);

    const classesMap = useMemo(() => {
        if (!classes) return new Map();
        return new Map(classes.map(c => [c.id, c.name]));
    }, [classes]);

    const getClassName = (classId?: string) => {
        return classId ? classesMap.get(classId) || 'Unassigned' : 'Unassigned';
    };

    const getScopeName = () => {
        if (scope === 'all') return 'Entire School';
        return getClassName(scope);
    }

    const getSortByLabel = () => {
        if (rankType === 'goals') return 'All Active & Completed Goals';
        if (rankType === 'classes') {
            if (sortBy === 'points') return 'Class totals (current balances)';
            if (sortBy === 'lifetimePoints') return 'Class totals (lifetime points)';
            if (sortBy === 'period_day') return 'Class totals (points today)';
            if (sortBy === 'period_week') return 'Class totals (points this week)';
            if (sortBy === 'period_month') return 'Class totals (points this month)';
            return `Class totals (${sortBy})`;
        }
        if (sortBy === 'points') return 'Top Current Earners';
        if (sortBy === 'lifetimePoints') return 'Top Lifetime Earners';
        if (sortBy === 'period_day') return 'Top Earners Today';
        if (sortBy === 'period_week') return 'Top Earners This Week';
        if (sortBy === 'period_month') return 'Top Earners This Month';
        return `Top Earners in ${sortBy}`;
    }

    const getPointsForStudent = (student: Student) => {
        if (sortBy === 'points') return student.points || 0;
        if (sortBy === 'lifetimePoints') return student.lifetimePoints || 0;
        if (sortBy === 'period_day') return student.pointsByPeriod?.[currentPeriodKeys.day] || 0;
        if (sortBy === 'period_week') return student.pointsByPeriod?.[currentPeriodKeys.week] || 0;
        if (sortBy === 'period_month') return student.pointsByPeriod?.[currentPeriodKeys.month] || 0;
        return student.categoryPoints?.[sortBy] || 0;
    }

    const getInitials = (firstName: string, lastName: string) => {
        return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
    }

    const topItems = useMemo(() => {
        if (rankType === 'students') {
            if (!allTopStudents) return [];
            let sorted = [...allTopStudents];

            if (sortBy !== 'points' && sortBy !== 'lifetimePoints' && !sortBy.startsWith('period_')) {
                // It's a category sort
                const categoryName = sortBy;
                sorted.sort((a, b) => (b.categoryPoints?.[categoryName] || 0) - (a.categoryPoints?.[categoryName] || 0));
            }

            if (scope !== 'all') {
                sorted = sorted.filter(s => s.classId === scope);
            }
            
            return sorted.slice(0, limit).map(s => ({
                id: s.id,
                type: 'student',
                name: getStudentNickname(s) + (s.lastName ? ` ${s.lastName}` : ''),
                photoUrl: s.photoUrl,
                points: getPointsForStudent(s),
                classId: s.classId,
                className: getClassName(s.classId),
                initials: getInitials(s.firstName, s.lastName)
            }));
        } else if (rankType === 'classes') {
            // Rank classes
            if (!classes || !allTopStudents) return [];
            const totals = new Map<string, number>();
            for (const s of allTopStudents) {
                const cid = s.classId;
                if (!cid) continue;
                totals.set(cid, (totals.get(cid) ?? 0) + getPointsForStudent(s));
            }
            const rows = classes.map(c => ({
                id: c.id,
                type: 'class',
                name: c.name || 'Unassigned',
                photoUrl: null,
                points: totals.get(c.id) ?? 0,
                classId: c.id,
                className: c.name || 'Unassigned',
                initials: (c.name || 'Unassigned').substring(0, 2).toUpperCase()
            }));
            rows.sort((a, b) => b.points - a.points);
            return rows.slice(0, limit);
        } else {
            // rankType === 'goals'
            if (!allGoals) return [];
            let sorted = [...allGoals];
            if (scope !== 'all') {
                sorted = sorted.filter(g => g.classId === scope);
            }
            return sorted.slice(0, limit).map(g => ({
                id: g.id,
                type: 'goal',
                name: g.title,
                photoUrl: null,
                points: goalsProgressMap[g.id] || 0,
                targetPoints: g.targetPoints,
                classId: g.classId,
                className: g.classId ? getClassName(g.classId) : 'School-wide',
                initials: g.type === 'class' ? 'C' : 'P',
                description: g.description || '',
                status: g.status,
                goalType: g.type,
                bonusReward: g.bonusPointsReward
            }));
        }
    }, [rankType, allTopStudents, classes, allGoals, goalsProgressMap, scope, sortBy, limit, currentPeriodKeys]);

    // Auto-scroll logic
    useEffect(() => {
        if (!autoScroll) return;

        let scrollDirection = 1; // 1 for down, -1 for up
        const scrollSpeed = 0.5; // pixels per frame equivalent-ish
        let lastTime = 0;
        let animationId: number;
        let timeoutId: NodeJS.Timeout;

        const handleScroll = (time: number) => {
            if (!lastTime) lastTime = time;
            const delta = Math.min(time - lastTime, 50); // cap delta to prevent huge jumps
            lastTime = time;

            const scrollStep = (scrollSpeed * delta) / 16; // attempt 1px per 16ms
            window.scrollBy(0, scrollStep * scrollDirection);

            // Check if we hit bottom or top
            const isAtBottom = Math.ceil(window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 10;
            const isAtTop = window.scrollY <= 10;

            if (isAtBottom && scrollDirection === 1) {
                // Wait a bit at the bottom before reversing
                timeoutId = setTimeout(() => {
                    scrollDirection = -1;
                    lastTime = 0;
                    animationId = requestAnimationFrame(handleScroll);
                }, 3000);
                return; // stop current animation loop, wait for timeout
            } else if (isAtTop && scrollDirection === -1) {
                // Wait a bit at the top before reversing
                timeoutId = setTimeout(() => {
                    scrollDirection = 1;
                    lastTime = 0;
                    animationId = requestAnimationFrame(handleScroll);
                }, 3000);
                return;
            }

            animationId = requestAnimationFrame(handleScroll);
        };

        animationId = requestAnimationFrame(handleScroll);
        return () => {
            cancelAnimationFrame(animationId);
            clearTimeout(timeoutId);
        };
    }, [autoScroll]);

    // ESC to stop auto-scroll
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setAutoScroll(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const animBackdrop = globalAnimatedBackdropActive(settings);

    if (!isInitialized || !['student', 'teacher', 'admin', 'school', 'developer'].includes(loginState) || studentsLoading || classesLoading || categoriesLoading) {
        return <HallOfFameSkeleton animBackdrop={animBackdrop} />;
    }

    const podium = topItems?.slice(0, podiumSize) || [];
    const others = topItems?.slice(podiumSize) || [];
    const showHallLocalDecor = !animBackdrop;

    return (
        <div
          className={cn(
            "min-h-screen text-foreground relative overflow-hidden font-sans flex flex-col items-center",
            animBackdrop ? "bg-transparent" : "bg-background",
          )}
          style={{
            ['--primary' as any]: rainbowTripletForNavId('fame', settings.colorScheme),
            ['--chart-1' as any]: rainbowTripletForNavId('fame', settings.colorScheme),
            ['--chart-2' as any]: complementTripletForNavId('fame', settings.colorScheme),
            ['--chart-3' as any]: rainbowTripletForNavId('fame', settings.colorScheme),
            ['--chart-4' as any]: complementTripletForNavId('fame', settings.colorScheme),
            ['--chart-5' as any]: rainbowTripletForNavId('fame', settings.colorScheme),
            ['--ring' as any]: complementTripletForNavId('fame', settings.colorScheme),
          } as any}
        >
            {showHallLocalDecor && (
            <div className="pointer-events-none fixed inset-0 opacity-[0.03] z-0" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
            }} />
            )}

            {showHallLocalDecor && (
            <>
            <motion.div
                animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="pointer-events-none fixed top-20 right-20 h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px] z-0"
            />
            <motion.div
                animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="pointer-events-none fixed bottom-20 left-20 h-[400px] w-[400px] rounded-full bg-chart-5/5 blur-[120px] z-0"
            />
            <motion.div
                animate={{ x: [0, 20, 0], y: [0, -30, 0] }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                className="pointer-events-none fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-chart-2/5 blur-[150px] z-0"
            />
            </>
            )}

            <div className={cn(
                "relative z-10 w-full px-4 sm:px-8 pt-8 md:pt-12 transition-all duration-500",
                "max-w-full",
                settings.displayMode === 'app' ? 'pb-24' : 'pb-12'
            )}>
                <Card className={cn(
                    "border-t-8 border-chart-5 shadow-2xl backdrop-blur-md",
                    animBackdrop ? "bg-card/92 border-border/40" : "bg-card/80",
                )}>
                    <CardContent className="p-4 sm:p-6 md:p-8">
                        {/* Header */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="mb-12 md:mb-16"
                        >
                            <div className="flex justify-between items-start">
                                <div className='text-center flex-grow'>
                                    <h2 className="text-4xl sm:text-5xl font-black tracking-tighter text-primary font-headline drop-shadow-sm mb-4 flex items-center justify-center gap-4">
                                        <Trophy className="w-10 h-10 sm:w-12 sm:h-12 text-chart-5" /> Hall of Fame
                                    </h2>
                                    <p className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-[0.3em]">
                                        {getScopeName()} &bull; {getSortByLabel()}
                                    </p>
                                    <div className="mt-6 flex justify-center gap-2">
                                        <Button
                                            variant={rankType === 'students' ? 'default' : 'outline'}
                                            size="sm"
                                            className="rounded-full h-9 px-5 text-xs font-bold uppercase tracking-widest"
                                            onClick={() => setRankType('students')}
                                        >
                                            Students
                                        </Button>
                                        <Button
                                            variant={rankType === 'classes' ? 'default' : 'outline'}
                                            size="sm"
                                            className="rounded-full h-9 px-5 text-xs font-bold uppercase tracking-widest"
                                            onClick={() => setRankType('classes')}
                                        >
                                            Class standings
                                        </Button>
                                        <Button
                                            variant={rankType === 'goals' ? 'default' : 'outline'}
                                            size="sm"
                                            className="rounded-full h-9 px-5 text-xs font-bold uppercase tracking-widest"
                                            onClick={() => setRankType('goals')}
                                        >
                                            School goals
                                        </Button>
                                    </div>
                                </div>
                                <Dialog open={isOptionsOpen} onOpenChange={setIsOptionsOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="icon" className="rounded-full flex-shrink-0"><Settings className="w-4 h-4" /></Button>
                                    </DialogTrigger>
                                    <DialogContent size="sm" className="border border-border p-0 overflow-hidden">
                                        <div className="px-6 pt-6 pb-4 border-b border-border/40 bg-card/30 backdrop-blur-md">
                                            <DialogHeader>
                                                <DialogTitle className="text-xl font-black tracking-tight text-foreground">Display Options</DialogTitle>
                                                <DialogDescription className="text-xs font-medium text-muted-foreground uppercase tracking-widest mt-1">
                                                    Customize the leaderboard view
                                                </DialogDescription>
                                            </DialogHeader>
                                        </div>
                                        <div className="grid gap-6 p-6">
                                            <div className="space-y-3">
                                                <Label htmlFor="rank-type" className="text-[10px] font-semibold text-muted-foreground/80 lowercase tracking-normal">Rank Type</Label>
                                                <Select value={rankType} onValueChange={(v: any) => setRankType(v)}>
                                                    <SelectTrigger id="rank-type" className="h-12 rounded-xl bg-muted/30 border-border hover:bg-muted/50 transition-all font-bold">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border-border">
                                                        <SelectItem value="students" className="rounded-lg font-medium">Students</SelectItem>
                                                        <SelectItem value="classes" className="rounded-lg font-medium">Class standings</SelectItem>
                                                        <SelectItem value="goals" className="rounded-lg font-medium">School goals</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-3">
                                                <Label htmlFor="sort-by" className="text-[10px] font-semibold text-muted-foreground/80 lowercase tracking-normal">Sort By</Label>
                                                <Select value={sortBy} onValueChange={(v) => setSortBy(v)}>
                                                    <SelectTrigger id="sort-by" className="h-12 rounded-xl bg-muted/30 border-border hover:bg-muted/50 transition-all font-bold">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border-border">
                                                        <SelectItem value="lifetimePoints" className="rounded-lg font-medium">Lifetime Points</SelectItem>
                                                        <SelectItem value="points" className="rounded-lg font-medium">Current Points</SelectItem>
                                                        <SelectItem value="period_day" className="rounded-lg font-medium">Points Today</SelectItem>
                                                        <SelectItem value="period_week" className="rounded-lg font-medium">Points This Week</SelectItem>
                                                        <SelectItem value="period_month" className="rounded-lg font-medium">Points This Month</SelectItem>
                                                        {categories?.map(c => <SelectItem key={c.id} value={c.name} className="rounded-lg font-medium">{c.name} Points</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="space-y-3">
                                                    <Label htmlFor="scope" className="text-[10px] font-semibold text-muted-foreground/80 lowercase tracking-normal">Show</Label>
                                                    <Select value={scope} onValueChange={setScope}>
                                                        <SelectTrigger id="scope" className="h-12 rounded-xl bg-muted/30 border-border hover:bg-muted/50 transition-all font-bold">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-xl border-border">
                                                            <SelectItem value="all" className="rounded-lg font-medium">Entire School</SelectItem>
                                                            {classes?.map(c => <SelectItem key={c.id} value={c.id} className="rounded-lg font-medium">{c.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-3">
                                                    <Label htmlFor="limit" className="text-[10px] font-semibold text-muted-foreground/80 lowercase tracking-normal">Show Top</Label>
                                                    <Input
                                                        id="limit"
                                                        type="number"
                                                        className="h-12 rounded-xl bg-muted/30 border-border font-bold px-4 focus:bg-background transition-all"
                                                        value={limit}
                                                        onChange={(e) => setLimit(Math.max(1, parseInt(e.target.value) || 1))}
                                                    />
                                                </div>
                                                <div className="space-y-3">
                                                    <Label htmlFor="podium-size" className="text-[10px] font-semibold text-muted-foreground/80 lowercase tracking-normal">Highlight Top</Label>
                                                    <Input
                                                        id="podium-size"
                                                        type="number"
                                                        className="h-12 rounded-xl bg-muted/30 border-border font-bold px-4 focus:bg-background transition-all"
                                                        value={podiumSize}
                                                        onChange={(e) => setPodiumSize(Math.max(0, Math.min(3, parseInt(e.target.value) || 0)))}
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between py-1 px-1">
                                                    <Label htmlFor="auto-scroll" className="cursor-pointer font-bold text-sm">Auto-Scroll</Label>
                                                    <Switch id="auto-scroll" checked={autoScroll} onCheckedChange={setAutoScroll} />
                                                </div>
                                                <div className="flex items-center justify-between py-1 px-1">
                                                    <Label htmlFor="grid-layout" className="cursor-pointer font-bold text-sm">Grid / Multi-column</Label>
                                                    <Switch id="grid-layout" checked={gridLayout} onCheckedChange={setGridLayout} />
                                                </div>
                                            </div>
                                        </div>
                                        <DialogFooter className="p-4 bg-muted/20 border-t border-border/40">
                                            <Button onClick={() => setIsOptionsOpen(false)} className="w-full h-11 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all">Done</Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </motion.div>

                        {/* Podium */}
                        {rankType !== 'goals' && podium.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end mb-12 md:mb-20">
                                {/* 1st Place */}
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.5, delay: 0.2 }}
                                    className="text-center md:order-2 order-1"
                                >
                                    <div className="bg-primary/5 backdrop-blur-md border-4 border-primary/20 rounded-t-[4rem] rounded-b-3xl p-6 md:p-8 relative shadow-2xl h-72 md:h-80 flex flex-col justify-end transition-all hover:-translate-y-2">
                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center">
                                            <Crown className="w-12 h-12 sm:w-16 sm:h-16 text-chart-5 animate-float drop-shadow-lg" />
                                        </div>
                                        <Avatar className="w-24 h-24 md:w-28 md:h-28 mx-auto mb-4 border-4 border-primary/30 shadow-xl overflow-hidden">
                                            {podium[0].photoUrl && <img src={podium[0].photoUrl} alt="Photo" className={settings.photoDisplayMode === 'cover' ? 'h-full w-full object-cover' : 'h-full w-full object-contain'} />}
                                            <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-black">{podium[0].initials}</AvatarFallback>
                                        </Avatar>
                                        <p className="font-black text-foreground text-xl md:text-2xl truncate tracking-tighter">{podium[0].name}</p>
                                        <p className="text-primary font-black text-2xl md:text-3xl mt-1 tracking-tighter">{podium[0].points.toLocaleString()} pts</p>
                                    </div>
                                </motion.div>

                                {/* 2nd Place */}
                                {podium.length > 1 && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.4 }}
                                        className="text-center md:order-1 order-2"
                                    >
                                        <div className="bg-card/40 backdrop-blur-sm border-2 border-border rounded-3xl p-6 md:p-8 relative h-56 md:h-64 flex flex-col justify-end shadow-lg transition-all hover:shadow-xl hover:-translate-y-1">
                                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
                                                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-black text-xl border-4 border-background">2</div>
                                            </div>
                                            <Avatar className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 border-4 border-border shadow-md">
                                                {podium[1].photoUrl && <img src={podium[1].photoUrl} alt="Photo" className={settings.photoDisplayMode === 'cover' ? 'h-full w-full object-cover' : 'h-full w-full object-contain'} />}
                                                <AvatarFallback className="bg-muted text-muted-foreground text-2xl font-black">{podium[1].initials}</AvatarFallback>
                                            </Avatar>
                                            <p className="font-black text-foreground text-lg md:text-xl truncate tracking-tight">{podium[1].name}</p>
                                            <p className="text-primary font-bold text-lg mt-1 tracking-tight">{podium[1].points.toLocaleString()} pts</p>
                                        </div>
                                    </motion.div>
                                )}

                                {/* 3rd Place */}
                                {podium.length > 2 && (
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.6 }}
                                        className="text-center md:order-3 order-3"
                                    >
                                        <div className="bg-card/40 backdrop-blur-sm border-2 border-border/50 rounded-3xl p-6 md:p-8 relative h-52 md:h-56 flex flex-col justify-end shadow-lg transition-all hover:shadow-xl hover:-translate-y-1">
                                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
                                                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-black text-xl border-4 border-background">3</div>
                                            </div>
                                            <Avatar className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-4 border-4 border-border shadow-md">
                                                {podium[2].photoUrl && <img src={podium[2].photoUrl} alt="Photo" className={settings.photoDisplayMode === 'cover' ? 'h-full w-full object-cover' : 'h-full w-full object-contain'} />}
                                                <AvatarFallback className="bg-muted text-muted-foreground text-xl font-black">{podium[2].initials}</AvatarFallback>
                                            </Avatar>
                                            <p className="font-black text-foreground text-base md:text-lg truncate tracking-tight">{podium[2].name}</p>
                                            <p className="text-primary font-bold text-lg mt-1 tracking-tight">{podium[2].points.toLocaleString()} pts</p>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        )}
                        {/* Goals List Grid */}
                        {rankType === 'goals' && topItems && topItems.length > 0 && (
                            <div className="mx-auto w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
                                {topItems.map((item: any, index: number) => {
                                    const pct = item.targetPoints > 0 ? Math.min(100, Math.round((item.points / item.targetPoints) * 100)) : 0;
                                    return (
                                        <motion.div
                                            key={item.id}
                                            initial={{ opacity: 0, y: 15 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.1 + index * 0.05 }}
                                            className="group relative flex flex-col justify-between backdrop-blur-sm border-2 border-border/40 rounded-3xl p-5 md:p-6 transition-all hover:bg-card hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 bg-card/40 min-h-[160px]"
                                        >
                                            <div>
                                                <div className="flex justify-between items-start gap-4 mb-2">
                                                    <div>
                                                        <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-1 rounded-full font-black uppercase tracking-wider">
                                                            {item.goalType} Goal
                                                        </span>
                                                        <span className={cn(
                                                            "text-[10px] ml-2 px-2.5 py-1 rounded-full font-black uppercase tracking-wider",
                                                            item.status === 'completed' ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"
                                                        )}>
                                                            {item.status}
                                                        </span>
                                                    </div>
                                                    {item.bonusReward ? (
                                                        <span className="text-xs font-bold text-chart-5 bg-chart-5/10 px-2.5 py-1 rounded-full whitespace-nowrap">
                                                            +{item.bonusReward} bonus
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <h4 className="font-black text-foreground text-lg md:text-xl tracking-tight mb-1">
                                                    {item.name}
                                                </h4>
                                                {item.description && (
                                                    <p className="text-xs font-medium text-muted-foreground mb-3 line-clamp-2">
                                                        {item.description}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-2 mb-4">
                                                    <Target className="w-3.5 h-3.5 text-muted-foreground/60" />
                                                    <p className="text-xs font-bold text-muted-foreground/80">
                                                        {item.className}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <div className="mt-auto space-y-2">
                                                <div className="flex justify-between text-xs font-black text-muted-foreground">
                                                    <span>
                                                        {item.points.toLocaleString()} / {item.targetPoints.toLocaleString()} pts
                                                    </span>
                                                    <span className="text-primary font-bold">
                                                        {pct}%
                                                    </span>
                                                </div>
                                                <div className="w-full bg-muted/40 rounded-full h-2.5 overflow-hidden border border-border/30">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${pct}%` }}
                                                        transition={{ duration: 1, ease: "easeOut" }}
                                                        className="h-full bg-primary"
                                                    />
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Leaderboard List */}
                        {rankType !== 'goals' && others.length > 0 && (
                            <div className={cn(
                                "mx-auto w-full",
                                gridLayout 
                                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" 
                                    : "grid grid-cols-1 lg:grid-cols-2 gap-4"
                            )}>
                                {!gridLayout && (
                                    <div className="lg:col-span-2 px-6 pb-2 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 flex justify-between w-full">
                                        <span>Top Items</span>
                                        <span>Points</span>
                                    </div>
                                )}
                                {others.map((item, index) => {
                                    const prevItem = index === 0 ? podium[podiumSize - 1] : others[index - 1];
                                    const pointsToNext = prevItem ? prevItem.points - item.points : 0;
                                    
                                    return (
                                        <motion.div
                                            key={item.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.8 + index * 0.05 }}
                                            onMouseEnter={() => setHoveredIndex(item.id)}
                                            onMouseLeave={() => setHoveredIndex(null)}
                                            className={cn(
                                                "group relative flex items-center justify-between backdrop-blur-sm border-2 border-transparent rounded-2xl px-4 py-3 md:px-6 md:py-4 transition-all hover:bg-card hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-0.5",
                                                index % 2 === 0 ? "bg-card/40" : "bg-card/20",
                                                "w-full"
                                            )}
                                            title={pointsToNext > 0 ? `${pointsToNext.toLocaleString()} pts to rank up` : ''}
                                        >
                                        <div className="flex min-w-0 items-center gap-4">
                                            <span className="w-6 shrink-0 text-sm font-black text-muted-foreground/30">{index + podiumSize + 1}</span>
                                            <Avatar className="w-10 h-10 border-2 border-background overflow-hidden">
                                                {item.photoUrl && <img src={item.photoUrl} alt="Photo" className={settings.photoDisplayMode === 'cover' ? 'h-full w-full object-cover' : 'h-full w-full object-contain'} />}
                                                <AvatarFallback className="bg-secondary text-xs font-bold">{item.initials}</AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <p className="truncate font-black text-foreground tracking-tight">{item.name}</p>
                                                </div>
                                                {item.type === 'student' && (
                                                    <p className="truncate text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{item.className}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="shrink-0 pl-3 text-lg font-black text-primary tracking-tighter">
                                            {item.points.toLocaleString()}
                                        </div>

                                        {/* Hover Bar Accent */}
                                        <motion.div
                                            initial={false}
                                            animate={{
                                                opacity: hoveredIndex === item.id ? 1 : 0,
                                                scaleY: hoveredIndex === item.id ? 1 : 0.6
                                            }}
                                            className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl bg-primary transition-opacity"
                                        />
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}

                        {(!topItems || topItems.length === 0) && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 text-muted-foreground font-medium">
                                No items have earned points yet for this view.
                            </motion.div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
