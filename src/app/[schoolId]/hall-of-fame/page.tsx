'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { useAppContext } from '@/components/AppProvider';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { Trophy, Crown, Target, Shield } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { Student, Class, House, Category, Goal } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useSettings } from '@/components/providers/SettingsProvider';
import { cn, displayStudentNameOnSharedBoard } from '@/lib/utils';
import { canAccessHallOfFameRoute } from '@/lib/hallOfFameAccess';
import { parseHallOfFameSearchParams, type HallOfFameRankType } from '@/lib/hallOfFameUrlConfig';
import { isHouseStudentPointsRollupEnabled } from '@/lib/houses/housePointsSettings';
import { computeGoalProgress } from '@/lib/goalsProgress';
import { getPeriodKeys } from '@/lib/db/helpers';
import { globalAnimatedBackdropActive } from '@/lib/animatedBackdrop';
import { rainbowTripletForNavId, complementTripletForNavId } from '@/lib/rainbowNav';
import { motion, AnimatePresence } from "framer-motion";
import { springCinematic } from '@/lib/animation';
import { useSchoolMetadataDocRef } from '@/hooks/useSchoolMetadataDocRef';
import { getLevelUpLogoHref } from '@/lib/appBranding';
import { useToast } from '@/hooks/use-toast';

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
    const { toast } = useToast();
    const firestore = useFirestore();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { settings } = useSettings();
    const [hoveredIndex, setHoveredIndex] = useState<string | null>(null);

    const isFullscreen = (searchParams?.get('fullscreen') || '').trim() === '1';

    const urlConfig = useMemo(() => {
        const urlRank = (searchParams?.get('rankType') || searchParams?.get('rank') || searchParams?.get('view') || '')
            .trim()
            .toLowerCase();
        const wantsHouses =
            urlRank === 'houses' || urlRank === 'house-standings' || urlRank === 'house_standings';
        const houseDefaults = wantsHouses
            ? {
                  hallOfFameRankType: 'houses' as const,
                  hallOfFameSortBy: settings.houseHallOfFameSortBy ?? settings.hallOfFameSortBy,
                  hallOfFameScope: 'all' as const,
                  hallOfFameLimit: settings.houseHallOfFameLimit ?? settings.hallOfFameLimit,
                  hallOfFamePodiumSize: settings.houseHallOfFamePodiumSize ?? settings.hallOfFamePodiumSize,
                  hallOfFameGridLayout: settings.houseHallOfFameGridLayout ?? settings.hallOfFameGridLayout,
              }
            : {
                  hallOfFameRankType: settings.hallOfFameRankType,
                  hallOfFameSortBy: settings.hallOfFameSortBy,
                  hallOfFameScope: settings.hallOfFameScope,
                  hallOfFameLimit: settings.hallOfFameLimit,
                  hallOfFamePodiumSize: settings.hallOfFamePodiumSize,
                  hallOfFameGridLayout: settings.hallOfFameGridLayout,
              };
        return parseHallOfFameSearchParams(searchParams, houseDefaults);
    }, [
        searchParams,
        settings.hallOfFameRankType,
        settings.hallOfFameSortBy,
        settings.hallOfFameScope,
        settings.hallOfFameLimit,
        settings.hallOfFamePodiumSize,
        settings.hallOfFameGridLayout,
        settings.houseHallOfFameSortBy,
        settings.houseHallOfFameLimit,
        settings.houseHallOfFamePodiumSize,
        settings.houseHallOfFameGridLayout,
    ]);

    const [rankType, setRankType] = useState<HallOfFameRankType>(urlConfig.rankType);
    const [sortBy, setSortBy] = useState<string>(urlConfig.sortBy);
    const [scope, setScope] = useState<'all' | string>(urlConfig.scope);
    const [limit, setLimit] = useState<number>(urlConfig.limit);
    const [podiumSize, setPodiumSize] = useState<number>(urlConfig.podiumSize);
    const [gridLayout, setGridLayout] = useState<boolean>(urlConfig.gridLayout);
    const [goalsProgressMap, setGoalsProgressMap] = useState<Record<string, number>>({});

    const schoolDocRef = useSchoolMetadataDocRef();
    const { data: schoolMeta } = useDoc<{ name?: string }>(schoolDocRef);
    const schoolName =
      schoolMeta?.name ||
      (schoolId ? schoolId.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) : '');

    // URL params lock the display (e.g. House Hall of Fame from Admin → Houses).
    useEffect(() => {
        if (!urlConfig.locked) return;
        setRankType(urlConfig.rankType);
        setSortBy(urlConfig.sortBy);
        setScope(urlConfig.scope);
        setLimit(urlConfig.limit);
        setPodiumSize(urlConfig.podiumSize);
        setGridLayout(urlConfig.gridLayout);
    }, [urlConfig]);

    useEffect(() => {
        if (urlConfig.locked) return;
        setRankType(settings.hallOfFameRankType ?? 'students');
        setSortBy(settings.hallOfFameSortBy ?? 'lifetimePoints');
        setScope(settings.hallOfFameScope ?? 'all');
        setLimit(settings.hallOfFameLimit ?? 50);
        setPodiumSize(settings.hallOfFamePodiumSize ?? 3);
        setGridLayout(settings.hallOfFameGridLayout ?? true);
    }, [
        urlConfig.locked,
        settings.hallOfFameRankType,
        settings.hallOfFameSortBy,
        settings.hallOfFameScope,
        settings.hallOfFameLimit,
        settings.hallOfFamePodiumSize,
        settings.hallOfFameGridLayout,
    ]);

    useEffect(() => {
        if (isInitialized && !canAccessHallOfFameRoute(loginState)) {
            toast({
                variant: "destructive",
                title: "Authorization Required",
                description: "Please sign in to access the Hall of Fame display.",
            });
            const q = schoolId ? `?school=${encodeURIComponent(schoolId)}` : '';
            router.replace(`/login${q}`);
        }
    }, [isInitialized, loginState, router, schoolId, toast]);

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

    const showHouseLeaderboard = rankType === 'houses' || urlConfig.rankType === 'houses';
    const housesQuery = useMemoFirebase(
        () =>
            schoolId && (settings.enableHouses || showHouseLeaderboard)
                ? collection(firestore, 'schools', schoolId, 'houses')
                : null,
        [firestore, schoolId, settings.enableHouses, showHouseLeaderboard],
    );
    const { data: houses, isLoading: housesLoading } = useCollection<House>(housesQuery);

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

    const getClassName = useCallback((classId?: string) => {
        return classId ? classesMap.get(classId) || 'Unassigned' : 'Unassigned';
    }, [classesMap]);

    const getScopeName = () => {
        if (scope === 'all') return 'Entire School';
        return getClassName(scope);
    }

    const getSortByLabel = () => {
        if (rankType === 'goals') return 'All Active & Completed Goals';
        if (rankType === 'houses') {
            if (sortBy === 'points') return 'House Hall of Fame · Current house points';
            if (sortBy === 'lifetimePoints') return 'House Hall of Fame · Lifetime house points';
            if (sortBy === 'period_day') return 'House Hall of Fame · Points earned today';
            if (sortBy === 'period_week') return 'House Hall of Fame · Points earned this week';
            if (sortBy === 'period_month') return 'House Hall of Fame · Points earned this month';
            return `House Hall of Fame · ${sortBy} points`;
        }
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

    const getPointsForStudent = useCallback((student: Student) => {
        if (sortBy === 'points') return student.points || 0;
        if (sortBy === 'lifetimePoints') return student.lifetimePoints || 0;
        if (sortBy === 'period_day') return student.pointsByPeriod?.[currentPeriodKeys.day] || 0;
        if (sortBy === 'period_week') return student.pointsByPeriod?.[currentPeriodKeys.week] || 0;
        if (sortBy === 'period_month') return student.pointsByPeriod?.[currentPeriodKeys.month] || 0;
        return student.categoryPoints?.[sortBy] || 0;
    }, [sortBy, currentPeriodKeys]);

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
                name: displayStudentNameOnSharedBoard(
                    s,
                    settings.privacyStudentNameDisplayMode === 'preferred_only' ? 'preferred_only' : 'full',
                ),
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
        } else if (rankType === 'houses') {
            if (!houses) return [];
            const rollup = isHouseStudentPointsRollupEnabled(settings);
            const memberCounts = new Map<string, number>();
            for (const s of allTopStudents ?? []) {
                if (!s.houseId) continue;
                memberCounts.set(s.houseId, (memberCounts.get(s.houseId) ?? 0) + 1);
            }
            const makeHouseRow = (h: House, points: number) => ({
                id: h.id,
                type: 'house' as const,
                name: h.name,
                photoUrl: h.crestUrl ?? null,
                points,
                classId: h.id,
                className: h.value || h.motto || 'House team',
                initials: (h.emoji || h.name).slice(0, 2),
                accentColor: h.color,
                motto: h.motto,
                memberCount: memberCounts.get(h.id),
            });

            if (sortBy === 'points' || sortBy === 'lifetimePoints') {
                const rows = houses.map((h) =>
                    makeHouseRow(
                        h,
                        sortBy === 'lifetimePoints' ? h.lifetimePoints ?? 0 : h.points ?? 0,
                    ),
                );
                rows.sort((a, b) => b.points - a.points);
                return rows.slice(0, limit);
            }
            if (!rollup || !allTopStudents) return [];
            const totals = new Map<string, number>();
            for (const s of allTopStudents) {
                const hid = s.houseId;
                if (!hid) continue;
                totals.set(hid, (totals.get(hid) ?? 0) + getPointsForStudent(s));
            }
            const rows = houses.map((h) => makeHouseRow(h, totals.get(h.id) ?? 0));
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
    }, [
        rankType,
        allTopStudents,
        classes,
        houses,
        allGoals,
        goalsProgressMap,
        scope,
        sortBy,
        limit,
        getClassName,
        getPointsForStudent,
        settings,
    ]);

    const animBackdrop = globalAnimatedBackdropActive(settings);

    if (
        !isInitialized ||
        !canAccessHallOfFameRoute(loginState) ||
        studentsLoading ||
        classesLoading ||
        ((settings.enableHouses || showHouseLeaderboard) && housesLoading) ||
        categoriesLoading
    ) {
        return <HallOfFameSkeleton animBackdrop={animBackdrop} />;
    }

    const podium = topItems?.slice(0, podiumSize) || [];
    const others = topItems?.slice(podiumSize) || [];
    const showHallLocalDecor = !animBackdrop;
    const hallLabel = rankType === 'houses' ? 'House Hall of Fame' : 'Hall of Fame';
    const scopeLabel = rankType === 'houses' ? 'All Houses' : getScopeName();
    const getAccentColor = (item: any): string | undefined =>
        item?.type === 'house' && item.accentColor ? item.accentColor : undefined;
    const getMetaLine = (item: any): string | null => {
        if (item?.type === 'house') {
            const parts = [
                item.className,
                typeof item.memberCount === 'number' ? `${item.memberCount} members` : null,
            ].filter(Boolean);
            return parts.length > 0 ? parts.join(' · ') : 'House team';
        }
        if (item?.type === 'class') return 'Class standing';
        if (item?.type === 'student') return item.className;
        return null;
    };

    return (
        <div
          className={cn(
            "min-h-screen text-foreground relative overflow-hidden font-sans flex flex-col items-center",
            isFullscreen && "h-dvh min-h-dvh overflow-hidden",
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
                settings.displayMode === 'app' ? 'pb-24' : 'pb-12',
            )}>
                <div className="sticky top-0 z-20 mb-8 py-3 bg-background/85 backdrop-blur-md border-b border-border/40">
                  <div className="w-full rounded-2xl border bg-card/70 backdrop-blur-md px-4 py-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <Link
                      href={getLevelUpLogoHref()}
                      className="min-w-0 justify-self-start no-underline outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
                      aria-label="LevelUp EDU — school sign-in"
                    >
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-muted-foreground">levelUp EDU</p>
                    </Link>

                    <div className="min-w-0 max-w-[70vw] sm:max-w-[60vw] text-center">
                      <p className="text-sm sm:text-base font-black tracking-tight text-foreground truncate">
                        {schoolName}
                      </p>
                    </div>

                    <div className="justify-self-end shrink-0 rounded-xl border bg-muted/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground inline-flex items-center gap-1.5">
                      {rankType === 'houses' ? <Shield className="h-3 w-3 text-primary" aria-hidden /> : null}
                      {hallLabel}
                    </div>
                  </div>
                  <div className="mt-3 text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground text-center">
                    {scopeLabel} &bull; {getSortByLabel()}
                  </div>
                </div>

                        {/* Podium */}
                        {rankType !== 'goals' && podium.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end mb-12 md:mb-20">
                                {/* 1st Place */}
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ ...springCinematic, delay: 0.2 }}
                                    className="text-center md:order-2 order-1"
                                >
                                    <div
                                        className="bg-primary/5 backdrop-blur-md border-4 border-primary/20 rounded-t-[4rem] rounded-b-3xl p-6 md:p-8 relative shadow-2xl h-72 md:h-80 flex flex-col justify-end transition-all"
                                        style={getAccentColor(podium[0]) ? { borderColor: `${getAccentColor(podium[0])}55` } : undefined}
                                    >
                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center">
                                            <Crown className="w-12 h-12 sm:w-16 sm:h-16 text-chart-5 animate-float drop-shadow-lg" />
                                        </div>
                                        <Avatar className="w-24 h-24 md:w-28 md:h-28 mx-auto mb-4 border-4 border-primary/30 shadow-xl overflow-hidden">
                                            {podium[0].photoUrl && <img src={podium[0].photoUrl} alt="Photo" className={settings.photoDisplayMode === 'cover' ? 'h-full w-full object-cover' : 'h-full w-full object-contain'} />}
                                            <AvatarFallback
                                                className="bg-primary text-primary-foreground text-3xl font-black"
                                                style={getAccentColor(podium[0]) ? { backgroundColor: `${getAccentColor(podium[0])}22`, color: getAccentColor(podium[0]) } : undefined}
                                            >
                                                {podium[0].initials}
                                            </AvatarFallback>
                                        </Avatar>
                                        <p className="font-black text-foreground text-xl md:text-2xl truncate tracking-tighter">{podium[0].name}</p>
                                        {getMetaLine(podium[0]) ? (
                                            <p className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">
                                                {getMetaLine(podium[0])}
                                            </p>
                                        ) : null}
                                        <p className="text-primary font-black text-2xl md:text-3xl mt-1 tracking-tighter">{podium[0].points.toLocaleString()} pts</p>
                                    </div>
                                </motion.div>

                                {/* 2nd Place */}
                                {podium.length > 1 && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ ...springCinematic, delay: 0.4 }}
                                        className="text-center md:order-1 order-2"
                                    >
                                        <div
                                            className="bg-card/40 backdrop-blur-sm border-2 border-border rounded-3xl p-6 md:p-8 relative h-56 md:h-64 flex flex-col justify-end shadow-lg transition-all hover:shadow-xl"
                                            style={getAccentColor(podium[1]) ? { borderColor: `${getAccentColor(podium[1])}44` } : undefined}
                                        >
                                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
                                                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-black text-xl border-4 border-background">2</div>
                                            </div>
                                            <Avatar className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 border-4 border-border shadow-md">
                                                {podium[1].photoUrl && <img src={podium[1].photoUrl} alt="Photo" className={settings.photoDisplayMode === 'cover' ? 'h-full w-full object-cover' : 'h-full w-full object-contain'} />}
                                                <AvatarFallback
                                                    className="bg-muted text-muted-foreground text-2xl font-black"
                                                    style={getAccentColor(podium[1]) ? { backgroundColor: `${getAccentColor(podium[1])}20`, color: getAccentColor(podium[1]) } : undefined}
                                                >
                                                    {podium[1].initials}
                                                </AvatarFallback>
                                            </Avatar>
                                            <p className="font-black text-foreground text-lg md:text-xl truncate tracking-tight">{podium[1].name}</p>
                                            {getMetaLine(podium[1]) ? (
                                                <p className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">
                                                    {getMetaLine(podium[1])}
                                                </p>
                                            ) : null}
                                            <p className="text-primary font-bold text-lg mt-1 tracking-tight">{podium[1].points.toLocaleString()} pts</p>
                                        </div>
                                    </motion.div>
                                )}

                                {/* 3rd Place */}
                                {podium.length > 2 && (
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ ...springCinematic, delay: 0.6 }}
                                        className="text-center md:order-3 order-3"
                                    >
                                        <div
                                            className="bg-card/40 backdrop-blur-sm border-2 border-border/50 rounded-3xl p-6 md:p-8 relative h-52 md:h-56 flex flex-col justify-end shadow-lg transition-all hover:shadow-xl"
                                            style={getAccentColor(podium[2]) ? { borderColor: `${getAccentColor(podium[2])}44` } : undefined}
                                        >
                                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
                                                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-black text-xl border-4 border-background">3</div>
                                            </div>
                                            <Avatar className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-4 border-4 border-border shadow-md">
                                                {podium[2].photoUrl && <img src={podium[2].photoUrl} alt="Photo" className={settings.photoDisplayMode === 'cover' ? 'h-full w-full object-cover' : 'h-full w-full object-contain'} />}
                                                <AvatarFallback
                                                    className="bg-muted text-muted-foreground text-xl font-black"
                                                    style={getAccentColor(podium[2]) ? { backgroundColor: `${getAccentColor(podium[2])}20`, color: getAccentColor(podium[2]) } : undefined}
                                                >
                                                    {podium[2].initials}
                                                </AvatarFallback>
                                            </Avatar>
                                            <p className="font-black text-foreground text-base md:text-lg truncate tracking-tight">{podium[2].name}</p>
                                            {getMetaLine(podium[2]) ? (
                                                <p className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">
                                                    {getMetaLine(podium[2])}
                                                </p>
                                            ) : null}
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
                                            transition={{ ...springCinematic, delay: 0.1 + index * 0.05 }}
                                            className="group relative flex flex-col justify-between backdrop-blur-sm border-2 border-border/40 rounded-3xl p-5 md:p-6 transition-all hover:bg-card hover:shadow-xl hover:shadow-primary/5 bg-card/40 min-h-[160px]"
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
                                                        transition={springCinematic}
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
                                        <span>{rankType === 'houses' ? 'More Houses' : 'Top Items'}</span>
                                        <span>Points</span>
                                    </div>
                                )}
                                {others.map((item, index) => {
                                    const prevItem = index === 0 ? podium[podiumSize - 1] : others[index - 1];
                                    const pointsToNext = prevItem ? prevItem.points - item.points : 0;
                                    const accentColor = getAccentColor(item);
                                    const metaLine = getMetaLine(item);
                                    
                                    return (
                                        <motion.div
                                            key={item.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ ...springCinematic, delay: 0.8 + index * 0.05 }}
                                            onMouseEnter={() => setHoveredIndex(item.id)}
                                            onMouseLeave={() => setHoveredIndex(null)}
                                            className={cn(
                                                "group relative flex items-center justify-between backdrop-blur-sm border-2 border-transparent rounded-2xl transition-all hover:bg-card hover:shadow-xl hover:shadow-primary/5",
                                                rankType === 'houses'
                                                  ? "px-5 py-4 md:px-7 md:py-5"
                                                  : "px-4 py-3 md:px-6 md:py-4",
                                                index % 2 === 0 ? "bg-card/40" : "bg-card/20",
                                                "w-full"
                                            )}
                                            title={pointsToNext > 0 ? `${pointsToNext.toLocaleString()} pts to rank up` : ''}
                                        >
                                        <div className="flex min-w-0 items-center gap-4">
                                            <span className="w-6 shrink-0 text-sm font-black text-muted-foreground/30">{index + podiumSize + 1}</span>
                                            <Avatar
                                              className={cn(
                                                "border-2 border-background overflow-hidden shrink-0",
                                                rankType === 'houses' ? "w-14 h-14 md:w-16 md:h-16" : "w-10 h-10",
                                              )}
                                            >
                                                {item.photoUrl && <img src={item.photoUrl} alt="Photo" className={settings.photoDisplayMode === 'cover' ? 'h-full w-full object-cover' : 'h-full w-full object-contain'} />}
                                                <AvatarFallback
                                                    className={cn(
                                                      "bg-secondary font-bold",
                                                      rankType === 'houses' ? "text-lg md:text-xl" : "text-xs",
                                                    )}
                                                    style={accentColor ? { backgroundColor: `${accentColor}20`, color: accentColor } : undefined}
                                                >
                                                    {item.initials}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <p
                                                      className={cn(
                                                        'truncate font-black text-foreground tracking-tight',
                                                        rankType === 'houses'
                                                          ? 'text-2xl md:text-3xl lg:text-4xl'
                                                          : 'text-base md:text-lg',
                                                      )}
                                                    >
                                                      {item.name}
                                                    </p>
                                                </div>
                                                {metaLine ? (
                                                    <p className="truncate text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{metaLine}</p>
                                                ) : null}
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
                                            style={accentColor ? { backgroundColor: accentColor } : undefined}
                                        />
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}

                        {(!topItems || topItems.length === 0) && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 text-muted-foreground font-medium">
                                {rankType === 'houses'
                                    ? 'No houses have earned points yet for this view.'
                                    : 'No items have earned points yet for this view.'}
                            </motion.div>
                        )}
            </div>
        </div>
    );
}
