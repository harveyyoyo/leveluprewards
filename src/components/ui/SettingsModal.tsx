

import { useState } from 'react';
import { useAppContext } from '@/components/AppProvider';
import { usePathname, useRouter } from 'next/navigation';
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
    Settings, Volume2, VolumeX, Monitor, Smartphone, ChevronRight,
    Bell, Shield, Moon, Sun, ArrowLeft, Palette, Zap, Trophy,
    BarChart3, MessageSquare, ShoppingBag, ShieldCheck, Star,
    Users, Database, Printer, LayoutDashboard, History, HelpCircle,
    Cpu, Award, Clock, Cog, Lock, Sparkles, ArrowRightLeft, Trash2, RotateCcw, Smile, BookOpen, Target, LogOut
} from 'lucide-react';
import { useSettings, colorSchemes, type ColorScheme, type Settings as AppSettings } from '../providers/SettingsProvider';
import type { StudentTheme } from '@/lib/types';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { AttendanceTimeZoneField } from '@/components/attendance/AttendanceTimeZoneField';
import { VendingMotorPanel } from '@/components/VendingMotorPanel';
import { ANIMATED_BACKGROUND_STYLES, type AnimatedBackgroundStyle } from '@/lib/animatedBackdrop';
import { globalAnimatedBackdropActive } from '@/lib/animatedBackdrop';
import { cn } from '@/lib/utils';

type SettingsView = 'main' | 'features' | 'library';

function cloneSettings(s: AppSettings): AppSettings {
    return JSON.parse(JSON.stringify(s)) as AppSettings;
}

