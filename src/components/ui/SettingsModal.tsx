'use client';

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useAppContext } from '@/components/AppProvider';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { collection } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
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
    Bell, Shield, Moon, Sun, ArrowLeft, Palette, Zap, Trophy,
    BarChart3, MessageSquare, ShoppingBag, ShieldCheck, Star,
    Users, Database, Printer, LayoutDashboard, History, HelpCircle,
    Cpu, Award, Clock, Cog, Lock, Sparkles, Trash2, RotateCcw, Smile, BookOpen, Target, Megaphone, Tv,
    Layers, UsersRound, Ticket, Loader2
} from 'lucide-react';
import { useSettings, colorSchemes, type ColorScheme, type Settings as AppSettings } from '../providers/SettingsProvider';
import type { BackupInfo, StudentTheme } from '@/lib/types';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useToast } from '@/hooks/use-toast';
import { AttendanceTimeZoneField } from '@/components/attendance/AttendanceTimeZoneField';
import { VendingMotorPanel } from '@/components/VendingMotorPanel';
import { ANIMATED_BACKGROUND_STYLES, type AnimatedBackgroundStyle } from '@/lib/animatedBackdrop';
import { globalAnimatedBackdropActive } from '@/lib/animatedBackdrop';
import { cn } from '@/lib/utils';
import { WELCOME_GREETING_STYLES } from '@/components/WelcomeGreeting';
import { AdminBackupsTab } from '@/app/[schoolId]/admin/sections/AdminBackupsTab';
import { IdCardPrinterSettingsSection } from '@/components/settings/IdCardPrinterSettingsSection';

type SettingsView = 'hub' | 'interface' | 'security' | 'features' | 'pillars' | 'developer';
type RoleView = 'global' | 'student' | 'teacher';
type PreviewMode = 'live' | 'draft';

type FeatureFilter = { query: string; enabledOnly: boolean };
const FeatureFilterContext = createContext<FeatureFilter>({ query: '', enabledOnly: false });

const FEATURE_SECTION_NAV = [
    { id: 'settings-features-core', label: 'Core' },
    { id: 'settings-features-attendance', label: 'Attendance' },
    { id: 'settings-features-recognition', label: 'Recognition' },
    { id: 'settings-features-shop', label: 'Shop' },
    { id: 'settings-features-students', label: 'Students' },
    { id: 'settings-features-occasions', label: 'Occasions' },
    { id: 'settings-features-sponsor', label: 'Sponsor' },
] as const;

const INTERFACE_SECTION_NAV = [
    { id: 'settings-interface-appearance', label: 'Colors' },
    { id: 'settings-interface-motion', label: 'Motion' },
    { id: 'settings-interface-layout', label: 'Layout' },
] as const;

/** Settings keys that correspond to Admin main-row add-on tabs (see admin/page.tsx addOnTabDefs). */
const ADD_ON_TAB_FOR_SETTINGS_KEY: Record<string, string> = {
    payRewards: 'coupons',
    enableAdminAnalytics: 'insights',
    enableClassLeaderboard: 'halloffame',
    payLibrary: 'library',
    enableAchievements: 'bonuspoints',
    enableBadges: 'category-badges',
    enableGoals: 'goals',
    enableNotifications: 'notifications',
    bulletinEnabled: 'bulletinboard',
};

/** Keep pinned add-on tabs in sync when feature switches change in Settings (otherwise the tab stays off the bar until pinned manually). */
function applyAdminAddOnTabPinSync(next: AppSettings, key: string, value: unknown): AppSettings {
    if (key === 'enableAttendance' || key === 'enableClassSignIn' || key === 'payAttendance') {
        const tab = 'attendance';
        const hidden = next.adminHiddenAddOnTabs || [];
        const pinned = next.adminPinnedAddOnTabs || [];
        const on = (next.payAttendance ?? true) && (!!next.enableAttendance || !!next.enableClassSignIn);
        if (on) {
            return {
                ...next,
                adminHiddenAddOnTabs: hidden.filter((x) => x !== tab),
                adminPinnedAddOnTabs: Array.from(new Set([...pinned, tab])),
            };
        }
        return {
            ...next,
            adminPinnedAddOnTabs: pinned.filter((x) => x !== tab),
        };
    }

    const tab = ADD_ON_TAB_FOR_SETTINGS_KEY[key];
    if (!tab || typeof value !== 'boolean') return next;

    const hidden = next.adminHiddenAddOnTabs || [];
    const pinned = next.adminPinnedAddOnTabs || [];
    if (value) {
        return {
            ...next,
            adminHiddenAddOnTabs: hidden.filter((x) => x !== tab),
            adminPinnedAddOnTabs: Array.from(new Set([...pinned, tab])),
        };
    }
    return {
        ...next,
        adminPinnedAddOnTabs: pinned.filter((x) => x !== tab),
    };
}

function SettingsSectionJumpNav({
    sections,
    onJump,
    ariaLabel,
}: {
    sections: readonly { readonly id: string; readonly label: string }[];
    onJump: (id: string) => void;
    ariaLabel: string;
}) {
    return (
        <div
            role="navigation"
            aria-label={ariaLabel}
            className={cn(
                'sticky top-0 z-10 -mx-1 mb-3 flex gap-2 overflow-x-auto pb-3 pt-0.5 shrink-0',
                'border-b border-border/40 bg-background/95 backdrop-blur-md [scrollbar-width:thin]',
                '[&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border',
            )}
        >
            {sections.map(({ id, label }) => (
                <button
                    key={id}
                    type="button"
                    onClick={() => onJump(id)}
                    className="shrink-0 whitespace-nowrap rounded-full border border-border/60 bg-muted/35 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground transition-colors hover:border-primary/45 hover:bg-primary/10 hover:text-foreground"
                >
                    {label}
                </button>
            ))}
        </div>
    );
}

function cloneSettings(s: AppSettings): AppSettings {
    return JSON.parse(JSON.stringify(s)) as AppSettings;
}

