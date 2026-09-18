'use client';

import { motion } from 'framer-motion';
import { Check, Minus, Plus, Redo2, Undo2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { classroomArrangeBarClass, type ClassroomDesign } from '@/components/points/classroomVisualTheme';
import { cn } from '@/lib/utils';

const spring = { type: 'spring' as const, stiffness: 280, damping: 26 };

const chipClass =
  'h-8 rounded-lg border-2 border-[#102033] bg-white px-2.5 text-xs font-black text-[#102033] hover:bg-white';

const gridStepClass =
  'h-8 w-8 shrink-0 rounded-lg border-2 border-[#102033] bg-white text-[#102033] hover:bg-white';

const arrangeActionClass =
  'h-8 rounded-lg border-2 border-emerald-700 bg-emerald-600 px-3 text-xs font-black text-white hover:!bg-emerald-500 hover:!text-white focus-visible:!bg-emerald-500 focus-visible:!text-white active:!bg-emerald-600 active:!text-white';

export function ClassroomArrangeToolbar({
  design,
  frontAtBottom,
  rows,
  cols,
  canUndo,
  canRedo,
  onFrontChange,
  onUndo,
  onRedo,
  onRowsChange,
  onColsChange,
  onSeatEveryone,
  onDone,
}: {
  design: ClassroomDesign;
  frontAtBottom: boolean;
  rows: number;
  cols: number;
  canUndo: boolean;
  canRedo: boolean;
  onFrontChange: (frontAtBottom: boolean) => void;
  onUndo: () => void;
  onRedo: () => void;
  onRowsChange: (rows: number) => void;
  onColsChange: (cols: number) => void;
  onSeatEveryone: () => void;
  onDone: () => void;
}) {
  return (
    <motion.div
      layoutId="classroom-arrange-toolbar"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      title="Drag desks to match your room."
      className={cn(
        classroomArrangeBarClass(design),
        'w-full justify-between gap-x-4 rounded-none border-x-0 border-t-0 px-3 py-2',
      )}
      role="toolbar"
      aria-label="Arrange classroom"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className={chipClass}
          disabled={!canUndo}
          onClick={onUndo}
          title={canUndo ? 'Undo last seat change' : 'Nothing to undo yet'}
        >
          <Undo2 className="mr-1 h-3.5 w-3.5" aria-hidden />
          Undo
        </Button>
        <Button
          type="button"
          variant="outline"
          className={chipClass}
          disabled={!canRedo}
          onClick={onRedo}
          title={canRedo ? 'Redo seat change' : 'Nothing to redo yet'}
        >
          <Redo2 className="mr-1 h-3.5 w-3.5" aria-hidden />
          Redo
        </Button>
      </div>

      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-x-3 gap-y-2">
        <span className="text-sm font-black">Layout:</span>
        <RadioGroup
          value={frontAtBottom ? 'bottom' : 'top'}
          onValueChange={(value) => onFrontChange(value === 'bottom')}
          className="flex flex-wrap items-center gap-3"
        >
          <label className="flex cursor-pointer items-center gap-1.5">
            <RadioGroupItem value="top" aria-label="Teacher desk at top" />
            <span className="text-sm font-bold">Desk at top</span>
          </label>
          <label className="flex cursor-pointer items-center gap-1.5">
            <RadioGroupItem value="bottom" aria-label="Teacher desk at bottom" />
            <span className="text-sm font-bold">Desk at bottom</span>
          </label>
        </RadioGroup>
        <span className="hidden font-black sm:inline">|</span>
        <div
          className="flex shrink-0 flex-nowrap items-center gap-1"
          role="group"
          aria-label="Grid size"
        >
          <span className="shrink-0 text-sm font-black">Grid:</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={gridStepClass}
            disabled={rows <= 1}
            aria-label="Fewer rows"
            onClick={() => onRowsChange(rows - 1)}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="shrink-0 whitespace-nowrap px-1 text-center font-mono text-sm font-black">
            {rows} rows
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={gridStepClass}
            aria-label="More rows"
            onClick={() => onRowsChange(rows + 1)}
          >
            <Plus className="h-3 w-3" />
          </Button>
          <span className="mx-1 shrink-0 font-black" aria-hidden>
            ×
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={gridStepClass}
            disabled={cols <= 1}
            aria-label="Fewer columns"
            onClick={() => onColsChange(cols - 1)}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="shrink-0 whitespace-nowrap px-1 text-center font-mono text-sm font-black">
            {cols} columns
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={gridStepClass}
            aria-label="More columns"
            onClick={() => onColsChange(cols + 1)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          className={arrangeActionClass}
          onClick={onSeatEveryone}
          title="Put every student in this class back on a desk"
        >
          <Users className="mr-1 h-3.5 w-3.5" aria-hidden />
          Seat everyone
        </Button>
        <Button
          type="button"
          variant="outline"
          className={arrangeActionClass}
          onClick={onDone}
          aria-label="Done Arranging"
        >
          <Check className="mr-1 h-3.5 w-3.5" aria-hidden />
          Done Arranging
        </Button>
      </div>
    </motion.div>
  );
}