function FeatureRow({ id, label, desc, icon, settings, onToggle, onConfigure, isImplemented = true, isAdmin = true, isAllowed = true, planLabel }: {
    id: string; label: string; desc: string; icon: React.ReactNode;
    settings: any; onToggle: (key: string, val: any) => void; onConfigure?: () => void; isImplemented?: boolean; isAdmin?: boolean; isAllowed?: boolean; planLabel?: string;
}) {
    const isEnabled = settings[id] || false;
    const canUse = isImplemented && isAllowed;
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
    const { loginState, getAttendanceConfig, setAttendanceConfig, schoolId: appSchoolId, logout } = useAppContext();
    const isAdmin = loginState === 'admin' || loginState === 'developer';
    const { settings, updateSettings, isFeatureAllowed, planLabel } = useSettings();
    const playSound = useArcadeSound();
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState<AppSettings | null>(null);
    const [view, setView] = useState<SettingsView>('main');
    const [vendingSettingsOpen, setVendingSettingsOpen] = useState(false);
    const local = draft ?? settings;
    const pathname = usePathname();
    const router = useRouter();

    // For short-link kiosk entry routes, keep the UI minimal.
    if (typeof pathname === 'string' && pathname.startsWith('/s/')) return null;

    const handleToggle = (key: string, value: any) => {
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
        if (local.soundEnabled || key === 'soundEnabled') {
            playSound('click');
        }
    };

    const viewTitle = view === 'main' ? 'Interface Settings' : view === 'features' ? 'Features' : 'Background Library';

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

    const handleOpenChange = (next: boolean) => {
        if (next) {
            setDraft(cloneSettings(settings));
            setView('main');
        } else {
            setDraft(null);
            setView('main');
        }
        setOpen(next);
    };


    const handleOk = () => {
        if (draft) {
            updateSettings({ ...draft });
        }
        setDraft(null);
        setView('main');
        setOpen(false);
    };

    const trigger = (
        <Button
            variant="ghost"
            size="icon"
            className={cn(
                "hover:bg-muted rounded-xl group relative z-50 transition-all active:scale-90",
                !isAdmin && "text-muted-foreground/60"
            )}
            aria-label="Open settings"
            onClick={(e) => {
                if (!isAdmin) {
                    e.preventDefault();
                    e.stopPropagation();
                    playSound('click');
                    // Use a safe school ID or the one from context
                    const sid = appSchoolId || (typeof window !== 'undefined' ? window.location.pathname.split('/')[1] : '');
                    router.push(`/login?school=${encodeURIComponent(sid)}&redirect=${encodeURIComponent(pathname)}`);
                }
            }}
        >
            <Settings className="w-5 h-5 text-muted-foreground group-hover:rotate-45 transition-transform duration-300" />
            {!isAdmin && (
                <div className="absolute -top-1 -right-1 bg-primary w-2 h-2 rounded-full border border-background" title="Admin required" />
            )}
        </Button>
    );

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            {isAdmin ? (
                <DialogTrigger asChild>
                    {trigger}
                </DialogTrigger>
            ) : (
                trigger
            )}
      <DialogContent size="lg" className="p-0 overflow-hidden border border-border bg-background flex flex-col shadow-2xl" data-settings-open="true">
                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-border/40 bg-card/30 backdrop-blur-md">
                    <DialogHeader>
                        <div className="flex items-center gap-2">
                            {view !== 'main' && (
                                <Button variant="ghost" size="icon" onClick={() => setView('main')} className="h-8 w-8 -ml-2 rounded-full hover:bg-muted">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            )}
                            <DialogTitle className="text-xl font-black tracking-tight text-foreground">
                                {viewTitle}
                            </DialogTitle>
                        </div>
                    </DialogHeader>
                </div>

                <div key={view} className="px-6 py-4 overflow-y-auto flex-1 min-h-0 flex flex-col pb-4">
                    {view === 'main' && (
                        <>
                            {/* APPEARANCE */}
                            <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-4 mb-4 border border-slate-100 dark:border-slate-800/50">
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 pb-3 flex items-center gap-2">
                                    <Palette className="w-3.5 h-3.5" /> Appearance
                                </p>
                                
                                {/* Color Scheme */}
                                <div className="grid grid-cols-3 gap-2 mt-1">
                                    {(Object.keys(colorSchemes) as ColorScheme[]).map((key) => (
                                        <button
                                            key={key}
                                            onClick={() => handleToggle('colorScheme', key)}
                                            className={`flex items-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all border ${local.colorScheme === key ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-muted'}`}
                                        >
                                            <span className={`w-4 h-4 rounded-full ${colorSchemes[key].swatch} shrink-0`} />
                                            {colorSchemes[key].label}
                                        </button>
                                    ))}
                                </div>

                            </div>

                            {/* MOTION & SOUND */}
                            <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-4 mb-4 border border-slate-100 dark:border-slate-800/50">
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

                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl transition-colors ${local.enableAnimatedBackground && !local.calmMode ? 'bg-primary/20 text-primary shadow-sm' : 'bg-muted text-muted-foreground'}`}>
                                            <Sparkles className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm text-foreground">Animated background</h4>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">Vibrant arcade style backdrop</p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={local.enableAnimatedBackground}
                                        onCheckedChange={(checked) => {
                                            // Only toggle the backdrop itself; don't force other UI modes.
                                            handleToggle('enableAnimatedBackground', checked);
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
                                                Current: {currentStyle.label}
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
                                        onClick={cycleBackground}
                                        disabled={!backdropActive || visibleStyles.length <= 1}
                                        title={!backdropActive && backdropBlockedReason ? `Background style is disabled: ${backdropBlockedReason}` : undefined}
>
                                        {currentStyle.label} <ArrowRightLeft className="w-3 h-3" />
                                    </Button>
                                </div>

                                {/* Theme Animations */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl transition-colors ${local.enableThemeAnimations ? 'bg-primary/20 text-primary shadow-sm' : 'bg-muted text-muted-foreground'}`}>
                                            <Zap className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm text-foreground">Theme animations</h4>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">Animate emojis + themed accents (kiosk & shop)</p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={local.enableThemeAnimations}
                                        onCheckedChange={(checked) => handleToggle('enableThemeAnimations', checked)}
                                        className="scale-110"
                                    />
                                </div>

                                {/* Background Library Button */}
                                <Button variant="outline" className="w-full justify-between h-11 px-4 rounded-xl border-border/50 text-xs font-bold text-muted-foreground hover:text-foreground" onClick={() => setView('library')}>
                                    <span className="flex items-center gap-2"><LayoutDashboard className="w-4 h-4" /> Background library</span>
                                    <div className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 px-2 py-1 rounded">{visibleStyles.length} of {ANIMATED_BACKGROUND_STYLES.length}</div>
                                </Button>
                            </div>

                            {/* THEME & LAYOUT */}
                            <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-4 mb-4 border border-slate-100 dark:border-slate-800/50">
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
                                            checked={local.darkMode}
                                            onCheckedChange={(checked) => handleToggle('darkMode', checked)}
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
                                    {/* Sound Effects */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Volume2 className="w-4 h-4 text-muted-foreground" />
                                            <span className="text-sm font-bold">Sound FX</span>
                                        </div>
                                        <Switch
                                            checked={local.soundEnabled}
                                            onCheckedChange={(checked) => handleToggle('soundEnabled', checked)}
                                            className="data-[state=checked]:bg-emerald-500"
                                        />
                                    </div>
                                </div>

                                {/* Display Mode */}
                                <div className="flex items-center justify-between bg-muted/40 p-1.5 rounded-2xl border border-border/50">
                                    <button
                                        onClick={() => handleToggle('displayMode', 'web')}
                                        className={`flex-1 py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${local.displayMode === 'web' ? 'bg-background text-foreground shadow-sm border border-border/50' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        Web
                                    </button>
                                    <button
                                        onClick={() => handleToggle('displayMode', 'app')}
                                        className={`flex-1 py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${local.displayMode === 'app' ? 'bg-background text-foreground shadow-sm border border-border/50' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        App
                                    </button>
                                </div>
                            </div>
                            {/* SECURITY */}
                            <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-4 mb-4 border border-slate-100 dark:border-slate-800/50">
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 pb-3 flex items-center gap-2">
                                    <Shield className="w-3.5 h-3.5" /> Security
                                </p>

                                <div className="space-y-4 mt-1">
                                    {/* Admin Timeout */}
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

                                    {/* Kiosk Timeout */}
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

                                    {/* Logout Button */}
                                    <Button
                                        variant="destructive"
                                        className="w-full h-11 rounded-xl font-bold gap-2 mt-2 bg-rose-500 hover:bg-rose-600 border-0 shadow-lg shadow-rose-500/20"
                                        onClick={() => {
                                            if (local.soundEnabled) playSound('swoosh');
                                            setOpen(false);
                                            logout();
                                        }}
                                    >
                                        <LogOut className="w-4 h-4" /> Sign Out
                                    </Button>
                                </div>
                            </div>

                            {/* Features Button */}
                            <Button
                                variant="outline"
                                onClick={() => setView('features')}
                                className="w-full flex justify-between items-center py-6 px-4 rounded-xl border-2 hover:bg-amber-50 dark:hover:bg-amber-950/20 border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400 mb-4"
                            >
                                <div className="flex items-center gap-3">
                                    <Zap className="w-5 h-5" />
                                    <span className="font-bold">Features & Add-ons</span>
                                </div>
                                <ChevronRight className="w-5 h-5 opacity-50" />
                            </Button>

                        </>
                    )}

                    {view === 'features' && (
                        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 pb-4">
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

                            <div className="space-y-4">

                             <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-2 border border-slate-100 dark:border-slate-800/50">
                                 <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 px-3 pt-3 pb-2 flex items-center gap-2"><MessageSquare className="w-3.5 h-3.5" /> Communication</p>
                                 <FeatureRow
                                     id="enableNotifications"
                                     label="Notifications & Alerts"
                                     desc="Send automated email and SMS alerts to parents and staff for student activity, rewards, and attendance events."
                                     icon={<Bell className="w-5 h-5" />}
                                     settings={local}
                                     onToggle={handleToggle}
                                     isImplemented={true}
                                     isAdmin={isAdmin}
                                     isAllowed={isFeatureAllowed('enableNotifications')}
                                     planLabel={planLabel}
                                 />
                             </div>

                             <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-2 border border-slate-100 dark:border-slate-800/50">
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
                                    icon={<Users className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={false}
                                    isAdmin={isAdmin}
                                    isAllowed={isFeatureAllowed('enableBulkPoints')}
                                    planLabel={planLabel}
                                />
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-2 border border-slate-100 dark:border-slate-800/50">
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 px-3 pt-3 pb-2 flex items-center gap-2"><BarChart3 className="w-3.5 h-3.5" /> Analytics & Reports</p>
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

                            <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-2 border border-slate-100 dark:border-slate-800/50">
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
                                            schoolId={appSchoolId}
                                            getAttendanceConfig={getAttendanceConfig}
                                            setAttendanceConfig={setAttendanceConfig}
                                            enabled
                                            compact
                                        />
                                    </div>
                                ) : null}
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-2 border border-slate-100 dark:border-slate-800/50">
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 px-3 pt-3 pb-2 flex items-center gap-2"><Smartphone className="w-3.5 h-3.5" /> Student Experience</p>
                                <FeatureRow
                                    id="enableStudentPortal"
                                    label="Student Home Portal (Soon)"
                                    desc="Placeholder for future home access. Students should use the in-school kiosk and prize shop for now."
                                    icon={<Smartphone className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={false}
                                    isAdmin={isAdmin}
                                    isAllowed={isFeatureAllowed('enableStudentPortal')}
                                    planLabel={planLabel}
                                />
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
                                    id="enableLibrary"
                                    label="Library Checkout"
                                    desc="Allow students to scan items (via UPC) and check them out/return them from the kiosk."
                                    icon={<ShoppingBag className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isAdmin={isAdmin}
                                    isAllowed={isFeatureAllowed('enableLibrary')}
                                    planLabel={planLabel}
                                />
                                  <FeatureRow
                                    id="enablePrizeImages"
                                    label="Prize Photos"
                                    desc="Show real photos of prizes in the shop, not only icons."
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
                                    desc="Let students star favorite prizes and track progress toward them."
                                    icon={<Star className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={false}
                                    isAdmin={isAdmin}
                                    isAllowed={isFeatureAllowed('enableWishlist')}
                                    planLabel={planLabel}
                                />
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-2 border border-slate-100 dark:border-slate-800/50">
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
                            </div>


                            <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-2 border border-slate-100 dark:border-slate-800/50">
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 px-3 pt-3 pb-2 flex items-center gap-2"><ShoppingBag className="w-3.5 h-3.5" /> Prize Shop</p>
                                <FeatureRow
                                    id="enablePrizeAiSurprise"
                                    label="AI Prize Surprise"
                                    desc="After redemption, show a school-safe AI joke, riddle, or fortune for prizes that have it configured. Uses server API keys."
                                    icon={<Sparkles className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={true}
                                    isAdmin={isAdmin}
                                    isAllowed={isFeatureAllowed('enablePrizeAiSurprise')}
                                    planLabel={planLabel}
                                />
                                <FeatureRow
                                    id="enableVendingMachine"
                                    label="Vending Machine"
                                    desc="Connect a USB serial vending rig and let configured prizes trigger a motor after redemption."
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
                                    label="Student emoji on prize tickets"
                                    desc="When printing a redeem ticket, show the student theme emoji (or school default theme emoji) next to their name."
                                    icon={<Smile className="w-5 h-5" />}
                                    settings={local}
                                    onToggle={handleToggle}
                                    isImplemented={true}
                                    isAdmin={isAdmin}
                                />
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-2 border border-slate-100 dark:border-slate-800/50">
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
                    </div>
                )}

                {view === 'library' && (
                    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 pb-4">
                        <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-4 mb-2 border border-slate-100 dark:border-slate-800/50">
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 pb-3 flex items-center gap-2">
                                <LayoutDashboard className="w-3.5 h-3.5" /> Background Library
                            </p>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Remove styles you don't want in the picker. Restore anytime. At least one style stays available.
                            </p>
                        </div>

                        <div className="space-y-1">
                            {ANIMATED_BACKGROUND_STYLES.map((style) => {
                                const isHidden = (local.hiddenAnimatedBackgroundIds || []).includes(style.id);
                                return (
                                    <div key={style.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors group">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm text-foreground">{style.label}</span>
                                            <span className="text-[10px] text-muted-foreground leading-tight">{style.description}</span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-lg shrink-0"
                                            onClick={() => {
                                                setDraft((d) => {
                                                    if (!d) return d;
                                                    const current = d.hiddenAnimatedBackgroundIds || [];
                                                    if (isHidden) {
                                                        const next = current.filter((id) => id !== style.id);
                                                        return { ...d, hiddenAnimatedBackgroundIds: next };
                                                    }
                                                    if (visibleStyles.length > 1) {
                                                        const next = [...current, style.id];
                                                        return { ...d, hiddenAnimatedBackgroundIds: next };
                                                    }
                                                    return d;
                                                });
                                                if (local.soundEnabled) playSound('click');
                                            }}
                                        >
                                            {isHidden ? <RotateCcw className="w-4 h-4 text-primary" /> : <Trash2 className="w-4 h-4 text-muted-foreground group-hover:text-destructive transition-colors" />}
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
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