function FeatureRow({ id, label, desc, icon, settings, onToggle, onConfigure, isImplemented = true, isAdmin = true, isAllowed = true, planLabel, blockHint }: {
    id: string; label: string; desc: string; icon: React.ReactNode;
    settings: any; onToggle: (key: string, val: any) => void; onConfigure?: () => void; isImplemented?: boolean; isAdmin?: boolean; isAllowed?: boolean; planLabel?: string;
    /** When set (e.g. product pillar off), the toggle is forced off and disabled even if the plan allows the feature. */
    blockHint?: string;
}) {
    const filter = useContext(FeatureFilterContext);
    const isEnabled = settings[id] || false;
    const blockedByConfig = Boolean(blockHint);
    const canUse = isImplemented && isAllowed && !blockedByConfig;
    if (filter.enabledOnly && !isEnabled) return null;
    if (filter.query.trim()) {
        const q = filter.query.trim().toLowerCase();
        const hay = `${id} ${label} ${desc}`.toLowerCase();
        if (!hay.includes(q)) return null;
    }
    return (
        <div 
            className={`flex items-start justify-between py-4 px-3 border-b border-border/40 last:border-0 hover:bg-muted/30 rounded-xl transition-colors ${canUse && isAdmin ? 'cursor-pointer' : ''}`}
            onClick={() => {
                if (canUse && isAdmin) {
                    onToggle(id, !isEnabled);
                }
            }}
        >
            <div className={`flex items-start gap-4 ${!canUse && 'opacity-60'} mr-6 min-w-0`}>
                <div className={`p-2.5 rounded-xl transition-colors shrink-0 mt-0.5 ${(isEnabled && canUse) ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {icon}
                </div>
                <div className="flex flex-col min-w-0">
                    <span className="font-bold text-sm block text-foreground mb-1">{label}</span>
                    <p className="text-xs text-muted-foreground leading-relaxed w-full pr-4">{desc}</p>
                </div>
            </div>
            {isImplemented ? (
                <div className="flex flex-col flex-shrink-0 items-end justify-start min-h-[44px]">
                    <div className="flex items-center gap-2">
                        {onConfigure ? (
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 rounded-xl"
                                onClick={(e) => { e.stopPropagation(); onConfigure(); }}
                                disabled={!isAdmin || !isAllowed}
                                title={`${label} settings`}
                                aria-label={`${label} settings`}
                            >
                                <Cog className="h-4 w-4" />
                            </Button>
                        ) : null}
                        <div onClick={(e) => e.stopPropagation()}>
                            <Switch
                                id={id}
                                checked={isEnabled && canUse}
                                onCheckedChange={(checked) => onToggle(id, checked)}
                                disabled={!isAdmin || !isAllowed || blockedByConfig}
                            />
                        </div>
                    </div>
                    {!isAdmin && <span className="text-[10px] text-muted-foreground mt-2 font-black uppercase tracking-widest whitespace-nowrap">Admin Only</span>}
                    {isAdmin && !isAllowed && (
                        <span className="text-[10px] text-amber-700 dark:text-amber-400 mt-2 font-black uppercase tracking-widest whitespace-nowrap flex items-center gap-1" title={`Current plan: ${planLabel ?? 'Free'}`}>
                            <Lock className="h-3 w-3" /> Upgrade
                        </span>
                    )}
                    {isAdmin && isAllowed && blockedByConfig && blockHint && (
                        <span className="text-[10px] text-muted-foreground mt-2 font-semibold tracking-wide max-w-[220px] text-right leading-snug" title={blockHint}>
                            {blockHint}
                        </span>
                    )}
                </div>
            ) : (
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted px-3 py-1.5 rounded-md mt-1 whitespace-nowrap">
                    Soon
                </div>
            )}
        </div>
    );
}

export function SettingsModal() {
    const {
        loginState,
        login,
        isAdmin,
        schoolId,
        getAttendanceConfig,
        setAttendanceConfig,
        devCreateBackup,
        devRestoreFromBackup,
        devDownloadBackup,
    } = useAppContext();
    const canOpenSettings = loginState === 'admin' || loginState === 'developer' || loginState === 'teacher';
    const { settings, updateSettings, isFeatureAllowed, planLabel } = useSettings();
    const playSound = useArcadeSound();
    const { toast } = useToast();
    const firestore = useFirestore();
    const [open, setOpen] = useState(false);
    const [adminDialogOpen, setAdminDialogOpen] = useState(false);
    const [adminPasscode, setAdminPasscode] = useState('');
    const [adminSubmitting, setAdminSubmitting] = useState(false);
    const [draft, setDraft] = useState<AppSettings | null>(null);
    const [view, setView] = useState<SettingsView>('hub');
    const [vendingSettingsOpen, setVendingSettingsOpen] = useState(false);
    const [interfaceRole, setInterfaceRole] = useState<RoleView>('global');
    const [previewMode, setPreviewMode] = useState<PreviewMode>(isAdmin ? 'draft' : 'live');
    const [featureQuery, setFeatureQuery] = useState('');
    const [featuresEnabledOnly, setFeaturesEnabledOnly] = useState(false);
    const local = draft ?? settings;
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const originalSettingsRef = useRef<AppSettings | null>(null);
    const committedRef = useRef(false);
    const isShortLinkKioskRoute = typeof pathname === 'string' && pathname.startsWith('/s/');
    const autoOpenedFromQueryRef = useRef(false);

    /** Must run whenever the modal opens (trigger, ?settings=, or window event) so draft/original refs stay in sync. */
    const beginSettingsSession = useCallback(
        (initialView?: SettingsView) => {
            committedRef.current = false;
            originalSettingsRef.current = cloneSettings(settings);
            setDraft(cloneSettings(settings));
            setView(initialView ?? 'hub');
            setPreviewMode(isAdmin ? 'draft' : 'live');
        },
        [settings, isAdmin],
    );

    useLayoutEffect(() => {
        if (open) setInterfaceRole('global');
    }, [open]);

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

    const canLivePreviewInterfaceRole = useMemo(() => {
        if (interfaceRole === 'global') return true;
        if (interfaceRole === 'student') return loginState === 'student';
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
            if (key === 'payAttendance' && value === false) {
                next = { ...next, enableClassSignIn: false, enableAttendance: false };
            }
            next = applyAdminAddOnTabPinSync(next, key, value);
            return next;
        });

        // Session timeouts affect global idle timers immediately (draft-only would leave stale values until OK).
        if (
            key === 'adminSessionTimeoutMs' ||
            key === 'kioskSessionTimeoutSec' ||
            key === 'kioskAiFunAndVoucherIdleOffMin'
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
        security: 'Basic settings',
        features: 'Extra features',
        pillars: 'Product Pillars',
        developer: 'Developer tools',
    };

    const backupsQuery = useMemoFirebase(
        () => (firestore && schoolId && loginState === 'developer' ? collection(firestore, 'schools', schoolId, 'backups') : null),
        [firestore, schoolId, loginState],
    );
    const { data: backups } = useCollection<BackupInfo>(backupsQuery);

    const handleCreateBackup = async () => {
        if (!schoolId) return;
        await devCreateBackup(schoolId);
        playSound('success');
        toast({ title: 'Backup created', description: 'A new snapshot has been saved.' });
    };

    const handleRestoreFromBackup = async (backupId: string) => {
        if (!schoolId) return;
        await devRestoreFromBackup(schoolId, backupId);
        playSound('success');
        toast({ title: 'Restore complete', description: 'School data has been restored from the snapshot.' });
    };

    const handleDownloadBackup = async (backupId: string) => {
        if (!schoolId) return;
        await devDownloadBackup(schoolId, backupId);
    };

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
            // Do not force view to hub here — avoids flashing the hub screen while the modal is
            // closing from Interface / features / etc. Next open always resets via beginSettingsSession.
        }
        setOpen(next);
    };

    // Allow deep-linking into the settings modal via query param.
    // Example: `?settings=features` opens the modal on "Extra features".
    useEffect(() => {
        if (!canOpenSettings) return;
        if (!searchParams) return;
        const requested = searchParams.get('settings');
        if (!requested) return;
        if (autoOpenedFromQueryRef.current) return;

        const requestedView = ((): SettingsView | null => {
            if (requested === 'hub') return 'hub';
            if (requested === 'features') return 'features';
            if (requested === 'interface') return 'interface';
            if (requested === 'security') return 'security';
            if (requested === 'pillars') return 'pillars';
            if (requested === 'developer') return 'developer';
            return null;
        })();
        if (!requestedView) return;

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
    }, [canOpenSettings, pathname, router, searchParams, beginSettingsSession]);

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
                    <DialogTitle className="font-headline font-black tracking-tight">Admin passcode</DialogTitle>
                    <DialogDescription>Enter the admin passcode for this school to open Admin tools.</DialogDescription>
                </DialogHeader>
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
                        setAdminDialogOpen(true);
                    }}
                >
                    <Settings className="w-5 h-5 text-muted-foreground group-hover:rotate-45 transition-transform duration-300" />
                </Button>
            )}
      <DialogContent
                size="lg"
                overlayClassName="z-[110]"
                className="z-[110] p-0 overflow-hidden border border-border bg-background flex flex-col shadow-2xl"
                data-settings-open="true"
            >
                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-border/40 bg-card/30 backdrop-blur-md">
                    <DialogHeader>
                        <div className="flex items-center gap-2">
                            {view !== 'hub' && (
                                <Button variant="ghost" size="icon" onClick={() => setView('hub')} className="h-8 w-8 -ml-2 rounded-full hover:bg-muted" aria-label="Back to settings menu">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            )}
                            <DialogTitle className="text-xl font-black tracking-tight text-foreground">
                                {viewTitle[view]}
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
                                <span className="text-xs leading-snug text-sky-800/90 dark:text-sky-200/80">Accent colors, dark mode, motion, sound, and Web vs App layout</span>
                            </button>
                            {isAdmin && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setView('security');
                                        if (local.soundEnabled) playSound('click');
                                    }}
                                    className={cn(
                                        'flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-all',
                                        'border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/80 dark:bg-indigo-950/20',
                                        'hover:bg-indigo-100/80 dark:hover:bg-indigo-950/35',
                                    )}
                                >
                                    <div className="flex w-full items-start justify-between gap-2">
                                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-inner">
                                            <Shield className="h-5 w-5" />
                                        </span>
                                        <ChevronRight className="h-5 w-5 shrink-0 text-indigo-700/50 dark:text-indigo-400/50" aria-hidden />
                                    </div>
                                    <span className="font-black text-indigo-900 dark:text-indigo-100">Basic settings</span>
                                    <span className="text-xs leading-snug text-indigo-800/90 dark:text-indigo-200/80">Session timeouts, printing, and guidance</span>
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => {
                                    setView('features');
                                    if (local.soundEnabled) playSound('click');
                                }}
                                className={cn(
                                    'flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-all',
                                    'border-amber-200 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/20',
                                    'hover:bg-amber-100/80 dark:hover:bg-amber-950/35',
                                )}
                            >
                                <div className="flex w-full items-start justify-between gap-2">
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-inner">
                                        <Zap className="h-5 w-5" />
                                    </span>
                                    <ChevronRight className="h-5 w-5 shrink-0 text-amber-700/50 dark:text-amber-400/50" aria-hidden />
                                </div>
                            <span className="font-black text-amber-900 dark:text-amber-100">Extra features</span>
                                <span className="text-xs leading-snug text-amber-800/90 dark:text-amber-200/80">Attendance, shop, recognition, library checkout, and more</span>
                            </button>
                            {loginState === 'developer' && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setView('developer');
                                        if (local.soundEnabled) playSound('click');
                                    }}
                                    className={cn(
                                        'flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-all',
                                        'border-fuchsia-200 dark:border-fuchsia-900/50 bg-fuchsia-50/80 dark:bg-fuchsia-950/20',
                                        'hover:bg-fuchsia-100/80 dark:hover:bg-fuchsia-950/35',
                                    )}
                                >
                                    <div className="flex w-full items-start justify-between gap-2">
                                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-fuchsia-600 text-white shadow-inner">
                                            <Database className="h-5 w-5" />
                                        </span>
                                        <ChevronRight className="h-5 w-5 shrink-0 text-fuchsia-700/50 dark:text-fuchsia-400/50" aria-hidden />
                                    </div>
                                    <span className="font-black text-fuchsia-900 dark:text-fuchsia-100">Developer tools</span>
                                    <span className="text-xs leading-snug text-fuchsia-800/90 dark:text-fuchsia-200/80">Create, download, and restore snapshots for this school</span>
                                </button>
                            )}
                            {isAdmin && (
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
                        </div>
                    )}

                    {view === 'developer' && loginState === 'developer' && (
                        <div className="space-y-4">
                            <AdminBackupsTab
                                backups={backups}
                                onCreateBackup={handleCreateBackup}
                                onDownloadBackup={handleDownloadBackup}
                                onRestoreFromBackup={handleRestoreFromBackup}
                            />
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
                                {isAdmin && (
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

                                {isAdmin ? (
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

                            {isAdmin ? null : null}

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
                                        <div className="grid grid-cols-3 gap-2 mt-1">
                                            {(Object.keys(colorSchemes) as ColorScheme[]).map((key) => {
                                                const roleKey = interfaceRole === 'student' ? 'studentColorScheme' : interfaceRole === 'teacher' ? 'teacherColorScheme' : 'colorScheme';
                                                const isSelected = local[roleKey] === key;
                                                const swatchColors = colorSchemes[key].swatchColors;
                                                const customSwatch = local.customAppearanceColors?.[key];
                                                const effectiveSwatchColors = [
                                                    customSwatch?.primary || swatchColors[0],
                                                    customSwatch?.secondary || swatchColors[1],
                                                ];
                                                return (
                                                    <button
                                                        key={key}
                                                        onClick={() => handleToggle(roleKey, key)}
                                                        className={cn(
                                                            "flex items-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all border",
                                                            isSelected 
                                                                ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary' 
                                                                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-muted'
                                                        )}
                                                    >
                                                        <span className="flex w-5 h-4 overflow-hidden rounded-full border border-black/10 shrink-0 shadow-sm">
                                                            {effectiveSwatchColors.map((color) => (
                                                                <span key={color} className="flex-1" style={{ backgroundColor: /^#[0-9A-Fa-f]{6}$/.test(color) ? color : '#94a3b8' }} />
                                                            ))}
                                                        </span>
                                                        {colorSchemes[key].label}
                                                    </button>
                                                );
                                            })}
                                        </div>

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
                                </div>

                                 {/* Display Mode */}
                                 <div className="flex items-center justify-between bg-muted/40 p-1.5 rounded-2xl border border-border/50">
                                     <button
                                         onClick={() => {
                                             const roleKey = interfaceRole === 'student' ? 'studentDisplayMode' : interfaceRole === 'teacher' ? 'teacherDisplayMode' : 'displayMode';
                                             handleToggle(roleKey, 'web');
                                         }}
                                         className={cn(
                                             "flex-1 py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                             (interfaceRole === 'student' ? (local.studentDisplayMode || local.displayMode) : interfaceRole === 'teacher' ? (local.teacherDisplayMode || local.displayMode) : local.displayMode) === 'web' 
                                                 ? 'bg-background text-foreground shadow-sm border border-border/50' 
                                                 : 'text-muted-foreground hover:text-foreground'
                                         )}
                                     >
                                         Web
                                     </button>
                                     <button
                                         onClick={() => {
                                             const roleKey = interfaceRole === 'student' ? 'studentDisplayMode' : interfaceRole === 'teacher' ? 'teacherDisplayMode' : 'displayMode';
                                             handleToggle(roleKey, 'app');
                                         }}
                                         className={cn(
                                             "flex-1 py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                             (interfaceRole === 'student' ? (local.studentDisplayMode || local.displayMode) : interfaceRole === 'teacher' ? (local.teacherDisplayMode || local.displayMode) : local.displayMode) === 'app' 
                                                 ? 'bg-background text-foreground shadow-sm border border-border/50' 
                                                 : 'text-muted-foreground hover:text-foreground'
                                         )}
                                     >
                                         App
                                     </button>
                                 </div>
                            </div>
                                </div>
                            </div>
                        </>
                    )}

                    {view === 'security' && (
                        <div className="space-y-4">
                            <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/50">
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 pb-3 flex items-center gap-2">
                                    <Shield className="w-3.5 h-3.5" /> Basic settings
                                </p>

                                <div className="space-y-4 mt-1">
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold">Admin Auto-Logout</span>
                                            <p className="text-[11px] text-muted-foreground">Session duration (minutes)</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                className="w-20 h-9 rounded-xl text-center font-bold bg-background/50 border-border/50"
                                                value={Math.round((local.adminSessionTimeoutMs || 0) / 60000)}
                                                onChange={(e) => handleToggle('adminSessionTimeoutMs', Math.max(1, parseInt(e.target.value) || 1) * 60000)}
                                                min={1}
                                                max={1440}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold">Kiosk Auto-Logout</span>
                                            <p className="text-[11px] text-muted-foreground">Idle time (seconds)</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                className="w-20 h-9 rounded-xl text-center font-bold bg-background/50 border-border/50"
                                                value={local.kioskSessionTimeoutSec ?? 10}
                                                onChange={(e) => handleToggle('kioskSessionTimeoutSec', Math.max(1, parseInt(e.target.value) || 10))}
                                                min={1}
                                                max={300}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col max-w-[min(100%,18rem)]">
                                            <span className="text-sm font-bold">AI Fun + print vouchers</span>
                                            <p className="text-[11px] text-muted-foreground">
                                                Turn off after this many idle minutes (no taps or keys) on the student kiosk or rewards shop. Next touch turns them back on.
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Input
                                                type="number"
                                                className="w-20 h-9 rounded-xl text-center font-bold bg-background/50 border-border/50"
                                                value={local.kioskAiFunAndVoucherIdleOffMin ?? 6}
                                                onChange={(e) =>
                                                    handleToggle(
                                                        'kioskAiFunAndVoucherIdleOffMin',
                                                        Math.max(1, Math.min(240, parseInt(e.target.value, 10) || 6)),
                                                    )
                                                }
                                                min={1}
                                                max={240}
                                            />
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">min</span>
                                        </div>
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
                                                    disabled={!isAdmin}
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
                                                    disabled={!isAdmin}
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
                                                    disabled={!isAdmin}
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
                                                    disabled={!isAdmin}
                                                />
                                            </div>
                                        </div>
                                        {!isAdmin ? (
                                            <p className="text-[11px] text-muted-foreground">Admin only.</p>
                                        ) : null}
                                    </div>

                                    <div className="space-y-2 border-t border-slate-200/60 dark:border-slate-700/50 pt-4">
                                        <p className="text-sm font-bold">Coupon redemption methods</p>
                                        <p className="text-[11px] text-muted-foreground">
                                            Choose how students can enter coupon codes after sign-in.
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-xs font-bold">Manual / USB</span>
                                                <Switch
                                                    checked={local.kioskCouponRedemptionManualEnabled !== false}
                                                    onCheckedChange={(checked) => {
                                                        handleToggle('kioskCouponRedemptionManualEnabled', checked);
                                                        const nextManual = checked;
                                                        const nextCamera = local.kioskCouponRedemptionCameraEnabled !== false;
                                                        const mode = !nextManual && !nextCamera ? 'off' : nextManual && nextCamera ? 'both' : nextManual ? 'manual' : 'camera';
                                                        handleToggle('kioskCouponRedemptionInput', mode);
                                                    }}
                                                    disabled={!isAdmin}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-xs font-bold">Webcam scan</span>
                                                <Switch
                                                    checked={local.kioskCouponRedemptionCameraEnabled !== false}
                                                    onCheckedChange={(checked) => {
                                                        handleToggle('kioskCouponRedemptionCameraEnabled', checked);
                                                        const nextManual = local.kioskCouponRedemptionManualEnabled !== false;
                                                        const nextCamera = checked;
                                                        const mode = !nextManual && !nextCamera ? 'off' : nextManual && nextCamera ? 'both' : nextManual ? 'manual' : 'camera';
                                                        handleToggle('kioskCouponRedemptionInput', mode);
                                                    }}
                                                    disabled={!isAdmin}
                                                />
                                            </div>
                                        </div>
                                        {!isAdmin ? (
                                            <p className="text-[11px] text-muted-foreground">Admin only.</p>
                                        ) : null}
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
                                            Turn on <span className="font-semibold">Welcome back splash</span> in Extra features to use this.
                                        </p>
                                    ) : null}
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/50 space-y-4">
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 pb-1 flex items-center gap-2">
                                    <Monitor className="w-3.5 h-3.5" /> Printing &amp; Guidance
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

                                    {isAdmin && (
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

                                    <div className="flex items-center justify-between border-t border-slate-200/60 dark:border-slate-700/50 pt-4">
                                        <div className="flex items-center gap-2">
                                            <HelpCircle className="w-4 h-4 text-muted-foreground" />
                                            <span className="text-sm font-bold">Helper Tips</span>
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
                                <p className="text-xs text-muted-foreground leading-normal mb-3">Select which of the 4 core pillars are part of your active paid plan.</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {(() => {
                                        const enabledCount = [
                                            local.payRewards ?? true,
                                            local.payAttendance ?? true,
                                            local.payHomework ?? true,
                                            local.payLibrary ?? true,
                                        ].filter(Boolean).length;
                                        return (
                                            <>
                                                <div className="flex items-center justify-between p-3 bg-background/50 border border-border/40 rounded-xl hover:bg-muted/40 transition-colors">
                                                    <div>
                                                        <h4 className="font-bold text-sm text-foreground uppercase tracking-tight">levelup rewards</h4>
                                                        <p className="text-[10px] text-muted-foreground">Product included in paid subscription</p>
                                                    </div>
                                                    <Switch
                                                        checked={local.payRewards ?? true}
                                                        onCheckedChange={(val) => handleToggle('payRewards', val)}
                                                        disabled={enabledCount === 1 && (local.payRewards ?? true)}
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between p-3 bg-background/50 border border-border/40 rounded-xl hover:bg-muted/40 transition-colors">
                                                    <div>
                                                        <h4 className="font-bold text-sm text-foreground uppercase tracking-tight">levelup attendance</h4>
                                                        <p className="text-[10px] text-muted-foreground">Product included in paid subscription</p>
                                                    </div>
                                                    <Switch
                                                        checked={local.payAttendance ?? true}
                                                        onCheckedChange={(val) => handleToggle('payAttendance', val)}
                                                        disabled={enabledCount === 1 && (local.payAttendance ?? true)}
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between p-3 bg-background/50 border border-border/40 rounded-xl hover:bg-muted/40 transition-colors">
                                                    <div>
                                                        <h4 className="font-bold text-sm text-foreground uppercase tracking-tight">levelup home work</h4>
                                                        <p className="text-[10px] text-muted-foreground">Product included in paid subscription</p>
                                                    </div>
                                                    <Switch
                                                        checked={local.payHomework ?? true}
                                                        onCheckedChange={(val) => handleToggle('payHomework', val)}
                                                        disabled={enabledCount === 1 && (local.payHomework ?? true)}
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between p-3 bg-background/50 border border-border/40 rounded-xl hover:bg-muted/40 transition-colors">
                                                    <div>
                                                        <h4 className="font-bold text-sm text-foreground uppercase tracking-tight">levelup library</h4>
                                                        <p className="text-[10px] text-muted-foreground">Product included in paid subscription</p>
                                                    </div>
                                                    <Switch
                                                        checked={local.payLibrary ?? true}
                                                        onCheckedChange={(val) => handleToggle('payLibrary', val)}
                                                        disabled={enabledCount === 1 && (local.payLibrary ?? true)}
                                                    />
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
                                            Search by name (e.g. “attendance”, “notifications”, “vending”).
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
                                    </div>
                                </div>
                            </div>

                            {/* Current Plan Banner */}
                            {planLabel === 'Enterprise' && (
                                <div className="bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-inner">
                                            <Zap className="w-7 h-7" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">Current Plan</p>
                                            <h3 className="text-xl font-headline font-black text-amber-900 dark:text-amber-100 uppercase italic tracking-tighter">Enterprise</h3>
                                        </div>
                                    </div>
                                    <div className="text-[10px] font-black bg-amber-500 text-white px-3 py-1.5 rounded-full uppercase tracking-widest shadow-sm">
                                        Unlimited
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between mb-3 border-b border-border/40 pb-3 mt-1">
                                <h3 className="text-sm font-bold text-muted-foreground">Manage Extra Features</h3>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Button variant="outline" size="sm" className="h-8 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300" onClick={() => {
                                        if (local.soundEnabled) playSound('click');
                                        setDraft(prev => {
                                            if (!prev) return prev;
                                            const next = { ...prev };
                                            const keys = [
                                                'enableTeacherBudgets', 'enableHomework', 'enableBulkPoints', 'enableAdminAnalytics',
                                                'enableNotifications', 'enableTeacherCharts', 'enableClassSignIn', 'enableStudentPortal',
                                                'enableStudentWelcomeBackScreen', 'enableStudentWelcome', 'enableFaceLogin', 'enableQrLogin',
                                                'enablePrizeImages', 'enableWishlist', 'kioskSponsorEnabled',
                                                'enableAchievements', 'enableBadges', 'enableLevels', 'enableStreaks', 'enableGoals',
                                                'enableClassAccumulations', 'enableBirthdayPoints', 'enableSpecialDayPoints',
                                                'enablePrizeAiSurprise', 'enableVendingMachine', 'enableStudentEmojiOnPrizeTickets',
                                                'enableThemeAnimations',
                                            ];
                                            keys.forEach(k => {
                                                if (isFeatureAllowed(k)) {
                                                    (next as any)[k] = true;
                                                }
                                            });
                                            next.enableAttendance = !!next.enableClassSignIn;
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
                                            const keys = [
                                                'enableTeacherBudgets', 'enableHomework', 'enableBulkPoints', 'enableAdminAnalytics',
                                                'enableNotifications', 'enableTeacherCharts', 'enableClassSignIn', 'enableStudentPortal',
                                                'enableStudentWelcomeBackScreen', 'enableStudentWelcome', 'enableFaceLogin', 'enableQrLogin',
                                                'enablePrizeImages', 'enableWishlist', 'kioskSponsorEnabled',
                                                'enableAchievements', 'enableBadges', 'enableLevels', 'enableStreaks', 'enableGoals',
                                                'enableClassAccumulations', 'enableBirthdayPoints', 'enableSpecialDayPoints',
                                                'enablePrizeAiSurprise', 'enableVendingMachine', 'enableStudentEmojiOnPrizeTickets',
                                                'enableThemeAnimations',
                                            ];
                                            keys.forEach(k => {
                                                (next as any)[k] = false;
                                            });
                                            next.enableAttendance = false;
                                            return next;
                                        });
                                    }}>
                                        Deselect All
                                    </Button>
                                </div>
                            </div>

                            <SettingsSectionJumpNav
                                sections={FEATURE_SECTION_NAV.filter(s => s.id !== 'settings-features-attendance' || (local.payAttendance ?? true))}
                                ariaLabel="Feature categories"
                                onJump={jumpToSettingsSection}
                            />

                            <FeatureFilterContext.Provider value={{ query: featureQuery, enabledOnly: featuresEnabledOnly }}>
                            <div className="space-y-4">


                             <div id="settings-features-core" className="scroll-mt-[5rem] bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-2 border border-slate-100 dark:border-slate-800/50">
                                 <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 px-3 pt-3 pb-2 flex items-center gap-2"><Settings className="w-3.5 h-3.5" /> Core Workflow</p>
                                <FeatureRow
                                    id="enableTeacherBudgets"
                                    label="Teacher Budgets"
                                    desc="Give each teacher a monthly points allowance so they can’t overspend when printing coupons or awarding points."
                                    icon={<Users className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={true}
                                    isAdmin={isAdmin}
                                    isAllowed={isFeatureAllowed('enableTeacherBudgets')}
                                    planLabel={planLabel}
                                />
                                <FeatureRow
                                    id="enableHomework"
                                    label="Homework Rewards"
                                    desc="Allow teacher-side homework rewards. Students do not see homework in the portal."
                                    icon={<BookOpen className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={true}
                                    isAdmin={isAdmin}
                                    isAllowed={isFeatureAllowed('enableHomework')}
                                    planLabel={planLabel}
                                    blockHint={!(local.payHomework ?? true) ? 'Turn on the Homework product pillar in Settings → Product Pillars first.' : undefined}
                                />
                                <FeatureRow
                                    id="enableTeacherGeneratedCouponsTab"
                                    label="Teacher Generated Coupons Tab"
                                    desc="Add an optional Teacher portal tab called “Coupons” that shows coupons generated by the signed-in teacher."
                                    icon={<Ticket className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={true}
                                    isAdmin={isAdmin}
                                    isAllowed={true}
                                    planLabel={planLabel}
                                />
                                <FeatureRow
                                    id="enableBulkPoints"
                                    label="Bulk Class Points (Soon)"
                                    desc="Award points to an entire class at once instead of one student at a time."
                                    icon={<Layers className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={false}
                                    isAdmin={isAdmin}
                                    isAllowed={isFeatureAllowed('enableBulkPoints')}
                                    planLabel={planLabel}
                                />
                                <FeatureRow
                                    id="enableAdminAnalytics"
                                    label="Admin Analytics"
                                    desc="Turn on the Admin → Stats view with school-wide totals, trends, and active student counts."
                                    icon={<ShieldCheck className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={true}
                                    isAdmin={isAdmin}
                                    isAllowed={isFeatureAllowed('enableAdminAnalytics')}
                                    planLabel={planLabel}
                                />
                                <FeatureRow
                                    id="enableWeeklyRaffle"
                                    label="Weekly Raffle Wheel"
                                    desc="Turn on the Teacher portal Raffle tab. Configure points per ticket, display, odds, and deduct-on-pull in Admin → Raffle."
                                    icon={<Ticket className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={true}
                                    isAdmin={isAdmin}
                                    isAllowed={isFeatureAllowed('enableWeeklyRaffle')}
                                    planLabel={planLabel}
                                />
                                <FeatureRow
                                    id="enableNotifications"
                                    label="Notifications"
                                    desc="Master switch for the notification system. When off, no alert mail/SMS/WhatsApp documents are created; use Admin → Notifications for per-event channels when this is on."
                                    icon={<Bell className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={true}
                                    isAdmin={isAdmin}
                                    isAllowed={isFeatureAllowed('enableNotifications')}
                                    planLabel={planLabel}
                                />
                                <FeatureRow
                                    id="enableTeacherCharts"
                                    label="Teacher Analytics (Soon)"
                                    desc="Let teachers see simple charts for just their own classes and students."
                                    icon={<BarChart3 className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={false}
                                    isAdmin={isAdmin}
                                    isAllowed={isFeatureAllowed('enableTeacherCharts')}
                                    planLabel={planLabel}
                                />
                            </div>

                            {(local.payAttendance ?? true) && (
                                <div id="settings-features-attendance" className="scroll-mt-[5rem] bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-2 border border-slate-100 dark:border-slate-800/50">
                                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 px-3 pt-3 pb-2 flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Attendance</p>
                                    <FeatureRow
                                        id="enableClassSignIn"
                                        label="Attendance"
                                        desc="Use student kiosk login as class attendance. Optional punctuality points and schedules can be configured in Admin → Attendance."
                                        icon={<Clock className="w-5 h-5" />}
                                        settings={local}
                                        onToggle={handleToggle}
                                        isImplemented={true}
                                        isAdmin={isAdmin}
                                        isAllowed={isFeatureAllowed('enableClassSignIn')}
                                        planLabel={planLabel}
                                    />
                                    {isFeatureAllowed('enableClassSignIn') && isAdmin ? (
                                        <div className="px-3 pb-4 pt-0">
                                            <AttendanceTimeZoneField
                                                schoolId={schoolId}
                                                getAttendanceConfig={getAttendanceConfig}
                                                setAttendanceConfig={setAttendanceConfig}
                                                enabled
                                                compact
                                            />
                                        </div>
                                    ) : null}
                                </div>
                            )}

                            <div id="settings-features-recognition" className="scroll-mt-[5rem] bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-2 border border-slate-100 dark:border-slate-800/50">
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 px-3 pt-3 pb-2 flex items-center gap-2"><Trophy className="w-3.5 h-3.5" /> Recognition</p>
                                <FeatureRow
                                    id="enableAchievements"
                                    label="Bonus Points"
                                    desc="Students earn extra points when they hit point milestones; show milestones and bonus points."
                                    icon={<Trophy className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={true}
                                    isAdmin={isAdmin}
                                    isAllowed={isFeatureAllowed('enableAchievements')}
                                    planLabel={planLabel}
                                />
                                <FeatureRow
                                    id="enableBadges"
                                    label="Badges"
                                    desc="Students earn badges for reaching a points threshold in a category within a time period (e.g. Good Behavior badge this month)."
                                    icon={<Award className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={true}
                                    isAdmin={isAdmin}
                                    isAllowed={isFeatureAllowed('enableBadges')}
                                    planLabel={planLabel}
                                />
                                <FeatureRow
                                    id="enableLevels"
                                    label="Levels (Soon)"
                                    desc="Turn total points into fun “levels” (Level 1, Level 2, etc.) for extra motivation."
                                    icon={<Zap className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={false}
                                    isAdmin={isAdmin}
                                    isAllowed={isFeatureAllowed('enableLevels')}
                                    planLabel={planLabel}
                                />
                                <FeatureRow
                                    id="enableStreaks"
                                    label="Daily Streaks (Soon)"
                                    desc="Reward students for showing up or logging in on consecutive days."
                                    icon={<History className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={false}
                                    isAdmin={isAdmin}
                                    isAllowed={isFeatureAllowed('enableStreaks')}
                                    planLabel={planLabel}
                                />
                                <FeatureRow
                                    id="enableGoals"
                                    label="Goals"
                                    desc="Set personal point goals for students to reach over time."
                                    icon={<Target className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={true}
                                    isAdmin={isAdmin}
                                    isAllowed={isFeatureAllowed('enableGoals')}
                                    planLabel={planLabel}
                                />
                                <FeatureRow
                                    id="enableClassAccumulations"
                                    label="Class Accumulations"
                                    desc="Class standings (combined balances by class) live on Hall of Fame. This toggle is for future extra features; it does not show class standings on the student kiosk."
                                    icon={<UsersRound className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={true}
                                    isAdmin={isAdmin}
                                    isAllowed={isFeatureAllowed('enableClassAccumulations')}
                                    planLabel={planLabel}
                                />
                            </div>

                            <div id="settings-features-shop" className="scroll-mt-[5rem] bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-2 border border-slate-100 dark:border-slate-800/50">
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 px-3 pt-3 pb-2 flex items-center gap-2"><ShoppingBag className="w-3.5 h-3.5" /> Rewards Shop</p>
                                <FeatureRow
                                    id="enablePrizeAiSurprise"
                                    label="AI reward surprises"
                                    desc="Adds a single built-in Fun reward in the shop; students pick joke, riddle, fortune teller, or random when redeeming. Requires API keys on the server."
                                    icon={<Sparkles className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={true}
                                    isAdmin={isAdmin}
                                    isAllowed={isFeatureAllowed('enablePrizeAiSurprise')}
                                    planLabel={planLabel}
                                />
                                {local.enablePrizeAiSurprise && isFeatureAllowed('enablePrizeAiSurprise') ? (
                                    <div className="px-3 pb-4 pt-0 border-t border-slate-100 dark:border-slate-800/50 mt-1">
                                        <Label htmlFor="prizeAiSurpriseDefaultPoints" className="text-xs font-bold text-foreground">
                                            Default point cost for Fun (AI surprise)
                                        </Label>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Controls the point cost for the built-in Fun reward shown to students.
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
                                ) : null}
                                <FeatureRow
                                    id="enableVendingMachine"
                                    label="Vending Machine"
                                    desc="Connect a USB serial vending rig and let configured reward items trigger a motor after redemption."
                                    icon={<Cog className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    onConfigure={() => setVendingSettingsOpen(true)}
                                    isImplemented={true}
                                    isAdmin={isAdmin}
                                    isAllowed={isFeatureAllowed('enableVendingMachine')}
                                    planLabel={planLabel}
                                />
                                <FeatureRow
                                    id="enableStudentEmojiOnPrizeTickets"
                                    label="Student emoji on reward vouchers"
                                    desc="When printing a redeem voucher, show the student theme emoji (or school default theme emoji) next to their name."
                                    icon={<Smile className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={true}
                                    isAdmin={isAdmin}
                                    isAllowed={isFeatureAllowed('enableStudentEmojiOnPrizeTickets')}
                                    planLabel={planLabel}
                                />

                            </div>

                            <div id="settings-features-students" className="scroll-mt-[5rem] bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-2 border border-slate-100 dark:border-slate-800/50">
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 px-3 pt-3 pb-2 flex items-center gap-2"><Smartphone className="w-3.5 h-3.5" /> Student Experience</p>
                                <FeatureRow
                                    id="enableStudentPortal"
                                    label="Student Home Portal (Soon)"
                                    desc="At-home access is planned. For now, students should use the in-school kiosk and rewards shop."
                                    icon={<Smartphone className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={false}
                                    isAdmin={isAdmin}
                                    isAllowed={isFeatureAllowed('enableStudentPortal')}
                                    planLabel={planLabel}
                                />
                                <FeatureRow
                                    id="enableStudentWelcomeBackScreen"
                                    label="Welcome back splash"
                                    desc="Shows a short full-screen greeting when a student opens the kiosk. Default 2 seconds (adjustable in Basic settings). Can be turned off per student in Admin → Students."
                                    icon={<Tv className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={true}
                                    isAdmin={isAdmin}
                                    isAllowed={isFeatureAllowed('enableStudentWelcomeBackScreen')}
                                    planLabel={planLabel}
                                />
                                <FeatureRow
                                    id="enableThemeAnimations"
                                    label="Theme Animations"
                                    desc="Animate emojis + themed accents (kiosk & shop)"
                                    icon={<Zap className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={true}
                                    isAdmin={isAdmin}
                                    isAllowed={true}
                                />
                                <FeatureRow
                                    id="enableStudentWelcome"
                                    label="Student welcome styles"
                                    desc="Full-screen animated welcome styles on the kiosk. Coming soon — per-student controls will return when this ships."
                                    icon={<Sparkles className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={false}
                                    isAdmin={isAdmin}
                                    isAllowed={isFeatureAllowed('enableStudentWelcome')}
                                    planLabel={planLabel}
                                />
                                {isAdmin && local.enableStudentWelcome && isFeatureAllowed('enableStudentWelcome') ? (
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
                                {/* Student kiosk login/coupon method controls moved to Security → Basic settings. */}

                                  <FeatureRow
                                    id="enablePrizeImages"
                                    label="Reward Photos"
                                    desc="Show real photos of reward items in the shop, not only icons."
                                    icon={<ShoppingBag className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={false}
                                    isAdmin={isAdmin}
                                    isAllowed={isFeatureAllowed('enablePrizeImages')}
                                    planLabel={planLabel}
                                />
                                <FeatureRow
                                    id="enableWishlist"
                                    label="Student Wishlists"
                                    desc="Let students star favorite reward items and track progress toward them."
                                    icon={<Star className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={false}
                                    isAdmin={isAdmin}
                                    isAllowed={isFeatureAllowed('enableWishlist')}
                                    planLabel={planLabel}
                                />
                            </div>

                            <div id="settings-features-occasions" className="scroll-mt-[5rem] bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-2 border border-slate-100 dark:border-slate-800/50">
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 px-3 pt-3 pb-2 flex items-center gap-2"><Sparkles className="w-3.5 h-3.5" /> Special Occasions</p>
                                <FeatureRow
                                    id="enableBirthdayPoints"
                                    label="Birthday Points"
                                    desc="Award bonus points to students on their birthday when they log in to the kiosk."
                                    icon={<Smile className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={true}
                                    isAdmin={isAdmin}
                                    isAllowed={true}
                                />
                                {local.enableBirthdayPoints && (
                                    <div className="px-3 pb-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="birthdayPointsAmount" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Points Amount</Label>
                                            <Input
                                                id="birthdayPointsAmount"
                                                type="number"
                                                className="w-24 h-9 rounded-xl text-center font-bold bg-background/50 border-border/50"
                                                value={local.birthdayPointsAmount}
                                                onChange={(e) => handleToggle('birthdayPointsAmount', parseInt(e.target.value) || 0)}
                                            />
                                        </div>
                                    </div>
                                )}
                                <FeatureRow
                                    id="enableSpecialDayPoints"
                                    label="School Special Day"
                                    desc="Award points to every student who logs in on a specific school-wide special day."
                                    icon={<Star className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={true}
                                    isAdmin={isAdmin}
                                    isAllowed={true}
                                />
                                {local.enableSpecialDayPoints && (
                                    <div className="px-3 pb-4 space-y-4 pt-1">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="specialDayLabel" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Event Label</Label>
                                                <Input
                                                    id="specialDayLabel"
                                                    placeholder="Founder's Day"
                                                    className="h-9 rounded-xl text-xs bg-background/50 border-border/50"
                                                    value={local.specialDayLabel}
                                                    onChange={(e) => handleToggle('specialDayLabel', e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="specialDayDate" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Date (MM-DD)</Label>
                                                <Input
                                                    id="specialDayDate"
                                                    placeholder="12-25"
                                                    className="h-9 rounded-xl text-xs text-center bg-background/50 border-border/50"
                                                    value={local.specialDayDate}
                                                    onChange={(e) => handleToggle('specialDayDate', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="specialDayPointsAmount" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Points Amount</Label>
                                            <Input
                                                id="specialDayPointsAmount"
                                                type="number"
                                                className="w-24 h-9 rounded-xl text-center font-bold bg-background/50 border-border/50"
                                                value={local.specialDayPointsAmount}
                                                onChange={(e) => handleToggle('specialDayPointsAmount', parseInt(e.target.value) || 0)}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>


                            </div>
                            </FeatureFilterContext.Provider>
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
            <DialogContent size="lg" overlayClassName="z-[120]" className="z-[120]">
                <DialogHeader>
                    <DialogTitle>Vending Machine Settings</DialogTitle>
                </DialogHeader>
                <VendingMotorPanel />
            </DialogContent>
        </Dialog>
        </>
    );
}
