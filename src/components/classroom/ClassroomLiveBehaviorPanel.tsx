'use client';

import { motion } from 'framer-motion';
import { BehaviorTimelinePanel } from '@/components/classroom/BehaviorTimelinePanel';
import { ClassroomLiveToolSheet } from '@/components/classroom/ClassroomLiveToolSheet';
import { CLASSROOM_NOTE_SHORTCUTS, type ClassroomNoteShortcutKey } from '@/lib/classroom/classroomNoteShortcuts';
import { cn } from '@/lib/utils';

const spring = { type: 'spring' as const, stiffness: 280, damping: 26 };

const KEY_FILL: Record<ClassroomNoteShortcutKey, string> = {
  p: 'bg-emerald-500 hover:bg-emerald-600',
  c: 'bg-sky-500 hover:bg-sky-600',
  i: 'bg-red-500 hover:bg-red-600',
  w: 'bg-amber-500 hover:bg-amber-600',
  h: 'bg-violet-600 hover:bg-violet-700',
};

const KEY_DOT: Record<ClassroomNoteShortcutKey, string> = {
  p: 'bg-emerald-200',
  c: 'bg-sky-200',
  i: 'bg-red-200',
  w: 'bg-amber-200',
  h: 'bg-violet-200',
};

export function ClassroomLiveBehaviorPanel({
  open,
  onClose,
  schoolId,
  pickKey,
  onPickKey,
}: {
  open: boolean;
  onClose: () => void;
  schoolId: string;
  pickKey: ClassroomNoteShortcutKey | null;
  onPickKey: (key: ClassroomNoteShortcutKey) => void;
}) {
  const selected = pickKey ? CLASSROOM_NOTE_SHORTCUTS.find((row) => row.key === pickKey) : null;
  const highlight = CLASSROOM_NOTE_SHORTCUTS.find((row) => row.key === 'h');
  const gridKeys = CLASSROOM_NOTE_SHORTCUTS.filter((row) => row.key !== 'h');

  return (
    <ClassroomLiveToolSheet
      open={open}
      title="📝 Behavior Log"
      layoutId="classroom-live-behavior"
      onClose={onClose}
      wide
    >
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { ...spring, staggerChildren: 0.05 } },
        }}
        className="flex min-h-0 flex-col gap-3"
      >
        <section className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-lime-800">
            Quick tag
          </p>
          <p className="text-xs font-semibold text-slate-700">
            {selected
              ? `Now tap a desk to write a ${selected.hintLabel.toLowerCase()}.`
              : 'Select type, then click a desk'}
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {gridKeys.map((shortcut) => (
              <NoteTypeChip
                key={shortcut.key}
                shortcutKey={shortcut.key}
                label={shortcut.hintLabel.replace(/ note$/i, '')}
                selected={pickKey === shortcut.key}
                onPick={() => onPickKey(shortcut.key)}
              />
            ))}
            {highlight ? (
              <NoteTypeChip
                shortcutKey="h"
                label={highlight.hintLabel}
                selected={pickKey === 'h'}
                onPick={() => onPickKey('h')}
              />
            ) : null}
          </div>
        </section>
        <BehaviorTimelinePanel schoolId={schoolId} embedded liveLog mode="behavior" />
      </motion.div>
    </ClassroomLiveToolSheet>
  );
}

function NoteTypeChip({
  shortcutKey,
  label,
  selected,
  onPick,
}: {
  shortcutKey: ClassroomNoteShortcutKey;
  label: string;
  selected: boolean;
  onPick: () => void;
}) {
  return (
    <motion.button
      type="button"
      variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: spring } }}
      className={cn(
        'inline-flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-black text-white shadow-sm shadow-black/15 transition-all hover:-translate-y-0.5 hover:shadow-md',
        KEY_FILL[shortcutKey],
        selected && 'ring-2 ring-slate-900 ring-offset-1',
      )}
      onClick={onPick}
    >
      <span className="inline-flex min-w-0 items-center gap-2">
        <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white/80', KEY_DOT[shortcutKey])} />
        <span className="truncate">{label}</span>
      </span>
      <kbd className="rounded-md border border-white/35 bg-black/20 px-1.5 py-0.5 font-mono text-[11px] font-bold">
        {shortcutKey.toUpperCase()}
      </kbd>
    </motion.button>
  );
}
