import { useState, useEffect, useLayoutEffect, useRef, type CSSProperties } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Award, ChevronRight, Loader2, Redo2, ScanBarcode, Trash2, Undo2, Wallet, Wand2 } from 'lucide-react';
import { StudentTheme } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { GoogleFontLoader } from './GoogleFontLoader';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useAppContext } from '@/components/AppProvider';
import { useAuthFetch } from '@/lib/authFetch';
import type { Student } from '@/lib/types';
import { StudentIdCard } from '@/components/student/StudentIdCard';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { APP_NAME, APP_TAGLINE, LEVELUP_BRAND_PRIMARY_HEX } from '@/lib/appBranding';
import { getStudentThemeCssVars, normalizeStudentTheme } from '@/lib/themeContrast';
import { useSchoolMetadataDocRef } from '@/hooks/useSchoolMetadataDocRef';
import {
    DEFAULT_ARCADE_AI_MODEL,
    getArcadeAiModelFromStorage,
    persistArcadeAiModel,
} from '@/lib/aiModelPreference';
import { useThemeEditorHistory } from '@/components/themes/useThemeEditorHistory';
import {
    buildLinearGradientCss,
    extractCssColors,
    hexForColorInput,
    inferBackgroundMode,
    linearGradientColors,
    parseEditableLinearGradient,
    replaceCssColor,
    uniqueBackgroundColors,
} from '@/components/themes/themeBackgroundStyle';

