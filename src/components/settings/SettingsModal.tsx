'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useAppContext } from '@/components/AppProvider';
import { useFirebase } from '@/firebase';
import { canBypassSchoolAdminPasscode, loginSchoolAdmin } from '@/lib/adminGoogleAccess';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { NumericKeypad } from '@/components/ui/NumericKeypad';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Settings, Volume2, VolumeX, Monitor, Smartphone, ChevronRight,
    Shield, Moon, Sun, ArrowLeft, Palette, Zap, Trophy,
    BarChart3, MessageSquare, ShoppingBag, ShieldCheck, Star,
    Users, Printer, LayoutDashboard, History, HelpCircle,
    Cpu, Cog, Lock, Sparkles, Trash2, RotateCcw, Smile, BookOpen,
    Layers, UsersRound, Ticket, Loader2, PanelTop, ScanFace
} from 'lucide-react';
import { useSettings, colorSchemes, type ColorScheme, type Settings as AppSettings } from '../providers/SettingsProvider';
import { normalizeDisplayModePreference } from '@/lib/displayMode';
import type { StudentTheme } from '@/lib/types';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useToast } from '@/hooks/use-toast';
import { isStudentKioskUiContext } from '@/lib/students/studentKioskRoute';
import { VendingMotorPanel } from '@/components/kiosk/VendingMotorPanel';
import { ANIMATED_BACKGROUND_STYLES, type AnimatedBackgroundStyle } from '@/lib/animatedBackdrop';
import { globalAnimatedBackdropActive } from '@/lib/animatedBackdrop';
import { cn } from '@/lib/utils';
import { WELCOME_GREETING_STYLES } from '@/components/welcome/WelcomeGreeting';
import { IdCardPrinterSettingsSection } from '@/components/settings/IdCardPrinterSettingsSection';
import { SettingsFaceEnrollmentsPanel } from '@/components/settings/SettingsFaceEnrollmentsPanel';
import { SettingsSectionJumpNav } from '@/components/settings/SettingsSectionJumpNav';
import { FeatureFilterContext, SettingsFeatureRow } from '@/components/settings/SettingsFeatureRow';
import { PRODUCT_PILLAR_LABELS, type ProductPillarKey } from '@/lib/productPillars';
import { CLASSROOM_SEATING_SECTION_LABEL } from '@/lib/classroom/classroomTabSections';
import { OfficePortalEntryLink } from '@/components/office/OfficePortalEntryLink';
import {
    FEATURE_SECTION_NAV,
    GENERAL_SECTION_NAV,
    IMPLEMENTED_FEATURE_TOGGLE_KEYS,
    INTERFACE_SECTION_NAV,
    parseSettingsViewFromQuery,
    type SettingsView,
} from '@/components/settings/settingsModalConfig';
import { useStaffPortalLayoutMode } from '@/lib/staffPortal/useStaffPortalLayoutMode';
type RoleView = 'global' | 'student' | 'teacher';
type PreviewMode = 'live' | 'draft';

function cloneSettings(s: AppSettings): AppSettings {
    return JSON.parse(JSON.stringify(s)) as AppSettings;
}

