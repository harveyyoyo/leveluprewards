'use client';

import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const spring = { type: 'spring' as const, stiffness: 280, damping: 26 };

export type ClassroomArrangeOverflowStudent = {
  id: string;
  label: string;
};

export function ClassroomArrangeOverflowTray({
  students,
  onDragStudent,
  onPlaceStudent,
}: {
  students: ClassroomArrangeOverflowStudent[];
  onDragStudent: (studentId: string | null) => void;
  onPlaceStudent: (studentId: string) => void;
}) {
  if (!students.length) return null;

  return (
    <motion.aside
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={spring}
      className="flex h-full w-44 shrink-0 flex-col overflow-hidden rounded-2xl border-2 border-[#9a3412] bg-[#fff7ed] shadow-md"
      aria-live="polite"
      aria-label="Students waiting for a seat"
    >
      <div className="border-b-2 border-[#9a3412] bg-[#9a3412] px-3 py-2">
        <p className="classroom-on-dark flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-white">
          <Users className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Waiting for a seat
        </p>
        <p className="classroom-on-dark mt-1 text-xs font-bold leading-snug text-white">
          This room is too small for everyone.
        </p>
      </div>
      <p className="px-3 pt-2 text-[11px] font-semibold leading-snug text-[#7c2d12]">
        Drag a name onto an empty desk, or add a row or column.
      </p>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { ...spring, staggerChildren: 0.05 } },
        }}
        className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2"
      >
        {students.map((student) => (
          <motion.button
            key={student.id}
            type="button"
            variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: spring } }}
            draggable
            onDragStart={() => onDragStudent(student.id)}
            onDragEnd={() => onDragStudent(null)}
            onClick={() => onPlaceStudent(student.id)}
            className={cn(
              'w-full cursor-grab rounded-xl border-2 border-[#9a3412] bg-white px-2.5 py-1.5 text-left text-xs font-black text-[#7c2d12] shadow-sm',
              'active:cursor-grabbing hover:bg-[#ffedd5]',
            )}
            title="Drag onto an empty desk"
          >
            {student.label}
          </motion.button>
        ))}
      </motion.div>
    </motion.aside>
  );
}
