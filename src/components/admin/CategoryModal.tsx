'use client';

import { useEffect, useRef, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAppContext } from '@/components/AppProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useToast } from '@/hooks/use-toast';
import type { Category, CategoryRubricLevel } from '@/lib/types';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { pickDistinctCategoryColor } from '@/lib/utils';
import { uploadCategoryImage } from '@/lib/categories/categoryImageUpload';
import { validatePrizeImageFile } from '@/lib/prizes/prizeImageUpload';
import { CategoryIconBadge } from '@/components/categories/CategoryIconBadge';
import { useFirestore, useStorage } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ImagePlus, Loader2, Plus, Trash2 } from 'lucide-react';

interface CategoryModalProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    category: Category | null;
    /** When creating a category from the teacher portal, assign ownership to this teacher. */
    defaultTeacherId?: string;
}

export function CategoryModal({ isOpen, setIsOpen, category, defaultTeacherId }: CategoryModalProps) {
    const { addCategory, updateCategory, categories, schoolId } = useAppContext();
    const { settings } = useSettings();
    const firestore = useFirestore();
    const storage = useStorage();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [name, setName] = useState('');
    const [points, setPoints] = useState('10');
    const [color, setColor] = useState(pickDistinctCategoryColor());
    const [icon, setIcon] = useState('');
    const [imageUrl, setImageUrl] = useState<string | undefined>();
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [countsForHousePoints, setCountsForHousePoints] = useState(true);
    const [isGoldenTicket, setIsGoldenTicket] = useState(false);
    const [rubricLevels, setRubricLevels] = useState<CategoryRubricLevel[]>([]);
    const [uploading, setUploading] = useState(false);
    const { toast } = useToast();
    const playSound = useArcadeSound();

    const isEditing = !!category;
    const previewCategory: Category = {
        id: category?.id ?? 'preview',
        name: name || 'Category',
        points: parseInt(points, 10) || 0,
        color,
        icon: icon.trim() || undefined,
        imageUrl: pendingFile ? undefined : imageUrl,
        countsForHousePoints,
        isGoldenTicket,
    };

    useEffect(() => {
        if (isOpen) {
            if (category) {
                setName(category.name);
                setPoints(String(category.points ?? 0));
                setColor(category.color || '#cccccc');
                setIcon(category.icon || '');
                setImageUrl(category.imageUrl);
                setPendingFile(null);
                setCountsForHousePoints(category.countsForHousePoints !== false);
                setIsGoldenTicket(category.isGoldenTicket === true);
                setRubricLevels(Array.isArray(category.rubricLevels) ? category.rubricLevels : []);
            } else {
                setName('');
                setPoints('10');
                setColor(pickDistinctCategoryColor((categories || []).map((c) => c.color)));
                setIcon('');
                setImageUrl(undefined);
                setPendingFile(null);
                setCountsForHousePoints(true);
                setIsGoldenTicket(false);
                setRubricLevels([]);
            }
        }
    }, [category, isOpen, categories]);

    const handleImagePick = (file: File | null) => {
        if (!file) return;
        const err = validatePrizeImageFile(file);
        if (err) {
            playSound('error');
            toast({ variant: 'destructive', title: err });
            return;
        }
        setPendingFile(file);
        setImageUrl(URL.createObjectURL(file));
    };

    const handleSave = async () => {
        const pointsValue = parseInt(points, 10);
        if (!name) {
            playSound('error');
            toast({ variant: 'destructive', title: 'Name is required.' });
            return;
        }
        if (isNaN(pointsValue) || pointsValue < 0) {
            playSound('error');
            toast({ variant: 'destructive', title: 'Points must be a non-negative number.' });
            return;
        }

        setUploading(true);
        try {
            const coreFields = {
                name,
                points: pointsValue,
                color,
                icon: icon.trim() || undefined,
                countsForHousePoints,
                isGoldenTicket: isGoldenTicket || undefined,
                rubricLevels: rubricLevels.length > 0 ? rubricLevels : undefined,
            };

            if (isEditing && category) {
                let nextImageUrl = imageUrl;
                if (pendingFile && storage && schoolId) {
                    nextImageUrl = await uploadCategoryImage(storage, schoolId, category.id, pendingFile);
                }
                const updatedCategory: Category = {
                    ...category,
                    ...coreFields,
                    imageUrl: nextImageUrl,
                };
                await updateCategory(updatedCategory);
                playSound('success');
                toast({ title: 'Category updated!' });
            } else {
                const created = await addCategory({
                    ...coreFields,
                    ...(defaultTeacherId ? { teacherId: defaultTeacherId } : {}),
                    ...(imageUrl && !pendingFile ? { imageUrl } : {}),
                });
                if (created && pendingFile && storage && schoolId && firestore) {
                    const uploaded = await uploadCategoryImage(storage, schoolId, created.id, pendingFile);
                    await updateDoc(doc(firestore, 'schools', schoolId, 'categories', created.id), {
                        imageUrl: uploaded,
                    });
                }
                playSound('success');
                toast({ title: 'Category added!' });
            }
            setIsOpen(false);
        } catch (error) {
            playSound('error');
            toast({
                variant: 'destructive',
                title: 'Could not save category',
                description: error instanceof Error ? error.message : undefined,
            });
        } finally {
            setUploading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent size="sm" className="flex flex-col p-0 overflow-hidden max-h-[var(--dialog-max-h,min(90vh,calc(100dvh-2rem)))]">
                <DialogHeader className="px-6 pt-6 pb-4 border-b">
                    <DialogTitle>{isEditing ? 'Edit Category' : 'New Category'}</DialogTitle>
                    <DialogDescription>
                        Set the details for this reward category.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    <div className="grid gap-4">
                        <div className="flex items-center gap-3">
                            <CategoryIconBadge category={previewCategory} />
                            <p className="text-xs text-muted-foreground leading-snug">
                                Preview of how this category looks in lists.
                            </p>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="cat-name">Category Name</Label>
                            <Input id="cat-name" value={name} onChange={e => setName(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label htmlFor="cat-points">Default Points</Label>
                                <Input id="cat-points" type="number" value={points} onChange={e => setPoints(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="cat-color">Color</Label>
                                <div className="flex items-center gap-2">
                                    <Input id="cat-color" type="color" value={color} onChange={e => setColor(e.target.value)} className="p-1 h-10" />
                                    <Input value={color} onChange={e => setColor(e.target.value)} className="h-10" />
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label htmlFor="cat-icon">Icon (emoji)</Label>
                                <Input
                                    id="cat-icon"
                                    value={icon}
                                    onChange={(e) => setIcon(e.target.value)}
                                    placeholder="e.g. ⭐ or 🏆"
                                    maxLength={4}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Category image (optional)</Label>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/gif,image/webp"
                                    className="sr-only"
                                    onChange={(e) => handleImagePick(e.target.files?.[0] ?? null)}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full justify-start gap-2"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <ImagePlus className="h-4 w-4" />
                                    {imageUrl ? 'Change image' : 'Upload image'}
                                </Button>
                            </div>
                        </div>
                        {settings.enableHouses ? (
                            <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <Label htmlFor="cat-house-points" className="text-sm font-bold">Counts toward house points</Label>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            Off = student still earns LevelUp points, but their house total stays unchanged.
                                        </p>
                                    </div>
                                    <Switch
                                        id="cat-house-points"
                                        checked={countsForHousePoints}
                                        onCheckedChange={setCountsForHousePoints}
                                    />
                                </div>
                            </div>
                        ) : null}
                        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <Label htmlFor="cat-golden-ticket" className="text-sm font-bold">Golden ticket</Label>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Highlights this category as a special golden-ticket award.
                                    </p>
                                </div>
                                <Switch
                                    id="cat-golden-ticket"
                                    checked={isGoldenTicket}
                                    onCheckedChange={setIsGoldenTicket}
                                />
                            </div>
                        </div>
                        <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                            <div className="flex items-center justify-between gap-2">
                                <Label className="text-sm font-bold">Rubric quick-awards (optional)</Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8"
                                    onClick={() => {
                                        const def = Math.max(0, Math.round(parseInt(points, 10) || 0));
                                        setRubricLevels((prev) => [
                                            ...prev,
                                            {
                                                id: `rub_${Date.now()}`,
                                                label: 'Level',
                                                points: def,
                                            },
                                        ]);
                                    }}
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add level
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Teachers see these as one-tap point amounts for this category (e.g. behavior tiers).
                            </p>
                            <div className="space-y-2">
                                {rubricLevels.map((row, idx) => (
                                    <div key={row.id} className="flex flex-wrap items-end gap-2">
                                        <div className="flex-1 min-w-[120px] space-y-1">
                                            <Label className="text-[10px] uppercase text-muted-foreground">Label</Label>
                                            <Input
                                                value={row.label ?? ''}
                                                onChange={(e) => {
                                                    const v = e.target.value;
                                                    setRubricLevels((prev) =>
                                                        prev.map((r, i) => (i === idx ? { ...r, label: v } : r)),
                                                    );
                                                }}
                                            />
                                        </div>
                                        <div className="w-24 space-y-1">
                                            <Label className="text-[10px] uppercase text-muted-foreground">Pts</Label>
                                            <Input
                                                type="number"
                                                value={String(row.points ?? 0)}
                                                onChange={(e) => {
                                                    const n = Math.max(0, Math.round(Number(e.target.value) || 0));
                                                    setRubricLevels((prev) =>
                                                        prev.map((r, i) => (i === idx ? { ...r, points: n } : r)),
                                                    );
                                                }}
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="shrink-0 text-destructive"
                                            onClick={() => setRubricLevels((prev) => prev.filter((_, i) => i !== idx))}
                                            aria-label="Remove rubric row"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <DialogFooter className="px-6 py-4 border-t bg-muted/30">
                    <Button type="button" variant="secondary" onClick={() => setIsOpen(false)} disabled={uploading}>
                        Cancel
                    </Button>
                    <Button type="submit" onClick={handleSave} disabled={uploading}>
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
