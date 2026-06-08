'use client';
import { useMemo, useState, useEffect, useLayoutEffect, useRef, type ComponentType, type CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/components/AppProvider';
import { useAdminGooglePasscodeBypass } from '@/hooks/useAdminGooglePasscodeBypass';
import { Book, GraduationCap, Printer, UserCog, Users, Loader2, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { motion, useReducedMotion } from 'framer-motion';
import { easePremium, staggerContainer, staggerItem } from '@/lib/animation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NumericKeypad } from '@/components/ui/NumericKeypad';
import { doc } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { rainbowByIndex, rainbowForPortalId } from '@/lib/rainbowNav';
import { LEVELUP_BRAND_PRIMARY_HEX, LEVELUP_BRAND_PRIMARY_ON_DARK_HEX } from '@/lib/appBranding';
import {
    isKioskPortraitDisplay,
    portalChooseGridClass,
    portalChoosePageShellClass,
    portalChooseTitleClass,
} from '@/lib/kioskPortraitLayout';
import { isClassroomPillarOn, isParentPortalOn, isRewardsPillarOn } from '@/lib/productPillars';
import { CLASSROOM_SEATING_SECTION_LABEL } from '@/lib/classroom/classroomTabSections';
import { leadershipPersonnelLabel, normalizeTeacherPersonnelRole } from '@/lib/teacherPersonnelRole';
import type { TeacherPersonnelRole } from '@/lib/types';
import { isSchoolPortalChooser } from '@/lib/students/studentKioskRoute';
import { isCompactDisplayMode, isMobileDisplayMode, isPortalAreaOnDisplayMode } from '@/lib/displayMode';

type PortalArea = {
    id: string;
    href: string;
    title: string;
    description: string;
    icon: ComponentType<{ className?: string; style?: CSSProperties }>;
};

type StaffPortalLoginOption = {
    id: string;
    sourceId?: string;
    type: 'teacher' | 'secretary' | 'prizeClerk' | 'reports' | 'librarian' | 'office' | 'houseCoordinator';
    label: string;
    username: string;
    personnelRole?: TeacherPersonnelRole;
};

type SchoolPublicStaffDirectory = {
    staffDirectory?: StaffPortalLoginOption[];
};

function staffLoginKey(option: StaffPortalLoginOption) {
    return option.id;
}

function roleLabel(option: StaffPortalLoginOption) {
    if (option.type === 'teacher') {
        return leadershipPersonnelLabel(normalizeTeacherPersonnelRole(option.personnelRole));
    }
    if (option.type === 'secretary') return 'Coupon printing';
    if (option.type === 'prizeClerk') return 'Prize desk';
    if (option.type === 'librarian') return 'Library';
    if (option.type === 'office') return 'School Office';
    if (option.type === 'houseCoordinator') return 'Houses';
    return 'Reports';
}

function staffLandingPath(schoolId: string, type: StaffPortalLoginOption['type']) {
    if (type === 'teacher') return `/${schoolId}/teacher`;
    if (type === 'secretary') return `/${schoolId}/secretary`;
    if (type === 'prizeClerk') return `/${schoolId}/admin`;
    if (type === 'reports') return `/${schoolId}/reports`;
    if (type === 'librarian') return `/${schoolId}/librarian`;
    if (type === 'office') return `/${schoolId}/office`;
    if (type === 'houseCoordinator') return `/${schoolId}/admin`;
    return `/${schoolId}/admin`;
}

function WhereToDrawnTitle({
    accentColor,
    compactDisplay,
    glowColor,
}: {
    accentColor: string;
    compactDisplay: boolean;
    glowColor?: string;
}) {
    const titleClassName = cn(
        'font-headline portal-choose-title-depth relative inline-block overflow-visible pb-[0.2em] font-black tracking-tight',
        compactDisplay
            ? 'px-2 py-2 text-5xl sm:text-6xl md:text-7xl'
            : 'px-2 py-3 text-6xl sm:text-7xl md:text-8xl',
    );

    return (
        <h2
            className={titleClassName}
            style={{
                color: accentColor,
                textShadow: glowColor ? `0 0 12px ${glowColor}33` : undefined,
            }}
        >
            <motion.span
                className="inline-block [will-change:clip-path,opacity,transform]"
                initial={{ clipPath: 'inset(0 100% 0 0)', opacity: 0.82, y: 2 }}
                animate={{ clipPath: 'inset(0 0% 0 0)', opacity: 1, y: 0 }}
                transition={{
                    clipPath: { duration: 0.7, ease: easePremium, delay: 0.04 },
                    opacity: { duration: 0.24, ease: easePremium, delay: 0.04 },
                    y: { duration: 0.28, ease: easePremium, delay: 0.04 },
                }}
            >
                Where to?
            </motion.span>
            <motion.svg
                className="pointer-events-none absolute left-[13%] top-[86%] h-[0.14em] w-[74%] overflow-visible"
                viewBox="0 0 220 18"
                preserveAspectRatio="none"
                aria-hidden="true"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.4, 0.2] }}
                transition={{
                    opacity: { duration: 0.64, ease: easePremium, delay: 0.46 },
                }}
            >
                <motion.path
                    d="M 4 11 C 54 16, 154 15, 216 7"
                    fill="none"
                    stroke={accentColor}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.46, ease: easePremium, delay: 0.46 }}
                    style={{
                        filter: glowColor ? `drop-shadow(0 0 8px ${glowColor}44)` : undefined,
                    }}
                />
            </motion.svg>
        </h2>
    );
}

