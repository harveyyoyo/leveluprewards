
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAppContext } from '@/components/AppProvider';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { collection } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import {
    Dialog,
    DialogContent,
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
    Cpu, Award, Clock, Cog, Lock, Sparkles, ArrowRightLeft, Trash2, RotateCcw, Smile, BookOpen, Target, Megaphone, Tv,
    Layers, UsersRound
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
    { id: 'settings-features-printing', label: 'Printing' },
] as const;

const INTERFACE_SECTION_NAV = [
    { id: 'settings-interface-appearance', label: 'Colors' },
    { id: 'settings-interface-motion', label: 'Motion' },
    { id: 'settings-interface-layout', label: 'Layout' },
] as const;

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

function FeatureRow({ id, label, desc, icon, settings, onToggle, onConfigure, isImplemented = true, isAdmin = true, isAllowed = true, planLabel }: {
    id: string; label: string; desc: string; icon: React.ReactNode;
    settings: any; onToggle: (key: string, val: any) => void; onConfigure?: () => void; isImplemented?: boolean; isAdmin?: boolean; isAllowed?: boolean; planLabel?: string;
}) {
    const filter = useContext(FeatureFilterContext);
    const isEnabled = settings[id] || false;
    const canUse = isImplemented && isAllowed;
    if (filter.enabledOnly && !isEnabled) return null;
    if (filter.query.trim()) {
        const q = filter.query.trim().toLowerCase();
        const hay = `${id} ${label} ${desc}`.toLowerCase();
        if (!hay.includes(q)) return null;
    }
    return (
        <div className="flex items-start justify-between py-4 px-3 border-b border-border/40 last:border-0 hover:bg-muted/30 rounded-xl transition-colors">
            <div className={`flex items-start gap-4 ${!canUse && 'opacity-60'} mr-6`}>
                <div className={`p-2.5 rounded-xl transition-colors shrink-0 mt-0.5 ${(isEnabled && canUse) ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {icon}
                </div>
                <div className="flex flex-col">
                    <Label className="font-bold text-sm block text-foreground mb-1" htmlFor={canUse && isAdmin ? id : undefined}>{label}</Label>
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
                                onClick={onConfigure}
                                disabled={!isAdmin || !isAllowed}
                                title={`${label} settings`}
                                aria-label={`${label} settings`}
                            >
                                <Cog className="h-4 w-4" />
                            </Button>
                        ) : null}
                        <Switch
                            id={id}
                            checked={isEnabled && isAllowed}
                            onCheckedChange={(checked) => onToggle(id, checked)}
                            disabled={!isAdmin || !isAllowed}
                        />
                    </div>
                    {!isAdmin && <span className="text-[10px] text-muted-foreground mt-2 font-black uppercase tracking-widest whitespace-nowrap">Admin Only</span>}
                    {isAdmin && !isAllowed && (
                        <span className="text-[10px] text-amber-700 dark:text-amber-400 mt-2 font-black uppercase tracking-widest whitespace-nowrap flex items-center gap-1" title={`Current plan: ${planLabel ?? 'Free'}`}>
                            <Lock className="h-3 w-3" /> Upgrade
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
    const [draft, setDraft] = useState<AppSettings | null>(null);
    const [view, setView] = useState<SettingsView>('hub');
    const [vendingSettingsOpen, setVendingSettingsOpen] = useState(false);
    const [interfaceRole, setInterfaceRole] = useState<RoleView>(
        isAdmin ? 'global' : (loginState === 'teacher' ? 'teacher' : 'student')
    );
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

    // In-app opener (avoids route transitions / layout jank).
    useEffect(() => {
        if (!canOpenSettings) return;
        const handler = (e: Event) => {
            const detail = (e as CustomEvent<{ view?: SettingsView }>).detail;
            const requestedView = detail?.view ?? 'hub';
            setOpen(true);
            setView(requestedView);
        };
        window.addEventListener('open-settings-modal', handler as EventListener);
        return () => window.removeEventListener('open-settings-modal', handler as EventListener);
    }, [canOpenSettings]);

    const canLivePreviewInterfaceRole = useMemo(() => {
        if (interfaceRole === 'global') return true;
        if (interfaceRole === 'student') return loginState === 'student';
        if (interfaceRole === 'teacher') return loginState === 'teacher';
        return false;
    }, [interfaceRole, loginState]);

    const handleToggle = (key: string, value: any) => {
        const isLivePreviewKey =
            key === 'enableAnimatedBackground' ||
            key === 'calmMode' ||
            key === 'legacyMode' ||
            key === 'animatedBackgroundStyle' ||
            key === 'studentEnableAnimatedBackground' ||
            key === 'teacherEnableAnimatedBackground' ||
            key === 'studentAnimatedBackgroundStyle' ||
            key === 'teacherAnimatedBackgroundStyle';

        setDraft((prev) => {
            if (!prev) return prev;
            let next: AppSettings = { ...prev, [key]: value } as AppSettings;
            if (key === 'enableClassSignIn' && typeof value === 'boolean') {
                next = { ...next, enableAttendance: value };
            }
            if (key === 'enableAttendance' && typeof value === 'boolean') {
                next = { ...next, enableClassSignIn: value };
            }
            return next;
        });

        if (previewMode === 'live' && isLivePreviewKey && canLivePreviewInterfaceRole) {
            updateSettings({ [key]: value } as Partial<AppSettings>);
        }
        if (local.soundEnabled || key === 'soundEnabled') {
            playSound('click');
        }
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
        security: 'Security',
        features: 'Features & add-ons',
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
    const currentStyle = visibleStyles.find(s => s.id === local.animatedBackgroundStyle) || visibleStyles[0] || ANIMATED_BACKGROUND_STYLES[0];
    const currentStyleIndex = visibleStyles.findIndex(s => s.id === currentStyle.id);
    const backdropActive = globalAnimatedBackdropActive(local);
    const backdropBlockedReason =
        local.legacyMode ? 'Legacy mode is on' : local.calmMode ? 'Calm mode is on' : !local.enableAnimatedBackground ? 'Animated background is off' : null;

    const cycleBackground = () => {
        if (visibleStyles.length === 0) return;
        const nextIndex = (currentStyleIndex + 1) % visibleStyles.length;
        setDraft((d) => (d ? { ...d, animatedBackgroundStyle: visibleStyles[nextIndex].id } : d));
        if (local.soundEnabled) playSound('click');
    };

    const jumpToSettingsSection = (id: string) => {
        if (local.soundEnabled) playSound('click');
        requestAnimationFrame(() => {
            document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    };

    const handleOpenChange = (next: boolean) => {
        if (next) {
            committedRef.current = false;
            originalSettingsRef.current = cloneSettings(settings);
            setDraft(cloneSettings(settings));
            setView('hub');
            setPreviewMode(isAdmin ? 'draft' : 'live');
        } else {
            setDraft(null);
            setView('hub');
        }
        setOpen(next);
    };

    // Allow deep-linking into the settings modal via query param.
    // Example: `?settings=features` opens the modal on "Features & add-ons".
    useEffect(() => {
        if (!canOpenSettings) return;
        if (!searchParams) return;
        const requested = searchParams.get('settings');
        if (!requested) return;
        if (autoOpenedFromQueryRef.current) return;

        const requestedView = ((): SettingsView | null => {
            if (requested === 'features') return 'features';
            if (requested === 'interface') return 'interface';
            if (requested === 'security') return 'security';
            if (requested === 'pillars') return 'pillars';
            if (requested === 'developer') return 'developer';
            return null;
        })();
        if (!requestedView) return;

        autoOpenedFromQueryRef.current = true;
        setOpen(true);
        setView(requestedView);

        // Clean the URL so refresh/back doesn't reopen.
        requestAnimationFrame(() => {
            try {
                router.replace(pathname);
            } catch {
                // ignore
            }
        });
    }, [canOpenSettings, pathname, router, searchParams]);

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
        if (draft) {
            committedRef.current = true;
            updateSettings({ ...draft });
        }
        setDraft(null);
        setView('hub');
        setOpen(false);
    };

    // For short-link kiosk entry routes, keep the UI minimal (and avoid showing settings).
    if (isShortLinkKioskRoute) return null;

    return (
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
                        const sid = schoolId || (typeof window !== 'undefined' ? window.location.pathname.split('/')[1] : '');
                        router.push(`/${sid}/admin-signin?redirect=${encodeURIComponent(pathname)}`);
                    }}
                >
                    <Settings className="w-5 h-5 text-muted-foreground group-hover:rotate-45 transition-transform duration-300" />
                </Button>
            )}
      <DialogContent size="lg" className="p-0 overflow-hidden border border-border bg-background flex flex-col shadow-2xl" data-settings-open="true">
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
                                <span className="font-black text-amber-900 dark:text-amber-100">Features &amp; add-ons</span>
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
                                    <span className="font-black text-indigo-900 dark:text-indigo-100">Security</span>
                                    <span className="text-xs leading-snug text-indigo-800/90 dark:text-indigo-200/80">Admin and kiosk session timeouts</span>
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

                            {isAdmin && (
                                <div className="mb-4 rounded-2xl border border-border/40 bg-muted/30 p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                                            Preview mode
                                        </p>
                                        <p className="text-xs text-muted-foreground leading-snug mt-1">
                                            {previewMode === 'live'
                                                ? 'Changes apply immediately so you can verify motion/background instantly.'
                                                : 'Changes stay in this dialog until you press OK.'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 rounded-2xl border border-border/50 bg-background/60 p-1 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPreviewMode('draft');
                                                if (local.soundEnabled) playSound('click');
                                            }}
                                            className={cn(
                                                'px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                                                previewMode === 'draft'
                                                    ? 'bg-background text-foreground shadow-sm border border-border/50'
                                                    : 'text-muted-foreground hover:text-foreground',
                                            )}
                                        >
                                            Apply on OK
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPreviewMode('live');
                                                if (local.soundEnabled) playSound('click');
                                            }}
                                            className={cn(
                                                'px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                                                previewMode === 'live'
                                                    ? 'bg-background text-foreground shadow-sm border border-border/50'
                                                    : 'text-muted-foreground hover:text-foreground',
                                            )}
                                        >
                                            Live preview
                                        </button>
                                    </div>
                                </div>
                            )}

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
                                                        <span className={`w-4 h-4 rounded-full ${colorSchemes[key].swatch} shrink-0`} />
                                                        {colorSchemes[key].label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                            {/* MOTION & SOUND */}
                            <div
                                id="settings-interface-motion"
                                className="scroll-mt-[4.5rem] bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-4 mb-4 border border-slate-100 dark:border-slate-800/50"
                            >
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 pb-3 flex items-center gap-2">
                                    <Zap className="w-3.5 h-3.5" /> Motion & Sound
                                </p>

                                {/* Calm Mode */}
                                <div className="flex items-center justify-between mb-4 mt-1">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl bg-muted text-muted-foreground`}>
                                            <Moon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm text-foreground">Calm mode</h4>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">Quiets decorative motion and glows</p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={local.calmMode}
                                        onCheckedChange={(checked) => handleToggle('calmMode', checked)}
                                        className="scale-110"
                                    />
                                </div>

                                {/* Sound Effects */}
                                <div className="flex items-center justify-between mb-4">
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
                                        <div className={`p-2 rounded-xl transition-colors ${local.enableAnimatedBackground && !local.calmMode ? 'bg-primary/20 text-primary shadow-sm' : 'bg-muted text-muted-foreground'}`}>
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
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-xl bg-muted text-muted-foreground">
                                            <Palette className="w-5 h-5" />
                                        </div>
                                         <div>
                                            <h4 className="font-bold text-sm text-foreground">Background style</h4>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                                Current: {(() => {
                                                    const roleStyle = interfaceRole === 'student' ? local.studentAnimatedBackgroundStyle : interfaceRole === 'teacher' ? local.teacherAnimatedBackgroundStyle : local.animatedBackgroundStyle;
                                                    const s = ANIMATED_BACKGROUND_STYLES.find(x => x.id === (roleStyle || local.animatedBackgroundStyle));
                                                    return s?.label || currentStyle.label;
                                                })()}
                                                {!backdropActive && backdropBlockedReason ? (
                                                    <span className="ml-2 text-amber-700 dark:text-amber-400 font-bold">
                                                        (not visible: {backdropBlockedReason})
                                                    </span>
                                                ) : null}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        className={cn(
                                            "h-9 px-3 rounded-xl text-xs font-bold gap-2 transition-colors",
                                            backdropActive && "hover:bg-primary/10 hover:text-primary",
                                            !backdropActive && "opacity-50 cursor-not-allowed",
                                        )}
                                        onClick={() => {
                                            const roleKey = interfaceRole === 'student' ? 'studentAnimatedBackgroundStyle' : interfaceRole === 'teacher' ? 'teacherAnimatedBackgroundStyle' : 'animatedBackgroundStyle';
                                            const roleStyle = local[roleKey] || local.animatedBackgroundStyle;
                                            const idx = visibleStyles.findIndex(s => s.id === roleStyle);
                                            const nextIdx = (idx + 1) % visibleStyles.length;
                                            handleToggle(roleKey, visibleStyles[nextIdx].id);
                                        }}
                                        disabled={!backdropActive || visibleStyles.length <= 1}
                                        title={!backdropActive && backdropBlockedReason ? `Background style is disabled: ${backdropBlockedReason}` : undefined}
                                    >
                                        Cycle <ArrowRightLeft className="w-3 h-3" />
                                    </Button>
                                </div>



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
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Moon className="w-4 h-4 text-muted-foreground" />
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
                                    {/* Legacy Mode */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Cpu className="w-4 h-4 text-muted-foreground" />
                                            <span className="text-sm font-bold">Legacy Mode</span>
                                        </div>
                                        <Switch
                                            checked={local.legacyMode}
                                            onCheckedChange={(checked) => handleToggle('legacyMode', checked)}
                                            className="data-[state=checked]:bg-orange-600"
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
                        <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-4 mb-4 border border-slate-100 dark:border-slate-800/50">
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 pb-3 flex items-center gap-2">
                                <Shield className="w-3.5 h-3.5" /> Security
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
                                            value={local.kioskSessionTimeoutSec || 0}
                                            onChange={(e) => handleToggle('kioskSessionTimeoutSec', Math.max(5, parseInt(e.target.value) || 5))}
                                            min={5}
                                            max={300}
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
                                <h3 className="text-sm font-bold text-muted-foreground">Manage Features</h3>
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
                                                'enableColorPrinting', 'enableHelperMode', 'showIntroWizard'
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
                                                'enableColorPrinting', 'enableHelperMode', 'showIntroWizard'
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
                                    desc="Class standings (combined balances by class) live on Hall of Fame. This toggle is for future add-ons; it does not show class standings on the student kiosk."
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
                                    desc="Lets staff add dedicated AI surprise prizes (school-safe short text after redemption). Requires API keys on the server; staff choose point cost per prize and can remove a prize anytime."
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
                                            Default point cost for new AI surprise prizes
                                        </Label>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Shown when you click &quot;Add AI surprise prize&quot; in Admin → Prizes. You can still change the cost on each prize afterward.
                                        </p>
                                        <Input
                                            id="prizeAiSurpriseDefaultPoints"
                                            type="number"
                                            min={0}
                                            className="mt-3 max-w-[8rem] rounded-xl"
                                            value={local.prizeAiSurpriseDefaultPoints ?? 25}
                                            onChange={(e) => {
                                                const n = parseInt(e.target.value, 10);
                                                handleToggle('prizeAiSurpriseDefaultPoints', Number.isFinite(n) ? Math.max(0, n) : 25);
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
                                    desc="Shows a short full-screen greeting when a student opens the kiosk. Default 3 seconds; duration is adjustable below. Can be turned off per student in Admin → Students."
                                    icon={<Tv className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={true}
                                    isAdmin={isAdmin}
                                    isAllowed={isFeatureAllowed('enableStudentWelcomeBackScreen')}
                                    planLabel={planLabel}
                                />
                                {isAdmin && local.enableStudentWelcomeBackScreen && isFeatureAllowed('enableStudentWelcomeBackScreen') ? (
                                    <div className="px-3 pb-4 pt-0">
                                        <Label htmlFor="studentWelcomeBackDurationSec" className="text-xs font-bold text-foreground">
                                            Splash duration (seconds)
                                        </Label>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            How long the welcome back screen stays up before it dismisses itself (1–60). Students can still tap the skip button to leave sooner.
                                        </p>
                                        <Input
                                            id="studentWelcomeBackDurationSec"
                                            type="number"
                                            min={1}
                                            max={60}
                                            className="mt-3 max-w-[8rem] rounded-xl"
                                            value={local.studentWelcomeBackDurationSec ?? 3}
                                            onChange={(e) => {
                                                const n = parseInt(e.target.value, 10);
                                                handleToggle('studentWelcomeBackDurationSec', Number.isFinite(n) ? Math.min(60, Math.max(1, n)) : 3);
                                            }}
                                        />
                                    </div>
                                ) : null}
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
                                <FeatureRow
                                    id="enableFaceLogin"
                                    label="Face Login"
                                    desc="Allow students to sign in using the kiosk webcam. Requires camera permission and deployed Cloud Functions."
                                    icon={<Shield className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={true}
                                    isAdmin={isAdmin}
                                    isAllowed={isFeatureAllowed('enableFaceLogin')}
                                    planLabel={planLabel}
                                />
                                <FeatureRow
                                    id="enableQrLogin"
                                    label="QR Code Login"
                                    desc="Students scan a QR code instead of typing their ID to log into kiosks."
                                    icon={<LayoutDashboard className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={false}
                                    isAdmin={isAdmin}
                                    isAllowed={isFeatureAllowed('enableQrLogin')}
                                    planLabel={planLabel}
                                />

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


                            <div id="settings-features-printing" className="scroll-mt-[5rem] bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-2 border border-slate-100 dark:border-slate-800/50">
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 px-3 pt-3 pb-2 flex items-center gap-2"><Monitor className="w-3.5 h-3.5" /> Printing & Guidance</p>
                                <FeatureRow
                                    id="enableColorPrinting"
                                    label="Color Printing"
                                    desc="Use color for coupons and badges when printing, instead of plain black-and-white."
                                    icon={<Palette className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={true}
                                    isAdmin={isAdmin}
                                />
                                <FeatureRow
                                    id="enableHelperMode"
                                    label="Helper Tips"
                                    desc="Show little “?” helpers and tooltips around the app to explain what things do."
                                    icon={<HelpCircle className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={true}
                                    isAdmin={isAdmin}
                                />
                                 <FeatureRow
                                    id="showIntroWizard"
                                    label="Show Welcome Tour"
                                    desc="Display the introductory guide for new users that explains the basic features."
                                    icon={<HelpCircle className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={true}
                                    isAdmin={true}
                                />
                            </div>
                            </div>
                            </FeatureFilterContext.Provider>
                        </div>
                )}

                </div>

                <DialogFooter className="border-t border-border/40 bg-card/30 px-6 py-4 shrink-0 sm:justify-end gap-2">
                    <DialogClose asChild>
                        <Button type="button" variant="outline" className="rounded-xl min-w-[88px]">
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button type="button" className="rounded-xl min-w-[88px]" onClick={handleOk}>
                        OK
                    </Button>
                </DialogFooter>

                <Dialog open={vendingSettingsOpen} onOpenChange={setVendingSettingsOpen}>
      <DialogContent size="lg">
                        <DialogHeader>
                            <DialogTitle>Vending Machine Settings</DialogTitle>
                        </DialogHeader>
                        <VendingMotorPanel />
                    </DialogContent>
                </Dialog>
            </DialogContent>
        </Dialog>
    );
}

