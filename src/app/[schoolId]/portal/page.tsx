
'use client';
import { useState, useEffect, useMemo, type ComponentType, type CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/components/AppProvider';
import { GraduationCap, Printer, Gift, UserCog, Trophy, ChevronRight, Loader2, Home, Clock, BookOpen, Library } from 'lucide-react';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from "framer-motion";
import { Button } from '@/components/ui/button';
import { rainbowByIndex, rainbowForPortalId } from '@/lib/rainbowNav';
import { globalAnimatedBackdropActive } from '@/lib/animatedBackdrop';
import { KioskSponsorBanner } from '@/components/KioskSponsorBanner';
import type { LevelUpPillarId } from '@/lib/levelupNav';

type PortalArea = {
    id: string;
    href: string;
    title: string;
    description: string;
    icon: ComponentType<{ className?: string; style?: CSSProperties }>;
    disabled?: boolean;
    status?: string;
};

type PillarSection = {
    id: LevelUpPillarId;
    kicker: string;
    title: string;
    blurb: string;
    cards: PortalArea[];
};

/** In student (kiosk) login, idle on the hub → default to the badge / redeem flow. */
const STUDENT_MODE_DEFAULT_TO_KIOSK_SEC = 10;

export default function PortalPage() {
    const { loginState, isInitialized, schoolId, isAdmin } = useAppContext();
    const { settings, updateSettings, isFeatureAllowed } = useSettings();
    const playSound = useArcadeSound();
    const router = useRouter();
    const [hoveredIndex, setHoveredIndex] = useState<string | null>(null);
    const animBackdrop = globalAnimatedBackdropActive(settings);

    useEffect(() => {
        if (!isInitialized || loginState !== 'student' || !schoolId) return;
        const ms = STUDENT_MODE_DEFAULT_TO_KIOSK_SEC * 1000;
        let timer: ReturnType<typeof setTimeout> | null = null;
        const arm = () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                router.push(`/${schoolId}/student`);
            }, ms);
        };
        arm();
        const onActivity = () => {
            arm();
        };
        window.addEventListener('pointerdown', onActivity, { capture: true, passive: true });
        window.addEventListener('keydown', onActivity, { capture: true });
        window.addEventListener('scroll', onActivity, { capture: true, passive: true });
        return () => {
            if (timer) clearTimeout(timer);
            window.removeEventListener('pointerdown', onActivity, { capture: true });
            window.removeEventListener('keydown', onActivity, { capture: true });
            window.removeEventListener('scroll', onActivity, { capture: true });
        };
    }, [isInitialized, loginState, schoolId, router]);
    const showPortalLocalDecor =
        settings.graphicMode === 'graphics' &&
        !animBackdrop &&
        !!settings.enableAnimatedBackground &&
        !settings.calmMode &&
        !settings.legacyMode;
    const isStaff = loginState === 'teacher' || loginState === 'admin' || loginState === 'developer';

    const pillarSections = useMemo((): PillarSection[] => {
        if (!schoolId) return [];
        const sid = schoolId;
        const isDemoSchool = sid === 'schoolabc';

        const rewardsCards: PortalArea[] = [
            {
                id: 'redeem',
                href: `/${sid}/student`,
                title: 'Student Kiosk',
                description: 'Scan your card to redeem coupon codes and view points.',
                icon: GraduationCap,
            },
            {
                id: 'prize',
                href: `/${sid}/prize`,
                title: 'Prize / Rewards shop',
                description: 'Spend your points for awesome prizes.',
                icon: Gift,
            },
        ];
        if (isStaff || isDemoSchool) {
            rewardsCards.push({
                id: 'fame',
                href: `/${sid}/halloffame`,
                title: 'Hall of Fame',
                description: 'View top student point earners.',
                icon: Trophy,
            });
        }

        const sections: PillarSection[] = [
            {
                id: 'rewards',
                kicker: 'LevelUp',
                title: 'Rewards',
                blurb: 'Points, prizes, and recognition.',
                cards: rewardsCards,
            },
        ];

        const attendanceCards: PortalArea[] = [];
        if (settings.enableAttendance && isFeatureAllowed('enableAttendance')) {
            if (isStaff || isDemoSchool) {
                attendanceCards.push({
                    id: 'attendance-teacher',
                    href: `/${sid}/teacher?tab=attendance`,
                    title: 'Attendance · Teacher',
                    description: 'Period rules, sign-in rewards, and attendance logs.',
                    icon: Clock,
                });
            }
            if (isAdmin || isDemoSchool) {
                attendanceCards.push({
                    id: 'attendance-admin',
                    href: `/${sid}/admin`,
                    title: 'Attendance · Admin',
                    description: 'School-wide class sign-in, periods, and schedules.',
                    icon: Clock,
                });
            }
        }
        if (attendanceCards.length > 0) {
            sections.push({
                id: 'attendance',
                kicker: 'LevelUp',
                title: 'Attendance',
                blurb: 'Sign-in windows tied to your schedule and rewards.',
                cards: attendanceCards,
            });
        }

        const homeworkCards: PortalArea[] = [];
        if (settings.enableHomework && isFeatureAllowed('enableHomework') && (isStaff || isDemoSchool)) {
            homeworkCards.push({
                id: 'homework-teacher',
                href: `/${sid}/teacher?tab=homework`,
                title: 'Homework rewards',
                description: 'Create homework incentives and award points from the teacher portal.',
                icon: BookOpen,
            });
        }
        if (homeworkCards.length > 0) {
            sections.push({
                id: 'homework',
                kicker: 'LevelUp',
                title: 'Homework',
                blurb: 'Teacher-led homework points that feed the same balance.',
                cards: homeworkCards,
            });
        }

        const libraryCards: PortalArea[] = [];
        if (settings.enableLibrary && isFeatureAllowed('enableLibrary')) {
            libraryCards.push({
                id: 'library-kiosk',
                href: `/${sid}/student`,
                title: 'Library checkout · Student',
                description: 'Scan item barcodes at the kiosk to check out or return.',
                icon: Library,
            });
            if (isAdmin || isDemoSchool) {
                libraryCards.push({
                    id: 'library-admin',
                    href: `/${sid}/admin`,
                    title: 'Library catalog · Admin',
                    description: 'Manage titles, UPC codes, and availability (Admin → Library tab).',
                    icon: Library,
                });
            }
        }
        if (libraryCards.length > 0) {
            sections.push({
                id: 'library',
                kicker: 'LevelUp',
                title: 'Library',
                blurb: 'Checkout and inventory connected to your kiosk.',
                cards: libraryCards,
            });
        }

        return sections;
    }, [
        schoolId,
        isStaff,
        isAdmin,
        settings.enableAttendance,
        settings.enableHomework,
        settings.enableLibrary,
        isFeatureAllowed,
    ]);

    const accessCards: PortalArea[] = useMemo(() => {
        if (!schoolId) return [];
        const sid = schoolId;
        const isDemoSchool = sid === 'schoolabc';
        const cards: PortalArea[] = [];
        if (isAdmin || isDemoSchool) {
            cards.push({
                id: 'admin',
                href: `/${sid}/admin`,
                title: 'Admin Portal',
                description: 'Manage school data and settings.',
                icon: UserCog,
            });
        }
        if (isStaff || isDemoSchool) {
            cards.push({
                id: 'print',
                href: `/${sid}/teacher`,
                title: 'Teacher and Staff Portal',
                description: 'Sign in for teacher tools, coupon printing, or the prize desk.',
                icon: Printer,
            });
        }
        if (isStaff && settings.enableStudentPortal) {
            cards.push({
                id: 'student-home',
                href: `/${sid}/student-home`,
                title: 'Student Home Portal',
                description: 'Home access is being prepared and is not available yet.',
                icon: Home,
                disabled: true,
                status: 'Coming soon',
            });
        }
        return cards;
    }, [schoolId, isStaff, isAdmin, settings.enableStudentPortal]);

    if (!isInitialized) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Button disabled variant="ghost" size="lg" className="text-muted-foreground">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Loading Portal...
                </Button>
            </div>
        );
    }

    return (
        <>
        <div className={cn(
                "min-h-[calc(100vh-5rem)] text-foreground relative font-sans flex flex-col items-center pt-2 sm:pt-6",
                animBackdrop ? "bg-transparent" : "bg-background",
                settings.displayMode === 'app' && 'pb-24',
            )}>
            {showPortalLocalDecor && (
            <div className="pointer-events-none fixed inset-0 opacity-[0.03] z-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
            )}

            {showPortalLocalDecor && (
                <>
                    <motion.div
                        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        className="pointer-events-none fixed -top-20 -right-20 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px] z-0"
                    />
                    <motion.div
                        animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
                        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                        className="pointer-events-none fixed bottom-20 left-20 h-[400px] w-[400px] rounded-full bg-chart-5/10 blur-[120px] z-0"
                    />
                    <motion.div
                        animate={{ x: [0, 20, 0], y: [0, -30, 0] }}
                        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                        className="pointer-events-none fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-chart-2/5 blur-[150px] z-0"
                    />
                </>
            )}

            <div className="relative z-10 w-full max-w-2xl px-4 sm:px-6 flex flex-col justify-start">
                <motion.div
                    initial={{ opacity: 0, y: 48, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    className="mb-8 mt-2 text-center"
                >
                    <h2
                        className="text-5xl font-black tracking-tighter font-headline drop-shadow-md px-6 py-2 inline-block"
                        style={{
                            color: settings.colorScheme === 'default' ? 'hsl(var(--primary))' : rainbowByIndex(0, settings.colorScheme),
                            textShadow:
                                settings.colorScheme === 'default'
                                    ? undefined
                                    : `0 0 14px ${rainbowByIndex(0, settings.colorScheme)}55, 0 0 28px ${rainbowByIndex(0, settings.colorScheme)}33`,
                        }}
                    >
                        LevelUp
                    </h2>
                    <p className="text-sm text-muted-foreground font-medium mt-1 max-w-md mx-auto">
                        Choose a destination. Rewards, Attendance, Homework, and Library work together on one student balance.
                    </p>
                    {schoolId === 'schoolabc' && !settings.showIntroWizard && (
                        <div className="mt-1">
                            <Button variant="link" onClick={() => {
                                playSound('click');
                                updateSettings({ showIntroWizard: true });
                            }}>
                                Click here to start the wizard
                            </Button>
                        </div>
                    )}
                </motion.div>

                <div className="flex flex-col gap-10">
                    {(() => {
                        let cardAnimIndex = 0;
                        const renderDestination = (area: PortalArea) => {
                            const index = cardAnimIndex++;
                            const Icon = area.icon;
                            const isDisabled = !!area.disabled;
                            const rainbowColor =
                                settings.colorScheme === 'default'
                                    ? 'hsl(var(--primary))'
                                    : rainbowForPortalId(area.id, settings.colorScheme);
                            const portalCard = (
                                <motion.div
                                    initial={{ opacity: 0, x: -50 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.5, delay: 0.15 + index * 0.08 }}
                                    onMouseEnter={() => !isDisabled && setHoveredIndex(area.id)}
                                    onMouseLeave={() => !isDisabled && setHoveredIndex(null)}
                                    className={cn(
                                        "relative flex w-full items-center justify-between rounded-2xl border-2 px-6 py-4 md:px-8 md:py-5 text-left transition-all duration-300",
                                        isDisabled ? "cursor-not-allowed opacity-70" : "hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-1 shadow-md",
                                        animBackdrop
                                            ? "border-border/50 bg-card/90 backdrop-blur-md shadow-sm hover:bg-card hover:border-border"
                                            : "border-transparent bg-card/85 backdrop-blur-sm hover:bg-card",
                                    )}
                                >
                                    <div
                                      className={cn(
                                        "absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl transition-all duration-500 shadow-sm",
                                        hoveredIndex === area.id ? "opacity-100" : "opacity-70"
                                      )}
                                      style={{ backgroundColor: rainbowColor }}
                                    />

                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all duration-300 border-2 border-border/50 shadow-md",
                                            animBackdrop ? "bg-card/90" : "bg-card/70",
                                            !isDisabled && "group-hover:scale-105 group-hover:border-primary/20 group-hover:shadow-lg"
                                        )}>
                                            <Icon className="w-6 h-6 md:w-7 md:h-7" style={{ color: rainbowColor }} />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-lg md:text-xl font-black tracking-tight leading-tight" style={{ color: rainbowColor }}>
                                                  {area.title}
                                                </h3>
                                                {area.status && (
                                                    <span className="rounded-full border border-border/70 bg-muted/60 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                        {area.status}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-1 font-medium leading-normal">{area.description}</p>
                                        </div>
                                    </div>

                                    {!isDisabled && (
                                        <motion.div animate={{ x: hoveredIndex === area.id ? 0 : -4, opacity: hoveredIndex === area.id ? 1 : 0.4 }} transition={{ duration: 0.2 }}>
                                            <ChevronRight className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
                                        </motion.div>
                                    )}

                                    <AnimatePresence>
                                        {hoveredIndex === area.id && !isDisabled && (
                                            <motion.div
                                              initial={{ opacity: 0 }}
                                              animate={{ opacity: 0.08 }}
                                              exit={{ opacity: 0 }}
                                              className="absolute inset-0 rounded-2xl pointer-events-none"
                                              style={{ backgroundColor: rainbowColor }}
                                            />
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );

                            if (isDisabled) {
                                return (
                                    <div key={area.id} className="block rounded-2xl no-underline" aria-disabled="true">
                                        {portalCard}
                                    </div>
                                );
                            }

                            return (
                                <Link
                                    key={area.id}
                                    href={area.href}
                                    onClick={() => playSound('click')}
                                    className="block group no-underline rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                >
                                    {portalCard}
                                </Link>
                            );
                        };

                        return (
                            <>
                                {pillarSections.map((section) => (
                                    <section
                                        key={section.id}
                                        id={`levelup-${section.id}`}
                                        className="scroll-mt-24 space-y-3"
                                        aria-labelledby={`levelup-${section.id}-heading`}
                                    >
                                        <div className="px-1 text-left border-l-4 border-primary/40 pl-3 py-0.5 rounded-r-lg bg-muted/20">
                                            <p id={`levelup-${section.id}-heading`} className="text-[10px] font-black uppercase tracking-[0.28em] text-muted-foreground">
                                                {section.kicker} · {section.title}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">{section.blurb}</p>
                                        </div>
                                        <div className="flex flex-col gap-4">
                                            {section.cards.map((area) => renderDestination(area))}
                                        </div>
                                    </section>
                                ))}

                                {accessCards.length > 0 && (
                                    <section className="space-y-3" aria-labelledby="levelup-access-heading">
                                        <div className="px-1 text-left border-l-4 border-chart-2/50 pl-3 py-0.5 rounded-r-lg bg-muted/15">
                                            <p id="levelup-access-heading" className="text-[10px] font-black uppercase tracking-[0.28em] text-muted-foreground">
                                                School access
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">Staff sign-in and administration.</p>
                                        </div>
                                        <div className="flex flex-col gap-4">
                                            {accessCards.map((area) => renderDestination(area))}
                                        </div>
                                    </section>
                                )}
                            </>
                        );
                    })()}
                </div>

                {loginState === 'student' && schoolId && (
                    <div className="mt-10 text-center rounded-2xl border border-border/60 bg-muted/30 px-4 py-5">
                        <p className="text-sm text-muted-foreground mb-3">Need staff or admin access?</p>
                        <div className="flex flex-wrap justify-center gap-2">
                            <Button variant="outline" size="sm" asChild className="font-bold">
                                <Link href={`/${schoolId}/teacher`} onClick={() => playSound('click')}>
                                    Teacher and Staff Portal
                                </Link>
                            </Button>
                            <Button variant="ghost" size="sm" asChild className="font-bold">
                                <Link href={`/login?school=${encodeURIComponent(schoolId)}`} onClick={() => playSound('click')}>
                                    Admin login
                                </Link>
                            </Button>
                        </div>
                    </div>
                )}

                <div className="mt-16 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60">
                        beta · {process.env.NEXT_PUBLIC_VERSION || 'beta-1.1.0'} · {process.env.NEXT_PUBLIC_BUILD_TIME}
                    </p>
                </div>
            </div>
        </div>
        <KioskSponsorBanner />
        </>
    );
}