export default function PortalPage() {
    const { loginState, isInitialized, schoolId, isAdmin, isOffice, login, logout } = useAppContext();
    const { canBypassAdminPasscode, loginAsAdminViaGoogle } = useAdminGooglePasscodeBypass({
        schoolId,
        autoLogin: false,
    });
    const { settings } = useSettings();
    const prefersReducedMotion = useReducedMotion();
    const playSound = useArcadeSound();
    const { toast } = useToast();
    const router = useRouter();
    const [adminDialogOpen, setAdminDialogOpen] = useState(false);
    const [adminPasscode, setAdminPasscode] = useState('');
    const [adminSubmitting, setAdminSubmitting] = useState(false);
    const [teacherDialogOpen, setTeacherDialogOpen] = useState(false);
    const [selectedTeacherKey, setSelectedTeacherKey] = useState('');
    const [teacherPasscode, setTeacherPasscode] = useState('');
    const [teacherSubmitting, setTeacherSubmitting] = useState(false);
    const gridRef = useRef<HTMLDivElement>(null);

    const [reduceWhereToMotion, setReduceWhereToMotion] = useState(
        () =>
            typeof window !== 'undefined'
                ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
                : !!prefersReducedMotion,
    );
    const kioskPortrait = isKioskPortraitDisplay(settings);
    const compactDisplay = isCompactDisplayMode(settings.displayMode);
    const mobileDisplay = isMobileDisplayMode(settings.displayMode);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        const syncReducedMotion = () => setReduceWhereToMotion(mediaQuery.matches);

        syncReducedMotion();
        mediaQuery.addEventListener('change', syncReducedMotion);

        return () => mediaQuery.removeEventListener('change', syncReducedMotion);
    }, []);

    /** Default scheme: real brand hex — `hsl(var(--primary))` stays near-white in `.dark` by design. */
    const defaultPortalAccent =
        settings.colorScheme === 'default'
            ? settings.darkMode
                ? LEVELUP_BRAND_PRIMARY_ON_DARK_HEX
                : LEVELUP_BRAND_PRIMARY_HEX
            : null;

    /** Card lift on hover; icon pop via `.portal-choose-icon--hoverable` (off in legacy / reduced motion). */
    const portalCardHoverEffects = !prefersReducedMotion && !settings.legacyMode;
    const isSchoolChooser = isSchoolPortalChooser(loginState);
    const isStaff =
        loginState === 'teacher' ||
        loginState === 'admin' ||
        loginState === 'developer' ||
        loginState === 'secretary' ||
        loginState === 'prizeClerk' ||
        loginState === 'reports' ||
        loginState === 'librarian' ||
        loginState === 'office' ||
        loginState === 'houseCoordinator';

    const firestore = useFirestore();
    const schoolPublicRef = useMemoFirebase(
        () => (schoolId ? doc(firestore, 'schoolPublic', schoolId) : null),
        [firestore, schoolId],
    );
    const { data: schoolPublic } = useDoc<SchoolPublicStaffDirectory>(schoolPublicRef);
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

    const showAdminPortalCard = isAdmin || isSchoolChooser || (isStaff && !isAdmin);
    const showTeacherPortalCard = isStaff || isSchoolChooser;
    const whereToAccentColor = defaultPortalAccent ?? rainbowByIndex(0, settings.colorScheme);
    const whereToGlowColor = defaultPortalAccent === null ? whereToAccentColor : undefined;

    const portals: PortalArea[] = [
        ...(isAdmin
            ? [
                  {
                      id: 'admin',
                      href: `/${schoolId}/admin`,
                      title: 'Admin Portal',
                      description: 'Manage students, classes, teachers, points, prizes and much more...',
                      icon: UserCog,
                  },
              ]
            : showAdminPortalCard
                ? [
                      {
                          id: 'admin',
                          href: `/${schoolId}/admin`,
                          title: 'Admin Portal',
                          description: 'Manage students, classes, teachers, points, prizes and much more...',
                          icon: UserCog,
                      },
                  ]
                : []),
        ...(showTeacherPortalCard
            ? [
                  {
                      id: 'print',
                      href: `/${schoolId}/teacher`,
                      title: 'Teacher Portal',
                      description: isRewardsPillarOn(settings)
                        ? 'Staff portal with teacher tabs — points, classes, prizes, and reports.'
                        : isClassroomPillarOn(settings)
                          ? `Classroom Management — ${CLASSROOM_SEATING_SECTION_LABEL}, session tracking, and room display.`
                          : 'Staff portal for your school.',
                      icon: Printer,
                  },
              ]
            : []),
        ...(isRewardsPillarOn(settings)
          ? [
              {
                  id: 'redeem',
                  href: `/${schoolId}/student`,
                  title: 'Student Kiosk',
                  description:
                      'Scan your card to redeem coupon codes, view points, and open the prize shop.',
                  icon: GraduationCap,
              },
            ]
          : []),
        ...(isParentPortalOn(settings)
          ? [
              {
                  id: 'parent',
                  href: `/${schoolId}/parent`,
                  title: 'Parent Portal',
                  description: 'View your child’s points, behavior notes, and today’s attendance.',
                  icon: Users,
              },
            ]
          : []),
    ];
    const visiblePortals = portals.filter((area) =>
        isPortalAreaOnDisplayMode(area.id, settings.displayMode),
    );

    return (
        <div className="text-foreground relative min-h-0 h-full w-full bg-transparent font-sans">
            {/* Positioning on a plain div so Framer does not override translate-based centering */}
            {/* Main layout: app mode can scroll within the shell when browser chrome leaves little height. */}
            <div
                className={cn(
                    'relative z-[10] flex h-full min-h-0 w-full flex-col',
                    compactDisplay ? 'overflow-x-hidden overflow-y-auto overscroll-contain' : 'overflow-hidden',
                    compactDisplay
                        ? 'px-4 pb-3 pt-2 sm:pb-4 sm:pt-4 md:py-10'
                        : 'px-4 pb-4 pt-10 sm:pt-12 md:pb-6 md:pt-16',
                    portalChoosePageShellClass(kioskPortrait, compactDisplay),
                )}
            >
                <div
                    className={cn(
                        'flex min-h-full w-full flex-1 flex-col items-center',
                        compactDisplay
                            ? 'justify-start gap-3 sm:gap-4 md:justify-center md:gap-8'
                            : 'justify-start gap-10 sm:gap-12 md:gap-16',
                    )}
                >

                    {/* Title: gap above (from outer pt) matches gap below (gap-10/12/16), so title is halfway between header and boxes */}
                    <div
                        className={cn(
                            'flex w-full shrink-0 flex-col items-center justify-center px-1 text-center md:min-h-0',
                            compactDisplay ? 'pb-1 pt-0 md:pb-0' : '',
                        )}
                    >
                        {mobileDisplay ? (
                            <p className="mb-2 max-w-md text-xs font-semibold leading-snug text-emerald-700 dark:text-emerald-300">
                                Mobile mode — teacher and student essentials only. Switch to Web or App in Settings for admin tools.
                            </p>
                        ) : null}
                        <div className="pointer-events-none w-full max-w-6xl text-center shrink-0 overflow-visible">
                            {reduceWhereToMotion || mobileDisplay ? (
                                <h2
                                    className={cn(
                                        'font-headline portal-choose-title-depth inline-block overflow-visible pb-[0.15em] font-black tracking-tight',
                                        kioskPortrait
                                            ? portalChooseTitleClass(true, compactDisplay)
                                            : mobileDisplay
                                              ? 'px-2 py-1 text-4xl sm:text-5xl'
                                              : compactDisplay
                                              ? 'px-2 py-2 text-5xl sm:text-6xl md:text-7xl'
                                              : 'px-2 py-3 text-6xl sm:text-7xl md:text-8xl',
                                    )}
                                    style={{
                                        color: whereToAccentColor,
                                        textShadow: whereToGlowColor
                                            ? `0 0 14px ${whereToGlowColor}55, 0 0 28px ${whereToGlowColor}33`
                                            : undefined,
                                    }}
                                >
                                    {mobileDisplay ? 'Quick access' : 'Where to?'}
                                </h2>
                            ) : (
                                <WhereToDrawnTitle
                                    accentColor={whereToAccentColor}
                                    compactDisplay={compactDisplay}
                                    glowColor={whereToGlowColor}
                                />
                            )}
                        </div>
                    </div>

                    {/* Grid: narrower cards on phone; full width from md up */}
                    <div
                        className={cn(
                            'mx-auto w-full shrink-0 pb-safe md:mt-0',
                            kioskPortrait
                                ? ''
                                : compactDisplay
                                  ? 'max-w-[min(24rem,calc(100%-0.5rem))] sm:max-w-xl'
                                  : 'max-w-[min(22rem,calc(100%-0.5rem))] sm:max-w-md md:max-w-6xl',
                            portalChooseGridClass(kioskPortrait),
                        )}
                    >
                        <motion.div
                            ref={gridRef}
                            variants={prefersReducedMotion ? undefined : staggerContainer}
                            initial={prefersReducedMotion ? false : 'hidden'}
                            animate="show"
                            className={cn(
                                'pointer-events-auto grid w-full gap-3 overflow-visible md:gap-5',
                                kioskPortrait || compactDisplay ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3',
                            )}
                        >
                    {visiblePortals.map((area, index) => {
                        const Icon = area.icon;
                        const rainbowColor = rainbowForPortalId(area.id, settings.colorScheme);
                        const needsAdminKioskHandoff = area.id === 'redeem' && loginState === 'admin';
                        const needsAdminPasscode = area.id === 'admin' && !isAdmin && !canBypassAdminPasscode;
                        // School gate, admins, and developers can pick staff (or continue as admin); signed-in teachers go straight through.
                        const needsTeacherLogin =
                            area.id === 'print' &&
                            (loginState === 'school' || loginState === 'admin' || loginState === 'developer');
                        const portalCard = (
                                <motion.div
                                    variants={prefersReducedMotion ? undefined : staggerItem}
                                    className={cn(
                                        'portal-choose-card relative overflow-hidden rounded-2xl border-2 bg-card',
                                        compactDisplay ? 'text-left' : 'text-center',
                                        portalCardHoverEffects &&
                                            'transition-[transform,box-shadow,border-color] duration-200 ease-out group-hover:-translate-y-1 group-hover:border-foreground/25 group-active:translate-y-0',
                                        'flex h-full min-h-0 w-full flex-col justify-center',
                                        compactDisplay
                                            ? 'px-4 py-4 sm:px-5 sm:py-5'
                                            : 'min-h-[12rem] px-3 py-3.5 sm:min-h-[clamp(200px,24vw,300px)] sm:px-5 sm:py-5 md:min-h-[clamp(220px,24vw,300px)]',
                                    )}
                                    style={{
                                        borderColor: `${rainbowColor}55`,
                                    }}
                                >
                                    {compactDisplay ? (
                                    <div className="relative z-10 flex w-full items-center gap-3 sm:gap-4">
                                        <div
                                            className={cn(
                                                'portal-choose-icon flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl sm:h-16 sm:w-16',
                                                portalCardHoverEffects && 'portal-choose-icon--hoverable',
                                            )}
                                            style={{
                                                backgroundColor: rainbowColor,
                                            }}
                                            aria-hidden
                                        >
                                            <Icon className="h-7 w-7 text-white sm:h-8 sm:w-8" />
                                        </div>
                                        <div className="min-w-0 flex-1 space-y-1 pr-1">
                                            <h3 className="text-lg font-black leading-snug tracking-tight text-foreground sm:text-xl">
                                                {area.title}
                                            </h3>
                                            {!mobileDisplay ? (
                                                <p className="text-sm font-medium leading-snug text-muted-foreground sm:text-base">
                                                    {area.description}
                                                </p>
                                            ) : null}
                                        </div>
                                        <ArrowUpRight
                                            className={cn(
                                                'h-5 w-5 shrink-0 opacity-70 sm:h-6 sm:w-6',
                                                portalCardHoverEffects &&
                                                    'transition-opacity duration-200 ease-out group-hover:opacity-100',
                                            )}
                                            style={{ color: rainbowColor }}
                                            aria-hidden
                                        />
                                    </div>
                                    ) : (
                                    <div className="relative z-10 flex h-full min-h-0 flex-1 flex-col">
                                        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2.5 text-center md:gap-4">
                                            <motion.div
                                                className={cn(
                                                    'portal-choose-icon shrink-0 rounded-xl p-3 md:p-4',
                                                    portalCardHoverEffects && 'portal-choose-icon--hoverable',
                                                )}
                                                style={{
                                                    backgroundColor: rainbowColor,
                                                }}
                                            >
                                                <Icon className="h-8 w-8 text-white md:h-9 md:w-9" />
                                            </motion.div>
                                            <div className="min-w-0 max-w-prose space-y-1.5 px-0.5">
                                                <h3 className="text-base font-black leading-tight tracking-tight text-foreground sm:text-lg md:text-xl">
                                                    <span style={{ color: rainbowColor }}>{area.title}</span>
                                                </h3>
                                                <p className="text-xs font-semibold leading-snug text-muted-foreground/85 sm:text-sm md:text-base">
                                                    {area.description}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    )}
                                </motion.div>
                        );

                        return (
                            <Link
                                key={area.id}
                                href={area.href}
                                onClick={(e) => {
                                    playSound('click');
                                    if (area.id === 'admin' && !isAdmin) {
                                        e.preventDefault();
                                        if (canBypassAdminPasscode && schoolId) {
                                            void (async () => {
                                                setAdminSubmitting(true);
                                                const ok = await loginAsAdminViaGoogle();
                                                setAdminSubmitting(false);
                                                if (!ok) {
                                                    playSound('error');
                                                    toast({
                                                        variant: 'destructive',
                                                        title: 'Admin sign-in failed',
                                                        description:
                                                            'Could not sign in with your Google account. Try again or use the admin passcode.',
                                                    });
                                                    setAdminDialogOpen(true);
                                                    return;
                                                }
                                                playSound('login');
                                                router.replace(`/${schoolId}/admin`);
                                            })();
                                            return;
                                        }
                                        if (needsAdminPasscode) {
                                            if (schoolId) router.prefetch(`/${schoolId}/admin`);
                                            setAdminDialogOpen(true);
                                            return;
                                        }
                                    }
                                    if (needsTeacherLogin) {
                                        e.preventDefault();
                                        setTeacherSubmitting(false);
                                        setSelectedTeacherKey('');
                                        setTeacherPasscode('');
                                        setTeacherDialogOpen(true);
                                        return;
                                    }
                                    if (needsAdminKioskHandoff) {
                                        e.preventDefault();
                                        logout({ staffNavigateTo: 'student' });
                                        return;
                                    }
                                    if (area.id === 'redeem' && isSchoolChooser) return;
                                }}
                                className={cn(
                                    'group relative block h-full flex flex-col rounded-2xl no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                                    portalCardHoverEffects && 'z-0 hover:z-10 focus-visible:z-10',
                                )}
                                style={{ ['--portal-accent' as string]: rainbowColor }}
                            >
                                {portalCard}
                            </Link>
                        );
                    })}
                </motion.div>
                </div>
                </div>
            </div>

                <Dialog
                    open={adminDialogOpen}
                    onOpenChange={(open) => {
                        if (!open) {
                            setAdminSubmitting(false);
                            setAdminPasscode('');
                        } else if (schoolId) {
                            router.prefetch(`/${schoolId}/admin`);
                        }
                        setAdminDialogOpen(open);
                    }}
                >
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="font-headline font-black tracking-tight">Admin passcode</DialogTitle>
                            <DialogDescription>
                                Enter the admin passcode for this school to open the admin dashboard.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
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
                                        if (!schoolId) return;
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
                                            router.replace(`/${schoolId}/admin`);
                                        })();
                                    }}
                                />
                            </div>
                            <NumericKeypad value={adminPasscode} onChange={setAdminPasscode} />
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
                                    if (!schoolId) return;
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
                                        router.replace(`/${schoolId}/admin`);
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

                <Dialog open={teacherDialogOpen} onOpenChange={(open) => {
                    if (!open) {
                        setTeacherSubmitting(false);
                        setSelectedTeacherKey('');
                        setTeacherPasscode('');
                    }
                    setTeacherDialogOpen(open);
                }}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="font-headline font-black tracking-tight">Staff sign-in</DialogTitle>
                            <DialogDescription>
                                Select your name and enter your passcode to open staff tools.
                            </DialogDescription>
                        </DialogHeader>

                        {!isAdmin && schoolId && (
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full rounded-xl font-bold"
                                disabled={adminSubmitting}
                                onClick={() => {
                                    playSound('click');
                                    if (canBypassAdminPasscode) {
                                        void (async () => {
                                            setAdminSubmitting(true);
                                            const ok = await loginAsAdminViaGoogle();
                                            setAdminSubmitting(false);
                                            if (!ok) {
                                                playSound('error');
                                                toast({
                                                    variant: 'destructive',
                                                    title: 'Admin sign-in failed',
                                                    description:
                                                        'Could not sign in with your Google account. Try again or use the admin passcode.',
                                                });
                                                setAdminDialogOpen(true);
                                                return;
                                            }
                                            playSound('login');
                                            setTeacherDialogOpen(false);
                                            router.replace(`/${schoolId}/admin`);
                                        })();
                                        return;
                                    }
                                    setTeacherDialogOpen(false);
                                    router.prefetch(`/${schoolId}/admin`);
                                    setAdminDialogOpen(true);
                                }}
                            >
                                <ShieldCheck className="mr-2 h-4 w-4" aria-hidden />
                                Sign in as admin
                            </Button>
                        )}

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-muted-foreground">
                                    Select your name
                                </Label>
                                <Select value={selectedTeacherKey} onValueChange={setSelectedTeacherKey}>
                                    <SelectTrigger className="h-12 rounded-xl font-semibold" autoFocus={!isAdmin}>
                                        <SelectValue placeholder={staffOptions.length ? 'Choose your name' : 'No staff accounts yet'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {staffOptions.map((opt) => (
                                            <SelectItem key={opt.id} value={staffLoginKey(opt)}>
                                                {opt.label}{opt.type === 'teacher' && !opt.personnelRole ? '' : ` - ${roleLabel(opt)}`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {!staffOptions.length && (
                                    <p className="text-xs text-muted-foreground">
                                        Ask an admin to open <span className="font-semibold">Admin</span> once (any tab) so the
                                        staff list publishes, or add the account under{' '}
                                        <span className="font-semibold">Admin → Teachers → Desk staff</span> with{' '}
                                        <span className="font-semibold">Library catalog &amp; checkouts</span> checked.
                                    </p>
                                )}
                            </div>
                             <div className="space-y-4 py-2">
                                <div className="space-y-2">
                                    <Label htmlFor="teacher-passcode" className="text-xs font-semibold text-muted-foreground">
                                        Passcode
                                    </Label>
                                    <Input
                                        id="teacher-passcode"
                                        type="password"
                                        value={teacherPasscode}
                                        onChange={(e) => setTeacherPasscode(e.target.value)}
                                        className="h-12 rounded-xl font-mono tracking-[0.25em] text-center"
                                        autoComplete="current-password"
                                        onKeyDown={(e) => {
                                            if (e.key !== 'Enter') return;
                                            e.preventDefault();
                                            if (teacherSubmitting) return;
                                            if (!schoolId) return;
                                            void (async () => {
                                                const passcode = teacherPasscode.trim();
                                                if (!selectedTeacherKey || !passcode) {
                                                    playSound('error');
                                                    toast({
                                                        variant: 'destructive',
                                                        title: 'Missing info',
                                                        description: 'Select your name and enter a passcode to continue.',
                                                    });
                                                    return;
                                                }
                                                const selected = staffOptions.find((o) => staffLoginKey(o) === selectedTeacherKey);
                                                if (!selected) {
                                                    playSound('error');
                                                    toast({
                                                        variant: 'destructive',
                                                        title: 'Choose a staff account from the list',
                                                        description: 'Please select your name again.',
                                                    });
                                                    return;
                                                }
                                                setTeacherSubmitting(true);
                                                const authResult = await login(selected.type, {
                                                    schoolId,
                                                    username: selected.username,
                                                    passcode,
                                                    teacherName: selected.label,
                                                    teacherDocId: selected.type === 'teacher' ? selected.sourceId || selected.id.replace(/^teacher:/, '') : undefined,
                                                });
                                                if (!authResult.ok) {
                                                    setTeacherSubmitting(false);
                                                    playSound('error');
                                                    toast({
                                                        variant: 'destructive',
                                                        title: 'Login failed',
                                                        description: authResult.message,
                                                    });
                                                    setTeacherPasscode('');
                                                    return;
                                                }
                                                playSound('login');
                                                setTeacherDialogOpen(false);
                                                router.push(staffLandingPath(schoolId, selected.type));
                                            })();
                                        }}
                                    />
                                </div>
                                <NumericKeypad value={teacherPasscode} onChange={setTeacherPasscode} />
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                className="rounded-xl font-bold"
                                onClick={() => setTeacherDialogOpen(false)}
                                disabled={teacherSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                className="rounded-xl font-black"
                                disabled={teacherSubmitting}
                                onClick={() => {
                                    if (teacherSubmitting) return;
                                    if (!schoolId) return;
                                    void (async () => {
                                        const passcode = teacherPasscode.trim();
                                        if (!selectedTeacherKey || !passcode) {
                                            playSound('error');
                                            toast({
                                                variant: 'destructive',
                                                title: 'Missing info',
                                                description: 'Select your name and enter a passcode to continue.',
                                            });
                                            return;
                                        }
                                        const selected = staffOptions.find((o) => staffLoginKey(o) === selectedTeacherKey);
                                        if (!selected) {
                                            playSound('error');
                                            toast({
                                                variant: 'destructive',
                                                title: 'Choose a staff account from the list',
                                                description: 'Please select your name again.',
                                            });
                                            return;
                                        }
                                        setTeacherSubmitting(true);
                                        const authResult = await login(selected.type, {
                                            schoolId,
                                            username: selected.username,
                                            passcode,
                                            teacherName: selected.label,
                                            teacherDocId: selected.type === 'teacher' ? selected.sourceId || selected.id.replace(/^teacher:/, '') : undefined,
                                        });
                                        if (!authResult.ok) {
                                            setTeacherSubmitting(false);
                                            playSound('error');
                                            toast({
                                                variant: 'destructive',
                                                title: 'Login failed',
                                                description: authResult.message,
                                            });
                                            setTeacherPasscode('');
                                            return;
                                        }
                                        playSound('login');
                                        setTeacherDialogOpen(false);
                                        router.push(staffLandingPath(schoolId, selected.type));
                                    })();
                                }}
                            >
                                {teacherSubmitting ? (
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

        </div>
    );
}