export function SettingsModal() {
    const {
        loginState,
        login,
        isAdmin: hasAdminRole,
        schoolId,
    } = useAppContext();
    const { user: firebaseUser } = useFirebase();
    const canBypassAdminPasscode = canBypassSchoolAdminPasscode(firebaseUser);
    const canOpenSettings = loginState === 'admin' || loginState === 'developer' || loginState === 'teacher';
    const [open, setOpen] = useState(false);
    const [adminDialogOpen, setAdminDialogOpen] = useState(false);
    const [adminPasscode, setAdminPasscode] = useState('');
    const [adminSubmitting, setAdminSubmitting] = useState(false);
    /** Set when kiosk/school session unlocks settings via passcode (before auth context re-renders). */
    const [kioskAdminSettingsUnlock, setKioskAdminSettingsUnlock] = useState(false);
    /** Full school settings (all sections, edits) — admin role, admin session, or kiosk passcode unlock. */
    const canManageSchoolSettings =
        kioskAdminSettingsUnlock ||
        hasAdminRole ||
        loginState === 'admin' ||
        loginState === 'developer';
    const { settings, settingsPreferences, updateSettings, isPillarAvailable } = useSettings();
    const playSound = useArcadeSound();
    const { toast } = useToast();
    const [draft, setDraft] = useState<AppSettings | null>(null);
    const [view, setView] = useState<SettingsView>('hub');
    const [vendingSettingsOpen, setVendingSettingsOpen] = useState(false);
    const [interfaceRole, setInterfaceRole] = useState<RoleView>('global');
    const [previewMode, setPreviewMode] = useState<PreviewMode>('live');
    const [featureQuery, setFeatureQuery] = useState('');
    const [featuresEnabledOnly, setFeaturesEnabledOnly] = useState(false);
    const [showComingSoonFeatures, setShowComingSoonFeatures] = useState(false);
    const [selectedProfileId, setSelectedProfileId] = useState('');
    const local = draft ?? settings;
    const unavailablePillarHint = (pillar: ProductPillarKey) =>
        isPillarAvailable(pillar) ? undefined : 'Not included for this school';
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { isWide: staffPortalWideLayout, toggleLayoutMode: toggleStaffPortalLayout } = useStaffPortalLayoutMode();
    const originalSettingsRef = useRef<AppSettings | null>(null);
    const committedRef = useRef(false);
    const isShortLinkKioskRoute = typeof pathname === 'string' && pathname.startsWith('/s/');
    const autoOpenedFromQueryRef = useRef(false);
    const pendingSettingsViewRef = useRef<SettingsView | null>(null);
    const lastEditorLoginStateRef = useRef(loginState);

    /** Must run whenever the modal opens (trigger, ?settings=, or window event) so draft/original refs stay in sync. */
    const beginSettingsSession = useCallback(
        (initialView?: SettingsView, options?: { fullAccess?: boolean }) => {
            const fullAccess = options?.fullAccess ?? canManageSchoolSettings;
            committedRef.current = false;
            originalSettingsRef.current = cloneSettings(settingsPreferences);
            setDraft(cloneSettings(settingsPreferences));
            setView(initialView ?? 'hub');
            setPreviewMode(fullAccess ? 'draft' : 'live');
            if (typeof window !== 'undefined') {
                setSelectedProfileId(localStorage.getItem('current_kiosk_profile_id') || '');
            }
        },
        [settingsPreferences, canManageSchoolSettings],
    );

    useLayoutEffect(() => {
        if (open) setInterfaceRole('global');
    }, [open]);

    useLayoutEffect(() => {
        if (!open || canManageSchoolSettings || view !== 'general') return;
        setView('features');
    }, [open, canManageSchoolSettings, view]);

    useLayoutEffect(() => {
        if (!open || canManageSchoolSettings || view !== 'pillars') return;
        setView('hub');
    }, [open, canManageSchoolSettings, view]);

    useLayoutEffect(() => {
        if (!open || !canManageSchoolSettings) return;
        setPreviewMode('draft');
    }, [open, canManageSchoolSettings]);

    // In-app opener (avoids route transitions / layout jank).
    useEffect(() => {
        if (!canOpenSettings) return;
        const handler = (e: Event) => {
            const detail = (e as CustomEvent<{ view?: SettingsView }>).detail;
            const requestedView = detail?.view ?? 'hub';
            beginSettingsSession(requestedView);
            setOpen(true);
        };
        window.addEventListener('open-settings-modal', handler as EventListener);
        return () => window.removeEventListener('open-settings-modal', handler as EventListener);
    }, [canOpenSettings, beginSettingsSession]);

    useEffect(() => {
        if (canOpenSettings) return;
        const requestedView = parseSettingsViewFromQuery(searchParams?.get('settings') ?? null);
        if (requestedView) pendingSettingsViewRef.current = requestedView;
    }, [canOpenSettings, searchParams]);

    useEffect(() => {
        if (!open) {
            lastEditorLoginStateRef.current = loginState;
            return;
        }
        const wasKioskSchoolSession =
            lastEditorLoginStateRef.current === 'school' || lastEditorLoginStateRef.current === 'student';
        const nowStaffEditor = loginState === 'admin' || loginState === 'developer';
        lastEditorLoginStateRef.current = loginState;
        if (!wasKioskSchoolSession || !nowStaffEditor) return;
        originalSettingsRef.current = cloneSettings(settingsPreferences);
        setDraft(cloneSettings(settingsPreferences));
        setPreviewMode('draft');
    }, [open, loginState, settingsPreferences]);

    const canLivePreviewInterfaceRole = useMemo(() => {
        if (interfaceRole === 'global') return true;
        if (interfaceRole === 'student') {
            return loginState === 'school' || loginState === 'student';
        }
        if (interfaceRole === 'teacher') return loginState === 'teacher';
        return false;
    }, [interfaceRole, loginState]);

    const handleToggle = (key: string, value: any) => {
        const isLivePreviewKey =
            key === 'colorScheme' ||
            key === 'studentColorScheme' ||
            key === 'teacherColorScheme' ||
            key === 'customAppearanceColors' ||
            key === 'enableAnimatedBackground' ||
            key === 'legacyMode' ||
            key === 'animatedBackgroundStyle' ||
            key === 'studentEnableAnimatedBackground' ||
            key === 'teacherEnableAnimatedBackground' ||
            key === 'studentAnimatedBackgroundStyle' ||
            key === 'teacherAnimatedBackgroundStyle' ||
            key === 'darkMode' ||
            key === 'studentDarkMode' ||
            key === 'teacherDarkMode' ||
            key === 'darkModeColorized' ||
            key === 'studentDarkModeColorized' ||
            key === 'teacherDarkModeColorized';

        setDraft((prev) => {
            if (!prev) return prev;
            let next: AppSettings = { ...prev, [key]: value } as AppSettings;
            if (key === 'enableClassSignIn' && typeof value === 'boolean') {
                next = { ...next, enableAttendance: value };
            }
            if (key === 'enableAttendance' && typeof value === 'boolean') {
                next = { ...next, enableClassSignIn: value };
            }
            if (key === 'payHomework' && value === false) {
                next = { ...next, enableHomework: false };
            }
            if (key === 'payClassroom' && value === false) {
                next = { ...next, enableParentView: false };
            }
            if (key === 'payAttendance' && value === false) {
                next = { ...next, enableClassSignIn: false, enableAttendance: false, enableBathroomTimer: false };
            }
            return next;
        });

        // Session timeouts affect global idle timers immediately (draft-only would leave stale values until OK).
        if (
            key === 'adminAutoLogoutEnabled' ||
            key === 'adminSessionTimeoutMs' ||
            key === 'kioskAutoLogoutEnabled' ||
            key === 'kioskSessionTimeoutSec' ||
            key === 'classroomAutoLogoutEnabled' ||
            key === 'classroomSessionTimeoutMs' ||
            key === 'kioskAiFunIdleOffSec' ||
            key === 'soundEnabled' ||
            key === 'studentAudioTheme' ||
            key === 'adminPerTabColorScheme'
        ) {
            updateSettings({ [key]: value } as Partial<AppSettings>);
        }

        if (previewMode === 'live' && isLivePreviewKey && canLivePreviewInterfaceRole) {
            updateSettings({ [key]: value } as Partial<AppSettings>);
        }
        if (local.soundEnabled || key === 'soundEnabled') {
            playSound('click');
        }
    };

    const handleAppearanceColorChange = (scheme: ColorScheme, slot: 'primary' | 'secondary', value: string) => {
        const nextColors = {
            ...(local.customAppearanceColors || {}),
            [scheme]: {
                ...(local.customAppearanceColors?.[scheme] || {}),
                [slot]: value,
            },
        };
        handleToggle('customAppearanceColors', nextColors);
    };

    const handleResetAppearanceColors = (scheme: ColorScheme) => {
        const nextColors = { ...(local.customAppearanceColors || {}) };
        delete nextColors[scheme];
        handleToggle('customAppearanceColors', nextColors);
    };

    const handleTeacherFeatureToggle = (key: string, value: boolean) => {
        setDraft((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                teacherFeatures: {
                    ...(prev.teacherFeatures || {}),
                    [key]: value
                }
            };
        });
        if (local.soundEnabled) playSound('click');
    };

    const viewTitle: Record<SettingsView, string> = {
        hub: 'Settings',
        interface: 'Interface & display',
        general: 'School settings',
        features: 'School settings',
        pillars: 'Product Pillars',
        device: 'Kiosk device setup',
        faceEnrollments: 'Face login enrollments',
    };

    const openSettingsView = useCallback(
        (target: 'general' | 'advanced') => {
            setView(target === 'advanced' ? 'features' : 'general');
            if (local.soundEnabled) playSound('click');
        },
        [local.soundEnabled, playSound],
    );

    const visibleStyles = ANIMATED_BACKGROUND_STYLES.filter(s => !(local.hiddenAnimatedBackgroundIds || []).includes(s.id));
    const backdropActive = globalAnimatedBackdropActive(local);
    const backdropBlockedReason =
        local.legacyMode ? 'Legacy mode is on' : !local.enableAnimatedBackground ? 'Animated background is off' : null;

    const jumpToSettingsSection = (id: string) => {
        if (local.soundEnabled) playSound('click');
        requestAnimationFrame(() => {
            document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    };

    const handleOpenChange = (next: boolean) => {
        if (next) {
            beginSettingsSession('hub');
        } else {
            setDraft(null);
            setKioskAdminSettingsUnlock(false);
            // Do not force view to hub here — avoids flashing the hub screen while the modal is
            // closing from Interface / features / etc. Next open always resets via beginSettingsSession.
        }
        setOpen(next);
    };

    // Allow deep-linking into the settings modal via query param.
    // Example: `?settings=features` opens Settings on the Advanced section.
    useEffect(() => {
        if (!canOpenSettings) return;
        if (!searchParams) return;
        const requested = searchParams.get('settings');
        if (!requested) return;
        if (autoOpenedFromQueryRef.current) return;

        const requestedView = parseSettingsViewFromQuery(requested);
        if (!requestedView) return;
        if (requestedView === 'pillars' && !canManageSchoolSettings) return;

        autoOpenedFromQueryRef.current = true;
        beginSettingsSession(requestedView);
        setOpen(true);

        // Clean the URL so refresh/back doesn't reopen.
        requestAnimationFrame(() => {
            try {
                router.replace(pathname);
            } catch {
                // ignore
            }
        });
    }, [canManageSchoolSettings, canOpenSettings, pathname, router, searchParams, beginSettingsSession]);

    // If the user closes/cancels, revert any live-previewed changes.
    useEffect(() => {
        if (open) return;
        if (committedRef.current) return;
        const original = originalSettingsRef.current;
        if (!original) return;
        updateSettings(original);
        originalSettingsRef.current = null;
    }, [open, updateSettings]);


    const handleOk = () => {
        committedRef.current = true;
        if (draft) {
            updateSettings({ ...draft });
        }
        // Use the same close path as Cancel / overlay (Radix onOpenChange) so focus stack stays consistent.
        handleOpenChange(false);
    };

    const attemptAdminUnlockForSettings = useCallback(
        async (passcode: string, options?: { openPasscodeDialogOnFail?: boolean }) => {
            if (adminSubmitting || !schoolId) return;

            setAdminSubmitting(true);
            const authResult = await loginSchoolAdmin(login, firebaseUser, schoolId, passcode);
            if (!authResult.ok) {
                setAdminSubmitting(false);
                playSound('error');
                if (options?.openPasscodeDialogOnFail) {
                    setAdminPasscode('');
                    setAdminDialogOpen(true);
                    return;
                }
                toast({
                    variant: 'destructive',
                    title: 'Login failed',
                    description: authResult.message,
                });
                setAdminPasscode('');
                return;
            }

            playSound('login');
            setKioskAdminSettingsUnlock(true);
            const pendingView = pendingSettingsViewRef.current;
            pendingSettingsViewRef.current = null;
            beginSettingsSession(pendingView ?? 'hub', { fullAccess: true });
            setOpen(true);
            setAdminSubmitting(false);
            setAdminDialogOpen(false);
        },
        [adminSubmitting, beginSettingsSession, firebaseUser, login, playSound, schoolId, toast],
    );

    // For short-link kiosk entry routes, keep the UI minimal (and avoid showing settings).
    if (isShortLinkKioskRoute) return null;

    return (
        <>
        <Dialog
            open={adminDialogOpen}
            onOpenChange={(open) => {
                if (!open) {
                    setAdminSubmitting(false);
                    setAdminPasscode('');
                }
                setAdminDialogOpen(open);
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="font-headline font-black tracking-tight">Sign in as admin</DialogTitle>
                    <DialogDescription>
                        Only admins can change school settings. Enter the admin passcode for this school to open settings.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="admin-passcode-settings" className="text-xs font-semibold text-muted-foreground">
                            Passcode
                        </Label>
                        <Input
                            id="admin-passcode-settings"
                            type="password"
                            value={adminPasscode}
                            onChange={(e) => setAdminPasscode(e.target.value)}
                            className="h-12 rounded-xl font-mono tracking-[0.35em] text-center"
                            autoComplete="current-password"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key !== 'Enter') return;
                                e.preventDefault();
                                void attemptAdminUnlockForSettings(adminPasscode);
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
                            void attemptAdminUnlockForSettings(adminPasscode);
                        }}
                    >
                        {adminSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                                Signing in...
                            </>
                        ) : (
                            'Sign in as admin'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        <Dialog open={open} onOpenChange={handleOpenChange}>
            {canOpenSettings ? (
                <DialogTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "hover:bg-muted rounded-xl group relative z-50 transition-all active:scale-90",
                            !canOpenSettings && "text-muted-foreground/60"
                        )}
                        aria-label="Open settings"
                    >
                        <Settings className="w-5 h-5 text-muted-foreground group-hover:rotate-45 transition-transform duration-300" />
                    </Button>
                </DialogTrigger>
            ) : (
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "hover:bg-muted rounded-xl group relative z-50 transition-all active:scale-90",
                        !canOpenSettings && "text-muted-foreground/60"
                    )}
                    aria-label="Open settings"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        playSound('click');
                        if (canBypassAdminPasscode && schoolId) {
                            void attemptAdminUnlockForSettings('', { openPasscodeDialogOnFail: true });
                            return;
                        }
                        setAdminDialogOpen(true);
                    }}
                >
                    <Settings className="w-5 h-5 text-muted-foreground group-hover:rotate-45 transition-transform duration-300" />
                </Button>
            )}
      <DialogContent
                size="lg"
                overlayClassName="z-[270]"
                className="z-[280] p-0 overflow-hidden border border-border bg-background flex flex-col shadow-2xl"
                data-settings-open="true"
            >
                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-border/40 bg-card/30 backdrop-blur-md">
                    <DialogHeader>
                        <div className="flex items-center gap-2">
                            {view !== 'hub' && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        if (view === 'faceEnrollments') {
                                            setView('general');
                                            if (local.soundEnabled) playSound('click');
                                            return;
                                        }
                                        if (view === 'features' && canManageSchoolSettings) {
                                            openSettingsView('general');
                                            return;
                                        }
                                        setView('hub');
                                        if (local.soundEnabled) playSound('click');
                                    }}
                                    className="h-8 w-8 -ml-2 rounded-full hover:bg-muted"
                                    aria-label={
                                        view === 'faceEnrollments'
                                            ? 'Back to school settings'
                                            : view === 'features' && canManageSchoolSettings
                                              ? 'Back to general settings'
                                              : 'Back to settings menu'
                                    }
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            )}
                            <DialogTitle className="text-xl font-black tracking-tight text-foreground">
                                {viewTitle[view]}
                                {view === 'features' ? (
                                    <span className="ml-2 text-sm font-bold text-amber-600 dark:text-amber-400">&middot; Advanced</span>
                                ) : view === 'general' ? (
                                    <span className="ml-2 text-sm font-bold text-muted-foreground">&middot; General</span>
                                ) : null}
                            </DialogTitle>
                        </div>
                    </DialogHeader>
                </div>

                <div key={view} className="px-6 py-4 overflow-y-auto flex-1 min-h-0 flex flex-col pb-4">
                    {view === 'hub' && (
                        <div className="grid gap-3 sm:grid-cols-2 pt-1">
                            <button
                                type="button"
                                onClick={() => {
                                    setView('interface');
                                    if (local.soundEnabled) playSound('click');
                                }}
                                className={cn(
                                    'flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-all',
                                    'border-sky-200 dark:border-sky-900/50 bg-sky-50/80 dark:bg-sky-950/20',
                                    'hover:bg-sky-100/80 dark:hover:bg-sky-950/35',
                                )}
                            >
                                <div className="flex w-full items-start justify-between gap-2">
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white shadow-inner">
                                        <Palette className="h-5 w-5" />
                                    </span>
                                    <ChevronRight className="h-5 w-5 shrink-0 text-sky-700/50 dark:text-sky-400/50" aria-hidden />
                                </div>
                                <span className="font-black text-sky-900 dark:text-sky-100">Interface &amp; display</span>
                                <span className="text-xs leading-snug text-sky-800/90 dark:text-sky-200/80">Accent colors, dark mode, motion, sound, and Auto / Web / App layout</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => openSettingsView(canManageSchoolSettings ? 'general' : 'advanced')}
                                className={cn(
                                    'flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-all',
                                    'border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/80 dark:bg-indigo-950/20',
                                    'hover:bg-indigo-100/80 dark:hover:bg-indigo-950/35',
                                )}
                            >
                                <div className="flex w-full items-start justify-between gap-2">
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-inner">
                                        <Cog className="h-5 w-5" />
                                    </span>
                                    <ChevronRight className="h-5 w-5 shrink-0 text-indigo-700/50 dark:text-indigo-400/50" aria-hidden />
                                </div>
                                <span className="font-black text-indigo-900 dark:text-indigo-100">School settings</span>
                                <span className="text-xs leading-snug text-indigo-800/90 dark:text-indigo-200/80">
                                    Sessions, kiosk behavior, printing, and optional features
                                </span>
                            </button>
                            {canManageSchoolSettings && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setView('pillars');
                                        if (local.soundEnabled) playSound('click');
                                    }}
                                    className={cn(
                                        'flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-all',
                                        'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/80 dark:bg-emerald-950/20',
                                        'hover:bg-emerald-100/80 dark:hover:bg-emerald-950/35',
                                    )}
                                >
                                    <div className="flex w-full items-start justify-between gap-2">
                                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-inner">
                                            <ShieldCheck className="h-5 w-5" />
                                        </span>
                                        <ChevronRight className="h-5 w-5 shrink-0 text-emerald-700/50 dark:text-emerald-400/50" aria-hidden />
                                    </div>
                                    <span className="font-black text-emerald-900 dark:text-emerald-100">Product Pillars</span>
                                    <span className="text-xs leading-snug text-emerald-800/90 dark:text-emerald-200/80">Select active paid plan products</span>
                                </button>
                            )}
                            {isStudentKioskUiContext(loginState, pathname, schoolId) && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setView('device');
                                        if (local.soundEnabled) playSound('click');
                                    }}
                                    className={cn(
                                        'flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-all',
                                        'border-amber-200 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/20',
                                        'hover:bg-amber-100/80 dark:hover:bg-amber-950/35 sm:col-span-2',
                                    )}
                                >
                                    <div className="flex w-full items-start justify-between gap-2">
                                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-inner">
                                            <Smartphone className="h-5 w-5" />
                                        </span>
                                        <ChevronRight className="h-5 w-5 shrink-0 text-amber-700/50 dark:text-amber-400/50" aria-hidden />
                                    </div>
                                    <span className="font-black text-amber-900 dark:text-amber-100">Kiosk device setup</span>
                                    <span className="text-xs leading-snug text-amber-800/90 dark:text-amber-200/80">
                                        Link this physical screen to a centralized Kiosk Profile (Portrait layout, sound options, active login tabs, etc.)
                                    </span>
                                </button>
                            )}
                        </div>
                    )}

                    {view === 'interface' && (
                        <>
                             <SettingsSectionJumpNav
                                sections={INTERFACE_SECTION_NAV}
                                ariaLabel="Interface settings sections"
                                onJump={jumpToSettingsSection}
                            />

                            <div className="mb-4 flex flex-col gap-3">
                                {canManageSchoolSettings && (
                                    <div className="flex items-center gap-2 p-1 bg-muted/50 rounded-2xl border border-border/40">
                                        {(['global', 'student', 'teacher'] as RoleView[]).map((role) => (
                                            <button
                                                key={role}
                                                onClick={() => {
                                                    setInterfaceRole(role);
                                                    if (local.soundEnabled) playSound('click');
                                                }}
                                                className={cn(
                                                    "flex-1 py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                                    interfaceRole === role 
                                                        ? "bg-background text-foreground shadow-sm border border-border/50" 
                                                        : "text-muted-foreground hover:text-foreground"
                                                )}
                                            >
                                                {role} Portal
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {canManageSchoolSettings ? (
                                    <div className="rounded-2xl border border-border/40 bg-muted/30 p-3 flex items-center justify-between">
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                                                Editing
                                            </p>
                                            <p className="text-sm font-black tracking-tight text-foreground mt-1">
                                                {interfaceRole === 'global'
                                                    ? 'Global defaults'
                                                    : interfaceRole === 'student'
                                                        ? 'Student portal overrides'
                                                        : 'Teacher portal overrides'}
                                            </p>
                                        </div>
                                        <div className="shrink-0 text-[10px] font-black uppercase tracking-widest rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-muted-foreground">
                                            {interfaceRole === 'global' ? 'ALL USERS' : interfaceRole.toUpperCase()}
                                        </div>
                                    </div>
                                ) : null}
                            </div>

                            {canManageSchoolSettings ? null : null}

                            {/* APPEARANCE */}
                            <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                                {/* Desktop left nav */}
                                <div className="hidden md:block">
                                    <div className="sticky top-0 rounded-2xl border border-border/40 bg-muted/20 p-2">
                                        <p className="px-3 pt-3 pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                                            Sections
                                        </p>
                                        <div className="flex flex-col gap-1 px-2 pb-2">
                                            {INTERFACE_SECTION_NAV.map((s) => (
                                                <button
                                                    key={s.id}
                                                    type="button"
                                                    onClick={() => jumpToSettingsSection(s.id)}
                                                    className="flex items-center justify-between rounded-xl border border-transparent px-3 py-2 text-left text-xs font-bold text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
                                                >
                                                    <span>{s.label}</span>
                                                    <ChevronRight className="h-4 w-4 opacity-50" aria-hidden />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="min-w-0">
                                    <div
                                        id="settings-interface-appearance"
                                        className="scroll-mt-[4.5rem] bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-4 mb-4 border border-slate-100 dark:border-slate-800/50"
                                    >
                                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 pb-3 flex items-center gap-2">
                                            <Palette className="w-3.5 h-3.5" /> Appearance
                                        </p>

                                        {/* Color Scheme */}
                                        {(() => {
                                            const roleKey =
                                                interfaceRole === 'student'
                                                    ? 'studentColorScheme'
                                                    : interfaceRole === 'teacher'
                                                      ? 'teacherColorScheme'
                                                      : 'colorScheme';
                                            const selectedScheme = (local[roleKey] || 'default') as ColorScheme;

                                            const renderSchemeSwatch = (key: ColorScheme) => {
                                                const swatchColors = colorSchemes[key].swatchColors;
                                                const customSwatch = local.customAppearanceColors?.[key];
                                                const effectiveSwatchColors = [
                                                    customSwatch?.primary || swatchColors[0],
                                                    customSwatch?.secondary || swatchColors[1],
                                                ];
                                                return (
                                                    <span className="flex h-4 w-5 shrink-0 overflow-hidden rounded-full border border-black/10 shadow-sm">
                                                        {effectiveSwatchColors.map((color) => (
                                                            <span
                                                                key={color}
                                                                className="flex-1"
                                                                style={{
                                                                    backgroundColor: /^#[0-9A-Fa-f]{6}$/.test(color)
                                                                        ? color
                                                                        : '#94a3b8',
                                                                }}
                                                            />
                                                        ))}
                                                    </span>
                                                );
                                            };

                                            return (
                                                <Select
                                                    value={selectedScheme}
                                                    onValueChange={(value) => {
                                                        handleToggle(roleKey, value as ColorScheme);
                                                        if (local.soundEnabled) playSound('click');
                                                    }}
                                                >
                                                    <SelectTrigger
                                                        className="h-10 w-full rounded-xl font-semibold text-sm"
                                                        aria-label="Color scheme"
                                                    >
                                                        <SelectValue placeholder="Select colors">
                                                            <span className="flex items-center gap-2">
                                                                {renderSchemeSwatch(selectedScheme)}
                                                                {colorSchemes[selectedScheme].label}
                                                            </span>
                                                        </SelectValue>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {(Object.keys(colorSchemes) as ColorScheme[]).map((key) => (
                                                            <SelectItem key={key} value={key}>
                                                                <span className="flex items-center gap-2">
                                                                    {renderSchemeSwatch(key)}
                                                                    {colorSchemes[key].label}
                                                                </span>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            );
                                        })()}

                                        {(() => {
                                            const roleKey = interfaceRole === 'student' ? 'studentColorScheme' : interfaceRole === 'teacher' ? 'teacherColorScheme' : 'colorScheme';
                                            const selectedScheme = (local[roleKey] || 'default') as ColorScheme;
                                            const presetColors = colorSchemes[selectedScheme].swatchColors;
                                            const customColors = local.customAppearanceColors?.[selectedScheme] || {};
                                            const primaryColor = customColors.primary || presetColors[0];
                                            const secondaryColor = customColors.secondary || presetColors[1];
                                            const hasCustom = !!customColors.primary || !!customColors.secondary;
                                            return (
                                                <div className="mt-4 rounded-xl border border-border/60 bg-background/70 p-3">
                                                    <div className="mb-3 flex items-center justify-between gap-3">
                                                        <div>
                                                            <h4 className="text-sm font-black text-foreground">{colorSchemes[selectedScheme].label} colors</h4>
                                                            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">Primary is used for main actions. Secondary is used for focus, hover, charts, and support accents.</p>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-9 shrink-0 rounded-xl px-2 text-[11px]"
                                                            onClick={() => handleResetAppearanceColors(selectedScheme)}
                                                            disabled={!hasCustom}
                                                        >
                                                            <RotateCcw className="h-3.5 w-3.5" />
                                                            Reset
                                                        </Button>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                        {([
                                                            ['primary', 'Primary'],
                                                            ['secondary', 'Secondary'],
                                                        ] as const).map(([slot, label]) => {
                                                            const value = slot === 'primary' ? primaryColor : secondaryColor;
                                                            const colorInputValue = /^#[0-9A-Fa-f]{6}$/.test(value) ? value : presetColors[slot === 'primary' ? 0 : 1];
                                                            return (
                                                                <label key={slot} className="flex items-center gap-3 rounded-xl border border-border/50 bg-card px-3 py-2">
                                                                    <span className="text-xs font-bold text-muted-foreground">{label}</span>
                                                                    <Input
                                                                        type="color"
                                                                        value={colorInputValue}
                                                                        onChange={(e) => handleAppearanceColorChange(selectedScheme, slot, e.target.value)}
                                                                        className="ml-auto h-9 w-12 cursor-pointer rounded-md border-border p-1"
                                                                        aria-label={`${label} color`}
                                                                    />
                                                                    <Input
                                                                        value={value}
                                                                        onChange={(e) => handleAppearanceColorChange(selectedScheme, slot, e.target.value)}
                                                                        className="h-9 w-24 font-mono text-xs"
                                                                        aria-label={`${label} hex`}
                                                                    />
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>

                            {/* MOTION & SOUND */}
                            <div
                                id="settings-interface-motion"
                                className="scroll-mt-[4.5rem] bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-4 mb-4 border border-slate-100 dark:border-slate-800/50"
                            >
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 pb-3 flex items-center gap-2">
                                    <Zap className="w-3.5 h-3.5" /> Motion & Sound
                                </p>

                                {/* Sound Effects */}
                                <div className="flex items-center justify-between mb-4 mt-1">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl bg-muted text-muted-foreground`}>
                                            <Volume2 className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm text-foreground">Sound FX</h4>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">Clicks and arcade UI sounds</p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={local.soundEnabled}
                                        onCheckedChange={(checked) => handleToggle('soundEnabled', checked)}
                                        className="data-[state=checked]:bg-emerald-500 scale-110"
                                    />
                                </div>

                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl transition-colors ${local.enableAnimatedBackground && !local.legacyMode ? 'bg-primary/20 text-primary shadow-sm' : 'bg-muted text-muted-foreground'}`}>
                                            <Sparkles className="w-5 h-5" />
                                        </div>
                                         <div>
                                            <h4 className="font-bold text-sm text-foreground">Animated background</h4>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                                Vibrant arcade style backdrop
                                                {!canLivePreviewInterfaceRole ? (
                                                    <span className="ml-2 text-amber-700 dark:text-amber-400 font-bold">
                                                        (preview applies only to your current portal)
                                                    </span>
                                                ) : null}
                                            </p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={(() => {
                                            if (interfaceRole === 'student') return local.studentEnableAnimatedBackground ?? local.enableAnimatedBackground;
                                            if (interfaceRole === 'teacher') return local.teacherEnableAnimatedBackground ?? local.enableAnimatedBackground;
                                            return local.enableAnimatedBackground;
                                        })()}
                                        onCheckedChange={(checked) => {
                                            const roleKey = interfaceRole === 'student' ? 'studentEnableAnimatedBackground' : interfaceRole === 'teacher' ? 'teacherEnableAnimatedBackground' : 'enableAnimatedBackground';
                                            handleToggle(roleKey, checked);
                                        }}
                                        className="scale-110"
                                    />
                                </div>

                                {/* Background Style */}
                                {(() => {
                                    const roleKey =
                                        interfaceRole === 'student'
                                            ? 'studentAnimatedBackgroundStyle'
                                            : interfaceRole === 'teacher'
                                              ? 'teacherAnimatedBackgroundStyle'
                                              : 'animatedBackgroundStyle';
                                    const rawStyle =
                                        (local[roleKey as keyof AppSettings] as AnimatedBackgroundStyle | undefined) ||
                                        local.animatedBackgroundStyle;
                                    const selectedId =
                                        visibleStyles.find((s) => s.id === rawStyle)?.id ??
                                        visibleStyles[0]?.id ??
                                        ANIMATED_BACKGROUND_STYLES[0].id;

                                    return (
                                        <div className="mb-4 space-y-3">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-xl bg-muted text-muted-foreground shrink-0">
                                                    <Palette className="w-5 h-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-bold text-sm text-foreground">Background style</h4>
                                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                                        Choose the animated backdrop for this portal role.
                                                        {!backdropActive && backdropBlockedReason ? (
                                                            <span className="ml-2 text-amber-700 dark:text-amber-400 font-bold">
                                                                (not visible: {backdropBlockedReason})
                                                            </span>
                                                        ) : null}
                                                    </p>
                                                </div>
                                            </div>
                                            {visibleStyles.length === 0 ? (
                                                <p className="text-[11px] text-muted-foreground rounded-xl border border-dashed border-border/60 bg-muted/30 px-3 py-2">
                                                    Every background style is hidden in Developer settings. Restore at least one to choose a backdrop here.
                                                </p>
                                            ) : (
                                                <Select
                                                    value={selectedId}
                                                    onValueChange={(value) => {
                                                        handleToggle(roleKey, value as AnimatedBackgroundStyle);
                                                        if (local.soundEnabled) playSound('click');
                                                    }}
                                                    disabled={!backdropActive}
                                                >
                                                    <SelectTrigger
                                                        className="h-10 w-full rounded-xl font-semibold text-sm"
                                                        aria-label="Background animation style"
                                                        title={
                                                            !backdropActive && backdropBlockedReason
                                                                ? `Background style is disabled: ${backdropBlockedReason}`
                                                                : undefined
                                                        }
                                                    >
                                                        <SelectValue placeholder="Select style" />
                                                    </SelectTrigger>
                                                    <SelectContent className="max-h-72">
                                                        {visibleStyles.map((s) => (
                                                            <SelectItem
                                                                key={s.id}
                                                                value={s.id}
                                                                title={s.description}
                                                                className="items-start py-2"
                                                            >
                                                                <span className="font-semibold leading-tight">{s.label}</span>
                                                                <span className="mt-0.5 block text-[10px] font-normal leading-snug text-muted-foreground">
                                                                    {s.description}
                                                                </span>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        </div>
                                    );
                                })()}



                            </div>

                            {/* THEME & LAYOUT */}
                            <div
                                id="settings-interface-layout"
                                className="scroll-mt-[4.5rem] bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-4 mb-4 border border-slate-100 dark:border-slate-800/50"
                            >
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 pb-3 flex items-center gap-2">
                                    <LayoutDashboard className="w-3.5 h-3.5" /> Theme & Layout
                                </p>

                                <div className="grid grid-cols-2 gap-4 mb-4 mt-1">
                                    {/* Dark Mode */}
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            <Moon className="w-4 h-4 text-muted-foreground shrink-0" />
                                             <span className="text-sm font-bold">Dark Mode</span>
                                        </div>
                                        <Switch
                                            checked={(() => {
                                                if (interfaceRole === 'student') return local.studentDarkMode ?? local.darkMode;
                                                if (interfaceRole === 'teacher') return local.teacherDarkMode ?? local.darkMode;
                                                return local.darkMode;
                                            })()}
                                            onCheckedChange={(checked) => {
                                                const roleKey = interfaceRole === 'student' ? 'studentDarkMode' : interfaceRole === 'teacher' ? 'teacherDarkMode' : 'darkMode';
                                                handleToggle(roleKey, checked);
                                            }}
                                        />
                                    </div>
                                    {/* Colorized dark — richer accents + ambient wash (see `html[data-dark-colorize]` in globals.css) */}
                                    <div
                                        className={cn(
                                            'flex items-start justify-between gap-2',
                                            !(() => {
                                                if (interfaceRole === 'student') return local.studentDarkMode ?? local.darkMode;
                                                if (interfaceRole === 'teacher') return local.teacherDarkMode ?? local.darkMode;
                                                return local.darkMode;
                                            })() && 'opacity-45 pointer-events-none',
                                        )}
                                    >
                                        <div className="min-w-0 pr-1">
                                            <div className="flex items-center gap-2">
                                                <Sparkles className="w-4 h-4 text-muted-foreground shrink-0" />
                                                <span className="text-sm font-bold">Colorize dark</span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground font-medium leading-snug mt-0.5 ml-6">
                                                Saturated buttons and a soft color wash behind the app (dark mode only).
                                            </p>
                                        </div>
                                        <Switch
                                            checked={(() => {
                                                if (interfaceRole === 'student') return local.studentDarkModeColorized ?? local.darkModeColorized ?? false;
                                                if (interfaceRole === 'teacher') return local.teacherDarkModeColorized ?? local.darkModeColorized ?? false;
                                                return local.darkModeColorized ?? false;
                                            })()}
                                            onCheckedChange={(checked) => {
                                                const roleKey =
                                                    interfaceRole === 'student'
                                                        ? 'studentDarkModeColorized'
                                                        : interfaceRole === 'teacher'
                                                          ? 'teacherDarkModeColorized'
                                                          : 'darkModeColorized';
                                                handleToggle(roleKey, checked);
                                            }}
                                            className="shrink-0 mt-0.5"
                                        />
                                    </div>
                                    {/* Legacy Mode — performance-oriented simple visuals (see `.legacy` in globals.css) */}
                                    <div className="flex items-start justify-between gap-2 col-span-2">
                                        <div className="min-w-0 pr-1">
                                            <div className="flex items-center gap-2">
                                                <Cpu className="w-4 h-4 text-muted-foreground shrink-0" />
                                                <span className="text-sm font-bold">Legacy Mode</span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground font-medium leading-snug mt-0.5 ml-6">
                                                Turn on for a simpler, faster UI (less animation, blur, and glow). Leave off for the full arcade look.
                                            </p>
                                        </div>
                                        <Switch
                                            checked={local.legacyMode}
                                            onCheckedChange={(checked) => handleToggle('legacyMode', checked)}
                                            className="data-[state=checked]:bg-orange-600 shrink-0 mt-0.5"
                                        />
                                    </div>
                                    {/* Student themes (display only; does not delete saved themes) */}
                                    <div className="flex items-center justify-between col-span-2">
                                        <div className="flex items-center gap-2 min-w-0 pr-2">
                                            <Palette className="w-4 h-4 text-muted-foreground shrink-0" />
                                            <div className="min-w-0">
                                                <span className="text-sm font-bold">Student themes</span>
                                                <p className="text-[10px] text-muted-foreground font-medium leading-snug mt-0.5">
                                                    Off: kiosk, shop, and ID cards use standard styling. Saved themes stay on file.
                                                </p>
                                            </div>
                                        </div>
                                        <Switch
                                            checked={local.enableStudentThemes !== false}
                                            onCheckedChange={(checked) => handleToggle('enableStudentThemes', checked)}
                                        />
                                    </div>
                                    {canManageSchoolSettings && interfaceRole === 'global' ? (
                                        <div className="flex items-center justify-between col-span-2">
                                            <div className="flex items-center gap-2 min-w-0 pr-2">
                                                <Layers className="w-4 h-4 text-muted-foreground shrink-0" />
                                                <div className="min-w-0">
                                                    <span className="text-sm font-bold">Colored feature tabs</span>
                                                    <p className="text-[10px] text-muted-foreground font-medium leading-snug mt-0.5">
                                                        Soft accent colors on extra-feature tabs you pin in the admin sidebar (Insights, Hall of Fame, and similar).
                                                    </p>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={!!local.adminPerTabColorScheme}
                                                onCheckedChange={(checked) => handleToggle('adminPerTabColorScheme', checked)}
                                            />
                                        </div>
                                    ) : null}
                                </div>

                                 {/* Display Mode */}
                                 <div className="space-y-2">
                                     <div className="flex items-center justify-between bg-muted/40 p-1.5 rounded-2xl border border-border/50">
                                         {(['auto', 'web', 'app'] as const).map((mode) => {
                                             const roleKey =
                                                 interfaceRole === 'student'
                                                     ? 'studentDisplayMode'
                                                     : interfaceRole === 'teacher'
                                                       ? 'teacherDisplayMode'
                                                       : 'displayMode';
                                             const rawPref =
                                                 interfaceRole === 'student'
                                                     ? local.studentDisplayMode ?? local.displayMode
                                                     : interfaceRole === 'teacher'
                                                       ? local.teacherDisplayMode ?? local.displayMode
                                                       : local.displayMode;
                                             const activePref = normalizeDisplayModePreference(rawPref);
                                             return (
                                                 <button
                                                     key={mode}
                                                     type="button"
                                                     onClick={() => handleToggle(roleKey, mode)}
                                                     className={cn(
                                                         'flex-1 py-2 px-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                                                         activePref === mode
                                                             ? 'bg-background text-foreground shadow-sm border border-border/50'
                                                             : 'text-muted-foreground hover:text-foreground',
                                                     )}
                                                 >
                                                     {mode === 'auto' ? 'Auto' : mode === 'web' ? 'Web' : 'App'}
                                                 </button>
                                             );
                                         })}
                                     </div>
                                     <p className="text-[10px] text-muted-foreground font-medium leading-snug px-1">
                                         Auto uses app layout on tablets and phones, web on larger screens. Web and App always use that layout.
                                     </p>
                                 </div>

                                 {interfaceRole === 'student' && (
                                     <div className="space-y-2 mt-4 pt-4 border-t border-border/40">
                                         <div className="flex items-center gap-2">
                                             <Volume2 className="w-4 h-4 text-muted-foreground shrink-0" />
                                             <div className="min-w-0">
                                                 <span className="text-sm font-bold">Personalized Audio Theme</span>
                                                 <p className="text-[10px] text-muted-foreground font-medium leading-snug mt-0.5">
                                                     Choose the synthesizer sound pack for student logins, hovers, and rewards.
                                                 </p>
                                             </div>
                                         </div>
                                         <Select
                                             value={(local as any).studentAudioTheme || 'retro_arcade'}
                                             onValueChange={(val) => {
                                                 handleToggle('studentAudioTheme', val);
                                             }}
                                         >
                                             <SelectTrigger className="w-full h-11 rounded-xl">
                                                 <SelectValue placeholder="Select sound pack" />
                                             </SelectTrigger>
                                             <SelectContent className="z-[290]">
                                                 <SelectItem value="retro_arcade">ðŸ‘¾ Retro Arcade (Classic 8-bit)</SelectItem>
                                                 <SelectItem value="modern_chime">ðŸ”” Modern Chime (Crystalline Bells)</SelectItem>
                                                 <SelectItem value="sci_fi_synth">ðŸš€ Sci-Fi Synth (Futuristic Lasers)</SelectItem>
                                             </SelectContent>
                                         </Select>
                                     </div>
                                 )}

                            </div>
                                </div>
                            </div>
                        </>
                    )}

                    {view === 'general' && (
                        <div className="space-y-4">
                            <SettingsSectionJumpNav
                                sections={GENERAL_SECTION_NAV}
                                ariaLabel="General school settings sections"
                                onJump={jumpToSettingsSection}
                            />
                            <div className="flex items-center justify-end">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-9 rounded-xl text-[10px] font-black uppercase tracking-widest border-amber-200/80 text-amber-800 hover:bg-amber-50 dark:border-amber-900/50 dark:text-amber-200 dark:hover:bg-amber-950/30"
                                    onClick={() => openSettingsView('advanced')}
                                >
                                    <Zap className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                                    Advanced
                                    <ChevronRight className="ml-1 h-3.5 w-3.5" aria-hidden />
                                </Button>
                            </div>
                            <div
                                id="settings-general-sessions"
                                className="scroll-mt-[4.5rem] bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/50"
                            >
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 pb-3 flex items-center gap-2">
                                    <Shield className="w-3.5 h-3.5" /> Sessions
                                </p>

                                <div className="space-y-4 mt-1">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-sm font-bold">Admin Auto-Logout</span>
                                            <p className="text-[11px] text-muted-foreground">
                                                {local.adminAutoLogoutEnabled !== false
                                                    ? 'Log out staff after idle time (minutes)'
                                                    : 'Staff stay signed in until they log out manually'}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Switch
                                                checked={local.adminAutoLogoutEnabled !== false}
                                                onCheckedChange={(checked) => handleToggle('adminAutoLogoutEnabled', checked)}
                                                disabled={!canManageSchoolSettings}
                                                aria-label="Enable admin auto-logout"
                                            />
                                            <Input
                                                type="number"
                                                className="w-20 h-9 rounded-xl text-center font-bold bg-background/50 border-border/50 disabled:opacity-40"
                                                value={Math.round((local.adminSessionTimeoutMs || 0) / 60000)}
                                                onChange={(e) => handleToggle('adminSessionTimeoutMs', Math.max(1, parseInt(e.target.value) || 1) * 60000)}
                                                min={1}
                                                max={1440}
                                                disabled={local.adminAutoLogoutEnabled === false || !canManageSchoolSettings}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-sm font-bold">Kiosk Auto-Logout</span>
                                            <p className="text-[11px] text-muted-foreground">
                                                {local.kioskAutoLogoutEnabled !== false
                                                    ? 'Return to sign-in after idle time (seconds)'
                                                    : 'Students stay signed in until they log out or kiosk is locked'}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Switch
                                                checked={local.kioskAutoLogoutEnabled !== false}
                                                onCheckedChange={(checked) => handleToggle('kioskAutoLogoutEnabled', checked)}
                                                disabled={!canManageSchoolSettings}
                                                aria-label="Enable kiosk auto-logout"
                                            />
                                            <Input
                                                type="number"
                                                className="w-20 h-9 rounded-xl text-center font-bold bg-background/50 border-border/50 disabled:opacity-40"
                                                value={local.kioskSessionTimeoutSec ?? 10}
                                                onChange={(e) => handleToggle('kioskSessionTimeoutSec', Math.max(1, parseInt(e.target.value) || 10))}
                                                min={1}
                                                max={300}
                                                disabled={local.kioskAutoLogoutEnabled === false || !canManageSchoolSettings}
                                            />
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-3 py-2.5">
                                        <p className="text-sm font-bold">Live monitor auto-exit</p>
                                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                                            Configure idle timeout for the live awards monitor in{' '}
                                            <span className="font-semibold text-foreground">
                                                Classroom → Class Awards Live
                                            </span>
                                            .
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div
                                id="settings-general-kiosk"
                                className="scroll-mt-[4.5rem] bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/50"
                            >
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 pb-3 flex items-center gap-2">
                                    <Smartphone className="w-3.5 h-3.5" /> Kiosk
                                </p>

                                <div className="space-y-4 mt-1">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex flex-col min-w-0 pr-4">
                                            <span className="text-sm font-bold">Portrait display layout</span>
                                            <p className="text-[11px] text-muted-foreground">
                                                Tall narrow layout for portrait-mounted kiosk screens. Per-device overrides live in Admin &rarr; Branding &rarr; Kiosk profiles.
                                            </p>
                                        </div>
                                        <Switch
                                            checked={
                                                local.kioskPortraitDisplay === true ||
                                                local.studentPortalPortraitDisplay === true
                                            }
                                            onCheckedChange={(checked) => {
                                                handleToggle('kioskPortraitDisplay', checked);
                                                if (local.studentPortalPortraitDisplay) {
                                                    handleToggle('studentPortalPortraitDisplay', false);
                                                }
                                            }}
                                            disabled={!canManageSchoolSettings}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between gap-3 border-t border-slate-200/60 dark:border-slate-700/50 pt-4">
                                        <div className="flex flex-col min-w-0 pr-4">
                                            <span className="text-sm font-bold">Hide header</span>
                                            <p className="text-[11px] text-muted-foreground">
                                                Tuck the header while you scroll on any portal page; it returns at the top or when you scroll up. Student kiosks reveal it when you move the pointer to the top edge.
                                            </p>
                                        </div>
                                        <Switch
                                            checked={local.hideSiteHeaderOutsidePortal === true}
                                            onCheckedChange={(checked) =>
                                                handleToggle('hideSiteHeaderOutsidePortal', checked)
                                            }
                                            disabled={!canManageSchoolSettings}
                                            aria-label="Hide header on portal pages"
                                        />
                                    </div>

                                    <div className="flex items-center justify-between gap-3 border-t border-slate-200/60 dark:border-slate-700/50 pt-4">
                                        <div className="flex flex-col min-w-0 pr-4">
                                            <span className="text-sm font-bold">Wide layout</span>
                                            <p className="text-[11px] text-muted-foreground">
                                                Use full-width layout on teacher and admin portals instead of centered content.
                                            </p>
                                        </div>
                                        <Switch
                                            checked={staffPortalWideLayout}
                                            onCheckedChange={() => toggleStaffPortalLayout()}
                                            aria-label="Wide staff portal layout"
                                        />
                                    </div>

                                    <div className="flex items-center justify-between gap-3 border-t border-slate-200/60 dark:border-slate-700/50 pt-4">
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-sm font-bold">Duplicate tap freeze</span>
                                            <p className="text-[11px] text-muted-foreground">
                                                Block repeat kiosk sign-ins for this many seconds (0 = off).
                                            </p>
                                        </div>
                                        <Input
                                            type="number"
                                            className="w-20 h-9 rounded-xl text-center font-bold bg-background/50 border-border/50 shrink-0"
                                            value={local.studentSignInFreezeSec ?? 0}
                                            onChange={(e) => {
                                                const n = parseInt(e.target.value, 10);
                                                const secs = Number.isFinite(n) ? Math.min(3600, Math.max(0, n)) : 0;
                                                handleToggle('studentSignInFreezeSec', secs);
                                            }}
                                            min={0}
                                            max={3600}
                                            disabled={!canManageSchoolSettings}
                                            aria-label="Duplicate tap freeze seconds"
                                        />
                                    </div>

                                    <div className="space-y-2 border-t border-slate-200/60 dark:border-slate-700/50 pt-4">
                                        <p className="text-sm font-bold">Student kiosk sign-in tabs</p>
                                        <p className="text-[11px] text-muted-foreground">
                                            Choose which login methods appear on the student kiosk sign-in screen.
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-xs font-bold">Card</span>
                                                <Switch
                                                    checked={local.kioskLoginTabCardEnabled !== false}
                                                    onCheckedChange={(checked) => {
                                                        handleToggle('kioskLoginTabCardEnabled', checked);
                                                        // Safety: never allow all login tabs to be disabled.
                                                        const nextCard = checked;
                                                        const nextType = local.kioskLoginTabTypeEnabled !== false;
                                                        const nextScan = local.kioskLoginTabScanEnabled !== false;
                                                        const nextFace = local.kioskLoginTabFaceEnabled === true;
                                                        if (!nextCard && !nextType && !nextScan && !nextFace) {
                                                            handleToggle('kioskLoginTabCardEnabled', true);
                                                        }
                                                    }}
                                                    disabled={!canManageSchoolSettings}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-xs font-bold">Type</span>
                                                <Switch
                                                    checked={local.kioskLoginTabTypeEnabled !== false}
                                                    onCheckedChange={(checked) => {
                                                        handleToggle('kioskLoginTabTypeEnabled', checked);
                                                        const nextCard = local.kioskLoginTabCardEnabled !== false;
                                                        const nextType = checked;
                                                        const nextScan = local.kioskLoginTabScanEnabled !== false;
                                                        const nextFace = local.kioskLoginTabFaceEnabled === true;
                                                        if (!nextCard && !nextType && !nextScan && !nextFace) {
                                                            handleToggle('kioskLoginTabCardEnabled', true);
                                                        }
                                                    }}
                                                    disabled={!canManageSchoolSettings}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-xs font-bold">Scan (webcam)</span>
                                                <Switch
                                                    checked={local.kioskLoginTabScanEnabled !== false}
                                                    onCheckedChange={(checked) => {
                                                        handleToggle('kioskLoginTabScanEnabled', checked);
                                                        // Keep legacy flag aligned for any older reads.
                                                        handleToggle('enableQrLogin', checked);
                                                        const nextCard = local.kioskLoginTabCardEnabled !== false;
                                                        const nextType = local.kioskLoginTabTypeEnabled !== false;
                                                        const nextScan = checked;
                                                        const nextFace = local.kioskLoginTabFaceEnabled === true;
                                                        if (!nextCard && !nextType && !nextScan && !nextFace) {
                                                            handleToggle('kioskLoginTabCardEnabled', true);
                                                        }
                                                    }}
                                                    disabled={!canManageSchoolSettings}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-xs font-bold">Face</span>
                                                <Switch
                                                    checked={local.kioskLoginTabFaceEnabled === true}
                                                    onCheckedChange={(checked) => {
                                                        handleToggle('kioskLoginTabFaceEnabled', checked);
                                                        handleToggle('enableFaceLogin', checked);
                                                        const nextCard = local.kioskLoginTabCardEnabled !== false;
                                                        const nextType = local.kioskLoginTabTypeEnabled !== false;
                                                        const nextScan = local.kioskLoginTabScanEnabled !== false;
                                                        const nextFace = checked;
                                                        if (!nextCard && !nextType && !nextScan && !nextFace) {
                                                            handleToggle('kioskLoginTabCardEnabled', true);
                                                        }
                                                    }}
                                                    disabled={!canManageSchoolSettings}
                                                />
                                            </div>
                                        </div>
                                        {!canManageSchoolSettings ? (
                                            <p className="text-[11px] text-muted-foreground">Admin only.</p>
                                        ) : null}
                                        {canManageSchoolSettings && local.kioskLoginTabFaceEnabled === true ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setView('faceEnrollments');
                                                    if (local.soundEnabled) playSound('click');
                                                }}
                                                className={cn(
                                                    'mt-2 flex w-full items-center justify-between gap-3 rounded-xl border border-sky-200/80 bg-sky-50/70 px-3 py-2.5 text-left transition-colors',
                                                    'hover:bg-sky-100/80 dark:border-sky-900/50 dark:bg-sky-950/25 dark:hover:bg-sky-950/40',
                                                )}
                                            >
                                                <span className="flex min-w-0 items-center gap-2">
                                                    <ScanFace className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden />
                                                    <span className="min-w-0">
                                                        <span className="block text-xs font-bold text-foreground">
                                                            Manage face enrollments
                                                        </span>
                                                        <span className="block text-[11px] text-muted-foreground">
                                                            View trained faces, remove stale enrollments, fix unclear match
                                                        </span>
                                                    </span>
                                                </span>
                                                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                                            </button>
                                        ) : null}
                                    </div>

                                    <div className="flex items-center justify-between border-t border-slate-200/60 dark:border-slate-700/50 pt-4">
                                        <div className="flex flex-col pr-4">
                                            <span className="text-sm font-bold">Camera coupon scan</span>
                                            <p className="text-[11px] text-muted-foreground">
                                                On when students use the login <span className="font-semibold">Scan</span> tab (saved for this browser session).
                                                Turn on separately for camera coupons while login stays on Card/wedge.
                                            </p>
                                        </div>
                                        <Switch
                                            checked={
                                                local.kioskCouponRedemptionCameraEnabled === true
                                            }
                                            onCheckedChange={(checked) => {
                                                handleToggle('kioskCouponRedemptionCameraEnabled', checked);
                                                handleToggle('kioskCouponRedemptionManualEnabled', !checked);
                                                handleToggle('kioskCouponRedemptionInput', checked ? 'camera' : 'manual');
                                            }}
                                            disabled={!canManageSchoolSettings}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between border-t border-slate-200/60 dark:border-slate-700/50 pt-4">
                                        <div className="flex flex-col pr-4">
                                            <span className="text-sm font-bold">Demo camera (wedge mode)</span>
                                            <p className="text-[11px] text-muted-foreground">
                                                Off by default. While USB wedge scanning stays on, allow the front camera to read barcodes for demos (Show camera on the kiosk page). Does not change coupon or login scan tabs.
                                            </p>
                                        </div>
                                        <Switch
                                            checked={local.kioskWedgeDemoCameraEnabled === true}
                                            onCheckedChange={(checked) =>
                                                handleToggle('kioskWedgeDemoCameraEnabled', checked)
                                            }
                                            disabled={!canManageSchoolSettings}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between border-t border-slate-200/60 dark:border-slate-700/50 pt-4">
                                        <div className="flex flex-col pr-4">
                                            <span className="text-sm font-bold">Login prize previews</span>
                                            <p className="text-[11px] text-muted-foreground">
                                                Show faint reward items that pop in and out around the sign-in scan screen to tease the prize shop.
                                            </p>
                                        </div>
                                        <Switch
                                            checked={local.enableKioskLoginPrizeTeasers === true}
                                            onCheckedChange={(checked) =>
                                                handleToggle('enableKioskLoginPrizeTeasers', checked)
                                            }
                                            disabled={!canManageSchoolSettings}
                                            aria-label="Login prize previews on kiosk sign-in"
                                        />
                                    </div>

                                    <div className="flex items-center justify-between border-t border-slate-200/60 dark:border-slate-700/50 pt-4">
                                        <div className="flex flex-col pr-4">
                                            <span className="text-sm font-bold">Coupon redeem compliments</span>
                                            <p className="text-[11px] text-muted-foreground">
                                                After a student scans a coupon, show an AI praise line tied to the coupon category, plus the toss-in-trash reminder.
                                            </p>
                                        </div>
                                        <Switch
                                            checked={local.enableCouponRedeemCompliments !== false}
                                            onCheckedChange={(checked) => handleToggle('enableCouponRedeemCompliments', checked)}
                                            disabled={!canManageSchoolSettings}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold">Welcome splash duration</span>
                                            <p className="text-[11px] text-muted-foreground">Auto-dismiss time (seconds)</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                id="studentWelcomeBackDurationSec"
                                                type="number"
                                                className="w-20 h-9 rounded-xl text-center font-bold bg-background/50 border-border/50"
                                                value={local.studentWelcomeBackDurationSec ?? 2}
                                                onChange={(e) => {
                                                    const n = parseInt(e.target.value, 10);
                                                    handleToggle('studentWelcomeBackDurationSec', Number.isFinite(n) ? Math.min(60, Math.max(1, n)) : 2);
                                                }}
                                                min={1}
                                                max={60}
                                                disabled={!local.enableStudentWelcomeBackScreen}
                                            />
                                        </div>
                                    </div>
                                    {!local.enableStudentWelcomeBackScreen ? (
                                        <p className="text-[11px] text-muted-foreground">
                                            Turn on <span className="font-semibold">Welcome back splash</span> under Feature toggles to use this.
                                        </p>
                                    ) : null}
                                </div>
                            </div>

                            <div
                                id="settings-general-printing"
                                className="scroll-mt-[4.5rem] bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/50 space-y-4"
                            >
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 pb-1 flex items-center gap-2">
                                    <Printer className="w-3.5 h-3.5" /> Printing
                                </p>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Palette className="w-4 h-4 text-muted-foreground" />
                                            <span className="text-sm font-bold">Color Printing</span>
                                        </div>
                                        <Switch
                                            checked={local.enableColorPrinting}
                                            onCheckedChange={(checked) => handleToggle('enableColorPrinting', checked)}
                                        />
                                    </div>

                                    <div className="space-y-1.5 border-t border-slate-200/60 dark:border-slate-700/50 pt-4">
                                        <Label htmlFor="prizeVoucherPaperFormat" className="text-xs font-bold flex items-center gap-2">
                                            <Printer className="w-3.5 h-3.5 text-muted-foreground" />
                                            Prize voucher paper size
                                        </Label>
                                        <Select
                                            value={local.prizeVoucherPaperFormat ?? 'label_50x70'}
                                            onValueChange={(v) =>
                                                handleToggle(
                                                    'prizeVoucherPaperFormat',
                                                    v === 'thermal_80mm' ? 'thermal_80mm' : 'label_50x70'
                                                )
                                            }
                                        >
                                            <SelectTrigger id="prizeVoucherPaperFormat" className="rounded-xl">
                                                <SelectValue placeholder="Paper format" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="label_50x70">Small label / M110-class (50 × 70 mm)</SelectItem>
                                                <SelectItem value="thermal_80mm">80 mm thermal receipt (POS / VCP-8370)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <p className="text-[11px] text-muted-foreground leading-snug">
                                            One school, one choice: use <span className="font-semibold">small label</span> for portable label printers (e.g. Phomemo M110/M110S) and <span className="font-semibold">80 mm thermal</span> for desk receipt printers (POS-80, VCP-8370, etc.). Change this before printing if you switch devices.
                                        </p>
                                    </div>

                                    <IdCardPrinterSettingsSection
                                        local={local}
                                        onPatch={(patch) =>
                                            setDraft((prev) => (prev ? { ...prev, ...patch } : prev))
                                        }
                                    />

                                    {canManageSchoolSettings && (
                                        <div className="space-y-4 border-t border-slate-200/60 dark:border-slate-700/50 pt-4">
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                Optional printer reminders for staff. Web apps cannot select a specific printer; these notes appear near the student ID print flow so the correct device is chosen in the print dialog.
                                            </p>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="printerReminderIdCards" className="text-xs font-bold">
                                                    Student ID / card stock printing
                                                </Label>
                                                <Textarea
                                                    id="printerReminderIdCards"
                                                    rows={2}
                                                    placeholder='e.g. "Use the Fargo DTC at the front desk — not the office copier."'
                                                    className="min-h-[72px] rounded-xl text-sm bg-background/80 border-border/60 resize-y"
                                                    value={local.printerReminderIdCards ?? ''}
                                                    onChange={(e) => handleToggle('printerReminderIdCards', e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="printerReminderPrizeVouchers" className="text-xs font-bold">
                                                    Prize vouchers &amp; coupon sheets
                                                </Label>
                                                <Textarea
                                                    id="printerReminderPrizeVouchers"
                                                    rows={2}
                                                    placeholder='e.g. "Send redeem slips to the thermal printer in the office."'
                                                    className="min-h-[72px] rounded-xl text-sm bg-background/80 border-border/60 resize-y"
                                                    value={local.printerReminderPrizeVouchers ?? ''}
                                                    onChange={(e) => handleToggle('printerReminderPrizeVouchers', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    )}

                                </div>
                            </div>

                            <div
                                id="settings-general-guidance"
                                className="scroll-mt-[4.5rem] bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/50 space-y-4"
                            >
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 pb-1 flex items-center gap-2">
                                    <HelpCircle className="w-3.5 h-3.5" /> Guidance
                                </p>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <HelpCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                                                <span className="text-sm font-bold">Helper Tips</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1 pl-6">
                                                Hover the ? beside section titles for a short explanation.
                                            </p>
                                        </div>
                                        <Switch
                                            checked={local.enableHelperMode}
                                            onCheckedChange={(checked) => handleToggle('enableHelperMode', checked)}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <HelpCircle className="w-4 h-4 text-muted-foreground" />
                                            <span className="text-sm font-bold">Show Welcome Tour</span>
                                        </div>
                                        <Switch
                                            checked={local.showIntroWizard}
                                            onCheckedChange={(checked) => handleToggle('showIntroWizard', checked)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {view === 'pillars' && (
                        <div className="space-y-6 pb-2 -mx-1 px-1">
                            <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/50 space-y-4">
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 pb-1 flex items-center gap-2">
                                    <ShieldCheck className="w-3.5 h-3.5" /> Product Pillars
                                </p>
                                <p className="text-xs text-muted-foreground leading-normal mb-3">
                                    Select which products are part of your active plan. School Office is optional and uses its own roster (not shared with rewards).
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {(() => {
                                        const enabledCount = [
                                            local.payRewards ?? true,
                                            local.payClassroom ?? true,
                                            local.payAttendance ?? true,
                                            local.payHomework ?? true,
                                            local.payLibrary ?? true,
                                        ].filter(Boolean).length;
                                        return (
                                            <>
                                                <div className="flex items-center justify-between p-3 bg-background/50 border border-border/40 rounded-xl hover:bg-muted/40 transition-colors">
                                                    <div>
                                                        <h4 className="font-bold text-sm text-foreground uppercase tracking-tight">levelup rewards</h4>
                                                        <p className="text-[10px] text-muted-foreground">Student kiosk, prize shop, and coupon redemption</p>
                                                    </div>
                                                    <Switch
                                                        checked={local.payRewards ?? true}
                                                        onCheckedChange={(val) => handleToggle('payRewards', val)}
                                                        disabled={enabledCount === 1 && (local.payRewards ?? true)}
                                                    />
                                                </div>
                                                <div className={cn("flex items-center justify-between p-3 bg-background/50 border border-border/40 rounded-xl hover:bg-muted/40 transition-colors", unavailablePillarHint('payClassroom') && 'opacity-60')}>
                                                    <div>
                                                        <h4 className="font-bold text-sm text-foreground uppercase tracking-tight">levelup classroom</h4>
                                                        <p className="text-[10px] text-muted-foreground">{unavailablePillarHint('payClassroom') ?? `${CLASSROOM_SEATING_SECTION_LABEL}, quick awards, and full-screen classroom view`}</p>
                                                    </div>
                                                    <Switch
                                                        checked={(local.payClassroom ?? true) && !unavailablePillarHint('payClassroom')}
                                                        onCheckedChange={(val) => handleToggle('payClassroom', val)}
                                                        disabled={!!unavailablePillarHint('payClassroom') || (enabledCount === 1 && (local.payClassroom ?? true))}
                                                    />
                                                </div>
                                                <div className={cn("flex items-center justify-between p-3 bg-background/50 border border-border/40 rounded-xl hover:bg-muted/40 transition-colors", unavailablePillarHint('payAttendance') && 'opacity-60')}>
                                                    <div>
                                                        <h4 className="font-bold text-sm text-foreground uppercase tracking-tight">levelup attendance</h4>
                                                        <p className="text-[10px] text-muted-foreground">{unavailablePillarHint('payAttendance') ?? 'Product included in paid subscription'}</p>
                                                    </div>
                                                    <Switch
                                                        checked={(local.payAttendance ?? true) && !unavailablePillarHint('payAttendance')}
                                                        onCheckedChange={(val) => handleToggle('payAttendance', val)}
                                                        disabled={!!unavailablePillarHint('payAttendance') || (enabledCount === 1 && (local.payAttendance ?? true))}
                                                    />
                                                </div>
                                                <div className={cn("flex items-center justify-between p-3 bg-background/50 border border-border/40 rounded-xl hover:bg-muted/40 transition-colors", unavailablePillarHint('payHomework') && 'opacity-60')}>
                                                    <div>
                                                        <h4 className="font-bold text-sm text-foreground uppercase tracking-tight">levelup home work</h4>
                                                        <p className="text-[10px] text-muted-foreground">{unavailablePillarHint('payHomework') ?? 'Product included in paid subscription'}</p>
                                                    </div>
                                                    <Switch
                                                        checked={(local.payHomework ?? true) && !unavailablePillarHint('payHomework')}
                                                        onCheckedChange={(val) => handleToggle('payHomework', val)}
                                                        disabled={!!unavailablePillarHint('payHomework') || (enabledCount === 1 && (local.payHomework ?? true))}
                                                    />
                                                </div>
                                                <div className={cn("flex items-center justify-between p-3 bg-background/50 border border-border/40 rounded-xl hover:bg-muted/40 transition-colors", unavailablePillarHint('payLibrary') && 'opacity-60')}>
                                                    <div>
                                                        <h4 className="font-bold text-sm text-foreground uppercase tracking-tight">levelup library</h4>
                                                        <p className="text-[10px] text-muted-foreground">{unavailablePillarHint('payLibrary') ?? 'Product included in paid subscription'}</p>
                                                    </div>
                                                    <Switch
                                                        checked={(local.payLibrary ?? true) && !unavailablePillarHint('payLibrary')}
                                                        onCheckedChange={(val) => handleToggle('payLibrary', val)}
                                                        disabled={!!unavailablePillarHint('payLibrary') || (enabledCount === 1 && (local.payLibrary ?? true))}
                                                    />
                                                </div>
                                                <div className={cn("sm:col-span-2 p-3 bg-background/50 border border-border/40 rounded-xl space-y-2", unavailablePillarHint('payOffice') && 'opacity-60')}>
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div>
                                                            <h4 className="font-bold text-sm text-foreground uppercase tracking-tight">
                                                                {PRODUCT_PILLAR_LABELS.payOffice}
                                                            </h4>
                                                            <p className="text-[10px] text-muted-foreground">
                                                                {unavailablePillarHint('payOffice') ?? 'Grades & billing - separate office roster (no rewards portal link)'}
                                                            </p>
                                                        </div>
                                                        <div className="flex shrink-0 flex-col items-end gap-2">
                                                            <Switch
                                                                checked={local.payOffice === true && !unavailablePillarHint('payOffice')}
                                                                onCheckedChange={(val) => handleToggle('payOffice', val)}
                                                                disabled={!!unavailablePillarHint('payOffice')}
                                                                aria-label={PRODUCT_PILLAR_LABELS.payOffice}
                                                            />
                                                            {local.payOffice === true && !unavailablePillarHint('payOffice') && schoolId ? (
                                                                <OfficePortalEntryLink
                                                                    schoolId={schoolId}
                                                                    className="text-[11px] font-bold text-teal-700 underline underline-offset-4 hover:text-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:text-teal-300 dark:hover:text-teal-100"
                                                                />
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    )}

                    {view === 'features' && (
                        <div className="space-y-6 pb-2 -mx-1 px-1">
                            <div className="rounded-2xl border border-border/40 bg-muted/20 p-3">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                                            Find toggles
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Search by name (e.g. "attendance", "notifications", "vending").
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <div className="w-full sm:w-[240px]">
                                            <Input
                                                value={featureQuery}
                                                onChange={(e) => setFeatureQuery(e.target.value)}
                                                placeholder="Search features…"
                                                className="h-9 rounded-xl bg-background/60 border-border/50"
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className={cn(
                                                "h-9 rounded-xl text-[10px] font-black uppercase tracking-widest",
                                                featuresEnabledOnly && "border-primary/40 text-primary bg-primary/5"
                                            )}
                                            onClick={() => {
                                                setFeaturesEnabledOnly((v) => !v);
                                                if (local.soundEnabled) playSound('click');
                                            }}
                                        >
                                            Enabled only
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className={cn(
                                                "h-9 rounded-xl text-[10px] font-black uppercase tracking-widest",
                                                showComingSoonFeatures && "border-primary/40 text-primary bg-primary/5"
                                            )}
                                            onClick={() => {
                                                setShowComingSoonFeatures((v) => !v);
                                                if (local.soundEnabled) playSound('click');
                                            }}
                                        >
                                            Coming soon
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mb-3 border-b border-border/40 pb-3 mt-1">
                                <h3 className="text-sm font-bold text-muted-foreground">Feature toggles</h3>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Button variant="outline" size="sm" className="h-8 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300" onClick={() => {
                                        if (local.soundEnabled) playSound('click');
                                        setDraft(prev => {
                                            if (!prev) return prev;
                                            const next = { ...prev };
                                            IMPLEMENTED_FEATURE_TOGGLE_KEYS.forEach((k) => {
                                                (next as Record<string, unknown>)[k] = true;
                                            });
                                            return next;
                                        });
                                    }}>
                                        Select All
                                    </Button>
                                    <Button variant="outline" size="sm" className="h-8 rounded-xl text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={() => {
                                        if (local.soundEnabled) playSound('click');
                                        setDraft(prev => {
                                            if (!prev) return prev;
                                            const next = { ...prev };
                                            IMPLEMENTED_FEATURE_TOGGLE_KEYS.forEach((k) => {
                                                (next as Record<string, unknown>)[k] = false;
                                            });
                                            return next;
                                        });
                                    }}>
                                        Deselect All
                                    </Button>
                                </div>
                            </div>

                            <SettingsSectionJumpNav
                                sections={FEATURE_SECTION_NAV}
                                ariaLabel="Advanced setting categories"
                                onJump={jumpToSettingsSection}
                            />

                            <FeatureFilterContext.Provider value={{ query: featureQuery, enabledOnly: featuresEnabledOnly, showComingSoon: showComingSoonFeatures }}>
                            <div className="space-y-4">


                             <div id="settings-features-core" className="scroll-mt-[5rem] bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-2 border border-slate-100 dark:border-slate-800/50">
                                 <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 px-3 pt-3 pb-2 flex items-center gap-2"><Settings className="w-3.5 h-3.5" /> Core Workflow</p>
                                <SettingsFeatureRow
                                    id="enableTeacherBudgets"
                                    label="Teacher Budgets"
                                    desc="Give each teacher a monthly points allowance so they can't overspend when printing coupons or awarding points."
                                    icon={<Users className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={true}
                                    canEditAdminSettings={canManageSchoolSettings}
                                />
                                <SettingsFeatureRow
                                    id="enableBulkPoints"
                                    label="Bulk Class Points (Soon)"
                                    desc="Award points to an entire class at once instead of one student at a time."
                                    icon={<Layers className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={false}
                                    canEditAdminSettings={canManageSchoolSettings}
                                />
                                <SettingsFeatureRow
                                    id="enableTeacherCharts"
                                    label="Teacher Analytics (Soon)"
                                    desc="Let teachers see simple charts for just their own classes and students."
                                    icon={<BarChart3 className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={false}
                                    canEditAdminSettings={canManageSchoolSettings}
                                />
                            </div>

                            <div id="settings-features-recognition" className="scroll-mt-[5rem] bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-2 border border-slate-100 dark:border-slate-800/50">
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 px-3 pt-3 pb-2 flex items-center gap-2"><Trophy className="w-3.5 h-3.5" /> Recognition</p>
                                <SettingsFeatureRow
                                    id="enableLevels"
                                    label="Levels (Soon)"
                                    desc="Turn total points into fun 'levels' (Level 1, Level 2, etc.) for extra motivation."
                                    icon={<Zap className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={false}
                                    canEditAdminSettings={canManageSchoolSettings}
                                />
                                <SettingsFeatureRow
                                    id="enableStreaks"
                                    label="Daily Streaks (Soon)"
                                    desc="Reward students for showing up or logging in on consecutive days."
                                    icon={<History className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={false}
                                    canEditAdminSettings={canManageSchoolSettings}
                                />
                                <SettingsFeatureRow
                                    id="enableClassAccumulations"
                                    label="Class Accumulations"
                                    desc="Class standings (combined balances by class) live on Hall of Fame. This toggle is for future advanced options; it does not show class standings on the student kiosk."
                                    icon={<UsersRound className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={true}
                                    canEditAdminSettings={canManageSchoolSettings}
                                />
                            </div>

                            <div id="settings-features-shop" className="scroll-mt-[5rem] bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-2 border border-slate-100 dark:border-slate-800/50">
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 px-3 pt-3 pb-2 flex items-center gap-2"><ShoppingBag className="w-3.5 h-3.5" /> Rewards Shop</p>
                                <SettingsFeatureRow
                                    id="enablePrizeAiSurprise"
                                    label="AI reward surprises"
                                    desc="Adds a single built-in Fun reward in the shop; students pick joke, riddle, fortune teller, name poem, or random when redeeming. Requires API keys on the server."
                                    icon={<Sparkles className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={true}
                                    canEditAdminSettings={canManageSchoolSettings}
                                />
                                {local.enablePrizeAiSurprise ? (
                                    <div className="px-3 pb-4 pt-0 border-t border-slate-100 dark:border-slate-800/50 mt-1">
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <div>
                                                <Label htmlFor="prizeAiSurpriseDefaultPoints" className="text-xs font-bold text-foreground">
                                                    Default point cost for Fun
                                                </Label>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    Point cost for the built-in AI Fun reward.
                                                </p>
                                                <Input
                                                    id="prizeAiSurpriseDefaultPoints"
                                                    type="number"
                                                    min={0}
                                                    className="mt-3 max-w-[8rem] rounded-xl"
                                                    value={local.prizeAiSurpriseDefaultPoints ?? 1}
                                                    onChange={(e) => {
                                                        const n = parseInt(e.target.value, 10);
                                                        handleToggle('prizeAiSurpriseDefaultPoints', Number.isFinite(n) ? Math.max(0, n) : 1);
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="kioskAiFunIdleOffSec" className="text-xs font-bold text-foreground">
                                                    AI Fun timeout
                                                </Label>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    Hide AI Fun after this many idle seconds.
                                                </p>
                                                <div className="mt-3 flex items-center gap-2">
                                                    <Input
                                                        id="kioskAiFunIdleOffSec"
                                                        type="number"
                                                        min={1}
                                                        max={14400}
                                                        className="max-w-[8rem] rounded-xl"
                                                        value={local.kioskAiFunIdleOffSec ?? 360}
                                                        onChange={(e) => {
                                                            const n = parseInt(e.target.value, 10);
                                                            handleToggle('kioskAiFunIdleOffSec', Number.isFinite(n) ? Math.min(14400, Math.max(1, n)) : 360);
                                                        }}
                                                    />
                                                    <span className="text-[10px] font-bold uppercase text-muted-foreground">sec</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}
                                <SettingsFeatureRow
                                    id="enableVendingMachine"
                                    label="Vending Machine"
                                    desc="Connect a USB serial vending rig and let configured reward items trigger a motor after redemption."
                                    icon={<Cog className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    onConfigure={() => setVendingSettingsOpen(true)}
                                    isImplemented={true}
                                    canEditAdminSettings={canManageSchoolSettings}
                                />
                                <SettingsFeatureRow
                                    id="enableStudentEmojiOnPrizeTickets"
                                    label="Student emoji on reward vouchers"
                                    desc="When printing a redeem voucher, show the student theme emoji (or school default theme emoji) next to their name."
                                    icon={<Smile className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={true}
                                    canEditAdminSettings={canManageSchoolSettings}
                                />

                            </div>

                            <div id="settings-features-students" className="scroll-mt-[5rem] bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-2 border border-slate-100 dark:border-slate-800/50">
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 px-3 pt-3 pb-2 flex items-center gap-2"><Smartphone className="w-3.5 h-3.5" /> Student Experience</p>
                                <SettingsFeatureRow
                                    id="enableStudentWelcomeBackScreen"
                                    label="Welcome back splash"
                                    desc="Shows a short full-screen greeting when a student opens the kiosk. Default 2 seconds (adjustable in General). Can be turned off per student in Admin &rarr; Students."
                                    icon={<Monitor className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={true}
                                    canEditAdminSettings={canManageSchoolSettings}
                                />
                                <SettingsFeatureRow
                                    id="enableThemeAnimations"
                                    label="Theme Animations"
                                    desc="Animate emojis + themed accents (kiosk & shop)"
                                    icon={<Zap className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={true}
                                    canEditAdminSettings={canManageSchoolSettings}
                                />
                                <SettingsFeatureRow
                                    id="enableStudentWelcome"
                                    label="Student welcome styles"
                                    desc="Full-screen animated welcome styles on the kiosk. Coming soon — per-student controls will return when this ships."
                                    icon={<Sparkles className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={false}
                                    canEditAdminSettings={canManageSchoolSettings}
                                />
                                {canManageSchoolSettings && local.enableStudentWelcome ? (
                                    <div className="px-3 pb-4 pt-1">
                                        <Label className="text-xs font-bold text-foreground">
                                            Default welcome style (school)
                                        </Label>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Used when a student has no specific default. Students can still pick their own style on each kiosk.
                                        </p>
                                        <div className="mt-3 max-w-sm">
                                            <Select
                                                value={local.defaultWelcomeGreetingStyleId || '__none__'}
                                                onValueChange={(v) =>
                                                    setDraft((prev) =>
                                                        prev
                                                            ? {
                                                                  ...prev,
                                                                  defaultWelcomeGreetingStyleId: v === '__none__' ? '' : v,
                                                              }
                                                            : prev,
                                                    )
                                                }
                                            >
                                                <SelectTrigger className="rounded-xl">
                                                    <SelectValue placeholder="Choose a default" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="__none__">Confetti (built-in default)</SelectItem>
                                                    {WELCOME_GREETING_STYLES.map((s) => (
                                                        <SelectItem key={s.id} value={s.id}>
                                                            {s.emoji} {s.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                ) : null}
                                {/* Student kiosk login/coupon controls: Settings -> General -> Kiosk. */}

                                  <SettingsFeatureRow
                                    id="enablePrizeImages"
                                    label="Reward Photos"
                                    desc="Show real photos of reward items in the shop, not only icons."
                                    icon={<ShoppingBag className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={false}
                                    canEditAdminSettings={canManageSchoolSettings}
                                />
                                <SettingsFeatureRow
                                    id="enableWishlist"
                                    label="Student Wishlists"
                                    desc="Let students star favorite reward items and track progress toward them."
                                    icon={<Star className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={false}
                                    canEditAdminSettings={canManageSchoolSettings}
                                />
                            </div>

                            </div>
                            </FeatureFilterContext.Provider>
                        </div>
                )}

                {view === 'faceEnrollments' && canManageSchoolSettings ? (
                    <SettingsFaceEnrollmentsPanel />
                ) : null}

                {view === 'device' && (
                    <div className="space-y-6 pb-2 -mx-1 px-1">
                        <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/50 space-y-4">
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-500 dark:text-amber-400 pb-1 flex items-center gap-2">
                                <Smartphone className="w-3.5 h-3.5" /> Kiosk Device Setup
                            </p>
                            <p className="text-xs text-muted-foreground leading-normal">
                                Link this physical device to a specific kiosk layout configuration profile. This determines what tabs, colors, and graphics options are applied to this screen.
                            </p>
                            
                            {(() => {
                                const profiles = Object.values(local.kioskProfiles || {});
                                if (profiles.length === 0) {
                                    return (
                                        <div className="rounded-xl border border-amber-200/50 bg-amber-50/50 dark:bg-amber-950/20 p-4 text-center">
                                            <Smartphone className="w-8 h-8 text-amber-500 mx-auto mb-2 opacity-60" />
                                            <p className="text-sm font-bold text-amber-800 dark:text-amber-300">No Kiosk Profiles Found</p>
                                            <p className="text-xs text-amber-600/90 dark:text-amber-400/90 mt-1 max-w-sm mx-auto leading-relaxed">
                                                Go to the <strong>Admin Portal &rarr; Branding &rarr; Kiosk Device Profiles</strong> tab to create profile configurations first, then link them here.
                                            </p>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="deviceKioskProfile" className="text-xs font-bold">
                                                Select Layout Profile
                                            </Label>
                                            <Select
                                                value={selectedProfileId || '__none__'}
                                                onValueChange={(val) => {
                                                    setSelectedProfileId(val === '__none__' ? '' : val);
                                                    if (local.soundEnabled) playSound('click');
                                                }}
                                            >
                                                <SelectTrigger id="deviceKioskProfile" className="rounded-xl">
                                                    <SelectValue placeholder="Select a profile..." />
                                                </SelectTrigger>
                                                <SelectContent className="z-[310]">
                                                    <SelectItem value="__none__">Default (School General Settings)</SelectItem>
                                                    {profiles.map((p) => (
                                                        <SelectItem key={p.id} value={p.id}>
                                                            {p.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <Button
                                            type="button"
                                            className="w-full rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold"
                                            onClick={() => {
                                                if (selectedProfileId) {
                                                    localStorage.setItem('current_kiosk_profile_id', selectedProfileId);
                                                } else {
                                                    localStorage.removeItem('current_kiosk_profile_id');
                                                }
                                                if (local.soundEnabled) playSound('click');
                                                toast({
                                                    title: 'Profile linked successfully',
                                                    description: 'The physical device is now linked. Reloading to apply settings...',
                                                });
                                                setTimeout(() => {
                                                    window.location.reload();
                                                }, 1500);
                                            }}
                                        >
                                            Link Device &amp; Reload
                                        </Button>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                )}

                </div>

                <DialogFooter className="relative z-20 pointer-events-auto border-t border-border/40 bg-card/30 px-6 py-4 shrink-0 sm:justify-end gap-2">
                    <DialogClose asChild>
                        <Button type="button" variant="outline" className="rounded-xl min-w-[88px]">
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button
                        type="button"
                        className="rounded-xl min-w-[88px]"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleOk();
                        }}
                    >
                        OK
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={vendingSettingsOpen} onOpenChange={setVendingSettingsOpen}>
            <DialogContent size="lg" overlayClassName="z-[290]" className="z-[300]">
                <DialogHeader>
                    <DialogTitle>Vending Machine Settings</DialogTitle>
                </DialogHeader>
                <VendingMotorPanel />
            </DialogContent>
        </Dialog>
        </>
    );
}
