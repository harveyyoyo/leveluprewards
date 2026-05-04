import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wand2, Loader2, Trash2 } from 'lucide-react';
import { StudentTheme } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn, getContrastColor } from '@/lib/utils';
import { GoogleFontLoader } from './GoogleFontLoader';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useAppContext } from '@/components/AppProvider';
import { useAuthFetch } from '@/lib/authFetch';
import type { Student } from '@/lib/types';
import { StudentIdCard } from '@/components/StudentIdCard';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { APP_NAME, APP_TAGLINE } from '@/lib/app-branding';

function hexForColorInput(color: string | undefined, fallback: string): string {
    if (!color) return fallback;
    const c = color.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(c)) return c;
    const m3 = c.match(/^#([0-9a-fA-F]{3})$/);
    if (m3) {
        const x = m3[1];
        return `#${x[0]}${x[0]}${x[1]}${x[1]}${x[2]}${x[2]}`;
    }
    return fallback;
}

function cssColorToHexForPicker(color: string, fallback: string): string {
    const t = color.trim();
    if (/^#/i.test(t)) return hexForColorInput(t, fallback);
    const rgb = t.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (rgb) {
        const r = Math.min(255, parseInt(rgb[1], 10));
        const g = Math.min(255, parseInt(rgb[2], 10));
        const b = Math.min(255, parseInt(rgb[3], 10));
        return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
    }
    return fallback;
}

const GRADIENT_ANGLE_OPTS = [45, 90, 135, 180, 225] as const;
function snapGradientAngleDeg(deg: number): string {
    let best: (typeof GRADIENT_ANGLE_OPTS)[number] = GRADIENT_ANGLE_OPTS[0];
    let bestD = Infinity;
    for (const o of GRADIENT_ANGLE_OPTS) {
        const d = Math.abs(o - deg);
        if (d < bestD) {
            bestD = d;
            best = o;
        }
    }
    return String(best);
}

function parseWizardLinearGradient(backgroundStyle: string): { angle: string; colorA: string; colorB: string } | null {
    const norm = backgroundStyle.replace(/\s+/g, ' ').trim();
    const m = norm.match(
        /^linear-gradient\(\s*(\d+(?:\.\d+)?)deg\s*,\s*((?:#[\da-fA-F]{3,8}|rgba?\([^)]+\)))\s+0%\s*,\s*((?:#[\da-fA-F]{3,8}|rgba?\([^)]+\)))\s+100%\s*\)$/i,
    );
    if (!m) return null;
    return {
        angle: snapGradientAngleDeg(parseFloat(m[1])),
        colorA: m[2].trim(),
        colorB: m[3].trim(),
    };
}

function inferBackgroundMode(theme: StudentTheme | undefined): 'solid' | 'gradient' | 'custom' {
    if (!theme?.backgroundStyle?.trim()) return 'solid';
    const bs = theme.backgroundStyle.trim();
    if (bs.startsWith('linear-gradient') && parseWizardLinearGradient(bs)) return 'gradient';
    return 'custom';
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
    const [previewTheme, setPreviewTheme] = useState<StudentTheme | undefined>(initialTheme);
    const [previousTheme, setPreviousTheme] = useState<StudentTheme | undefined>(initialTheme);
    const [model, setModel] = useState<string>('gpt-4o-mini');
    const [animatePreview, setAnimatePreview] = useState(false);
    const { toast } = useToast();
    const { schoolId } = useAppContext();
    const authFetch = useAuthFetch();
    const firestore = useFirestore();
    const schoolDocRef = useMemoFirebase(
        () => (schoolId ? doc(firestore, 'schools', schoolId) : null),
        [firestore, schoolId],
    );
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
    const [idPreviewScale, setIdPreviewScale] = useState(1.35);
    const [gradientAngle, setGradientAngle] = useState('135');
    const [gradientA, setGradientA] = useState(initialTheme?.primary || '#0ea5e9');
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
        const desired = 1.85; // "make it bigger" but still fit

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

    // Load provider from local storage on mount
    useEffect(() => {
        const savedModel = localStorage.getItem('arcade_ai_model');
        if (savedModel) setModel(savedModel);
    }, []);

    // When the dialog opens, reset preview from the latest saved theme (per student / school default).
    useEffect(() => {
        if (!isOpen) return;
        const initial = currentTheme ?? settings.defaultStudentTheme ?? undefined;
        setPreviewTheme(initial);
        setPreviousTheme(initial);
        setPrompt('');
        setBackgroundMode(inferBackgroundMode(initial));
    }, [isOpen, currentTheme, settings.defaultStudentTheme]);

    // Keep gradient controls and background mode in sync with the active preview theme.
    useEffect(() => {
        if (!previewTheme) return;
        const mode = inferBackgroundMode(previewTheme);
        setBackgroundMode(mode);
        if (mode !== 'gradient' || !previewTheme.backgroundStyle) return;
        const parsed = parseWizardLinearGradient(previewTheme.backgroundStyle);
        if (!parsed) return;
        setGradientAngle(parsed.angle);
        setGradientA(cssColorToHexForPicker(parsed.colorA, previewTheme.primary || '#0ea5e9'));
        setGradientB(cssColorToHexForPicker(parsed.colorB, previewTheme.accent || '#22c55e'));
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
            setPreviousTheme(previewTheme || currentTheme);
            setPreviewTheme(generatedTheme);
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
                title: 'Error',
                description,
                variant: 'destructive',
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = () => {
        if (!previewTheme) return;
        onSave(previewTheme);
        onOpenChange(false);
    };

    const updateTheme = (partial: Partial<StudentTheme>) => {
        setPreviewTheme(prev => (prev ? { ...prev, ...partial } : prev));
    };

    const handleRevert = () => {
        if (previousTheme) {
            setPreviewTheme(previousTheme);
        }
    };

    const canRemoveThemeFromWizard = Boolean(previewTheme || currentTheme);

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
            setPreviewTheme(undefined);
            setPreviousTheme(undefined);
            onOpenChange(false);
        } catch (error) {
            console.error('Remove theme failed:', error);
            const description =
                error instanceof Error && error.message
                    ? error.message
                    : 'Could not remove the theme. Please try again.';
            toast({ title: 'Error', description, variant: 'destructive' });
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
            setPreviewTheme(prev => {
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
                title: 'Error',
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
                                        localStorage.setItem('arcade_ai_model', v);
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Model" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="gemini-2.5-flash">Google Gemini 2.5 Flash (Fastest)</SelectItem>
                                        <SelectItem value="gemini-2.5-pro">Google Gemini 2.5 Pro (Best Reasoning)</SelectItem>
                                        <SelectItem value="gpt-4o-mini">OpenAI GPT-4o-mini (Fast)</SelectItem>
                                        <SelectItem value="gpt-4o">OpenAI GPT-4o (Robust)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="prompt">Prompt</Label>
                                <div className="flex items-end gap-2">
                                    <Input
                                        id="prompt"
                                        placeholder="e.g., Cyberpunk neon greens and purples"
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
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 items-end">
                                        <div className="space-y-1">
                                            <Label htmlFor="theme-font-scale">Text size</Label>
                                            <Select
                                                value={String(previewTheme.fontScale ?? 1.15)}
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
                                                value={String(previewTheme.fontTracking ?? 0)}
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
                                            return (
                                                <label key={key} className="flex flex-col items-center gap-1 text-[10px] uppercase font-bold text-muted-foreground cursor-pointer">
                                                    <span
                                                        className="w-9 h-9 rounded-xl border border-border shadow-sm"
                                                        style={{ backgroundColor: value || '#000000' }}
                                                    />
                                                    <span>{label}</span>
                                                    <input
                                                        type="color"
                                                        className="sr-only"
                                                        value={value || '#000000'}
                                                        onChange={(e) => updateTheme({ [key]: e.target.value } as any)}
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
                                                        const a = gradientA || previewTheme.primary || '#0ea5e9';
                                                        const b = gradientB || previewTheme.accent || '#22c55e';
                                                        setGradientA(a);
                                                        setGradientB(b);
                                                        const css = `linear-gradient(${gradientAngle}deg, ${a} 0%, ${b} 100%)`;
                                                        updateTheme({ backgroundStyle: css, background: a });
                                                    }
                                                }}
                                            >
                                                <SelectTrigger id="theme-bg-style-mode">
                                                    <SelectValue placeholder="Select style" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="solid">Solid</SelectItem>
                                                    <SelectItem value="gradient">Gradient</SelectItem>
                                                    <SelectItem value="custom">CSS / Image</SelectItem>
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
                                                        backgroundImage: `linear-gradient(${gradientAngle}deg, ${gradientA} 0%, ${gradientB} 100%)`,
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
                                                                        const css = `linear-gradient(${gradientAngle}deg, ${v} 0%, ${gradientB} 100%)`;
                                                                        updateTheme({ backgroundStyle: css, background: v });
                                                                    }}
                                                                />
                                                            </label>
                                                            <Input
                                                                value={gradientA}
                                                                onChange={(e) => {
                                                                    const v = hexForColorInput(e.target.value, gradientA);
                                                                    setGradientA(v);
                                                                    const css = `linear-gradient(${gradientAngle}deg, ${v} 0%, ${gradientB} 100%)`;
                                                                    updateTheme({ backgroundStyle: css, background: v });
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
                                                                        const css = `linear-gradient(${gradientAngle}deg, ${gradientA} 0%, ${v} 100%)`;
                                                                        updateTheme({ backgroundStyle: css, background: gradientA });
                                                                    }}
                                                                />
                                                            </label>
                                                            <Input
                                                                value={gradientB}
                                                                onChange={(e) => {
                                                                    const v = hexForColorInput(e.target.value, gradientB);
                                                                    setGradientB(v);
                                                                    const css = `linear-gradient(${gradientAngle}deg, ${gradientA} 0%, ${v} 100%)`;
                                                                    updateTheme({ backgroundStyle: css, background: gradientA });
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
                                                                const css = `linear-gradient(${v}deg, ${gradientA} 0%, ${gradientB} 100%)`;
                                                                updateTheme({ backgroundStyle: css, background: gradientA });
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
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-2">
                                                <Input
                                                    id="theme-background-style"
                                                    value={backgroundMode === 'custom' ? (previewTheme.backgroundStyle || '') : ''}
                                                    onChange={(e) => {
                                                        setBackgroundMode('custom');
                                                        updateTheme({ backgroundStyle: e.target.value || null });
                                                    }}
                                                    placeholder="CSS value, e.g. linear-gradient(...)"
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
                                                    Paste a CSS background or upload an image (small files recommended).
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
                                    {previousTheme && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={handleRevert}
                                        >
                                            Revert to previous
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <div
                                className={cn(
                                    "w-full h-64 md:h-72 lg:h-[520px] rounded-2xl border border-border shadow-inner overflow-hidden relative transition-colors duration-500",
                                    "bg-gradient-to-br from-muted/80 to-muted",
                                    settings.enableThemeAnimations && previewTheme && animatePreview && "theme-idcard-animated",
                                    !previewTheme && "flex items-center justify-center text-muted-foreground"
                                )}
                                style={previewTheme ? {
                                    ['--theme-bg' as any]: previewTheme.backgroundStyle ? 'transparent' : (previewTheme.background || '#020617'),
                                    ['--theme-primary' as any]: previewTheme.primary || '#0ea5e9',
                                    ['--theme-accent' as any]: previewTheme.accent || '#22c55e',
                                } : undefined}
                            >
                                {previewTheme?.fontFamily && <GoogleFontLoader fontFamily={previewTheme.fontFamily} />}

                                {!previewTheme ? (
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
                                            theme: previewTheme!,
                                        };
                                        const cardStudent: Student = previewStudent
                                            ? { ...previewStudent, theme: previewTheme! }
                                            : synthetic;

                                        return (
                                            <div ref={previewWrapRef} className="h-full w-full flex items-center justify-center p-3 md:p-4">
                                                <div
                                                    className="shrink-0"
                                                    style={{
                                                        transform: `scale(${idPreviewScale})`,
                                                        transformOrigin: 'center',
                                                        filter: 'drop-shadow(0 16px 28px rgba(0,0,0,0.22))',
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
                                        );
                                    })()
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-between sm:items-center pb-24 md:pb-16">
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
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
