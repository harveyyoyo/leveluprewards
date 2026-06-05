'use client';
import { useEffect, useState, useMemo, useCallback, useRef, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
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
import {
  parseHallOfFameUrlRankTypePin,
  resolveHallOfFameDisplayConfig,
  hallOfFameGridColumnClass,
  hallOfFameUsesClientSideStudentRanking,
  buildPodiumDisplaySlots,
  clampHallOfFamePodiumSize,
  getHallOfFameStageSizeStyle,
  isHallOfFamePointsSort,
  type PodiumPlace,
} from '@/lib/hallOfFameUrlConfig';
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

function LeaderboardName({
  name,
  className,
  variant = 'grid',
}: {
  name: string;
  className?: string;
  variant?: 'grid' | 'podium';
}) {
  return (
    <p
      className={cn(
        'font-black text-foreground tracking-tight break-words [overflow-wrap:anywhere]',
        variant === 'podium'
          ? 'w-full truncate px-0.5 leading-snug'
          : 'line-clamp-2 leading-snug',
        className,
      )}
      title={name}
    >
      {name}
    </p>
  );
}

function HallOfFameSkeleton({
    isFullscreen,
    isPortrait,
}: {
    isFullscreen: boolean;
    isPortrait: boolean;
}) {
    const inner = (
        <div
            className={cn(
                'flex flex-col overflow-hidden bg-background p-4 sm:p-6',
                !isFullscreen && 'min-h-screen w-full',
            )}
            style={isFullscreen ? getHallOfFameStageSizeStyle(isPortrait) : undefined}
        >
            <Skeleton className="h-14 w-full mb-4 rounded-2xl shrink-0" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full items-end mb-6 flex-1 min-h-0">
                <Skeleton className="h-40 w-full rounded-3xl" />
                <Skeleton className="h-48 w-full rounded-3xl" />
                <Skeleton className="h-36 w-full rounded-3xl" />
            </div>
            <div className="w-full space-y-2 shrink-0">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-2xl" />)}
            </div>
        </div>
    );

    if (isFullscreen) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-background">
                {inner}
            </div>
        );
    }

    return inner;
}

