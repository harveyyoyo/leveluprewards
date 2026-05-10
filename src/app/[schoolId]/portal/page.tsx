
'use client';
import { useMemo, useState, useEffect, type ComponentType, type CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/components/AppProvider';
import { GraduationCap, Printer, UserCog, ChevronRight, Loader2 } from 'lucide-react';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { doc } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { rainbowByIndex, rainbowForPortalId } from '@/lib/rainbowNav';
import { globalAnimatedBackdropActive } from '@/lib/animatedBackdrop';
import { LEVELUP_BRAND_PRIMARY_HEX, LEVELUP_BRAND_PRIMARY_ON_DARK_HEX } from '@/lib/app-branding';

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
    if (type === 'prizeClerk') return `/${schoolId}/admin`;
    if (type === 'reports') return `/${schoolId}/reports`;
    return `/${schoolId}/teacher`;
}

export default function PortalPage() {
    const { loginState, isInitialized, schoolId, isAdmin, login, logout } = useAppContext();
    const { settings } = useSettings();
    const prefersReducedMotion = useReducedMotion();
    const playSound = useArcadeSound();
    const { toast } = useToast();
    const router = useRouter();
    const [hoveredIndex, setHoveredIndex] = useState<string | null>(null);
    const [adminDialogOpen, setAdminDialogOpen] = useState(false);
    const [adminPasscode, setAdminPasscode] = useState('');
    const [adminSubmitting, setAdminSubmitting] = useState(false);
    const [teacherDialogOpen, setTeacherDialogOpen] = useState(false);
    const [selectedTeacherKey, setSelectedTeacherKey] = useState('');
    const [teacherPasscode, setTeacherPasscode] = useState('');
    const [teacherSubmitting, setTeacherSubmitting] = useState(false);
    const animBackdrop = globalAnimatedBackdropActive(settings);

    // Returning to the hub from a student kiosk session should become the school chooser again.
    useEffect(() => {
        if (!isInitialized || loginState !== 'student' || !schoolId) return;
        logout({ studentNavigateTo: 'portal' });
    }, [isInitialized, loginState, logout, schoolId]);
    /** Default scheme: real brand hex — `hsl(var(--primary))` stays near-white in `.dark` by design. */
    const defaultPortalAccent =
        settings.colorScheme === 'default'
            ? settings.darkMode
                ? LEVELUP_BRAND_PRIMARY_ON_DARK_HEX
                : LEVELUP_BRAND_PRIMARY_HEX
            : null;

    const showPortalLocalDecor =
        settings.graphicMode === 'graphics' &&
        !animBackdrop &&
        !!settings.enableAnimatedBackground &&
        !settings.calmMode &&
        !settings.legacyMode;
    const isSchoolChooser = loginState === 'school';
    const isStaff =
        loginState === 'teacher' ||
        loginState === 'admin' ||
        loginState === 'developer' ||
        loginState === 'secretary' ||
        loginState === 'prizeClerk' ||
        loginState === 'reports';

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
                        option.type === 'reports'),
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

    const portals: PortalArea[] = [
        ...(isAdmin
            ? [
                  {
                      id: 'admin',
                      href: `/${schoolId}/admin`,
                      title: 'Admin Portal',
                      description: 'Manage school data and settings.',
                      icon: UserCog,
                  },
              ]
            : isSchoolChooser
                ? [
                      {
                          id: 'admin',
                          href: `/${schoolId}/admin-signin`,
                          title: 'Admin Portal',
                          description: 'Enter the admin passcode to continue.',
                          icon: UserCog,
                      },
                  ]
                : []),
        ...((loginState === 'teacher' || isAdmin || isSchoolChooser)
            ? [
                  {
                      id: 'print',
                      href: `/${schoolId}/teacher`,
                      title: 'Teacher & Faculty Portal',
                      description:
                          loginState === 'teacher'
                              ? 'Open teacher tools, coupon printing, or the prize desk.'
                              : 'Sign in as faculty to continue.',
                      icon: Printer,
                  },
              ]
            : []),
        {
            id: 'redeem',
            href: `/${schoolId}/student`,
            title: 'Student Kiosk',
            description: 'Scan your card to redeem coupon codes, view points, and open the prize shop.',
            icon: GraduationCap,
        },
    ];

    return (
        <div
            className={cn(
                'text-foreground relative font-sans flex flex-col items-center pt-2 sm:pt-6',
                animBackdrop ? 'bg-transparent' : 'bg-background',
                settings.displayMode === 'app' && 'pb-24',
            )}
        >
            {/* Backdrop: keep existing palette; only subtle grid + optional noise/animated orbs */}
            <div className="pointer-events-none fixed inset-0 z-0">
                {!animBackdrop && (
                    <div
                        className="absolute inset-0 opacity-[0.08]"
                        style={{
                            backgroundImage:
                                'linear-gradient(to right, rgba(148,163,184,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.14) 1px, transparent 1px)',
                            backgroundSize: '48px 48px',
                        }}
                    />
                )}
                {showPortalLocalDecor && (
                    <>
                        <div
                            className="absolute inset-0 opacity-[0.03]"
                            style={{
                                backgroundImage:
                                    'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")',
                            }}
                        />
                        <motion.div
                            animate={{ x: [0, 28, 0], y: [0, -18, 0] }}
                            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                            className="absolute -top-24 -right-24 h-[520px] w-[520px] rounded-full bg-primary/10 blur-[130px]"
                        />
                        <motion.div
                            animate={{ x: [0, -20, 0], y: [0, 26, 0] }}
                            transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
                            className="absolute bottom-14 left-16 h-[420px] w-[420px] rounded-full bg-chart-5/10 blur-[135px]"
                        />
                        <motion.div
                            animate={{ x: [0, 18, 0], y: [0, -28, 0] }}
                            transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[620px] w-[620px] rounded-full bg-chart-2/10 blur-[160px]"
                        />
                    </>
                )}
            </div>

            <div className="relative z-10 w-full max-w-6xl px-4 sm:px-6 pt-10 sm:pt-14 pb-10">
                <motion.div
                    initial={
                        prefersReducedMotion ? false : { opacity: 0, y: 48, scale: 0.92 }
                    }
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={
                        prefersReducedMotion
                            ? { duration: 0 }
                            : { duration: 0.34, ease: [0.22, 1, 0.36, 1] }
                    }
                    className="mb-10 text-center"
                >
                    <h2
                        className="text-6xl sm:text-7xl font-black tracking-tighter font-headline drop-shadow-md px-2 py-2 inline-block"
                        style={{
                            color: defaultPortalAccent ?? rainbowByIndex(0, settings.colorScheme),
                            textShadow:
                                defaultPortalAccent === null
                                    ? `0 0 14px ${rainbowByIndex(0, settings.colorScheme)}55, 0 0 28px ${rainbowByIndex(0, settings.colorScheme)}33`
                                    : undefined,
                        }}
                    >
                        Where to?
                    </h2>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                    {portals.map((area, index) => {
                        const Icon = area.icon;
                        const rainbowColor =
                            defaultPortalAccent ?? rainbowForPortalId(area.id, settings.colorScheme);
                        const needsStudentSession = area.id === 'redeem' && loginState !== 'student';
                        const needsAdminPasscode = area.id === 'admin' && isSchoolChooser;
                        const needsTeacherLogin = area.id === 'print' && loginState !== 'teacher';
                        const portalCard = (
                                <motion.div
                                    initial={
                                        prefersReducedMotion ? false : { opacity: 0, x: -50 }
                                    }
                                    animate={{ opacity: 1, x: 0 }}
                                    whileHover={
                                        prefersReducedMotion
                                            ? undefined
                                            : { y: -6, scale: 1.015 }
                                    }
                                    whileTap={prefersReducedMotion ? undefined : { scale: 0.99 }}
                                    transition={
                                        prefersReducedMotion
                                            ? { duration: 0 }
                                            : {
                                                  type: 'spring',
                                                  stiffness: 420,
                                                  damping: 28,
                                                  delay: Math.min(0.06 + index * 0.035, 0.28),
                                              }
                                    }
                                    onMouseEnter={() => setHoveredIndex(area.id)}
                                    onMouseLeave={() => setHoveredIndex(null)}
                                    className={cn(
                                        'relative overflow-hidden rounded-3xl border border-border bg-card px-6 py-6 text-left shadow-sm transition-colors duration-200',
                                        'min-h-[196px] sm:min-h-[210px]',
                                        'hover:shadow-2xl hover:bg-muted/50',
                                        animBackdrop ? 'backdrop-blur-md' : 'backdrop-blur-xl',
                                    )}
                                >
                                    {/* Themed wash: primary + muted from CSS variables */}
                                    <div
                                        className={cn(
                                            'absolute inset-0 pointer-events-none bg-gradient-to-br from-primary/[0.08] via-transparent to-muted/90 opacity-70 transition-opacity duration-200',
                                            hoveredIndex === area.id ? 'opacity-90' : 'opacity-70',
                                        )}
                                    />
                                    {/* Portal accent tint (rainbow) — kept subtle so card stays theme-driven */}
                                    <div
                                        className="pointer-events-none absolute inset-0 opacity-70"
                                        style={{
                                            background: `radial-gradient(900px circle at 15% 10%, ${rainbowColor}12, transparent 55%), radial-gradient(900px circle at 80% 90%, ${rainbowColor}08, transparent 55%)`,
                                        }}
                                    />

                                    {/* Subtle sheen sweep on hover */}
                                    <motion.div
                                        aria-hidden="true"
                                        className="absolute inset-y-0 -left-1/2 w-1/2 rotate-12 bg-gradient-to-r from-transparent via-primary/15 to-transparent opacity-0"
                                        animate={hoveredIndex === area.id && !prefersReducedMotion ? { x: ['-60%', '220%'], opacity: [0, 0.55, 0] } : { opacity: 0 }}
                                        transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
                                    />

                                    <div className="relative z-10 flex h-full flex-col">
                                        <div className="flex items-start gap-4">
                                            <div
                                                className={cn(
                                                    'shrink-0 rounded-2xl bg-muted p-3 shadow-lg ring-1 ring-border',
                                                )}
                                                style={{
                                                    boxShadow: `0 12px 30px ${rainbowColor}26`,
                                                }}
                                            >
                                                <Icon className="h-7 w-7" style={{ color: rainbowColor }} />
                                            </div>
                                            <div className="min-w-0 pt-0.5">
                                                <h3 className="text-xl font-black tracking-tight leading-tight text-foreground">
                                                    <span style={{ color: rainbowColor }}>{area.title}</span>
                                                </h3>
                                                <p className="mt-2 text-sm font-semibold leading-normal text-muted-foreground/80">
                                                    {area.description}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-auto pt-6 flex items-center gap-2 text-sm font-black tracking-tight text-foreground/90">
                                            <span>Continue</span>
                                            <ChevronRight className="h-5 w-5 text-foreground/70" aria-hidden="true" />
                                        </div>
                                    </div>

                                    {/* Background Glow - Increased opacity on hover */}
                                    <AnimatePresence>
                                        {hoveredIndex === area.id && (
                                            <motion.div
                                              initial={{ opacity: 0 }}
                                              animate={{ opacity: 1 }}
                                              exit={{ opacity: 0 }}
                                              className="pointer-events-none absolute inset-0 rounded-3xl bg-primary/10"
                                            />
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                        );

                        return (
                            <Link
                                key={area.id}
                                href={area.href}
                                onClick={(e) => {
                                    playSound('click');
                                    if (needsAdminPasscode) {
                                        e.preventDefault();
                                        if (schoolId) router.prefetch(`/${schoolId}/admin`);
                                        setAdminDialogOpen(true);
                                        return;
                                    }
                                    if (needsTeacherLogin) {
                                        e.preventDefault();
                                        setTeacherSubmitting(false);
                                        setSelectedTeacherKey('');
                                        setTeacherPasscode('');
                                        setTeacherDialogOpen(true);
                                        return;
                                    }
                                    // In school mode, student kiosk should open immediately (no extra login step).
                                    if (area.id === 'redeem' && isSchoolChooser) return;
                                    if (!needsStudentSession) return;
                                    e.preventDefault();
                                    if (!schoolId) return;
                                    // Go straight to the kiosk route; establish student session in the background.
                                    router.replace(`/${schoolId}/student`);
                                    void (async () => {
                                        const ok = await login('student', { schoolId });
                                        if (!ok) {
                                            playSound('error');
                                            toast({
                                                variant: 'destructive',
                                                title: 'Could not open student kiosk',
                                                description: 'Check your connection and try again.',
                                            });
                                            router.replace(`/${schoolId}/portal`);
                                        }
                                    })();
                                }}
                                className="block group no-underline rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                            >
                                {portalCard}
                            </Link>
                        );
                    })}
                </div>

                <Dialog open={adminDialogOpen} onOpenChange={(open) => {
                    if (!open) {
                        setAdminSubmitting(false);
                        setAdminPasscode('');
                    } else if (schoolId) {
                        router.prefetch(`/${schoolId}/admin`);
                    }
                    setAdminDialogOpen(open);
                }}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="font-headline font-black tracking-tight">Admin passcode</DialogTitle>
                            <DialogDescription>Enter the admin passcode for this school to open Admin tools.</DialogDescription>
                        </DialogHeader>
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
                                        const ok = await login('admin', { schoolId, passcode: adminPasscode.trim() });
                                        if (!ok) {
                                            setAdminSubmitting(false);
                                            playSound('error');
                                            toast({
                                                variant: 'destructive',
                                                title: 'Login failed',
                                                description: 'Incorrect passcode.',
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
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                className="rounded-xl font-bold"
                                onClick={() => setAdminDialogOpen(false)}
                                disabled={adminSubmitting}
                            >
                                Cancel
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
                                        const ok = await login('admin', { schoolId, passcode: adminPasscode.trim() });
                                        if (!ok) {
                                            setAdminSubmitting(false);
                                            playSound('error');
                                            toast({
                                                variant: 'destructive',
                                                title: 'Login failed',
                                                description: 'Incorrect passcode.',
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
                            <DialogTitle className="font-headline font-black tracking-tight">Teacher & faculty sign-in</DialogTitle>
                            <DialogDescription>
                                Select your name and enter your passcode to open faculty tools.
                            </DialogDescription>
                        </DialogHeader>

                        {isAdmin && (
                            <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
                                <p className="text-xs font-semibold text-muted-foreground">Already signed in as Admin</p>
                                <p className="mt-1 text-xs text-muted-foreground/80">
                                    Open teacher tools using your admin session (no teacher passcode).
                                </p>
                                <div className="mt-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full rounded-xl font-bold"
                                        onClick={() => {
                                            if (!schoolId) return;
                                            setTeacherDialogOpen(false);
                                            router.replace(`/${schoolId}/teacher`);
                                        }}
                                        disabled={teacherSubmitting}
                                    >
                                        Continue as Admin
                                    </Button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-muted-foreground">
                                    Select your name
                                </Label>
                                <Select value={selectedTeacherKey} onValueChange={setSelectedTeacherKey}>
                                    <SelectTrigger className="h-12 rounded-xl font-semibold" autoFocus={!isAdmin}>
                                        <SelectValue placeholder={staffOptions.length ? 'Choose your name' : 'No faculty list yet'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {staffOptions.map((opt) => (
                                            <SelectItem key={opt.id} value={staffLoginKey(opt)}>
                                                {opt.label}{opt.type === 'teacher' ? '' : ` - ${roleLabel(opt.type)}`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {!staffOptions.length && (
                                    <p className="text-xs text-muted-foreground">
                                        Ask an admin to open <span className="font-semibold">Admin → Staff</span> once to publish the teacher directory.
                                    </p>
                                )}
                            </div>
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
                                                    title: 'Choose a faculty account from the list',
                                                    description: 'Please select your name again.',
                                                });
                                                return;
                                            }
                                            setTeacherSubmitting(true);
                                            const ok = await login(selected.type, {
                                                schoolId,
                                                username: selected.username,
                                                passcode,
                                                teacherName: selected.label,
                                                teacherDocId: selected.type === 'teacher' ? selected.sourceId || selected.id.replace(/^teacher:/, '') : undefined,
                                            });
                                            if (!ok) {
                                                setTeacherSubmitting(false);
                                                playSound('error');
                                                toast({
                                                    variant: 'destructive',
                                                    title: 'Login failed',
                                                    description: 'Incorrect username or passcode.',
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
                                                title: 'Choose a faculty account from the list',
                                                description: 'Please select your name again.',
                                            });
                                            return;
                                        }
                                        setTeacherSubmitting(true);
                                        const ok = await login(selected.type, {
                                            schoolId,
                                            username: selected.username,
                                            passcode,
                                            teacherName: selected.label,
                                            teacherDocId: selected.type === 'teacher' ? selected.sourceId || selected.id.replace(/^teacher:/, '') : undefined,
                                        });
                                        if (!ok) {
                                            setTeacherSubmitting(false);
                                            playSound('error');
                                            toast({
                                                variant: 'destructive',
                                                title: 'Login failed',
                                                description: 'Incorrect username or passcode.',
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

                {loginState === 'student' && schoolId && (
                    <div className="mt-10 text-center rounded-2xl border border-border/60 bg-background/15 backdrop-blur px-4 py-5">
                        <p className="text-sm text-muted-foreground mb-3">Need faculty access?</p>
                        <div className="flex flex-wrap justify-center gap-2">
                            <Button variant="outline" size="sm" asChild className="font-bold">
                                <Link href={`/${schoolId}/teacher`} onClick={() => playSound('click')}>
                                    Teacher & Faculty Portal
                                </Link>
                            </Button>
                            <Button variant="ghost" size="sm" asChild className="font-bold">
                                <Link href={`/${schoolId}/admin-signin`} onClick={() => playSound('click')}>
                                    Admin sign-in
                                </Link>
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
