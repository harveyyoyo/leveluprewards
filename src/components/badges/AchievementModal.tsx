'use client';

import { useEffect, useState } from 'react';
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
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import type { Achievement, Category } from '@/lib/types';
import DynamicIcon from '../DynamicIcon';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { Checkbox } from '@/components/ui/checkbox';
import { BonusSpinWheelModal } from '../kiosk/BonusSpinWheelModal';
import { LEVELUP_BRAND_PRIMARY_HEX } from '@/lib/appBranding';

interface AchievementModalProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    achievement: Achievement | null;
    categories: Category[];
    /** Called with achievement data on save. Admin should call addAchievement/updateAchievement and close modal. */
    onSave?: (data: Omit<Achievement, 'id'> | Achievement) => Promise<void>;
}

export function AchievementModal({ isOpen, setIsOpen, achievement, categories, onSave }: AchievementModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [icon, setIcon] = useState('Trophy');
    const [type, setType] = useState<Achievement['criteria']['type']>('points');
    const [threshold, setThreshold] = useState('100');
    const [categoryId, setCategoryId] = useState<string>('');
    const [bonusPoints, setBonusPoints] = useState('0');
    const [tier, setTier] = useState<Achievement['tier'] | ''>('');
    const [accentColor, setAccentColor] = useState('');
    const [enableWheelSpin, setEnableWheelSpin] = useState(false);
    const [wheelSegments, setWheelSegments] = useState<string[]>(['', '', '', '', '', '']);
    const [isTestSpinOpen, setIsTestSpinOpen] = useState(false);
    const { toast } = useToast();
    const playSound = useArcadeSound();

    const isEditing = !!achievement;

    useEffect(() => {
        if (isOpen) {
            if (achievement) { // Edit mode
                setName(achievement.name);
                setDescription(achievement.description);
                setIcon(achievement.icon);
                setType(achievement.criteria.type);
                setThreshold(achievement.criteria.threshold.toString());
                setCategoryId(achievement.criteria.categoryId || '');
                setBonusPoints((achievement.bonusPoints || 0).toString());
                setTier(achievement.tier || '');
                setAccentColor(achievement.accentColor || '');
                setEnableWheelSpin(!!achievement.enableWheelSpin);
                setWheelSegments(achievement.wheelSegments && achievement.wheelSegments.length === 6 ? achievement.wheelSegments.map(String) : ['', '', '', '', '', '']);
            } else { // Create mode
                setName('');
                setDescription('');
                setIcon('Trophy');
                setType('points');
                setThreshold('100');
                setCategoryId('');
                setBonusPoints('0');
                setTier('');
                setAccentColor('');
                setEnableWheelSpin(false);
                setWheelSegments(['', '', '', '', '', '']);
            }
        }
    }, [achievement, isOpen]);

    const handleSave = async () => {
        const thresholdValue = parseInt(threshold);
        const bonusPointsValue = parseInt(bonusPoints);

        if (!name || !description || !icon) {
            playSound('error');
            toast({ variant: 'destructive', title: 'Missing information', description: 'Name, description, and icon are required.' });
            return;
        }

        if (isNaN(thresholdValue) || thresholdValue < 0) {
            playSound('error');
            toast({ variant: 'destructive', title: 'Invalid threshold', description: 'Threshold must be a non-negative number.' });
            return;
        }

        const criteria: any = {
            type,
            threshold: thresholdValue,
        };
        if ((type === 'points' || type === 'coupons') && categoryId) {
            criteria.categoryId = categoryId;
        }

        const baseData: any = {
            name,
            description,
            icon,
            criteria,
            bonusPoints: isNaN(bonusPointsValue) ? 0 : bonusPointsValue,
            enableWheelSpin: !!enableWheelSpin,
        };

        if (enableWheelSpin) {
            const parsedSegments = wheelSegments.map(s => parseInt(s));
            if (parsedSegments.length === 6 && parsedSegments.every(s => !isNaN(s))) {
                baseData.wheelSegments = parsedSegments;
            }
        }

        if (tier) baseData.tier = tier;
        if (accentColor && accentColor.trim()) baseData.accentColor = accentColor.trim();

        if (onSave) {
            try {
                if (isEditing && achievement) {
                    await onSave({ ...baseData, id: achievement.id } as Achievement);
                } else {
                    await onSave(baseData as Omit<Achievement, 'id'>);
                }
                playSound('success');
                toast({ title: 'Milestone saved', description: isEditing ? 'Bonus milestone updated.' : 'Bonus milestone created.' });
                setIsOpen(false);
            } catch (e: any) {
                playSound('error');
                toast({ variant: 'destructive', title: 'Save failed', description: e?.message || 'Could not save badge.' });
            }
            return;
        }

        playSound('error');
        toast({ variant: 'destructive', title: 'Cannot save', description: 'No save handler provided.' });
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent size="sm" className="flex flex-col p-0 overflow-hidden max-h-[var(--dialog-max-h,min(90vh,calc(100dvh-2rem)))]">
                <DialogHeader className="px-6 pt-6 pb-4 border-b">
                    <DialogTitle>{isEditing ? 'Edit bonus milestone' : 'New bonus milestone'}</DialogTitle>
                    <DialogDescription>
                        Define when students earn extra bonus points (e.g. at 100 or 500 points).
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-4">
                    <div className="border rounded-2xl p-4 bg-secondary/15 flex items-center justify-between mb-4 hover:border-primary/20 transition-all">
                        <div className="flex items-center gap-3">
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center border-2 shrink-0"
                                style={{ borderColor: accentColor || undefined, backgroundColor: accentColor ? `${accentColor}20` : undefined }}
                            >
                                <DynamicIcon name={icon || 'Trophy'} className="w-5 h-5" style={accentColor ? { color: accentColor } : undefined} />
                            </div>
                            <div>
                                <p className="font-bold text-sm leading-tight">{name || 'Unnamed milestone'}</p>
                                <p className="text-xs text-muted-foreground leading-tight mt-1">
                                    {type === 'points' && `Current points ≥ ${threshold || 0}`}
                                    {type === 'lifetimePoints' && `Lifetime points ≥ ${threshold || 0}`}
                                    {type === 'coupons' && `Category threshold ${threshold || 0}`}
                                    {type === 'manual' && 'Manual award only'}
                                    {tier && ` · ${tier}`}
                                    {(parseInt(bonusPoints) || 0) >= 1 && ` · +${bonusPoints} bonus pts`}
                                    {enableWheelSpin && ` · 🎡 Wheel Spin`}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4">
                        <div className="space-y-1">
                            <Label htmlFor="ach-name">Name</Label>
                            <Input id="ach-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Early Bird" />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="ach-desc">Description</Label>
                            <Input id="ach-desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g., Earn your first 100 points" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label htmlFor="ach-icon">Icon</Label>
                                <div className="flex items-center gap-2">
                                    <Input id="ach-icon" value={icon} onChange={e => setIcon(e.target.value)} />
                                    <div className="p-2 border rounded-md bg-secondary flex items-center justify-center w-10 h-10">
                                        <DynamicIcon name={icon} className="w-5 h-5 text-primary" />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="ach-bonus">Bonus Points</Label>
                                <Input id="ach-bonus" type="number" value={bonusPoints} onChange={e => setBonusPoints(e.target.value)} />
                            </div>
                        </div>

                        <div className="flex items-center justify-between py-1">
                            <div className="flex items-center space-x-2">
                                <Checkbox id="ach-wheel" checked={enableWheelSpin} onCheckedChange={(checked) => setEnableWheelSpin(checked === true)} />
                                <Label htmlFor="ach-wheel" className="text-sm font-medium leading-none cursor-pointer">
                                    Enable spin wheel for bonus amount
                                </Label>
                            </div>
                            {enableWheelSpin && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs font-bold gap-1 rounded-xl"
                                    onClick={() => setIsTestSpinOpen(true)}
                                >
                                    🎡 Preview Spin
                                </Button>
                            )}
                        </div>

                        {enableWheelSpin && (
                            <div className="space-y-2 bg-secondary/10 p-3 rounded-xl border">
                                <Label className="text-xs">Custom wheel slices</Label>
                                <p className="text-[10px] text-muted-foreground leading-tight">Enter all six point values, or leave every slice blank to calculate the wheel from bonus points.</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {wheelSegments.map((val, idx) => (
                                        <Input 
                                            key={idx} 
                                            type="number" 
                                            placeholder={`Points ${idx + 1}`} 
                                            className="h-8 text-xs" 
                                            value={val} 
                                            onChange={(e) => {
                                                const newSegs = [...wheelSegments];
                                                newSegs[idx] = e.target.value;
                                                setWheelSegments(newSegs);
                                            }} 
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label>Tier</Label>
                                <Select value={tier || 'none'} onValueChange={v => setTier(v === 'none' ? '' : (v as Achievement['tier']))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Optional" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        <SelectItem value="bronze">Bronze</SelectItem>
                                        <SelectItem value="silver">Silver</SelectItem>
                                        <SelectItem value="gold">Gold</SelectItem>
                                        <SelectItem value="platinum">Platinum</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="ach-accent">Accent color</Label>
                                <div className="flex items-center gap-2">
                                    <input
                                        id="ach-accent"
                                        type="color"
                                        value={accentColor && /^#[0-9A-Fa-f]{6}$/.test(accentColor) ? accentColor : LEVELUP_BRAND_PRIMARY_HEX}
                                        onChange={e => setAccentColor(e.target.value)}
                                        className="w-10 h-10 rounded border border-input cursor-pointer"
                                    />
                                    <Input
                                        value={accentColor}
                                        onChange={e => setAccentColor(e.target.value)}
                                        placeholder={LEVELUP_BRAND_PRIMARY_HEX}
                                        className="font-mono text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-3">
                            <Label className="text-xs font-bold uppercase tracking-widest opacity-70">How to Earn</Label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label>Type</Label>
                                    <Select value={type} onValueChange={(v: any) => setType(v)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="points">Current Points</SelectItem>
                                            <SelectItem value="lifetimePoints">Total Lifetime Points</SelectItem>
                                            <SelectItem value="coupons">Category Threshold</SelectItem>
                                            <SelectItem value="manual">Manual Award Only</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                        {type === 'points' && "Unlocked when current points reach threshold."}
                                        {type === 'lifetimePoints' && "Unlocked when total points earned reach threshold."}
                                        {type === 'coupons' && "Unlocked when points in a specific category reach threshold."}
                                        {type === 'manual' && "This achievement must be awarded by a teacher manually."}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <Label>Threshold</Label>
                                    <Input type="number" value={threshold} onChange={e => setThreshold(e.target.value)} disabled={type === 'manual'} placeholder="100" />
                                </div>
                            </div>

                            {type === 'coupons' && (
                                <div className="space-y-1">
                                    <Label>Select category</Label>
                                    <Select value={categoryId} onValueChange={v => setCategoryId(v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choose category..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <DialogFooter className="px-6 py-4 border-t bg-muted/30">
                    <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave}>Save milestone</Button>
                </DialogFooter>
            </DialogContent>
            {isTestSpinOpen && (
                <BonusSpinWheelModal
                    isOpen={isTestSpinOpen}
                    achievement={{
                        name: name || 'Unnamed milestone',
                        bonusPoints: parseInt(bonusPoints) || 100,
                        wheelSegments: wheelSegments.length === 6 && wheelSegments.every(s => !isNaN(parseInt(s))) ? wheelSegments.map(s => parseInt(s)) : undefined
                    }}
                    onWon={async (wonAmount) => {
                        toast({ title: 'Bonus won!', description: `You won +${wonAmount} bonus points from the wheel spin!` });
                        setIsTestSpinOpen(false);
                    }}
                    primaryColor={accentColor}
                />
            )}
        </Dialog>
    );
}
