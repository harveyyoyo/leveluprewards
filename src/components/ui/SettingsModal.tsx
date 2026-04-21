

import { useCallback, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAppContext } from '@/components/AppProvider';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Settings, Volume2, VolumeX, Monitor, Smartphone, ChevronRight,
    Bell, Shield, Moon, Sun, ArrowLeft, Palette, Zap, Trophy,
    BarChart3, MessageSquare, ShoppingBag, ShieldCheck, Star,
    Users, Database, Printer, LayoutDashboard, History, HelpCircle,
    Cpu, Award, Clock, Sparkles, Trash2, RotateCcw,
} from 'lucide-react';
import { useSettings, colorSchemes, type ColorScheme, type AppearancePreviewSettings } from '../providers/SettingsProvider';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { cn } from '@/lib/utils';
import {
    ANIMATED_BACKGROUND_STYLES,
    type AnimatedBackgroundStyle,
    normalizeAnimatedBackgroundStyle,
    resolveAnimatedBackgroundStyle,
} from '@/lib/animatedBackdrop';

type SettingsView = 'main' | 'features';

function FeatureRow({ id, label, desc, icon, settings, onToggle, isImplemented = true, isAdmin = true }: {
    id: string; label: string; desc: string; icon: React.ReactNode;
    settings: any; onToggle: (key: string, val: any) => void; isImplemented?: boolean; isAdmin?: boolean;
}) {
    const isEnabled = settings[id] || false;
    return (
        <div className="flex items-start justify-between py-4 px-3 border-b border-slate-100/50 dark:border-slate-800/50 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 rounded-xl transition-colors">
            <div className={`flex items-start gap-4 ${!isImplemented && 'opacity-60'} mr-6`}>
                <div className={`p-2.5 rounded-xl transition-colors shrink-0 mt-0.5 ${(isEnabled && isImplemented) ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                    {icon}
                </div>
                <div className="flex flex-col">
                    <Label className="font-bold text-sm block text-slate-800 dark:text-slate-200 mb-1" htmlFor={isImplemented && isAdmin ? id : undefined}>{label}</Label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed w-full pr-4">{desc}</p>
                </div>
            </div>
            {isImplemented ? (
                <div className="flex flex-col flex-shrink-0 items-end justify-start min-h-[44px]">
                    <Switch
                        id={id}
                        checked={isEnabled}
                        onCheckedChange={(checked) => onToggle(id, checked)}
                        disabled={!isAdmin}
                        className="data-[state=checked]:bg-amber-500"
                    />
                    {!isAdmin && <span className="text-[10px] text-slate-400 mt-2 font-black uppercase tracking-widest whitespace-nowrap">Admin Only</span>}
                </div>
            ) : (
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-md mt-1 whitespace-nowrap">
                    Soon
                </div>
            )}
        </div>
    );
}

export function SettingsModal() {
    const pathname = usePathname();
    const { loginState, schoolId } = useAppContext();
    const isLoginPage = pathname === '/' || pathname.startsWith('/s/');
    // Settings are school-dependent; never show on public/login pages.
    if (isLoginPage || loginState === 'loggedOut' || (!schoolId && loginState !== 'developer')) {
        return null;
    }
    const isAdmin = loginState === 'admin' || loginState === 'developer';
    const {
        settings,
        visualSettings,
        appearancePreview,
        setAppearancePreview,
        hasAppearancePreview,
        discardAppearancePreview,
        updateSettings,
    } = useSettings();
    const playSound = useArcadeSound();
    const [view, setView] = useState<SettingsView>('main');

    const previewAppearance = useCallback(
        (patch: AppearancePreviewSettings) => {
            setAppearancePreview((prev) => ({ ...(prev ?? {}), ...patch }));
            if (settings.soundEnabled) playSound('click');
        },
        [setAppearancePreview, settings.soundEnabled, playSound],
    );

    const applyAppearance = useCallback(() => {
        if (!appearancePreview || Object.keys(appearancePreview).length === 0) return;
        const patch = { ...appearancePreview };
        if (patch.animatedBackgroundStyle !== undefined) {
            patch.animatedBackgroundStyle = normalizeAnimatedBackgroundStyle(patch.animatedBackgroundStyle);
        }
        updateSettings(patch);
        setAppearancePreview(null);
        if (settings.soundEnabled) playSound('click');
    }, [appearancePreview, updateSettings, setAppearancePreview, settings.soundEnabled, playSound]);

    const discardAppearance = useCallback(() => {
        discardAppearancePreview();
        if (settings.soundEnabled) playSound('click');
    }, [discardAppearancePreview, settings.soundEnabled, playSound]);

    const hiddenBgSet = useMemo(
        () => new Set(settings.hiddenAnimatedBackgroundIds),
        [settings.hiddenAnimatedBackgroundIds],
    );
    const visibleBgCount = ANIMATED_BACKGROUND_STYLES.length - hiddenBgSet.size;
    const visibleBgStyles = useMemo(
        () => ANIMATED_BACKGROUND_STYLES.filter((s) => !hiddenBgSet.has(s.id)),
        [hiddenBgSet],
    );
    const effectiveBgStyle = resolveAnimatedBackgroundStyle(
        normalizeAnimatedBackgroundStyle(settings.animatedBackgroundStyle),
        settings.hiddenAnimatedBackgroundIds,
    );

    const hideBackgroundStyle = useCallback(
        (id: AnimatedBackgroundStyle) => {
            if (hiddenBgSet.has(id) || visibleBgCount <= 1) return;
            const nextHidden = [...settings.hiddenAnimatedBackgroundIds, id];
            const nextStyle = resolveAnimatedBackgroundStyle(
                normalizeAnimatedBackgroundStyle(settings.animatedBackgroundStyle),
                nextHidden,
            );
            updateSettings({
                hiddenAnimatedBackgroundIds: nextHidden,
                animatedBackgroundStyle: nextStyle,
            });
            if (settings.soundEnabled) playSound('click');
        },
        [
            hiddenBgSet,
            visibleBgCount,
            settings.hiddenAnimatedBackgroundIds,
            settings.animatedBackgroundStyle,
            settings.soundEnabled,
            updateSettings,
            playSound,
        ],
    );

    const restoreBackgroundStyle = useCallback(
        (id: AnimatedBackgroundStyle) => {
            if (!hiddenBgSet.has(id)) return;
            updateSettings({
                hiddenAnimatedBackgroundIds: settings.hiddenAnimatedBackgroundIds.filter((x) => x !== id),
            });
            if (settings.soundEnabled) playSound('click');
        },
        [hiddenBgSet, settings.hiddenAnimatedBackgroundIds, settings.soundEnabled, updateSettings, playSound],
    );

    const handleToggle = (key: string, value: any) => {
        updateSettings({ [key]: value } as any);
        if (settings.soundEnabled || key === 'soundEnabled') {
            playSound('click');
        }
    };

    const viewTitle = view === 'main' ? 'Interface Settings' : 'Features';

    return (
        <Dialog onOpenChange={(open) => {
            if (!open) {
                discardAppearancePreview();
                setView('main');
            }
        }}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl group relative z-50">
                    <Settings className="w-5 h-5 text-slate-600 dark:text-slate-300 group-hover:rotate-45 transition-transform duration-300" />
                </Button>
            </DialogTrigger>
            <DialogContent
                overlayClassName="bg-transparent"
                className="sm:max-w-2xl rounded-2xl p-0 overflow-hidden border border-slate-200 dark:bg-slate-900 dark:border-slate-800 flex flex-col max-h-[90vh] shadow-2xl"
            >
                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <DialogHeader>
                        <div className="flex items-center gap-2">
                            {view !== 'main' && (
                                <Button variant="ghost" size="icon" onClick={() => setView('main')} className="h-8 w-8 -ml-2">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            )}
                            <DialogTitle className="text-lg font-bold text-slate-800 dark:text-white">
                                {viewTitle}
                            </DialogTitle>
                        </div>
                    </DialogHeader>
                </div>

                <div key={view} className="px-6 py-4 overflow-y-auto flex-1 min-h-0 flex flex-col pb-24">
                    {view === 'main' && (
                        <>
                            {/* Arcade Mode (Graphics) is permanently enabled; toggle removed. */}

                            {/* Color Scheme */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 rounded-lg bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                                        <Palette className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <Label htmlFor="settings-color-scheme" className="font-bold text-foreground text-base">Color Scheme</Label>
                                        <p className="text-xs text-muted-foreground mt-0.5">App colors and gradients</p>
                                    </div>
                                </div>
                                <Select
                                    value={settings.colorScheme}
                                    onValueChange={(v) => handleToggle('colorScheme', v as ColorScheme)}
                                >
                                    <SelectTrigger id="settings-color-scheme" className="w-full h-12 rounded-xl border-slate-200 dark:border-slate-700 bg-background text-left font-semibold">
                                        <SelectValue placeholder="Choose a color scheme" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[min(320px,60vh)]">
                                        {(Object.keys(colorSchemes) as ColorScheme[]).map((key) => (
                                            <SelectItem key={key} value={key} className="cursor-pointer">
                                                <span className="flex items-center gap-2">
                                                    <span className={cn('w-3.5 h-3.5 rounded-full shrink-0 ring-1 ring-black/10 dark:ring-white/20', colorSchemes[key].swatch)} />
                                                    <span>{colorSchemes[key].label}</span>
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Animated background */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-100 dark:border-slate-800">
                                <div className="flex items-start justify-between gap-4 mb-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="p-2 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 shrink-0">
                                            <Sparkles className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-foreground">Animated background</h4>
                                            <p className="text-xs text-muted-foreground mt-0.5">Backdrop behind pages; header uses a soft gradient so it stays readable.</p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={settings.enableAnimatedBackground}
                                        onCheckedChange={(checked) => handleToggle('enableAnimatedBackground', checked)}
                                        className="data-[state=checked]:bg-amber-500 shrink-0 scale-110"
                                    />
                                </div>
                                {settings.enableAnimatedBackground && (
                                    <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                                        <Label htmlFor="settings-animated-bg-style" className="text-xs font-semibold text-muted-foreground">Background style</Label>
                                        <Select
                                            value={effectiveBgStyle}
                                            onValueChange={(v) => handleToggle('animatedBackgroundStyle', v as AnimatedBackgroundStyle)}
                                            disabled={!settings.enableAnimatedBackground}
                                        >
                                            <SelectTrigger id="settings-animated-bg-style" className="w-full h-12 rounded-xl border-slate-200 dark:border-slate-700 bg-background text-left">
                                                <SelectValue placeholder="Choose a style" />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-[min(280px,50vh)]">
                                                {visibleBgStyles.map((s) => (
                                                    <SelectItem key={s.id} value={s.id} className="cursor-pointer py-2.5">
                                                        <div className="flex flex-col gap-0.5 text-left">
                                                            <span className="font-semibold text-sm">{s.label}</span>
                                                            <span className="text-xs text-muted-foreground font-normal leading-snug">{s.description}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <div>
                                            <p className="text-xs font-semibold text-muted-foreground mb-2">Background library</p>
                                            <p className="text-[11px] text-muted-foreground mb-2 leading-snug">
                                                Remove styles you don’t want in the picker. Restore anytime. At least one style stays available.
                                            </p>
                                            <div className="max-h-[min(220px,40vh)] overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 bg-background/50">
                                                {ANIMATED_BACKGROUND_STYLES.map((s) => {
                                                    const isHidden = hiddenBgSet.has(s.id);
                                                    return (
                                                        <div
                                                            key={s.id}
                                                            className="flex items-start gap-2 px-2 py-2 sm:px-3 sm:py-2.5"
                                                        >
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-sm font-medium leading-tight">{s.label}</p>
                                                                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{s.description}</p>
                                                            </div>
                                                            {isHidden ? (
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="shrink-0 h-8 gap-1 text-xs"
                                                                    onClick={() => restoreBackgroundStyle(s.id)}
                                                                >
                                                                    <RotateCcw className="h-3.5 w-3.5" />
                                                                    Restore
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                                                                    disabled={visibleBgCount <= 1}
                                                                    onClick={() => hideBackgroundStyle(s.id)}
                                                                    aria-label={`Remove ${s.label} from list`}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Dark Mode */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${settings.darkMode ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'}`}>
                                            {settings.darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-foreground">Dark Mode</h4>
                                            <p className="text-xs text-muted-foreground mt-0.5">Immersive dark interface</p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={settings.darkMode}
                                        onCheckedChange={(checked) => handleToggle('darkMode', checked)}
                                        className="data-[state=checked]:bg-indigo-600 scale-110"
                                    />
                                </div>
                            </div>

                            {/* Legacy Mode */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${settings.legacyMode ? 'bg-orange-100 text-orange-600' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}>
                                            <Cpu className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-foreground">Legacy Mode</h4>
                                            <p className="text-xs text-muted-foreground mt-0.5">Disables heavy effects for older hardware</p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={settings.legacyMode}
                                        onCheckedChange={(checked) => handleToggle('legacyMode', checked)}
                                        className="data-[state=checked]:bg-orange-600 scale-110"
                                    />
                                </div>
                            </div>

                            {/* Sound Effects (quick toggle) */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                                            {settings.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-foreground">Sound Effects</h4>
                                            <p className="text-xs text-muted-foreground mt-0.5">Button clicks and UI audio</p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={settings.soundEnabled}
                                        onCheckedChange={(checked) => handleToggle('soundEnabled', checked)}
                                        className="data-[state=checked]:bg-emerald-500 scale-110"
                                    />
                                </div>
                            </div>

                            {/* Display Mode */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-3 mb-3">
                                    {settings.displayMode === 'app' ? <Smartphone className="w-5 h-5 text-muted-foreground" /> : <Monitor className="w-5 h-5 text-muted-foreground" />}
                                    <div>
                                        <h4 className="font-bold text-foreground">Display Mode</h4>
                                        <p className="text-xs text-muted-foreground mt-0.5">UI layout style</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 bg-background p-1 rounded-lg border border-border">
                                    <button
                                        onClick={() => handleToggle('displayMode', 'web')}
                                        className={`flex-1 py-1.5 px-3 rounded-md text-sm font-bold transition-all ${settings.displayMode === 'web' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                                    >
                                        Web
                                    </button>
                                    <button
                                        onClick={() => handleToggle('displayMode', 'app')}
                                        className={`flex-1 py-1.5 px-3 rounded-md text-sm font-bold transition-all ${settings.displayMode === 'app' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                                    >
                                        App
                                    </button>
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
                                    <span className="font-bold">Features</span>
                                </div>
                                <ChevronRight className="w-5 h-5 opacity-50" />
                            </Button>

                        </>
                    )}

                    {view === 'features' && (
                        <div className="space-y-4 animate-in slide-in-from-right-4 duration-300 pb-24">

                            <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-2 border border-slate-100 dark:border-slate-800/50">
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 px-3 pt-3 pb-2 flex items-center gap-2"><Settings className="w-3.5 h-3.5" /> Core Workflow</p>
                                <FeatureRow
                                    id="enableTeacherBudgets"
                                    label="Teacher Budgets"
                                    desc="Give each teacher a monthly points allowance so they can’t overspend when printing coupons or awarding points."
                                    icon={<Users className="w-5 h-5" />}
                                    settings={settings}
                                    onToggle={handleToggle}
                                    isImplemented={true}
                                    isAdmin={isAdmin}
                                />
                                <FeatureRow
                                    id="enableBulkPoints"
                                    label="Bulk Class Points (Soon)"
                                    desc="Award points to an entire class at once instead of one student at a time."
                                    icon={<Users className="w-5 h-5" />}
                                    settings={settings}
                                    onToggle={handleToggle}
                                    isImplemented={false}
                                    isAdmin={isAdmin}
                                />
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-2 border border-slate-100 dark:border-slate-800/50">
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 px-3 pt-3 pb-2 flex items-center gap-2"><BarChart3 className="w-3.5 h-3.5" /> Analytics & Reports</p>
                                <FeatureRow
                                    id="enableAdminAnalytics"
                                    label="Admin Analytics"
                                    desc="Turn on the Admin → Stats view with school-wide totals, trends, and active student counts."
                                    icon={<ShieldCheck className="w-5 h-5" />}
                                    settings={settings}
                                    onToggle={handleToggle}
                                    isImplemented={true}
                                    isAdmin={isAdmin}
                                />
                                <FeatureRow
                                    id="enableTeacherCharts"
                                    label="Teacher Analytics (Soon)"
                                    desc="Let teachers see simple charts for just their own classes and students."
                                    icon={<BarChart3 className="w-5 h-5" />}
                                    settings={settings}
                                    onToggle={handleToggle}
                                    isImplemented={false}
                                    isAdmin={isAdmin}
                                />
                                <FeatureRow
                                    id="enableStudentReports"
                                    label="Printable Reports (Soon)"
                                    desc="Generate PDF-style reports for a student that can be shared with families or staff."
                                    icon={<Printer className="w-5 h-5" />}
                                    settings={settings}
                                    onToggle={handleToggle}
                                    isImplemented={false}
                                    isAdmin={isAdmin}
                                />
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-2 border border-slate-100 dark:border-slate-800/50">
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 px-3 pt-3 pb-2 flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Attendance</p>
                                <FeatureRow
                                    id="enableAttendance"
                                    label="Attendance"
                                    desc="Record attendance when students sign in at the kiosk. Configure periods and rewards in Admin → Attendance. When off, the Teacher portal Attendance tab is hidden."
                                    icon={<Clock className="w-5 h-5" />}
                                    settings={settings}
                                    onToggle={handleToggle}
                                    isImplemented={true}
                                    isAdmin={isAdmin}
                                />
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-2 border border-slate-100 dark:border-slate-800/50">
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 px-3 pt-3 pb-2 flex items-center gap-2"><Smartphone className="w-3.5 h-3.5" /> Student Experience</p>
                                <FeatureRow
                                    id="enableStudentPortal"
                                    label="Student Home Portal"
                                    desc="Let students log in from home to see their points, recent activity, and which prizes they can afford."
                                    icon={<Smartphone className="w-5 h-5" />}
                                    settings={settings}
                                    onToggle={handleToggle}
                                    isImplemented={true}
                                    isAdmin={isAdmin}
                                />
                                <FeatureRow
                                    id="enableFaceLogin"
                                    label="Face Login (Optional)"
                                    desc="Adds a Face tab to the student kiosk. Students can opt in to train their face so they can sign in faster on any computer."
                                    icon={<Shield className="w-5 h-5" />}
                                    settings={settings}
                                    onToggle={handleToggle}
                                    isImplemented={true}
                                    isAdmin={isAdmin}
                                />
                                <FeatureRow
                                    id="enableQrLogin"
                                    label="QR Code Login (Soon)"
                                    desc="Students scan a QR code instead of typing their ID to log into kiosks."
                                    icon={<LayoutDashboard className="w-5 h-5" />}
                                    settings={settings}
                                    onToggle={handleToggle}
                                    isImplemented={false}
                                    isAdmin={isAdmin}
                                />
                                <FeatureRow
                                    id="enablePrizeImages"
                                    label="Prize Photos (Soon)"
                                    desc="Show real photos of prizes in the shop, not only icons."
                                    icon={<ShoppingBag className="w-5 h-5" />}
                                    settings={settings}
                                    onToggle={handleToggle}
                                    isImplemented={false}
                                    isAdmin={isAdmin}
                                />
                                <FeatureRow
                                    id="enableWishlist"
                                    label="Student Wishlists (Soon)"
                                    desc="Let students star favorite prizes and track progress toward them."
                                    icon={<Star className="w-5 h-5" />}
                                    settings={settings}
                                    onToggle={handleToggle}
                                    isImplemented={false}
                                    isAdmin={isAdmin}
                                />
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-2 border border-slate-100 dark:border-slate-800/50">
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 px-3 pt-3 pb-2 flex items-center gap-2"><Trophy className="w-3.5 h-3.5" /> Recognition</p>
                                <FeatureRow
                                    id="enableAchievements"
                                    label="Bonus Points"
                                    desc="Students earn extra points when they hit point milestones; show milestones and bonus points."
                                    icon={<Trophy className="w-5 h-5" />}
                                    settings={settings}
                                    onToggle={handleToggle}
                                    isImplemented={true}
                                    isAdmin={isAdmin}
                                />
                                <FeatureRow
                                    id="enableBadges"
                                    label="Badges"
                                    desc="Students earn badges for reaching a points threshold in a category within a time period (e.g. Good Behavior badge this month)."
                                    icon={<Award className="w-5 h-5" />}
                                    settings={settings}
                                    onToggle={handleToggle}
                                    isImplemented={true}
                                    isAdmin={isAdmin}
                                />
                                <FeatureRow
                                    id="enableLevels"
                                    label="Levels (Soon)"
                                    desc="Turn total points into fun “levels” (Level 1, Level 2, etc.) for extra motivation."
                                    icon={<Zap className="w-5 h-5" />}
                                    settings={settings}
                                    onToggle={handleToggle}
                                    isImplemented={false}
                                    isAdmin={isAdmin}
                                />
                                <FeatureRow
                                    id="enableStreaks"
                                    label="Daily Streaks (Soon)"
                                    desc="Reward students for showing up or logging in on consecutive days."
                                    icon={<History className="w-5 h-5" />}
                                    settings={settings}
                                    onToggle={handleToggle}
                                    isImplemented={false}
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
                                    settings={settings}
                                    onToggle={handleToggle}
                                    isImplemented={true}
                                    isAdmin={isAdmin}
                                />
                                <FeatureRow
                                    id="enableHelperMode"
                                    label="Helper Tips"
                                    desc="Show little “?” helpers and tooltips around the app to explain what things do."
                                    icon={<HelpCircle className="w-5 h-5" />}
                                    settings={settings}
                                    onToggle={handleToggle}
                                    isImplemented={true}
                                    isAdmin={isAdmin}
                                />
                                 <FeatureRow
                                    id="showIntroWizard"
                                    label="Show Welcome Tour"
                                    desc="Display the introductory guide for new users that explains the basic features."
                                    icon={<HelpCircle className="w-5 h-5" />}
                                    settings={settings}
                                    onToggle={handleToggle}
                                    isImplemented={true}
                                    isAdmin={true}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="px-6 py-4 sm:justify-end border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 absolute bottom-0 w-full left-0 z-10 hidden sm:flex">
                    <DialogClose asChild>
                        <Button className="w-full sm:w-auto px-10 h-10 text-sm bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md cursor-pointer">
                            Close
                        </Button>
                    </DialogClose>
                </DialogFooter>

                {/* Mobile absolute footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 sm:hidden">
                    <DialogClose asChild>
                        <Button className="w-full h-12 text-sm bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md cursor-pointer">
                            Close
                        </Button>
                    </DialogClose>
                </div>
            </DialogContent>
        </Dialog>
    );
}
