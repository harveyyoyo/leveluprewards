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
import type { Category, CategoryCurrencyOverride, CategoryRubricLevel } from '@/lib/types';
import { useCurrency } from '@/hooks/useCurrency';
import { defaultCategoryCurrencyOverride } from '@/lib/currency/resolveCategoryCurrency';
import { CategoryCurrencyDesignFields } from '@/components/categories/CategoryCurrencyDesignFields';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { cn, pickDistinctCategoryColor } from '@/lib/utils';
import { uploadCategoryImage } from '@/lib/categories/categoryImageUpload';
import { validatePrizeImageFile } from '@/lib/prizes/prizeImageUpload';
import { CategoryIconBadge } from '@/components/categories/CategoryIconBadge';
import { useFirestore, useStorage } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { ImagePlus, Loader2, Plus, Trash2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import {
  DEFAULT_INCENTIVE_DISPLAY_SURFACES,
  INCENTIVE_SURFACE_KEYS,
  INCENTIVE_SURFACE_META,
  couponIncentivesEnabled,
  type IncentiveSurfaceKey,
} from '@/lib/incentives/incentiveSurfaces';

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
    const schoolCurrency = useCurrency();
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
    const [description, setDescription] = useState('');
    const [showAsIncentive, setShowAsIncentive] = useState(false);
    const [displaySurfaces, setDisplaySurfaces] = useState<NonNullable<Category['displaySurfaces']>>({});
    const [rubricLevels, setRubricLevels] = useState<CategoryRubricLevel[]>([]);
    const [currencyOverrideEnabled, setCurrencyOverrideEnabled] = useState(false);
    const [currencyOverride, setCurrencyOverride] = useState<CategoryCurrencyOverride>({ mode: 'points' });
    const showIncentiveExtras = couponIncentivesEnabled(settings);
    const [uploading, setUploading] = useState(false);
    const { toast } = useToast();
    const playSound = useArcadeSound();

    const isEditing = !!category;
    const previewCategory: Category = {
        id: category?.id ?? 'preview',
        name: name || 'Category',
        points: parseInt(points, 10) || 0,
        color,
        icon: icon.trim() || '⭐',
        imageUrl: pendingFile ? undefined : imageUrl,
        countsForHousePoints,
        isGoldenTicket,
        description: description.trim() || undefined,
        showAsIncentive: showAsIncentive || undefined,
        displaySurfaces: showAsIncentive ? displaySurfaces : undefined,
        currencyOverride: currencyOverrideEnabled ? currencyOverride : null,
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
                setDescription(category.description || '');
                setShowAsIncentive(category.showAsIncentive === true);
                setDisplaySurfaces(category.displaySurfaces ?? {});
                setRubricLevels(Array.isArray(category.rubricLevels) ? category.rubricLevels : []);
                setCurrencyOverrideEnabled(Boolean(category.currencyOverride));
                setCurrencyOverride(category.currencyOverride || defaultCategoryCurrencyOverride(schoolCurrency));
            } else {
                setName('');
                setPoints('10');
                setColor(pickDistinctCategoryColor((categories || []).map((c) => c.color)));
                setIcon('');
                setImageUrl(undefined);
                setPendingFile(null);
                setCountsForHousePoints(true);
                setIsGoldenTicket(false);
                setDescription('');
                setShowAsIncentive(false);
                setDisplaySurfaces({});
                setRubricLevels([]);
                setCurrencyOverrideEnabled(false);
                setCurrencyOverride(defaultCategoryCurrencyOverride(schoolCurrency));
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
                icon: icon.trim() || '⭐',
                countsForHousePoints,
                isGoldenTicket: isGoldenTicket || undefined,
                description: description.trim() || undefined,
                showAsIncentive,
                displaySurfaces: showAsIncentive ? displaySurfaces : {},
                currencyOverride: currencyOverrideEnabled ? currencyOverride : null,
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
                                <Label htmlFor="cat-points">Default amount</Label>
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
                                <Label htmlFor="cat-icon">Icon</Label>
                                <p className="text-xs text-muted-foreground">
                                    Every category uses a color and an icon together.
                                </p>
                                <div className="flex flex-wrap gap-1.5 pb-1">
                                    {['⭐', '🏆', '📚', '🎨', '🍎', '🧹', '🤝', '⏰', '🎵', '⚽', '🧠', '💛'].map((emoji) => (
                                        <button
                                            key={emoji}
                                            type="button"
                                            title={emoji}
                                            onClick={() => setIcon(emoji)}
                                            className={cn(
                                                'flex h-8 w-8 items-center justify-center rounded-lg border text-base transition-transform hover:scale-110',
                                                icon === emoji
                                                    ? 'border-primary bg-primary/10 ring-1 ring-primary'
                                                    : 'border-border/60',
                                            )}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                                <Input
                                    id="cat-icon"
                                    value={icon}
                                    onChange={(e) => setIcon(e.target.value)}
                                    placeholder="⭐"
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
                        {showIncentiveExtras ? (
                            <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <Label htmlFor="cat-show-incentive" className="text-sm font-bold">
                                            Show as a way to earn
                                        </Label>
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            Puts this category on hallway and student displays. Printed coupons still work the same.
                                        </p>
                                    </div>
                                    <Switch
                                        id="cat-show-incentive"
                                        checked={showAsIncentive}
                                        onCheckedChange={(checked) => {
                                            setShowAsIncentive(checked);
                                            if (checked && !Object.values(displaySurfaces).some(Boolean)) {
                                                setDisplaySurfaces({ ...DEFAULT_INCENTIVE_DISPLAY_SURFACES });
                                            }
                                        }}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="cat-description">How to earn (optional)</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Type one short sentence for students — what they should do. Leave it blank if you do not need a tip.
                                    </p>
                                    <Textarea
                                        id="cat-description"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Hold the door for a classmate"
                                        rows={3}
                                    />
                                </div>
                                {showAsIncentive ? (
                                    <motion.div
                                        layout
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{
                                            opacity: 1,
                                            y: 0,
                                            transition: { type: 'spring', stiffness: 420, damping: 34, staggerChildren: 0.04 },
                                        }}
                                        className="grid gap-2 sm:grid-cols-2"
                                    >
                                        {INCENTIVE_SURFACE_KEYS.map((surface: IncentiveSurfaceKey) => (
                                            <label
                                                key={surface}
                                                className="flex items-start justify-between gap-2 rounded-lg border bg-background/80 px-3 py-2"
                                            >
                                                <span>
                                                    <span className="block text-xs font-bold">
                                                        {INCENTIVE_SURFACE_META[surface].label}
                                                    </span>
                                                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                                                        {INCENTIVE_SURFACE_META[surface].description}
                                                    </span>
                                                </span>
                                                <Switch
                                                    checked={displaySurfaces[surface] === true}
                                                    onCheckedChange={(checked) =>
                                                        setDisplaySurfaces((prev) => ({ ...prev, [surface]: checked }))
                                                    }
                                                    aria-label={`Show on ${INCENTIVE_SURFACE_META[surface].label}`}
                                                />
                                            </label>
                                        ))}
                                    </motion.div>
                                ) : null}
                            </div>
                        ) : null}
                        <CategoryCurrencyDesignFields
                            enabled={currencyOverrideEnabled}
                            onEnabledChange={(next) => {
                                setCurrencyOverrideEnabled(next);
                                if (next) {
                                    setCurrencyOverride((prev) =>
                                        prev.couponBgColor || prev.moneyBgColor || prev.pointsDesign || prev.moneyDesign
                                            ? prev
                                            : defaultCategoryCurrencyOverride(schoolCurrency),
                                    );
                                }
                            }}
                            value={currencyOverride}
                            onChange={setCurrencyOverride}
                            schoolCurrency={schoolCurrency}
                            schoolId={schoolId}
                            categoryName={name}
                            points={parseInt(points, 10) || 0}
                            color={color}
                        />
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
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <Label htmlFor="cat-golden-ticket" className="text-sm font-medium">
                                    Golden ticket (optional)
                                </Label>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    A small highlight on this category. Most categories can leave this off.
                                </p>
                            </div>
                            <Switch
                                id="cat-golden-ticket"
                                checked={isGoldenTicket}
                                onCheckedChange={setIsGoldenTicket}
                            />
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
