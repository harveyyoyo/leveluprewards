import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wand2, Loader2 } from 'lucide-react';
import { StudentTheme } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn, getContrastColor } from '@/lib/utils';
import { GoogleFontLoader } from './GoogleFontLoader';


interface ThemeGeneratorModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (theme: StudentTheme) => void;
    currentTheme?: StudentTheme;
    studentName: string;
}

export function ThemeGeneratorModal({
    isOpen,
    onOpenChange,
    onSave,
    currentTheme,
    studentName,
}: ThemeGeneratorModalProps) {
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [previewTheme, setPreviewTheme] = useState<StudentTheme | undefined>(currentTheme);
    const [previousTheme, setPreviousTheme] = useState<StudentTheme | undefined>(currentTheme);
    const [model, setModel] = useState<string>('gpt-4o-mini');
    const { toast } = useToast();

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
            const response = await fetch('/api/generate-theme', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt, model }),
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
            const response = await fetch('/api/generate-theme', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, model }),
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
            console.error('Error generating theme for fine‑tune:', error);
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
            <DialogContent wide className="rounded-3xl sm:rounded-3xl max-h-[min(92dvh,92vh)]">
                <DialogHeader>
                    <DialogTitle>Generate Theme for {studentName}</DialogTitle>
                    <DialogDescription>
                        Describe a theme and let AI generate a custom look. Themes can include gradients/patterns, and even “animated vibe” ideas (moving colors or playful motion like an emoji popping in/out).
                        After generating, you can also fine‑tune specific parts like the emoji and colors.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
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

                    <div className="space-y-2">
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
                            className={cn(
                                "w-full h-64 md:h-72 rounded-2xl border border-border shadow-inner p-5 flex flex-col gap-4 overflow-hidden relative transition-colors duration-500",
                                !previewTheme && "bg-muted flex items-center justify-center text-muted-foreground"
                            )}
                            style={previewTheme ? (() => {
                                const bg = previewTheme.backgroundStyle ? undefined : (previewTheme.background || '#020617');
                                const effectiveText = previewTheme.text || (getContrastColor(bg || '#020617') === 'black' ? '#020617' : '#ffffff');
                                return {
                                    background: previewTheme.backgroundStyle || bg,
                                    color: effectiveText,
                                    fontFamily: previewTheme.fontFamily || 'inherit',
                                    fontSize: (previewTheme.fontScale ?? 1) !== 1 ? `${previewTheme.fontScale}em` : undefined,
                                };
                            })() : undefined}
                        >
                            {previewTheme?.fontFamily && <GoogleFontLoader fontFamily={previewTheme.fontFamily} />}

                            {!previewTheme ? (
                                <p>No theme generated yet</p>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between z-10">
                                        <div className="font-bold text-lg flex items-center gap-2">
                                            {previewTheme.emoji && <span className="text-2xl drop-shadow-md">{previewTheme.emoji}</span>}
                                            Student Portal
                                        </div>
                                        <div
                                            className="px-3 py-1 rounded-full text-sm font-bold shadow-sm"
                                            style={{
                                                backgroundColor: previewTheme.primary,
                                                color: getContrastColor(previewTheme.primary) === 'black' ? '#000' : '#fff'
                                            }}
                                        >
                                            ★ 1,250 Pts
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mt-2">
                                        <div
                                            className="rounded-lg p-3 shadow-sm border border-black/5"
                                            style={{ backgroundColor: previewTheme.cardBackground }}
                                        >
                                            <div className="text-sm opacity-80 mb-1">Recent Activity</div>
                                            <div className="font-medium">+50 points</div>
                                        </div>
                                        <div
                                            className="rounded-lg p-3 shadow-sm border border-black/5"
                                            style={{ backgroundColor: previewTheme.cardBackground }}
                                        >
                                            <div className="text-sm opacity-80 mb-1">New Reward</div>
                                            <div
                                                className="font-medium"
                                                style={{ color: previewTheme.accent }}
                                            >
                                                Available!
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-3 flex flex-col md:flex-row gap-3 text-xs">
                                        <div
                                            className="flex-1 rounded-lg p-3 border border-black/5 flex items-center justify-between"
                                            style={{ backgroundColor: previewTheme.cardBackground }}
                                        >
                                            <span className="font-semibold opacity-80">Badges</span>
                                            <div className="flex gap-1.5">
                                                <span
                                                    className="inline-flex h-7 px-3 rounded-full text-[10px] font-bold uppercase tracking-[0.18em] items-center justify-center"
                                                    style={{ backgroundColor: previewTheme.primary, color: getContrastColor(previewTheme.primary) === 'black' ? '#000' : '#fff' }}
                                                >
                                                    ⭐ Helper
                                                </span>
                                                <span
                                                    className="inline-flex h-7 px-3 rounded-full text-[10px] font-bold uppercase tracking-[0.18em] items-center justify-center"
                                                    style={{ backgroundColor: previewTheme.accent, color: getContrastColor(previewTheme.accent) === 'black' ? '#000' : '#fff' }}
                                                >
                                                    📚 Reader
                                                </span>
                                            </div>
                                        </div>
                                        <div
                                            className="w-full md:w-[42%] rounded-lg p-3 border border-black/5"
                                            style={{ backgroundColor: previewTheme.cardBackground }}
                                        >
                                            <div className="text-[10px] uppercase tracking-[0.22em] opacity-70 mb-1">Activity</div>
                                            <div className="font-medium">Redeemed coupon · +25 pts</div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {previewTheme && (
                        <div className="mt-4 space-y-3">
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
                                        value={String(previewTheme.fontScale ?? 1)}
                                        onValueChange={(v) => updateTheme({ fontScale: parseFloat(v) })}
                                    >
                                        <SelectTrigger id="theme-font-scale">
                                            <SelectValue placeholder="Default" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="0.9">Smaller</SelectItem>
                                            <SelectItem value="1">Default</SelectItem>
                                            <SelectItem value="1.05">+1 step</SelectItem>
                                            <SelectItem value="1.1">+2 steps</SelectItem>
                                        </SelectContent>
                                    </Select>
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
                                <Label htmlFor="theme-background-style">Background (optional)</Label>
                                <div className="flex flex-col gap-2">
                                    <Input
                                        id="theme-background-style"
                                        value={previewTheme.backgroundStyle || ''}
                                        onChange={(e) => updateTheme({ backgroundStyle: e.target.value || null })}
                                        placeholder="CSS value, e.g. linear-gradient(...)"
                                        className="font-mono text-xs"
                                    />
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
                                </div>
                                <p className="text-[10px] text-muted-foreground">
                                    You can paste a CSS background or upload an image (small files recommended).
                                </p>
                            </div>
                        </div>
                    )}
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