function StudentPortalThemePreview({
    theme,
    studentName,
}: {
    theme: StudentTheme;
    studentName: string;
}) {
    const themed = getStudentThemeCssVars(theme);
    if (!themed) return null;

    const { vars, effective } = themed;
    const themeBg = vars['--theme-bg'];
    const fontScale = effective.fontScale ?? 1.1;
    const previewStyle: CSSProperties = {
        ...vars,
        background:
            effective.backgroundStyle ||
            `radial-gradient(circle at top left, ${vars['--theme-primary']}22 0, transparent 45%), radial-gradient(circle at bottom right, ${vars['--theme-accent']}22 0, ${themeBg} 55%)`,
        color: 'var(--theme-page-text)',
        fontFamily: effective.fontFamily || undefined,
        fontSize: fontScale !== 1 ? `${fontScale}em` : undefined,
    };

    return (
        <div
            className="student-theme-surface overflow-hidden rounded-2xl border border-border shadow-inner"
            style={previewStyle}
        >
            {effective.fontFamily && <GoogleFontLoader fontFamily={effective.fontFamily} />}
            <div className="space-y-3 p-3">
                <div
                    className="rounded-xl border px-3 py-2.5"
                    style={{
                        backgroundColor: 'var(--theme-card)',
                        borderColor: 'var(--theme-primary)',
                        color: 'var(--theme-text)',
                    }}
                >
                    <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Welcome back,</p>
                            <div className="mt-1 flex items-center gap-2">
                                <div
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black"
                                    style={{
                                        backgroundColor: 'var(--theme-bg)',
                                        color: 'var(--theme-primary)',
                                    }}
                                >
                                    {effective.emoji || studentName.trim().charAt(0).toUpperCase() || 'S'}
                                </div>
                                <p className="truncate text-base font-black leading-tight">{studentName || 'Student Preview'}</p>
                            </div>
                        </div>
                        <div className="shrink-0 text-right">
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Balance</p>
                            <p className="text-2xl font-black leading-none" style={{ color: 'var(--theme-primary)' }}>
                                1,250
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    <div
                        className="rounded-xl border p-3"
                        style={{
                            backgroundColor: 'var(--theme-card)',
                            borderColor: 'color-mix(in srgb, var(--theme-primary) 42%, transparent)',
                            color: 'var(--theme-text)',
                        }}
                    >
                        <div className="mb-2 flex items-center gap-2">
                            <div
                                className="flex h-7 w-7 items-center justify-center rounded-lg"
                                style={{ backgroundColor: 'var(--theme-bg)' }}
                            >
                                <Wallet className="h-4 w-4" style={{ color: 'var(--theme-primary)' }} />
                            </div>
                            <p className="text-xs font-black">Redeem Coupon Code</p>
                        </div>
                        <div
                            className="mb-2 flex min-h-[2.75rem] items-center justify-center gap-2 rounded-lg border-2 border-dashed px-2 py-3"
                            style={{
                                borderColor: 'color-mix(in srgb, var(--theme-primary) 50%, transparent)',
                                background: `linear-gradient(165deg, color-mix(in srgb, var(--theme-primary) 54%, var(--theme-card)), color-mix(in srgb, var(--theme-primary) 64%, var(--theme-card)) 50%, color-mix(in srgb, var(--theme-primary) 54%, var(--theme-card)))`,
                                boxShadow:
                                    '0 12px 44px -10px color-mix(in srgb, var(--theme-primary) 48%, transparent)',
                                color: 'rgba(248, 250, 252, 0.97)',
                            }}
                        >
                            <ScanBarcode
                                className="h-5 w-5"
                                style={{ color: 'color-mix(in srgb, var(--theme-primary) 72%, white)' }}
                            />
                            <span className="text-xs font-black uppercase tracking-widest text-[rgba(248,250,252,0.97)]">
                                Scan coupon
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <div
                                className="min-w-0 flex-1 rounded-lg border px-2 py-2 font-mono text-[10px] tracking-widest"
                                style={{
                                    backgroundColor: 'var(--theme-bg)',
                                    borderColor: 'var(--theme-primary)',
                                    color: 'var(--theme-text)',
                                }}
                            >
                                ABC123
                            </div>
                            <div
                                className="rounded-lg px-3 py-2 text-[10px] font-black uppercase"
                                style={{
                                    backgroundColor: 'var(--theme-primary)',
                                    color: 'var(--theme-primary-foreground)',
                                }}
                            >
                                Redeem
                            </div>
                        </div>
                    </div>

                    <div
                        className="rounded-xl border p-3"
                        style={{
                            backgroundColor: 'var(--theme-card)',
                            borderColor: 'color-mix(in srgb, var(--theme-primary) 42%, transparent)',
                            color: 'var(--theme-text)',
                        }}
                    >
                        <div className="mb-2 flex items-center gap-2">
                            <div
                                className="flex h-7 w-7 items-center justify-center rounded-lg"
                                style={{ backgroundColor: 'var(--theme-bg)' }}
                            >
                                <Award className="h-4 w-4" style={{ color: 'var(--theme-primary)' }} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-black">Eligible Rewards</p>
                                <p className="text-[10px] font-medium opacity-70">Tap a reward to redeem it here.</p>
                            </div>
                        </div>
                        {['Homework Pass', 'Prize Box'].map((label, index) => (
                            <div
                                key={label}
                                className="mb-2 flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5 last:mb-0"
                                style={{
                                    backgroundColor: 'var(--theme-bg)',
                                    borderColor: 'color-mix(in srgb, var(--theme-primary) 35%, transparent)',
                                    color: 'var(--theme-text)',
                                }}
                            >
                                <span className="truncate text-[11px] font-black">{label}</span>
                                <span
                                    className="rounded px-1.5 py-0.5 text-[8px] font-black tracking-wider"
                                    style={{
                                        backgroundColor: 'var(--theme-primary)',
                                        color: 'var(--theme-primary-foreground)',
                                    }}
                                >
                                    {index === 0 ? '500' : '900'} PTS
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div
                    className="flex items-center justify-between rounded-xl border px-3 py-2"
                    style={{
                        backgroundColor: 'var(--theme-card)',
                        borderColor: 'color-mix(in srgb, var(--theme-primary) 35%, transparent)',
                        color: 'var(--theme-text)',
                    }}
                >
                    <div className="min-w-0">
                        <p className="text-xs font-black">Activity</p>
                        <p className="truncate text-[10px] font-medium opacity-70">+50 points from kindness coupon</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0" style={{ color: 'var(--theme-primary)' }} />
                </div>
            </div>
        </div>
    );
}

async function readJsonErrorMessage(response: Response, fallback: string): Promise<string> {
    try {
        const text = await response.text();
        if (!text) return fallback;
        try {
            const data = JSON.parse(text) as { error?: unknown };
            if (typeof data.error === 'string' && data.error.trim()) {
                return data.error.trim();
            }
        } catch {
            const t = text.trim();
            if (t.length > 0 && t.length <= 280) return t;
        }
    } catch {
        // ignore
    }
    return fallback;
}

interface ThemeGeneratorModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (theme: StudentTheme) => void;
    currentTheme?: StudentTheme;
    /** Shown in the dialog title; use full name when available. */
    studentName: string;
    /** When set, the live preview uses real student data (name, class, ID, photo, etc.). */
    previewStudent?: Student;
    /** Class line on the ID card, e.g. "Grade 8". Defaults to "Unassigned" if omitted. */
    classLabel?: string;
    /** When set, a “Remove theme” control calls this (e.g. clear student theme or school default). */
    onRemoveTheme?: () => void | Promise<void>;
}

export function ThemeGeneratorModal({
    isOpen,
    onOpenChange,
    onSave,
    currentTheme,
    studentName,
    previewStudent,
    classLabel = 'Unassigned',
    onRemoveTheme,
}: ThemeGeneratorModalProps) {
    const { settings } = useSettings();
    const initialTheme = currentTheme ?? settings.defaultStudentTheme ?? undefined;
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const {
        present: previewTheme,
        reset: resetThemeHistory,
        commit: commitTheme,
        commitFrom: commitThemeFrom,
        patch: updateTheme,
        undo: undoTheme,
        redo: redoTheme,
        canUndo,
        canRedo,
    } = useThemeEditorHistory(initialTheme);
    const [model, setModel] = useState<string>(DEFAULT_ARCADE_AI_MODEL);
    const [animatePreview, setAnimatePreview] = useState(false);
    const { toast } = useToast();
    const { schoolId } = useAppContext();
    const authFetch = useAuthFetch();
    const firestore = useFirestore();
    // Students/kiosks cannot read private `schools/{id}`. Use public mirror when not staff.
    const schoolDocRef = useSchoolMetadataDocRef();
    const { data: schoolData } = useDoc<{ name?: string; logoUrl?: string }>(schoolDocRef);
    const appConfigRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'appConfig', 'global') : null),
        [firestore],
    );
    const { data: appConfig } = useDoc<{ appLogoUrl?: string; appName?: string; appTagline?: string }>(appConfigRef);
    const previewSchoolName = (schoolData?.name ?? '').trim() || (schoolId ? schoolId : 'School');
    const previewSchoolLogoUrl = (schoolData?.logoUrl ?? '').trim() || null;
    const previewAppLogoUrl = appConfig?.appLogoUrl || null;
    const previewAppName = appConfig?.appName?.trim() || APP_NAME;
    const previewAppTagline = appConfig?.appTagline?.trim() ?? APP_TAGLINE;
    const displayTitleName = previewStudent
        ? `${previewStudent.firstName}${previewStudent.lastName ? ` ${previewStudent.lastName}` : ''}`.trim() || studentName
        : studentName;

    const previewWrapRef = useRef<HTMLDivElement | null>(null);
    const [idPreviewScale, setIdPreviewScale] = useState(1);
    const [gradientAngle, setGradientAngle] = useState('135');
    const [gradientA, setGradientA] = useState(initialTheme?.primary || LEVELUP_BRAND_PRIMARY_HEX);
    const [gradientB, setGradientB] = useState(initialTheme?.accent || '#22c55e');
    const [backgroundMode, setBackgroundMode] = useState<'solid' | 'gradient' | 'custom'>(() =>
        inferBackgroundMode(initialTheme),
    );
    const [isRemovingTheme, setIsRemovingTheme] = useState(false);

    useLayoutEffect(() => {
        const el = previewWrapRef.current;
        if (!el) return;

        // ISO ID-1: 85.6mm × 53.98mm (same as `.print-id-card` in globals.css)
        const MM_PER_IN = 25.4;
        const cardW = (85.6 / MM_PER_IN) * 96;
        const cardH = (53.98 / MM_PER_IN) * 96;
        const desired = 1; // 1:1 ISO ID-1 — matches print output

        const compute = () => {
            const r = el.getBoundingClientRect();
            const pad = 24; // match p-3/md:p-4 feel
            const availW = Math.max(0, r.width - pad);
            const availH = Math.max(0, r.height - pad);
            if (!availW || !availH) return;
            const fit = Math.min(availW / cardW, availH / cardH);
            const next = Math.max(0.9, Math.min(desired, fit));
            setIdPreviewScale((prev) => (Math.abs(prev - next) < 0.01 ? prev : next));
        };

        compute();
        let ro: ResizeObserver | null = null;
        if (typeof ResizeObserver !== 'undefined') {
            ro = new ResizeObserver(() => compute());
            ro.observe(el);
        }
        const t = window.setTimeout(() => compute(), 0);

        return () => {
            window.clearTimeout(t);
            if (ro) ro.disconnect();
        };
    }, [isOpen]);

    // When the dialog opens, reset preview from the latest saved theme (per student / school default).
    useEffect(() => {
        if (!isOpen) return;
        setModel(getArcadeAiModelFromStorage());
        const initial = currentTheme ?? settings.defaultStudentTheme ?? undefined;
        resetThemeHistory(initial);
        setPrompt('');
        setBackgroundMode(inferBackgroundMode(initial));
    }, [isOpen, currentTheme, settings.defaultStudentTheme, resetThemeHistory]);

    // Keep gradient controls and background mode in sync with the active preview theme.
    useEffect(() => {
        if (!previewTheme) return;
        const mode = inferBackgroundMode(previewTheme);
        setBackgroundMode(mode);
        if (mode !== 'gradient' || !previewTheme.backgroundStyle) return;
        const parsed = parseEditableLinearGradient(previewTheme.backgroundStyle);
        if (!parsed) return;
        setGradientAngle(parsed.angle);
        setGradientA(hexForColorInput(parsed.colorA, previewTheme.primary || LEVELUP_BRAND_PRIMARY_HEX));
        setGradientB(hexForColorInput(parsed.colorB, previewTheme.accent || '#22c55e'));
    }, [
        previewTheme,
        previewTheme?.backgroundStyle,
        previewTheme?.primary,
        previewTheme?.accent,
    ]);

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            toast({
                title: 'Prompt required',
                description: 'Please enter a description for the theme.',
                variant: 'destructive',
            });
            return;
        }

        setIsGenerating(true);
        try {
            if (!schoolId) throw new Error('No school session found.');
            const response = await authFetch('/api/generate-theme', {
                method: 'POST',
                body: JSON.stringify({ prompt, model, schoolId }),
            });

            if (!response.ok) {
                const msg = await readJsonErrorMessage(response, 'Failed to generate theme.');
                throw new Error(msg);
            }

            const generatedTheme: StudentTheme = await response.json();
            commitTheme(generatedTheme);
            toast({
                title: 'Theme Generated',
                description: 'Preview the new theme below before saving.',
            });
        } catch (error) {
            console.error('Error generating theme:', error);
            const description =
                error instanceof Error && error.message
                    ? error.message
                    : 'There was a problem generating the theme. Please try again.';
            toast({
                title: 'Failed to generate theme',
                description,
                variant: 'destructive',
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const normalizedPreviewTheme = normalizeStudentTheme(previewTheme);

    const handleSave = () => {
        if (!previewTheme) return;
        // Persist only contrast-normalized themes so low-contrast palettes can't be stored.
        onSave(normalizedPreviewTheme ?? previewTheme);
        onOpenChange(false);
    };

    const canRemoveThemeFromWizard = Boolean(previewTheme || currentTheme);

    const parsedLinearGradient = previewTheme?.backgroundStyle
        ? parseEditableLinearGradient(previewTheme.backgroundStyle)
        : null;

    const aiBackgroundColors =
        backgroundMode === 'custom' && previewTheme?.backgroundStyle
            ? uniqueBackgroundColors(previewTheme.backgroundStyle)
            : [];

    const applyLinearGradientColors = (colors: string[], angle: string = gradientAngle) => {
        if (colors.length === 0) return;
        const css = buildLinearGradientCss(angle, colors);
        const lead = colors[0];
        setGradientA(hexForColorInput(lead, LEVELUP_BRAND_PRIMARY_HEX));
        setGradientB(hexForColorInput(colors[colors.length - 1], '#22c55e'));
        updateTheme({ backgroundStyle: css, background: lead });
    };

    const patchThemeBackgroundSwatch = (newHex: string) => {
        if (!previewTheme) return;
        const bs = previewTheme.backgroundStyle?.trim();
        if (!bs) {
            updateTheme({ background: newHex, backgroundStyle: null });
            return;
        }
        const colors = extractCssColors(bs);
        const anchor = colors[0] ?? previewTheme.background;
        updateTheme({
            background: newHex,
            backgroundStyle: replaceCssColor(bs, anchor, newHex),
        });
    };

    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            const target = e.target;
            if (target instanceof HTMLElement) {
                const tag = target.tagName;
                if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) {
                    return;
                }
            }
            const mod = e.ctrlKey || e.metaKey;
            if (!mod) return;
            if (e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undoTheme();
                return;
            }
            if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
                e.preventDefault();
                redoTheme();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen, undoTheme, redoTheme]);

    const handleRemoveTheme = async () => {
        if (!canRemoveThemeFromWizard) return;
        setIsRemovingTheme(true);
        try {
            if (onRemoveTheme) {
                await onRemoveTheme();
            } else {
                toast({
                    title: 'Preview cleared',
                    description: 'Generate again or close the dialog.',
                });
            }
            resetThemeHistory(undefined);
            onOpenChange(false);
        } catch (error) {
            console.error('Remove theme failed:', error);
            const description =
                error instanceof Error && error.message
                    ? error.message
                    : 'Could not remove the theme. Please try again.';
            toast({ title: 'Failed to remove theme', description, variant: 'destructive' });
        } finally {
            setIsRemovingTheme(false);
        }
    };

    const generateWithAI = async (kind: 'emoji' | 'font') => {
        if (!prompt.trim()) {
            toast({
                title: 'Prompt required',
                description: 'Enter a prompt first so AI knows what style to match.',
                variant: 'destructive',
            });
            return;
        }
        setIsGenerating(true);
        try {
            if (!schoolId) throw new Error('No school session found.');
            const response = await authFetch('/api/generate-theme', {
                method: 'POST',
                body: JSON.stringify({ prompt, model, schoolId }),
            });
            if (!response.ok) {
                const msg = await readJsonErrorMessage(response, 'Failed to generate theme.');
                throw new Error(msg);
            }
            const generated: StudentTheme = await response.json();
            commitThemeFrom((prev) => {
                if (!prev) return generated;
                if (kind === 'emoji') {
                    return { ...prev, emoji: generated.emoji || prev.emoji };
                }
                if (kind === 'font') {
                    return { ...prev, fontFamily: generated.fontFamily || prev.fontFamily };
                }
                return prev;
            });
            toast({
                title: 'AI suggestion applied',
                description: kind === 'emoji' ? 'Updated the icon to match your prompt.' : 'Updated the font to match your prompt.',
            });
        } catch (error) {
            console.error('Error generating theme for fine‑tune:', error);
            const description =
                error instanceof Error && error.message
                    ? error.message
                    : 'There was a problem asking AI for a suggestion. Please try again.';
            toast({
                title: 'Failed to generate suggestion',
                description,
                variant: 'destructive',
            });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent wide className="max-h-[min(92dvh,92vh)]" data-settings-open="true">
                <DialogHeader>
                    <DialogTitle>Generate theme for {displayTitleName}</DialogTitle>
                    <DialogDescription>
                        Describe a theme and let AI generate a custom look. Themes can include gradients/patterns, and even “animated vibe” ideas (moving colors or playful motion like an emoji popping in/out).
                        After generating, you can also fine‑tune specific parts like the emoji and colors.
                        Use fonts that are easy to read on kiosk screens—clear sans-serif typefaces work best; avoid decorative, script, or ultra-narrow fonts.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="grid gap-6 lg:grid-cols-[360px_1fr] lg:items-start">
                        <div className="space-y-6">
                            <div className="grid gap-2">
                                <Label>AI Generation Model</Label>
                                <Select
                                    value={model}
                                    onValueChange={(v: string) => {
                                        setModel(v);
                                        persistArcadeAiModel(v);
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Model" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="gpt-4o-mini">OpenAI GPT-4o-mini (Default)</SelectItem>
                                        <SelectItem value="gpt-4o">OpenAI GPT-4o (Robust)</SelectItem>
                                        <SelectItem value="gemini-2.5-flash">Google Gemini 2.5 Flash</SelectItem>
                                        <SelectItem value="gemini-2.5-flash-lite">Google Gemini 2.5 Flash-Lite</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="prompt">Prompt</Label>
                                <div className="flex items-end gap-2">
                                    <Input
                                        id="prompt"
                                        placeholder="e.g., Ocean blues and warm sand tones"
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleGenerate();
                                            }
                                        }}
                                    />
                                    <Button onClick={handleGenerate} disabled={isGenerating || !prompt.trim()} className="shrink-0">
                                        {isGenerating ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <Wand2 className="w-4 h-4 mr-2" />
                                        )}
                                        Generate
                                    </Button>
                                </div>
                            </div>

                            {previewTheme ? (
                                <div className="space-y-3">
                                    <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-muted-foreground">
                                        Fine‑tune
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label htmlFor="theme-emoji">Emoji (optional)</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    id="theme-emoji"
                                                    value={previewTheme.emoji || ''}
                                                    onChange={(e) => updateTheme({ emoji: e.target.value })}
                                                    placeholder="e.g. ⭐"
                                                    className="font-mono"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    className="shrink-0"
                                                    disabled={isGenerating}
                                                    onClick={() => generateWithAI('emoji')}
                                                    title="Ask AI for an emoji"
                                                >
                                                    <Wand2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor="theme-font">Font (optional)</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    id="theme-font"
                                                    value={previewTheme.fontFamily || ''}
                                                    onChange={(e) => updateTheme({ fontFamily: e.target.value || undefined })}
                                                    placeholder="e.g. Orbitron"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    className="shrink-0"
                                                    disabled={isGenerating}
                                                    onClick={() => generateWithAI('font')}
                                                    title="Ask AI for a font"
                                                >
                                                    <Wand2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                            <p className="text-[11px] leading-snug text-muted-foreground">
                                                Tip: Don&apos;t use fonts that are hard to read. Stick to simple, legible typefaces students can scan quickly on the kiosk.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 items-end">
                                        <div className="space-y-1">
                                            <Label htmlFor="theme-font-scale">Text size</Label>
                                            <Select
                                                value={String(previewTheme.fontScale ?? 1.1)}
                                                onValueChange={(v) => updateTheme({ fontScale: parseFloat(v) })}
                                            >
                                                <SelectTrigger id="theme-font-scale">
                                                    <SelectValue placeholder="Default" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="0.85">Extra small</SelectItem>
                                                    <SelectItem value="1">Standard (Smaller)</SelectItem>
                                                    <SelectItem value="1.1">+1 step</SelectItem>
                                                    <SelectItem value="1.15">Default (Bigger)</SelectItem>
                                                    <SelectItem value="1.2">+1 step</SelectItem>
                                                    <SelectItem value="1.25">Large</SelectItem>
                                                    <SelectItem value="1.3">Extra large</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor="theme-font-tracking">Text tracking</Label>
                                            <Select
                                                value={String(previewTheme.fontTracking ?? 0.02)}
                                                onValueChange={(v) => updateTheme({ fontTracking: parseFloat(v) })}
                                            >
                                                <SelectTrigger id="theme-font-tracking">
                                                    <SelectValue placeholder="Default" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="-0.01">Tighter</SelectItem>
                                                    <SelectItem value="0">Default</SelectItem>
                                                    <SelectItem value="0.02">Slight</SelectItem>
                                                    <SelectItem value="0.06">Wide</SelectItem>
                                                    <SelectItem value="0.1">Widest</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 items-end">
                                        <div className="space-y-1">
                                            <Label>Style</Label>
                                            <div className="flex items-center gap-3 pt-1">
                                                <label className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground select-none cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={(previewTheme.fontWeight ?? 400) >= 700}
                                                        onChange={(e) => updateTheme({ fontWeight: e.target.checked ? 800 : 400 })}
                                                    />
                                                    Bold
                                                </label>
                                                <label className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground select-none cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={(previewTheme.fontStyle ?? 'normal') === 'italic'}
                                                        onChange={(e) => updateTheme({ fontStyle: e.target.checked ? 'italic' : 'normal' })}
                                                    />
                                                    Italics
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-5 gap-2">
                                        {[
                                            { key: 'background', label: 'BG' },
                                            { key: 'text', label: 'Text' },
                                            { key: 'primary', label: 'Primary' },
                                            { key: 'cardBackground', label: 'Card' },
                                            { key: 'accent', label: 'Accent' },
                                        ].map(({ key, label }) => {
                                            const value = (previewTheme as any)[key] as string | undefined;
                                            const swatchHex =
                                                key === 'background' && previewTheme.backgroundStyle
                                                    ? hexForColorInput(
                                                          extractCssColors(previewTheme.backgroundStyle)[0] ??
                                                              value,
                                                          '#020617',
                                                      )
                                                    : hexForColorInput(value, '#000000');
                                            return (
                                                <label key={key} className="flex flex-col items-center gap-1 text-[10px] uppercase font-bold text-muted-foreground cursor-pointer">
                                                    <span
                                                        className="w-9 h-9 rounded-xl border border-border shadow-sm"
                                                        style={{ backgroundColor: swatchHex }}
                                                    />
                                                    <span>{label}</span>
                                                    <input
                                                        type="color"
                                                        className="sr-only"
                                                        value={swatchHex}
                                                        onChange={(e) => {
                                                            const v = e.target.value;
                                                            if (key === 'background') {
                                                                patchThemeBackgroundSwatch(v);
                                                                return;
                                                            }
                                                            updateTheme({ [key]: v } as Partial<StudentTheme>);
                                                        }}
                                                    />
                                                </label>
                                            );
                                        })}
                                    </div>
                                    <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-3">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="theme-bg-style-mode">Card background style</Label>
                                            <Select
                                                value={backgroundMode}
                                                onValueChange={(v) => {
                                                    const mode = v as typeof backgroundMode;
                                                    setBackgroundMode(mode);
                                                    if (mode === 'solid') {
                                                        updateTheme({ backgroundStyle: null });
                                                    } else if (mode === 'gradient') {
                                                        const fromAi = previewTheme.backgroundStyle
                                                            ? uniqueBackgroundColors(previewTheme.backgroundStyle)
                                                            : [];
                                                        const colors =
                                                            fromAi.length >= 2
                                                                ? fromAi
                                                                : [
                                                                      gradientA ||
                                                                          previewTheme.primary ||
                                                                          LEVELUP_BRAND_PRIMARY_HEX,
                                                                      gradientB ||
                                                                          previewTheme.accent ||
                                                                          '#22c55e',
                                                                  ];
                                                        setGradientAngle(
                                                            parseEditableLinearGradient(
                                                                previewTheme.backgroundStyle || '',
                                                            )?.angle ?? gradientAngle,
                                                        );
                                                        applyLinearGradientColors(colors);
                                                    }
                                                }}
                                            >
                                                <SelectTrigger id="theme-bg-style-mode">
                                                    <SelectValue placeholder="Select style" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="solid">Solid</SelectItem>
                                                    <SelectItem value="gradient">Gradient</SelectItem>
                                                    <SelectItem value="custom">Advanced / Image</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {backgroundMode === 'solid' ? (
                                            <div className="space-y-2">
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] uppercase tracking-[0.18em]">Background color</Label>
                                                    <div className="flex gap-2 items-center">
                                                        <label className="relative h-10 w-[3.25rem] shrink-0 cursor-pointer overflow-hidden rounded-lg border border-border shadow-sm">
                                                            <span
                                                                className="absolute inset-0"
                                                                style={{
                                                                    backgroundColor: hexForColorInput(previewTheme.background, '#020617'),
                                                                }}
                                                            />
                                                            <input
                                                                type="color"
                                                                aria-label="Pick solid background color"
                                                                value={hexForColorInput(previewTheme.background, '#020617')}
                                                                onChange={(e) => {
                                                                    const v = e.target.value;
                                                                    updateTheme({ background: v, backgroundStyle: null });
                                                                }}
                                                                className="sr-only"
                                                            />
                                                        </label>
                                                        <Input
                                                            value={previewTheme.background || ''}
                                                            onChange={(e) =>
                                                                updateTheme({
                                                                    background: e.target.value || '#020617',
                                                                    backgroundStyle: null,
                                                                })
                                                            }
                                                            className="min-w-0 flex-1 font-mono text-xs"
                                                            placeholder="#hex or CSS color"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : backgroundMode === 'gradient' ? (
                                            <div className="space-y-3">
                                                <div
                                                    className="h-11 w-full rounded-xl border border-border shadow-inner"
                                                    style={{
                                                        backgroundImage:
                                                            previewTheme.backgroundStyle?.trim().startsWith(
                                                                'linear-gradient',
                                                            )
                                                                ? previewTheme.backgroundStyle
                                                                : `linear-gradient(${gradientAngle}deg, ${gradientA} 0%, ${gradientB} 100%)`,
                                                    }}
                                                    aria-hidden
                                                />
                                                <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-3">
                                                    <div className="space-y-1.5">
                                                        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                                                            Color A
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <label className="relative block h-10 w-10 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-border shadow-sm">
                                                                <span
                                                                    className="absolute inset-0"
                                                                    style={{ backgroundColor: gradientA }}
                                                                />
                                                                <input
                                                                    type="color"
                                                                    aria-label="Gradient color A"
                                                                    value={gradientA}
                                                                    className="sr-only"
                                                                    onChange={(e) => {
                                                                        const v = e.target.value;
                                                                        setGradientA(v);
                                                                        const middles = parsedLinearGradient?.middleColors ?? [];
                                                                        applyLinearGradientColors([v, ...middles, gradientB]);
                                                                    }}
                                                                />
                                                            </label>
                                                            <Input
                                                                value={gradientA}
                                                                onChange={(e) => {
                                                                    const v = hexForColorInput(e.target.value, gradientA);
                                                                    setGradientA(v);
                                                                    const middles = parsedLinearGradient?.middleColors ?? [];
                                                                    applyLinearGradientColors([v, ...middles, gradientB]);
                                                                }}
                                                                className="min-w-0 flex-1 font-mono text-xs"
                                                                placeholder="#hex"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                                                            Color B
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <label className="relative block h-10 w-10 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-border shadow-sm">
                                                                <span
                                                                    className="absolute inset-0"
                                                                    style={{ backgroundColor: gradientB }}
                                                                />
                                                                <input
                                                                    type="color"
                                                                    aria-label="Gradient color B"
                                                                    value={gradientB}
                                                                    className="sr-only"
                                                                    onChange={(e) => {
                                                                        const v = e.target.value;
                                                                        setGradientB(v);
                                                                        const middles = parsedLinearGradient?.middleColors ?? [];
                                                                        applyLinearGradientColors([gradientA, ...middles, v]);
                                                                    }}
                                                                />
                                                            </label>
                                                            <Input
                                                                value={gradientB}
                                                                onChange={(e) => {
                                                                    const v = hexForColorInput(e.target.value, gradientB);
                                                                    setGradientB(v);
                                                                    const middles = parsedLinearGradient?.middleColors ?? [];
                                                                    applyLinearGradientColors([gradientA, ...middles, v]);
                                                                }}
                                                                className="min-w-0 flex-1 font-mono text-xs"
                                                                placeholder="#hex"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                                                            Angle
                                                        </span>
                                                        <Select
                                                            value={gradientAngle}
                                                            onValueChange={(v) => {
                                                                setGradientAngle(v);
                                                                const colors = parsedLinearGradient
                                                                    ? linearGradientColors(parsedLinearGradient)
                                                                    : [gradientA, gradientB];
                                                                applyLinearGradientColors(colors, v);
                                                            }}
                                                        >
                                                            <SelectTrigger className="h-10 w-full">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="45">45°</SelectItem>
                                                                <SelectItem value="90">90°</SelectItem>
                                                                <SelectItem value="135">135°</SelectItem>
                                                                <SelectItem value="180">180°</SelectItem>
                                                                <SelectItem value="225">225°</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                                {parsedLinearGradient && parsedLinearGradient.middleColors.length > 0 ? (
                                                    <div className="space-y-2">
                                                        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                                                            Middle colors (from AI)
                                                        </span>
                                                        <div className="flex flex-wrap gap-2">
                                                            {parsedLinearGradient.middleColors.map((mid, idx) => (
                                                                <label
                                                                    key={`${mid}-${idx}`}
                                                                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5 cursor-pointer"
                                                                >
                                                                    <span
                                                                        className="h-8 w-8 shrink-0 rounded-md border border-border shadow-sm"
                                                                        style={{ backgroundColor: hexForColorInput(mid, '#888888') }}
                                                                    />
                                                                    <span className="text-[10px] font-bold text-muted-foreground">
                                                                        Stop {idx + 2}
                                                                    </span>
                                                                    <input
                                                                        type="color"
                                                                        className="sr-only"
                                                                        value={hexForColorInput(mid, '#888888')}
                                                                        aria-label={`Gradient middle color ${idx + 1}`}
                                                                        onChange={(e) => {
                                                                            const middles = [
                                                                                ...parsedLinearGradient.middleColors,
                                                                            ];
                                                                            middles[idx] = e.target.value;
                                                                            applyLinearGradientColors([
                                                                                gradientA,
                                                                                ...middles,
                                                                                gradientB,
                                                                            ]);
                                                                        }}
                                                                    />
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : null}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-2">
                                                {aiBackgroundColors.length > 0 ? (
                                                    <div className="space-y-2">
                                                        <Label>Background colors from AI</Label>
                                                        <p className="text-[10px] leading-snug text-muted-foreground">
                                                            Tweak radial, patterned, or multi-stop backgrounds without editing raw CSS.
                                                        </p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {aiBackgroundColors.map((color, idx) => (
                                                                <label
                                                                    key={`${color}-${idx}`}
                                                                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5 cursor-pointer"
                                                                >
                                                                    <span
                                                                        className="h-8 w-8 shrink-0 rounded-md border border-border shadow-sm"
                                                                        style={{
                                                                            backgroundColor: hexForColorInput(color, '#888888'),
                                                                        }}
                                                                    />
                                                                    <span className="text-[10px] font-bold text-muted-foreground">
                                                                        Color {idx + 1}
                                                                    </span>
                                                                    <input
                                                                        type="color"
                                                                        className="sr-only"
                                                                        value={hexForColorInput(color, '#888888')}
                                                                        aria-label={`AI background color ${idx + 1}`}
                                                                        onChange={(e) => {
                                                                            const newHex = e.target.value;
                                                                            if (!previewTheme?.backgroundStyle) return;
                                                                            const nextStyle = replaceCssColor(
                                                                                previewTheme.backgroundStyle,
                                                                                color,
                                                                                newHex,
                                                                            );
                                                                            updateTheme({
                                                                                background:
                                                                                    idx === 0
                                                                                        ? newHex
                                                                                        : previewTheme.background,
                                                                                backgroundStyle: nextStyle,
                                                                            });
                                                                        }}
                                                                    />
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : null}
                                                <Input
                                                    id="theme-background-style"
                                                    value={backgroundMode === 'custom' ? (previewTheme.backgroundStyle || '') : ''}
                                                    onChange={(e) => {
                                                        setBackgroundMode('custom');
                                                        updateTheme({ backgroundStyle: e.target.value || null });
                                                    }}
                                                    placeholder="Background value, e.g. linear-gradient(...)"
                                                    className="font-mono text-xs"
                                                    disabled={backgroundMode !== 'custom'}
                                                />
                                                <Input
                                                    type="file"
                                                    accept="image/*"
                                                    disabled={backgroundMode !== 'custom'}
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;
                                                        const reader = new FileReader();
                                                        reader.onload = () => {
                                                            const dataUrl = String(reader.result || '');
                                                            if (!dataUrl) return;
                                                            setBackgroundMode('custom');
                                                            updateTheme({
                                                                backgroundStyle: `url("${dataUrl}") center / cover no-repeat`,
                                                            });
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }}
                                                    className="text-xs"
                                                />
                                                <p className="text-[10px] text-muted-foreground">
                                                    Paste a background value or upload an image (small files recommended).
                                                </p>
                                            </div>
                                        )}
                                        {backgroundMode !== 'custom' ? (
                                            <p className="text-[10px] text-muted-foreground">
                                                Solid and gradient modes keep the ID card preview in sync with the colors above.
                                            </p>
                                        ) : null}
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <Label>Live Preview</Label>
                                <div className="flex items-center gap-2">
                                    {settings.enableThemeAnimations && previewTheme ? (
                                        <label className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground select-none cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={animatePreview}
                                                onChange={(e) => setAnimatePreview(e.target.checked)}
                                            />
                                            Animations
                                        </label>
                                    ) : null}
                                    <div className="flex items-center gap-1">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={!canUndo}
                                            onClick={undoTheme}
                                            title="Undo (Ctrl+Z)"
                                            aria-label="Undo theme change"
                                        >
                                            <Undo2 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={!canRedo}
                                            onClick={redoTheme}
                                            title="Redo (Ctrl+Y)"
                                            aria-label="Redo theme change"
                                        >
                                            <Redo2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            <div
                                className={cn(
                                    "w-full h-64 md:h-72 lg:h-[520px] rounded-2xl border border-border shadow-inner overflow-hidden relative transition-colors duration-500",
                                    "bg-gradient-to-br from-muted/80 to-muted",
                                    settings.enableThemeAnimations && normalizedPreviewTheme && animatePreview && "theme-idcard-animated",
                                    !normalizedPreviewTheme && "flex items-center justify-center text-muted-foreground"
                                )}
                                style={normalizedPreviewTheme ? {
                                    ['--theme-bg' as any]: normalizedPreviewTheme.backgroundStyle ? 'transparent' : (normalizedPreviewTheme.background || '#020617'),
                                    ['--theme-primary' as any]: normalizedPreviewTheme.primary || LEVELUP_BRAND_PRIMARY_HEX,
                                    ['--theme-accent' as any]: normalizedPreviewTheme.accent || '#22c55e',
                                } : undefined}
                            >
                                {normalizedPreviewTheme?.fontFamily && <GoogleFontLoader fontFamily={normalizedPreviewTheme.fontFamily} />}

                                {!normalizedPreviewTheme ? (
                                    <p>No theme generated yet</p>
                                ) : (
                                    (() => {
                                        const [firstName, ...rest] = studentName.trim().split(/\s+/);
                                        const lastName = rest.join(' ') || 'Student';
                                        const synthetic: Student = {
                                            id: 'preview-student',
                                            firstName: firstName || 'Preview',
                                            lastName,
                                            points: 0,
                                            nfcId: '00000000',
                                            theme: normalizedPreviewTheme,
                                        };
                                        const cardStudent: Student = previewStudent
                                            ? { ...previewStudent, theme: normalizedPreviewTheme }
                                            : synthetic;

                                        return (
                                            <div className="h-full w-full grid grid-cols-1 lg:grid-cols-2 gap-3 p-3 md:p-4">
                                                <div
                                                    ref={previewWrapRef}
                                                    className="min-h-0 min-w-0 flex items-center justify-center rounded-xl bg-black/5 dark:bg-white/5"
                                                >
                                                    <div
                                                        className="student-id-card-screen-preview shrink-0"
                                                        style={{
                                                            transform: idPreviewScale < 1 ? `scale(${idPreviewScale})` : undefined,
                                                            transformOrigin: 'center',
                                                        }}
                                                    >
                                                        <StudentIdCard
                                                            student={cardStudent}
                                                            schoolName={previewSchoolName}
                                                            schoolLogoUrl={previewSchoolLogoUrl}
                                                            className={classLabel}
                                                            isColorEnabled={settings.enableColorPrinting}
                                                            appLogoUrl={previewAppLogoUrl}
                                                            appName={previewAppName}
                                                            appTagline={previewAppTagline}
                                                            forceStudentThemePreview
                                                        />
                                                    </div>
                                                </div>

                                                <div className="min-h-0 min-w-0 flex flex-col rounded-xl bg-black/5 dark:bg-white/5 overflow-hidden">
                                                    <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b border-border/40">
                                                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                                                            Student Portal Preview
                                                        </span>
                                                        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                                                            Readability check
                                                        </span>
                                                    </div>
                                                    <div className="min-h-0 flex-1 overflow-auto p-3">
                                                        <StudentPortalThemePreview
                                                            theme={normalizedPreviewTheme}
                                                            studentName={displayTitleName}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()
                                )}
                            </div>

                            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                                    {canRemoveThemeFromWizard ? (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                            disabled={isRemovingTheme}
                                            onClick={() => void handleRemoveTheme()}
                                        >
                                            {isRemovingTheme ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="mr-2 h-4 w-4" />
                                            )}
                                            Remove theme
                                        </Button>
                                    ) : null}
                                </div>
                                <div className="flex w-full justify-end gap-2 sm:w-auto">
                                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                                        Cancel
                                    </Button>
                                    <Button onClick={handleSave} disabled={!previewTheme}>
                                        Save & Apply Theme
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
