
'use client';
import { useMemo, useState, useEffect, type ComponentType, type CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/components/AppProvider';
import { GraduationCap, Printer, UserCog, Trophy, ChevronRight, Loader2, Megaphone } from 'lucide-react';
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

export default function PortalPage() {
    const { loginState, isInitialized, schoolId, isAdmin, login } = useAppContext();
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

    // Student kiosk accounts use `/student` — not this faculty/staff hub (`/portal`).
    useEffect(() => {
        if (!isInitialized || loginState !== 'student' || !schoolId) return;
        router.replace(`/${schoolId}/student`);
    }, [isInitialized, loginState, schoolId, router]);
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
    const teacherOptions = useMemo(
        () =>
            (schoolPublic?.staffDirectory || []).filter(
                (option) => option?.id && option?.username && option?.label && option.type === 'teacher',
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
            ? [{ id: 'admin', href: `/${schoolId}/admin`, title: 'Admin Portal', description: 'Manage school data and settings.', icon: UserCog }]
            : isSchoolChooser
                ? [{ id: 'admin', href: `/${schoolId}/admin-signin`, title: 'Admin Portal', description: 'Enter the admin passcode to continue.', icon: UserCog }]
                : []),
        ...((loginState === 'teacher' || isAdmin || isSchoolChooser)
            ? [{ id: 'print', href: `/${schoolId}/teacher`, title: 'Teacher & Faculty Portal', description: loginState === 'teacher' ? 'Open teacher tools, coupon printing, or the prize desk.' : 'Sign in as a teacher to continue.', icon: Printer }]
            : []),
        { id: 'redeem', href: `/${schoolId}/student`, title: 'Student Kiosk', description: 'Scan your card to redeem coupon codes, view points, and open the prize shop.', icon: GraduationCap },
    ];

    return (
        <div className={cn(
                "text-foreground relative font-sans flex flex-col items-center pt-2 sm:pt-6",
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
                    initial={
                        prefersReducedMotion ? false : { opacity: 0, y: 48, scale: 0.92 }
                    }
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={
                        prefersReducedMotion
                            ? { duration: 0 }
                            : { duration: 0.34, ease: [0.22, 1, 0.36, 1] }
                    }
                    className="mb-8 mt-2 text-center"
                >
                    <h2
                        className="text-5xl font-black tracking-tighter font-headline drop-shadow-md px-6 py-2 inline-block"
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

                <div className="flex flex-col gap-4">
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
                                    transition={
                                        prefersReducedMotion
                                            ? { duration: 0 }
                                            : {
                                                  duration: 0.22,
                                                  delay: Math.min(0.06 + index * 0.035, 0.28),
                                                  ease: [0.22, 1, 0.36, 1],
                                              }
                                    }
                                    onMouseEnter={() => setHoveredIndex(area.id)}
                                    onMouseLeave={() => setHoveredIndex(null)}
                                    className={cn(
                                        'relative flex w-full items-center justify-between rounded-2xl border-2 px-6 py-4 md:px-8 md:py-5 text-left transition-all duration-200',
                                        "hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1",
                                        animBackdrop
                                            ? "border-border/50 bg-card/90 backdrop-blur-md shadow-sm hover:bg-card hover:border-border"
                                            : "border-transparent bg-card/40 backdrop-blur-sm hover:bg-card",
                                    )}
                                >
                                    {/* Fixed Vertical Color Bar - Increased visibility when inactive */}
                                    <div
                                      className={cn(
                                        'absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl transition-all duration-200 shadow-sm',
                                        hoveredIndex === area.id ? "opacity-100" : "opacity-70"
                                      )}
                                      style={{ backgroundColor: rainbowColor }}
                                    />

                                    {/* Left content */}
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            'w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all duration-200 border-2 border-border/50 shadow-md',
                                            animBackdrop ? "bg-card/90" : "bg-card/70",
                                            "group-hover:scale-105 group-hover:border-primary/20 group-hover:shadow-lg"
                                        )}>
                                            <Icon className="w-6 h-6 md:w-7 md:h-7" style={{ color: rainbowColor }} />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-lg md:text-xl font-black tracking-tight leading-tight" style={{ color: rainbowColor }}>
                                                {area.title}
                                            </h3>
                                            <p className="text-sm text-muted-foreground mt-1 font-medium leading-normal">{area.description}</p>
                                        </div>
                                    </div>

                                    {/* Right arrow — always visible, darker on hover (touch-friendly) */}
                                    <motion.div animate={{ x: hoveredIndex === area.id ? 0 : -4, opacity: hoveredIndex === area.id ? 1 : 0.4 }} transition={{ duration: 0.2 }}>
                                        <ChevronRight className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
                                    </motion.div>

                                    {/* Background Glow - Increased opacity on hover */}
                                    <AnimatePresence>
                                        {hoveredIndex === area.id && (
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
                                className="block group no-underline rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
                            <DialogTitle className="font-headline font-black tracking-tight">Teacher sign-in</DialogTitle>
                            <DialogDescription>
                                Enter your teacher username and passcode to open teacher tools.
                            </DialogDescription>
                        </DialogHeader>

                        {isAdmin && (
                            <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
                                <p className="text-xs font-semibold text-muted-foreground">Already signed in as Admin</p>
                                <p className="mt-1 text-xs text-muted-foreground/80">
                                    You can continue as Admin instead of signing in as Teacher.
                                </p>
                                <div className="mt-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full rounded-xl font-bold"
                                        onClick={() => {
                                            if (!schoolId) return;
                                            setTeacherDialogOpen(false);
                                            router.replace(`/${schoolId}/admin`);
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
                                        <SelectValue placeholder={teacherOptions.length ? 'Choose your name' : 'No teacher list yet'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {teacherOptions.map((opt) => (
                                            <SelectItem key={opt.id} value={staffLoginKey(opt)}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {!teacherOptions.length && (
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
                                            const selected = teacherOptions.find((o) => staffLoginKey(o) === selectedTeacherKey);
                                            if (!selected) {
                                                playSound('error');
                                                toast({
                                                    variant: 'destructive',
                                                    title: 'Choose a teacher from the list',
                                                    description: 'Please select your name again.',
                                                });
                                                return;
                                            }
                                            setTeacherSubmitting(true);
                                            const ok = await login('teacher', {
                                                schoolId,
                                                username: selected.username,
                                                passcode,
                                                teacherName: selected.label,
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
                                            router.push(`/${schoolId}/teacher`);
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
                                        const selected = teacherOptions.find((o) => staffLoginKey(o) === selectedTeacherKey);
                                        if (!selected) {
                                            playSound('error');
                                            toast({
                                                variant: 'destructive',
                                                title: 'Choose a teacher from the list',
                                                description: 'Please select your name again.',
                                            });
                                            return;
                                        }
                                        setTeacherSubmitting(true);
                                        const ok = await login('teacher', {
                                            schoolId,
                                            username: selected.username,
                                            passcode,
                                            teacherName: selected.label,
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
                                        router.push(`/${schoolId}/teacher`);
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
                    <div className="mt-10 text-center rounded-2xl border border-border/60 bg-muted/30 px-4 py-5">
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
