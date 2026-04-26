

import { useState } from 'react';
import { useAppContext } from '@/components/AppProvider';
import { usePathname } from 'next/navigation';
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
    Cpu, Award, Clock, Cog
} from 'lucide-react';
import { useSettings, colorSchemes, type ColorScheme } from '../providers/SettingsProvider';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { VendingMotorPanel } from '@/components/VendingMotorPanel';

type SettingsView = 'main' | 'features';

function FeatureRow({ id, label, desc, icon, settings, onToggle, onConfigure, isImplemented = true, isAdmin = true }: {
    id: string; label: string; desc: string; icon: React.ReactNode;
    settings: any; onToggle: (key: string, val: any) => void; onConfigure?: () => void; isImplemented?: boolean; isAdmin?: boolean;
}) {
    const isEnabled = settings[id] || false;
    return (
        <div className="flex items-start justify-between py-4 px-3 border-b border-border/40 last:border-0 hover:bg-muted/30 rounded-xl transition-colors">
            <div className={`flex items-start gap-4 ${!isImplemented && 'opacity-60'} mr-6`}>
                <div className={`p-2.5 rounded-xl transition-colors shrink-0 mt-0.5 ${(isEnabled && isImplemented) ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {icon}
                </div>
                <div className="flex flex-col">
                    <Label className="font-bold text-sm block text-foreground mb-1" htmlFor={isImplemented && isAdmin ? id : undefined}>{label}</Label>
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
                                disabled={!isAdmin}
                                title={`${label} settings`}
                                aria-label={`${label} settings`}
                            >
                                <Cog className="h-4 w-4" />
                            </Button>
                        ) : null}
                        <Switch
                            id={id}
                            checked={isEnabled}
                            onCheckedChange={(checked) => onToggle(id, checked)}
                            disabled={!isAdmin}
                        />
                    </div>
                    {!isAdmin && <span className="text-[10px] text-muted-foreground mt-2 font-black uppercase tracking-widest whitespace-nowrap">Admin Only</span>}
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
    const { loginState } = useAppContext();
    const isAdmin = loginState === 'admin' || loginState === 'developer';
    const { settings, updateSettings } = useSettings();
    const playSound = useArcadeSound();
    const [view, setView] = useState<SettingsView>('main');
    const [vendingSettingsOpen, setVendingSettingsOpen] = useState(false);
    const pathname = usePathname();
    const isPublicLoginRoute =
        pathname === '/' ||
        pathname === '/portal' ||
        pathname === '/login' ||
        (typeof pathname === 'string' && pathname.startsWith('/s/'));

    // For short-link kiosk entry routes, keep the UI minimal.
    if (typeof pathname === 'string' && pathname.startsWith('/s/')) return null;

    const handleToggle = (key: string, value: any) => {
        updateSettings({ [key]: value } as any);
        if (settings.soundEnabled || key === 'soundEnabled') {
            playSound('click');
        }
    };

    const viewTitle = view === 'main' ? 'Interface Settings' : 'Features';

    return (
        <Dialog onOpenChange={(open) => { if (!open) setView('main'); }}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="hover:bg-muted rounded-xl group relative z-50">
                    <Settings className="w-5 h-5 text-muted-foreground group-hover:rotate-45 transition-transform duration-300" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl rounded-3xl p-0 overflow-hidden border border-border bg-background flex flex-col max-h-[90vh] shadow-2xl">
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

                <div key={view} className="px-6 py-4 overflow-y-auto flex-1 min-h-0 flex flex-col pb-24">
                    {view === 'main' && (
                        <>
                            {/* Graphic Mode */}
                            <div className="bg-muted/30 rounded-2xl p-4 mb-4 border border-border/50 transition-all hover:bg-muted/40">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2.5 rounded-xl transition-colors ${settings.graphicMode === 'graphics' ? 'bg-primary/20 text-primary shadow-sm' : 'bg-muted text-muted-foreground'}`}>
                                            <Monitor className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-sm text-foreground uppercase tracking-wider">Arcade Mode</h4>
                                            <p className="text-[11px] font-medium text-muted-foreground mt-0.5">Gamified UI with special effects</p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={settings.graphicMode === 'graphics'}
                                        onCheckedChange={(checked) => handleToggle('graphicMode', checked ? 'graphics' : 'classic')}
                                        className="scale-110"
                                    />
                                </div>
                            </div>

                            {/* Color Scheme */}
                            {settings.graphicMode === 'classic' && (
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="p-2 rounded-lg bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                                            <Palette className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-foreground">Color Scheme</h4>
                                            <p className="text-xs text-muted-foreground mt-0.5">Classic mode colors</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(Object.keys(colorSchemes) as ColorScheme[]).map((key) => (
                                            <button
                                                key={key}
                                                onClick={() => handleToggle('colorScheme', key)}
                                                className={`flex items-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all border ${settings.colorScheme === key ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                            >
                                                <span className={`w-4 h-4 rounded-full ${colorSchemes[key].swatch} shrink-0`} />
                                                {colorSchemes[key].label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

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
                            <div className="bg-muted/30 rounded-2xl p-4 mb-4 border border-border/50">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2.5 rounded-xl bg-muted text-muted-foreground">
                                        {settings.displayMode === 'app' ? <Smartphone className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-sm text-foreground uppercase tracking-wider">Display Mode</h4>
                                        <p className="text-[11px] font-medium text-muted-foreground mt-0.5">UI layout style</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 bg-background/50 p-1.5 rounded-2xl border border-border shadow-inner">
                                    <button
                                        onClick={() => handleToggle('displayMode', 'web')}
                                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${settings.displayMode === 'web' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                                        aria-pressed={settings.displayMode === 'web'}
                                    >
                                        Desktop
                                    </button>
                                    <button
                                        onClick={() => handleToggle('displayMode', 'app')}
                                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${settings.displayMode === 'app' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                                        aria-pressed={settings.displayMode === 'app'}
                                    >
                                        Mobile
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
                                    id="enableClassSignIn"
                                    label="Class Sign-In"
                                    desc="Use student kiosk login as class attendance. Optional punctuality points and schedules can be configured in Admin → Attendance."
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
                                    label="Face Login"
                                    desc="Allow students to sign in using the kiosk webcam. Requires camera permission and deployed Cloud Functions."
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
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 px-3 pt-3 pb-2 flex items-center gap-2"><ShoppingBag className="w-3.5 h-3.5" /> Prize Shop</p>
                                <FeatureRow
                                    id="enableVendingMachine"
                                    label="Vending Machine"
                                    desc="Connect a USB serial vending rig and let configured prizes trigger a motor after redemption."
                                    icon={<Cog className="w-5 h-5" />}
                                    settings={settings}
                                    onToggle={handleToggle}
                                    onConfigure={() => setVendingSettingsOpen(true)}
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

                <Dialog open={vendingSettingsOpen} onOpenChange={setVendingSettingsOpen}>
                    <DialogContent className="sm:max-w-xl rounded-3xl">
                        <DialogHeader>
                            <DialogTitle>Vending Machine Settings</DialogTitle>
                        </DialogHeader>
                        <VendingMotorPanel />
                    </DialogContent>
                </Dialog>

                <DialogFooter className="px-6 py-6 sm:justify-end border-t border-border/40 bg-muted/20 absolute bottom-0 w-full left-0 z-10 hidden sm:flex">
                    <DialogClose asChild>
                        <Button className="w-full sm:w-auto px-12 h-11 text-xs uppercase tracking-widest bg-primary hover:bg-primary/90 text-primary-foreground font-black rounded-2xl shadow-lg transition-all active:scale-95">
                            Close Settings
                        </Button>
                    </DialogClose>
                </DialogFooter>

                {/* Mobile absolute footer */}
                <div className="p-4 border-t border-border/40 sm:hidden bg-background">
                    <DialogClose asChild>
                        <Button className="w-full h-14 text-xs uppercase tracking-widest bg-primary hover:bg-primary/90 text-primary-foreground font-black rounded-2xl shadow-lg active:scale-95">
                            Close Settings
                        </Button>
                    </DialogClose>
                </div>
            </DialogContent>
        </Dialog>
    );
}
