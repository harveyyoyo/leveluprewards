import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Wand2, Loader2 } from 'lucide-react';
import type { Student, StudentTheme } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { getContrastColor } from '@/lib/utils';
import { GoogleFontLoader } from './GoogleFontLoader';
import { StudentIdCard } from './StudentIdCard';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useAuthFetch } from '@/lib/authFetch';
import { useAppContext } from '@/components/AppProvider';


interface ThemeGeneratorModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (theme: StudentTheme) => void;
    currentTheme?: StudentTheme;
    /** Student row + form fields used for the live ID preview (name, photo, points, etc.). */
    previewStudent: Student;
    schoolName: string;
    /** Homeroom / class line (same as `StudentIdCard` `className` prop). */
    classLabel: string;
    schoolLogoUrl?: string | null;
    appLogoUrl?: string | null;
    appName?: string;
    appTagline?: string;
}

export function ThemeGeneratorModal({
    isOpen,
    onOpenChange,
    onSave,
    currentTheme,
    previewStudent,
    schoolName,
    classLabel,
    schoolLogoUrl,
    appLogoUrl,
    appName,
    appTagline,
}: ThemeGeneratorModalProps) {
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [previewTheme, setPreviewTheme] = useState<StudentTheme | undefined>(currentTheme);
    const [previousTheme, setPreviousTheme] = useState<StudentTheme | undefined>(currentTheme);
    const [model, setModel] = useState<string>('gpt-4o-mini');
    const { toast } = useToast();
    const { settings } = useSettings();
    const authFetch = useAuthFetch();
    const { schoolId } = useAppContext();

    const [backgroundMode, setBackgroundMode] = useState<'solid' | 'gradient' | 'image'>('solid');
    const [bgColorA, setBgColorA] = useState<string>(currentTheme?.background || '#020617');
    const [bgColorB, setBgColorB] = useState<string>('#1f2937');

    const previewContainerRef = useRef<HTMLDivElement | null>(null);
    const [previewScale, setPreviewScale] = useState(1);

    // Matches `.student-id-card-screen-preview .print-id-card` size in `globals.css`.
    const PREVIEW_BASE_W_PX = 3.38 * 96;
    const PREVIEW_BASE_H_PX = 2.18 * 96;

    useEffect(() => {
        if (!isOpen) return;
        const el = previewContainerRef.current;
        if (!el) return;

        const compute = () => {
            const rect = el.getBoundingClientRect();
            const padding = 16;
            const w = Math.max(0, rect.width - padding);
            const h = Math.max(0, rect.height - padding);
            // Small safety margin so the preview never clips due to rounding/fonts.
            const s = 0.96 * Math.min(w / PREVIEW_BASE_W_PX, h / PREVIEW_BASE_H_PX);
            setPreviewScale(Number.isFinite(s) && s > 0 ? Math.min(6, Math.max(0.5, s)) : 1);
        };

        compute();

        const ro = new ResizeObserver(() => compute());
        ro.observe(el);
        window.addEventListener('resize', compute);

        return () => {
            ro.disconnect();
            window.removeEventListener('resize', compute);
        };
    }, [isOpen, previewTheme]);

    useEffect(() => {
        if (!isOpen) return;
        setPreviewTheme(currentTheme);
        setPreviousTheme(currentTheme);
    }, [isOpen, currentTheme]);

    useEffect(() => {
        if (!currentTheme) return;
        const style = currentTheme.backgroundStyle || '';
        if (style.startsWith('url(')) {
            setBackgroundMode('image');
            return;
        }
        if (style.startsWith('linear-gradient')) {
            setBackgroundMode('gradient');
            // Best-effort parse: linear-gradient(<angle>, <c1>, <c2>)
            const match = style.match(/linear-gradient\([^,]*,\s*([^,]+),\s*([^)]+)\)/i);
            const c1 = match?.[1]?.trim().split(/\s+/)?.[0];
            const c2 = match?.[2]?.trim().split(/\s+/)?.[0];
            if (c1 && c1.startsWith('#')) setBgColorA(c1);
            if (c2 && c2.startsWith('#')) setBgColorB(c2);
            return;
        }
        setBackgroundMode('solid');
        setBgColorA(currentTheme.background || '#020617');
    }, [currentTheme]);

    // Load provider from local storage on mount
    useEffect(() => {
        const savedModel = localStorage.getItem('arcade_ai_model');
        if (savedModel) setModel(savedModel);
    }, []);

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
            const response = await authFetch('/api/generate-theme', {
                method: 'POST',
                body: JSON.stringify({ prompt, model, schoolId }),
            });

            if (!response.ok) {
                throw new Error('Failed to generate theme');
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
            toast({
                title: 'Error',
                description: 'There was a problem generating the theme. Please try again.',
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

    const generateWithAI = async (kind: 'emoji' | 'font') => {
        const textFromBox = kind === 'emoji' ? previewTheme?.emoji : previewTheme?.fontFamily;
        const promptToUse = textFromBox?.trim() ? textFromBox : prompt;

        if (!promptToUse?.trim()) {
            toast({
                title: 'Prompt required',
                description: kind === 'emoji' ? 'Enter an emoji idea or a general prompt first.' : 'Enter a font idea or a general prompt first.',
                variant: 'destructive',
            });
            return;
        }
        setIsGenerating(true);
        try {
            const response = await authFetch('/api/generate-theme', {
                method: 'POST',
                body: JSON.stringify({ prompt: promptToUse, model, schoolId }),
            });
            if (!response.ok) throw new Error('Failed to generate theme');
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
            console.error('Error generating theme for fineâ€‘tune:', error);
            toast({
                title: 'Error',
                description: 'There was a problem asking AI for a suggestion. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent
                wide
                className="flex flex-col gap-4 min-h-0"
            >
                <DialogHeader>
                    <DialogTitle>
                        Generate theme for {`${previewStudent.firstName} ${previewStudent.lastName}`.trim() || 'Student'}
                    </DialogTitle>
                    <DialogDescription>
                        Describe a theme and let AI generate a custom look. Themes can include gradients/patterns, and even â€œanimated vibeâ€ ideas (moving colors or playful motion like an emoji popping in/out).
                        After generating, you can also fineâ€‘tune specific parts like the emoji and colors.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[440px_1fr] gap-6">
                    {/* Controls (scrollable, left) */}
                    <div className="min-h-0 overflow-y-auto pr-1 space-y-6">
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

                        <div className="flex items-end gap-2">
                            <div className="grid flex-1 gap-2">
                                <Label htmlFor="prompt">Prompt</Label>
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
                            </div>
                            <Button onClick={handleGenerate} disabled={isGenerating || !prompt.trim()}>
                                {isGenerating ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Wand2 className="w-4 h-4 mr-2" />
                                )}
                                Generate
                            </Button>
                        </div>

                    {previewTheme && (
                        <div className="mt-4 space-y-3">
                            <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-muted-foreground">
                                Fineâ€‘tune
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label htmlFor="theme-emoji">Emoji (optional)</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="theme-emoji"
                                            value={previewTheme.emoji || ''}
                                            onChange={(e) => updateTheme({ emoji: e.target.value })}
                                            placeholder="e.g. â­"
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
                                        value={String(previewTheme.fontScale ?? 1)}
                                        onValueChange={(v) => updateTheme({ fontScale: parseFloat(v) })}
                                    >
                                        <SelectTrigger id="theme-font-scale">
                                            <SelectValue placeholder="Default" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="0.9">Smaller</SelectItem>
                                            <SelectItem value="1">Default</SelectItem>
                                            <SelectItem value="1.05">+5%</SelectItem>
                                            <SelectItem value="1.1">+10%</SelectItem>
                                            <SelectItem value="1.15">+15%</SelectItem>
                                            <SelectItem value="1.2">+20%</SelectItem>
                                            <SelectItem value="1.25">+25%</SelectItem>
                                            <SelectItem value="1.3">+30%</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 items-end">
                                <div className="space-y-1">
                                    <Label>Text tracking</Label>
                                    <Select
                                        value={typeof previewTheme.fontTracking === 'number' ? String(previewTheme.fontTracking) : 'default'}
                                        onValueChange={(v) => {
                                            if (v === 'default') updateTheme({ fontTracking: undefined });
                                            else updateTheme({ fontTracking: parseFloat(v) });
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Default" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="default">Default</SelectItem>
                                            <SelectItem value="0.01">Tight</SelectItem>
                                            <SelectItem value="0.03">Normal</SelectItem>
                                            <SelectItem value="0.05">Loose</SelectItem>
                                            <SelectItem value="0.08">Extra loose</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                id="theme-bold"
                                                checked={(previewTheme.fontWeight ?? 800) >= 750}
                                                onCheckedChange={(checked) => updateTheme({ fontWeight: checked ? 800 : 600 })}
                                            />
                                            <Label htmlFor="theme-bold" className="cursor-pointer text-sm">Bold</Label>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                id="theme-italic"
                                                checked={previewTheme.fontStyle === 'italic'}
                                                onCheckedChange={(checked) => updateTheme({ fontStyle: checked ? 'italic' : undefined })}
                                            />
                                            <Label htmlFor="theme-italic" className="cursor-pointer text-sm">Italics</Label>
                                        </div>
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
                            <div className="space-y-1 pt-1">
                                <Label>Background style (picker)</Label>
                                <Select
                                    value={backgroundMode}
                                    onValueChange={(v) => {
                                        const next = v as 'solid' | 'gradient' | 'image';
                                        setBackgroundMode(next);
                                        if (next === 'solid') {
                                            updateTheme({ backgroundStyle: null, background: bgColorA });
                                        }
                                        if (next === 'gradient') {
                                            updateTheme({
                                                backgroundStyle: `linear-gradient(135deg, ${bgColorA}, ${bgColorB})`,
                                            });
                                        }
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose background style" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="solid">Solid</SelectItem>
                                        <SelectItem value="gradient">Gradient</SelectItem>
                                        <SelectItem value="image">Image</SelectItem>
                                    </SelectContent>
                                </Select>

                                {backgroundMode === 'solid' && (
                                    <div className="flex items-center gap-3 pt-2">
                                        <Label className="text-xs text-muted-foreground whitespace-nowrap">Color</Label>
                                        <input
                                            type="color"
                                            value={bgColorA}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                setBgColorA(v);
                                                updateTheme({ backgroundStyle: null, background: v });
                                            }}
                                        />
                                    </div>
                                )}

                                {backgroundMode === 'gradient' && (
                                    <div className="flex flex-col gap-2 pt-2">
                                        <div className="flex items-center gap-3">
                                            <Label className="text-xs text-muted-foreground whitespace-nowrap">Start</Label>
                                            <input
                                                type="color"
                                                value={bgColorA}
                                                onChange={(e) => {
                                                    const v = e.target.value;
                                                    setBgColorA(v);
                                                    updateTheme({ backgroundStyle: `linear-gradient(135deg, ${v}, ${bgColorB})` });
                                                }}
                                            />
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Label className="text-xs text-muted-foreground whitespace-nowrap">End</Label>
                                            <input
                                                type="color"
                                                value={bgColorB}
                                                onChange={(e) => {
                                                    const v = e.target.value;
                                                    setBgColorB(v);
                                                    updateTheme({ backgroundStyle: `linear-gradient(135deg, ${bgColorA}, ${v})` });
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {backgroundMode === 'image' && (
                                    <div className="flex flex-col gap-2 pt-2">
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                const reader = new FileReader();
                                                reader.onload = () => {
                                                    const dataUrl = String(reader.result || '');
                                                    if (!dataUrl) return;
                                                    updateTheme({
                                                        backgroundStyle: `url("${dataUrl}") center / cover no-repeat`,
                                                    });
                                                };
                                                reader.readAsDataURL(file);
                                            }}
                                            className="text-xs"
                                        />
                                        <p className="text-[10px] text-muted-foreground">
                                            Upload an image (small files recommended). This replaces the gradient/solid background.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    </div>

                    {/* Live preview (right) */}
                    <div className="min-h-0 flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                            <Label>Live Preview</Label>
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
                        <div
                            ref={previewContainerRef}
                            className="flex-1 min-h-0 w-full rounded-2xl border border-border shadow-inner p-1 sm:p-2 grid place-items-center overflow-auto bg-black/5 dark:bg-white/5 transition-colors duration-500"
                        >
                            {/* Give the scaled preview real layout size so centering + scroll works. */}
                            <div
                                style={{
                                    width: `${PREVIEW_BASE_W_PX * previewScale}px`,
                                    height: `${PREVIEW_BASE_H_PX * previewScale}px`,
                                    margin: 'auto',
                                }}
                                className="grid place-items-center"
                            >
                                <div className="student-id-card-screen-preview" style={{ transform: 'none' }}>
                                    <StudentIdCard
                                        student={{ ...previewStudent, theme: previewTheme }}
                                        schoolName={schoolName}
                                        schoolLogoUrl={schoolLogoUrl ?? null}
                                        className={classLabel}
                                        isColorEnabled={settings.enableColorPrinting}
                                        appLogoUrl={appLogoUrl ?? null}
                                        appName={appName}
                                        appTagline={appTagline}
                                    />
                                </div>
                            </div>
                        </div>
                        {!previewTheme ? (
                            <p className="text-[11px] text-muted-foreground text-center shrink-0">
                                No theme yet â€” preview shows the default card until you generate one.
                            </p>
                        ) : null}
                    </div>

                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={!previewTheme}>
                        Save & Apply Theme
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    );
}