export default function HallOfFamePage() {
    const { loginState, isInitialized, schoolId } = useAppContext();
    const { toast } = useToast();
    const firestore = useFirestore();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { settings } = useSettings();
    const [hoveredIndex, setHoveredIndex] = useState<string | null>(null);
    const [autoScrollPaused, setAutoScrollPaused] = useState(false);
    const [portalReady, setPortalReady] = useState(false);

    const isFullscreen = (searchParams?.get('fullscreen') || '').trim() === '1';

    useEffect(() => {
        setPortalReady(true);
    }, []);

    const urlRankTypePin = useMemo(
        () => parseHallOfFameUrlRankTypePin(searchParams),
        [searchParams],
    );

    const displayConfig = useMemo(
        () => resolveHallOfFameDisplayConfig(settings, urlRankTypePin),
        [
            settings,
            urlRankTypePin,
        ],
    );

    const {
        rankType,
        sortBy,
        scope,
        limit,
        podiumSize,
        gridLayout,
        gridColumns,
        layout,
    } = displayConfig;
    const autoScroll = displayConfig.autoScroll && !autoScrollPaused;

    useEffect(() => {
        if (displayConfig.autoScroll) setAutoScrollPaused(false);
    }, [displayConfig.autoScroll]);

    const [goalsProgressMap, setGoalsProgressMap] = useState<Record<string, number>>({});
    const contentScrollRef = useRef<HTMLDivElement>(null);

    const schoolDocRef = useSchoolMetadataDocRef();
    const { data: schoolMeta } = useDoc<{ name?: string }>(schoolDocRef);
    const schoolName =
      schoolMeta?.name ||
      (schoolId ? schoolId.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) : '');

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
        const studentsRef = collection(firestore, 'schools', schoolId, 'students');
        if (hallOfFameUsesClientSideStudentRanking(sortBy)) {
            return query(studentsRef, firestoreLimit(500));
        }
        const orderByField = sortBy === 'points' ? 'points' : 'lifetimePoints';
        return query(studentsRef, orderBy(orderByField, 'desc'), firestoreLimit(200));
    }, [firestore, schoolId, sortBy]);
    const { data: allTopStudents, isLoading: studentsLoading } = useCollection<Student>(studentsQuery);

    const classesQuery = useMemoFirebase(() => schoolId ? collection(firestore, 'schools', schoolId, 'classes') : null, [firestore, schoolId]);
    const { data: classes, isLoading: classesLoading } = useCollection<Class>(classesQuery);

    const showHouseLeaderboard = rankType === 'houses' || urlRankTypePin === 'houses';
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

            if (hallOfFameUsesClientSideStudentRanking(sortBy)) {
                sorted.sort((a, b) => getPointsForStudent(b) - getPointsForStudent(a));
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
                photoUrl: undefined,
                points: totals.get(c.id) ?? 0,
                classId: c.id,
                className: c.name || 'Unassigned',
                initials: (c.name || 'Unassigned').substring(0, 2).toUpperCase()
            }));
            rows.sort((a, b) => b.points - a.points);
            return rows.slice(0, limit);
        } else if (rankType === 'houses') {
            if (!houses?.length) return [];
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
                photoUrl: h.crestUrl || undefined,
                points,
                classId: h.id,
                className: h.value || h.motto || 'House team',
                initials: (h.emoji || h.name).slice(0, 2),
                accentColor: h.color,
                motto: h.motto,
                memberCount: memberCounts.get(h.id),
            });
            const houseDocPoints = (h: House) =>
                sortBy === 'points' ? (h.points ?? 0) : (h.lifetimePoints ?? h.points ?? 0);

            if (isHallOfFamePointsSort(sortBy)) {
                const rows = houses.map((h) => makeHouseRow(h, houseDocPoints(h)));
                rows.sort((a, b) => b.points - a.points);
                return rows.slice(0, limit);
            }
            if (sortBy.startsWith('period_') && rollup && allTopStudents?.length) {
                const totals = new Map<string, number>();
                for (const s of allTopStudents) {
                    const hid = s.houseId;
                    if (!hid) continue;
                    totals.set(hid, (totals.get(hid) ?? 0) + getPointsForStudent(s));
                }
                const rows = houses.map((h) => makeHouseRow(h, totals.get(h.id) ?? 0));
                rows.sort((a, b) => b.points - a.points);
                return rows.slice(0, limit);
            }
            const rows = houses.map((h) => makeHouseRow(h, houseDocPoints(h)));
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
                photoUrl: undefined,
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

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setAutoScrollPaused(true);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        if (!isFullscreen) return;
        const prevHtml = document.documentElement.style.overflow;
        const prevBody = document.body.style.overflow;
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        return () => {
            document.documentElement.style.overflow = prevHtml;
            document.body.style.overflow = prevBody;
        };
    }, [isFullscreen]);

    const animBackdrop = globalAnimatedBackdropActive(settings);
    const isPortrait = layout === 'portrait';
    const clampedPodiumSize = clampHallOfFamePodiumSize(podiumSize);
    const podium = topItems?.slice(0, clampedPodiumSize) ?? [];
    const others = topItems?.slice(clampedPodiumSize) ?? [];
    const podiumSlots = buildPodiumDisplaySlots(podium, clampedPodiumSize);
    const podiumSlotCount = podiumSlots.length;

    const needsClasses =
        rankType === 'classes' ||
        rankType === 'goals' ||
        (rankType === 'students' && scope !== 'all');
    const needsCategories =
        rankType === 'goals' ||
        (rankType === 'students' &&
            !isHallOfFamePointsSort(sortBy) &&
            !sortBy.startsWith('period_'));
    const needsGoals = rankType === 'goals';
    const needsHouses = rankType === 'houses';

    const isPageLoading =
        !isInitialized ||
        !schoolId ||
        !canAccessHallOfFameRoute(loginState) ||
        studentsLoading ||
        (needsClasses && classesLoading) ||
        (needsHouses && (housesLoading || houses === null)) ||
        (needsCategories && categoriesLoading) ||
        (needsGoals && goalsLoading);

    const leaderboardDataReady =
        rankType === 'houses'
            ? houses !== null
            : rankType === 'classes'
              ? classes !== null && allTopStudents !== null
              : rankType === 'goals'
                ? allGoals !== null
                : allTopStudents !== null;

    useEffect(() => {
        if (!autoScroll) return;

        let cancelled = false;
        let animationId = 0;
        let timeoutId: ReturnType<typeof setTimeout> | undefined;

        const startLoop = (scrollEl: HTMLDivElement) => {
            let scrollDirection = 1;
            const scrollSpeed = 0.5;
            let lastTime = 0;

            const handleScroll = (time: number) => {
                if (cancelled) return;
                if (!lastTime) lastTime = time;
                const delta = Math.min(time - lastTime, 50);
                lastTime = time;

                const scrollStep = (scrollSpeed * delta) / 16;
                scrollEl.scrollTop += scrollStep * scrollDirection;

                const isAtBottom =
                    Math.ceil(scrollEl.clientHeight + scrollEl.scrollTop) >= scrollEl.scrollHeight - 10;
                const isAtTop = scrollEl.scrollTop <= 10;

                if (isAtBottom && scrollDirection === 1) {
                    timeoutId = setTimeout(() => {
                        scrollDirection = -1;
                        lastTime = 0;
                        animationId = requestAnimationFrame(handleScroll);
                    }, 3000);
                    return;
                }
                if (isAtTop && scrollDirection === -1) {
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
        };

        const waitForScrollableContent = () => {
            if (cancelled) return;
            const scrollEl = contentScrollRef.current;
            if (!scrollEl) {
                animationId = requestAnimationFrame(waitForScrollableContent);
                return;
            }
            if (scrollEl.scrollHeight <= scrollEl.clientHeight + 2) {
                animationId = requestAnimationFrame(waitForScrollableContent);
                return;
            }
            startLoop(scrollEl);
        };

        waitForScrollableContent();
        return () => {
            cancelled = true;
            cancelAnimationFrame(animationId);
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [
        autoScroll,
        leaderboardDataReady,
        topItems?.length,
        clampedPodiumSize,
        others.length,
        gridLayout,
        gridColumns,
        rankType,
    ]);

    if (isPageLoading) {
        const skeleton = <HallOfFameSkeleton isFullscreen={isFullscreen} isPortrait={isPortrait} />;
        if (isFullscreen && portalReady) {
            return createPortal(skeleton, document.body);
        }
        return skeleton;
    }
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

    const renderPodiumCard = (item: (typeof podium)[number], place: PodiumPlace, index: number) => {
        const isFirst = place === 1;
        const isMid = place === 2 || place === 3;
        const isOuter = place === 4 || place === 5;
        const accent = getAccentColor(item);
        const metaLine = getMetaLine(item);
        return (
            <motion.div
                key={`${item.id}-${place}`}
                initial={isFullscreen ? false : { opacity: 0, scale: isFirst ? 0.9 : 1, x: place === 2 ? -20 : place === 3 ? 20 : 0 }}
                animate={isFullscreen ? undefined : { opacity: 1, scale: 1, x: 0 }}
                transition={{ ...springCinematic, delay: 0.2 + index * 0.2 }}
                className={cn(
                  'text-center min-w-0 overflow-visible',
                  podiumSlotCount === 1 && 'w-full max-w-xs',
                  clampedPodiumSize <= 3 && clampedPodiumSize > 1 && 'w-full max-w-[11rem] sm:max-w-xs',
                  clampedPodiumSize >= 5 && 'w-full',
                )}
            >
                <div
                    className={cn(
                      'relative flex flex-col items-center justify-end gap-1 overflow-visible shadow-lg transition-all',
                      isFirst
                        ? cn(
                            'bg-primary/5 backdrop-blur-md border-4 border-primary/20 rounded-t-[3rem] rounded-b-3xl shadow-2xl',
                            isFullscreen ? 'min-h-40 sm:min-h-48 p-4' : isPortrait ? 'min-h-64 p-6' : 'min-h-72 md:min-h-80 p-6 md:p-8',
                          )
                        : cn(
                            'bg-card/40 backdrop-blur-sm border-2 border-border rounded-3xl',
                            isMid
                              ? (isFullscreen ? 'min-h-36 sm:min-h-44 p-4' : isPortrait ? 'min-h-52 p-6' : 'min-h-60 md:min-h-[17rem] p-6 md:p-8')
                              : (isFullscreen ? 'min-h-32 sm:min-h-36 p-3' : isPortrait ? 'min-h-44 p-5' : 'min-h-52 md:min-h-56 p-5 md:p-6'),
                          ),
                    )}
                    style={accent ? { borderColor: `${accent}${isFirst ? '55' : '44'}` } : undefined}
                >
                    <div className="flex shrink-0 flex-col items-center pb-1">
                        {isFirst ? (
                            <Crown className={cn('text-chart-5 animate-float drop-shadow-lg', isFullscreen ? 'w-9 h-9 sm:w-10 sm:h-10' : 'w-12 h-12 sm:w-14 sm:h-14')} />
                        ) : (
                            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border-4 border-background bg-muted text-base font-black text-muted-foreground">
                                {place}
                            </div>
                        )}
                    </div>
                    <Avatar
                      className={cn(
                        'mx-auto shrink-0 border-4 overflow-hidden',
                        isFirst
                          ? cn('mb-2 border-primary/30 shadow-xl', isFullscreen ? 'w-16 h-16' : 'w-24 h-24 md:w-28 md:h-28')
                          : cn(
                              'mb-2 border-border shadow-md',
                              isOuter
                                ? (isFullscreen ? 'w-10 h-10' : 'w-12 h-12 md:w-14 md:h-14')
                                : (isFullscreen ? 'w-12 h-12' : 'w-16 h-16 md:w-20 md:h-20'),
                            ),
                      )}
                    >
                        {item.photoUrl && (
                          <img
                            src={item.photoUrl}
                            alt=""
                            className={settings.photoDisplayMode === 'cover' ? 'h-full w-full object-cover' : 'h-full w-full object-contain'}
                          />
                        )}
                        <AvatarFallback
                            className={cn('font-black', isFirst ? 'bg-primary text-primary-foreground text-2xl' : 'bg-muted text-muted-foreground text-xl')}
                            style={accent ? { backgroundColor: `${accent}20`, color: accent } : undefined}
                        >
                            {item.initials}
                        </AvatarFallback>
                    </Avatar>
                    <LeaderboardName
                      name={item.name}
                      variant="podium"
                      className={cn(
                        isFirst
                          ? (isFullscreen ? 'text-base sm:text-lg' : 'text-xl md:text-2xl')
                          : isOuter
                            ? (isFullscreen ? 'text-xs sm:text-sm' : 'text-sm md:text-base')
                            : (isFullscreen ? 'text-sm sm:text-base' : 'text-lg md:text-xl'),
                        'tracking-tight',
                      )}
                    />
                    {metaLine ? (
                        <p className="w-full truncate px-0.5 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">
                            {metaLine}
                        </p>
                    ) : null}
                    <p className={cn('shrink-0 text-primary font-black tracking-tighter', isFirst ? 'text-xl md:text-2xl' : 'text-lg')}>
                        {item.points.toLocaleString()} pts
                    </p>
                </div>
            </motion.div>
        );
    };

    const themeStyle = {
        ['--primary' as string]: rainbowTripletForNavId('fame', settings.colorScheme),
        ['--chart-1' as string]: rainbowTripletForNavId('fame', settings.colorScheme),
        ['--chart-2' as string]: complementTripletForNavId('fame', settings.colorScheme),
        ['--chart-3' as string]: rainbowTripletForNavId('fame', settings.colorScheme),
        ['--chart-4' as string]: complementTripletForNavId('fame', settings.colorScheme),
        ['--chart-5' as string]: rainbowTripletForNavId('fame', settings.colorScheme),
        ['--ring' as string]: complementTripletForNavId('fame', settings.colorScheme),
    } as CSSProperties;

    const pageContent = (
        <div
          className={cn(
            "text-foreground font-sans",
            isFullscreen
              ? "fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-background"
              : "relative min-h-screen flex flex-col items-center",
            !isFullscreen && animBackdrop ? "bg-transparent" : "bg-background",
          )}
          style={themeStyle}
        >
            {!isFullscreen && showHallLocalDecor && (
            <div className="pointer-events-none fixed inset-0 opacity-[0.03] z-0" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
            }} />
            )}

            {!isFullscreen && showHallLocalDecor && (
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

            <div
              className={cn(
                'relative z-10 flex flex-col overflow-hidden bg-background',
                !isFullscreen && 'w-full min-h-screen',
                !isFullscreen && (isPortrait ? 'max-w-md mx-auto' : 'max-w-full'),
              )}
              style={isFullscreen ? getHallOfFameStageSizeStyle(isPortrait) : undefined}
            >
            <div
              className={cn(
                "w-full h-full flex flex-col min-h-0",
                isFullscreen ? "px-3 pt-2 pb-2" : "px-4 sm:px-8 pt-8 md:pt-12",
                !isFullscreen && (settings.displayMode === 'app' ? 'pb-24' : 'pb-12'),
              )}
            >
                <div className={cn(
                  "z-20 shrink-0 bg-background/85 backdrop-blur-md border-b border-border/40",
                  isFullscreen ? "mb-2 py-1.5" : "sticky top-0 mb-8 py-3",
                )}>
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

                <div
                  ref={contentScrollRef}
                  className={cn(
                    'flex-1 min-h-0',
                    autoScroll && 'overflow-y-auto overscroll-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
                    isFullscreen && !autoScroll && 'overflow-hidden',
                    !isFullscreen && autoScroll && 'max-h-[calc(100dvh-14rem)]',
                  )}
                >
                        {rankType !== 'goals' && podiumSlotCount > 0 && (
                            <div className={cn(
                              'items-end gap-3 sm:gap-4 md:gap-6 mx-auto w-full overflow-visible pt-2',
                              isFullscreen ? 'mb-2' : 'mb-12 md:mb-20',
                              clampedPodiumSize === 5 && !isPortrait
                                ? 'grid grid-cols-5 max-w-6xl'
                                : clampedPodiumSize === 3 && !isPortrait
                                  ? 'grid grid-cols-3 max-w-5xl'
                                  : 'flex flex-wrap justify-center',
                            )}>
                                {podiumSlots.map((slot, index) => renderPodiumCard(slot.item, slot.place, index))}
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
                                "mx-auto w-full grid",
                                isFullscreen ? "gap-2" : "gap-4",
                                gridLayout
                                    ? hallOfFameGridColumnClass(gridColumns, isPortrait, isFullscreen)
                                    : "grid-cols-1 lg:grid-cols-2",
                            )}>
                                {!gridLayout && (
                                    <div className="lg:col-span-2 px-6 pb-2 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 flex justify-between w-full">
                                        <span>{rankType === 'houses' ? 'More Houses' : 'Top Items'}</span>
                                        <span>Points</span>
                                    </div>
                                )}
                                {others.map((item, index) => {
                                    const prevItem = index === 0 && clampedPodiumSize > 0 ? podium[clampedPodiumSize - 1] : others[index - 1];
                                    const pointsToNext = prevItem ? prevItem.points - item.points : 0;
                                    const accentColor = getAccentColor(item);
                                    const metaLine = getMetaLine(item);
                                    
                                    return (
                                        <motion.div
                                            key={item.id}
                                            initial={isFullscreen ? false : { opacity: 0, y: 10 }}
                                            animate={isFullscreen ? undefined : { opacity: 1, y: 0 }}
                                            transition={{ ...springCinematic, delay: 0.8 + index * 0.05 }}
                                            onMouseEnter={() => setHoveredIndex(item.id)}
                                            onMouseLeave={() => setHoveredIndex(null)}
                                            className={cn(
                                                "group relative flex items-center justify-between gap-3 backdrop-blur-sm border-2 border-transparent rounded-2xl transition-all hover:bg-card hover:shadow-xl hover:shadow-primary/5 min-w-0 overflow-hidden",
                                                rankType === 'houses'
                                                  ? (isFullscreen ? "px-3 py-2" : "px-5 py-4 md:px-7 md:py-5")
                                                  : (isFullscreen ? "px-3 py-2" : "px-4 py-3 md:px-6 md:py-4"),
                                                index % 2 === 0 ? "bg-card/40" : "bg-card/20",
                                                "w-full"
                                            )}
                                            title={pointsToNext > 0 ? `${pointsToNext.toLocaleString()} pts to rank up` : ''}
                                        >
                                        <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                                            <span className="w-6 shrink-0 text-sm font-black text-muted-foreground/30">{index + clampedPodiumSize + 1}</span>
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
                                            <div className="min-w-0 flex-1">
                                                <LeaderboardName
                                                  name={item.name}
                                                  className={cn(
                                                    rankType === 'houses'
                                                      ? 'text-xl sm:text-2xl md:text-3xl'
                                                      : 'text-sm sm:text-base md:text-lg',
                                                  )}
                                                />
                                                {metaLine ? (
                                                    <p className="truncate text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{metaLine}</p>
                                                ) : null}
                                            </div>
                                        </div>
                                        <div className="shrink-0 pl-2 text-base sm:text-lg font-black text-primary tracking-tighter tabular-nums">
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

                        {leaderboardDataReady && (!topItems || topItems.length === 0) && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 text-muted-foreground font-medium">
                                {rankType === 'houses'
                                    ? houses?.length
                                        ? 'No house point totals yet for this sort. Award points or check Houses settings.'
                                        : 'No houses are set up yet. Add houses under Admin → Rosters & Points.'
                                    : rankType === 'students' && scope !== 'all'
                                      ? 'No students in the selected class have points for this view yet.'
                                      : 'No items have earned points yet for this view.'}
                            </motion.div>
                        )}
                </div>
            </div>
            </div>
        </div>
    );

    if (isFullscreen && portalReady) {
        return createPortal(pageContent, document.body);
    }
    return pageContent;
}
