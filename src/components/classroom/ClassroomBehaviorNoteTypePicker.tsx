'use client';

import { motion } from 'framer-motion';
import { CLASSROOM_NOTE_SHORTCUTS, type ClassroomNoteShortcutKey } from '@/lib/classroom/classroomNoteShortcuts';
import { cn } from '@/lib/utils';

const spring = { type: 'spring' as const, stiffness: 280, damping: 26 };

const KEY_FILL: Record<ClassroomNoteShortcutKey, string> = {
  p: 'bg-emerald-500 hover:bg-emerald-600',
  c: 'bg-sky-500 hover:bg-sky-600',
  i: 'bg-red-500 hover:bg-red-600',
  w: 'bg-amber-500 hover:bg-amber-600',
  h: 'bg-lime-600 hover:bg-lime-700',
};

export function ClassroomBehaviorNoteTypePicker({
  studentLabel,
  onPick,
  onClose,
}: {
  studentLabel: string;
  onPick: (key: ClassroomNoteShortcutKey) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[540] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/60" aria-label="Close note types" onClick={onClose} />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="classroom-note-type-title"
        layoutId="classroom-behavior-note-type"
        initial={{ opacity: 0, y: 12, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={spring}
        className="relative z-[1] w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-slate-700 bg-slate-900 p-4 text-white shadow-2xl"
      >
        <p id="classroom-note-type-title" className="text-base font-black">
          Note for {studentLabel}
        </p>
        <p className="mt-0.5 text-xs font-semibold text-slate-300">Pick the kind of note.</p>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { ...spring, staggerChildren: 0.05 } },
          }}
          className="mt-3 grid gap-1.5"
        >
          {CLASSROOM_NOTE_SHORTCUTS.map((shortcut) => (
            <motion.button
              key={shortcut.key}
              type="button"
              variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: spring } }}
              className={cn(
                'inline-flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-black text-white shadow-sm shadow-black/10 transition-all hover:-translate-y-0.5 hover:shadow-md',
                KEY_FILL[shortcut.key],
              )}
              onClick={() => onPick(shortcut.key)}
            >
              <span>{shortcut.hintLabel}</span>
              <kbd className="rounded-md border border-white/30 bg-black/20 px-1.5 py-0.5 font-mono text-[11px] font-bold">
                {shortcut.key.toUpperCase()}
              </kbd>
            </motion.button>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
