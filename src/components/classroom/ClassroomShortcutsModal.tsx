'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Footprints, Keyboard, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const spring = { type: 'spring' as const, stiffness: 280, damping: 26 };

function shortcutRows(tapPoints: number) {
  return [
    { action: `Instant award: +${tapPoints} now`, keys: ['Left click'] },
    { action: 'Open menu', keys: ['Right click'] },
    { action: 'Positive note', keys: ['Hold P', 'click'] },
    { action: 'Comment', keys: ['Hold C', 'click'] },
    { action: 'Incident', keys: ['Hold I', 'click'] },
    { action: 'Warning', keys: ['Hold W', 'click'] },
    { action: 'Highlight', keys: ['Hold H', 'click'] },
    { action: 'Choose note type', keys: ['Shift', 'click'] },
    { action: 'Bathroom pass', keys: ['Alt', 'click'] },
  ] as const;
}

const STATUSES = [
  { id: 'present', label: 'Present', hint: 'Signed in today', dot: 'bg-emerald-500' },
  { id: 'late', label: 'Late', hint: 'Arrived after start', dot: 'bg-amber-500' },
  { id: 'absent', label: 'Not signed in', hint: 'No sign-in yet', dot: 'bg-red-500' },
] as const;

function KeyBadge({ children }: { children: string }) {
  return (
    <kbd className="inline-flex items-center rounded-md border border-slate-500 bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wide text-white">
      {children}
    </kbd>
  );
}

export function ClassroomShortcutsModal({
  open,
  onOpenChange,
  tapPoints = 5,
  showOnScreen = false,
  onShowOnScreenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tapPoints?: number;
  showOnScreen?: boolean;
  onShowOnScreenChange?: (show: boolean) => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  if (typeof document === 'undefined') return null;
  const rows = shortcutRows(tapPoints);

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="classroom-shortcuts-overlay"
          className="fixed inset-0 z-[560] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={spring}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            aria-label="Close shortcuts"
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="classroom-shortcuts-title"
            layoutId="classroom-keyboard-tips"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={spring}
            className="relative z-[1] w-[min(26.25rem,calc(100vw-2rem))] rounded-2xl border border-slate-700 bg-slate-900 p-5 text-white shadow-2xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p id="classroom-shortcuts-title" className="text-base font-black tracking-tight">
                  Shortcuts
                </p>
                <p className="mt-0.5 text-xs font-semibold text-slate-300">Glance, then close.</p>
              </div>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-600 bg-slate-800 text-white hover:bg-slate-700"
                aria-label="Close shortcuts"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { ...spring, staggerChildren: 0.05 } },
              }}
              className="space-y-4"
            >
              {onShowOnScreenChange ? (
                <div className="rounded-xl border border-slate-600 bg-slate-800/80 p-3">
                  <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Show on screen</p>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showOnScreen}
                    className={cn(
                      'mt-2 inline-flex h-9 w-full items-center justify-center rounded-xl px-3 text-sm font-black tracking-normal',
                      showOnScreen ? 'bg-amber-300 text-[#102033]' : 'bg-slate-700 text-white hover:bg-slate-600',
                    )}
                    onClick={() => onShowOnScreenChange(!showOnScreen)}
                  >
                    {showOnScreen ? 'By teacher desk ✓' : 'By teacher desk'}
                  </button>
                  <p className="mt-1.5 text-xs font-semibold text-slate-300">
                    Keep a small reminder beside the teacher desk. It does not cover student desks.
                  </p>
                </div>
              ) : null}
              <div>
                <div className="mb-2 grid grid-cols-[1fr_auto] gap-x-3 text-[10px] font-black uppercase tracking-wide text-slate-400">
                  <span>Action</span>
                  <span>Key</span>
                </div>
                <div className="divide-y divide-slate-700 overflow-hidden rounded-xl border border-slate-700">
                  {rows.map((row) => (
                    <motion.div
                      key={row.action}
                      variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: spring } }}
                      className="grid grid-cols-[1fr_auto] items-center gap-x-3 px-3 py-2.5"
                    >
                      <span className="text-sm font-bold">{row.action}</span>
                      <span className="flex flex-wrap items-center justify-end gap-1">
                        {row.keys.map((key, index) => (
                          <span key={`${row.action}-${key}`} className="flex items-center gap-1">
                            {index > 0 ? <span className="text-[10px] font-black text-slate-400">+</span> : null}
                            <KeyBadge>{key}</KeyBadge>
                          </span>
                        ))}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-slate-400">Status indicators</p>
                <motion.ul className="space-y-2">
                  {STATUSES.map((status) => (
                    <motion.li
                      key={status.id}
                      variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: spring } }}
                      className="flex items-center gap-2.5"
                    >
                      <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white/80', status.dot)} />
                      <span className="text-sm font-bold">{status.label}:</span>
                      <span className="text-sm text-slate-300">{status.hint}</span>
                    </motion.li>
                  ))}
                  <motion.li
                    variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: spring } }}
                    className="flex items-center gap-2.5"
                  >
                    <span className="classroom-light-ink inline-flex items-center gap-0.5 rounded-md border-2 border-[#0F172A] bg-amber-400 px-1 py-0.5 text-[9px] font-black !text-[#0F172A]">
                      <Footprints className="h-3 w-3" aria-hidden />
                      Pass Out
                    </span>
                    <span className="text-sm font-bold">Hall Pass:</span>
                    <span className="text-sm text-slate-300">Out of classroom</span>
                  </motion.li>
                </motion.ul>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

export function ClassroomShortcutsTrigger({
  onOpen,
}: {
  onOpen: () => void;
}) {
  return (
    <motion.button
      type="button"
      layoutId="classroom-keyboard-tips"
      transition={spring}
      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 text-xs font-black text-white hover:bg-white/20"
      aria-label="Shortcuts"
      title="Shortcuts"
      onClick={onOpen}
    >
      <Keyboard className="h-3.5 w-3.5 shrink-0" aria-hidden />
      Shortcuts
    </motion.button>
  );
}
