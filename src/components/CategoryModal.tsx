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
import { useAppContext } from '@/components/AppProvider';
import { useToast } from '@/hooks/use-toast';
import type { Category } from '@/lib/types';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { pickDistinctCategoryColor } from '@/lib/utils';

interface CategoryModalProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    category: Category | null;
}

export function CategoryModal({ isOpen, setIsOpen, category }: CategoryModalProps) {
    const { addCategory, updateCategory, categories } = useAppContext();
    const [name, setName] = useState('');
    const [points, setPoints] = useState('10');
    const [color, setColor] = useState(pickDistinctCategoryColor());
    const { toast } = useToast();
    const playSound = useArcadeSound();

    const isEditing = !!category;

    useEffect(() => {
        if (isOpen) {
            if (category) { // Edit mode
                setName(category.name);
                setPoints(category.points.toString());
                setColor(category.color || '#cccccc');
            } else { // Create mode
                setName('');
                setPoints('10');
                setColor(pickDistinctCategoryColor((categories || []).map((c) => c.color)));
            }
        }
    }, [category, isOpen, categories]);

    const handleSave = async () => {
        const pointsValue = parseInt(points);
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

        if (isEditing && category) {
            const updatedCategory: Category = { ...category, name, points: pointsValue, color };
            await updateCategory(updatedCategory);
            playSound('success');
            toast({ title: 'Category updated!' });
        } else {
            const newCategory = { name, points: pointsValue, color };
            await addCategory(newCategory);
            playSound('success');
            toast({ title: 'Category added!' });
        }
        setIsOpen(false);
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
                    </div>
                </div>
                <DialogFooter className="px-6 py-4 border-t bg-muted/30">
                    <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button type="submit" onClick={handleSave}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
