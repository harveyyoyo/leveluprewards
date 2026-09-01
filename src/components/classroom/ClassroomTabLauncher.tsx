'use client';

import { motion } from 'framer-motion';
import { ExternalLink, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { classroomRealmOpenHref } from '@/lib/classroomRealmUrl';
import { CLASSROOM_TAB_LABEL } from '@/lib/classroom/classroomTabSections';
import { useSettings } from '@/components/providers/SettingsProvider';
import { isClassroomPillarOn } from '@/lib/productPillars';

export function ClassroomTabLauncher({ schoolId }: { schoolId: string }) {
  const { settings } = useSettings();
  const classroomOn = isClassroomPillarOn(settings);
  const classroomUrl = classroomRealmOpenHref(schoolId);

  if (!classroomOn) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <p className="text-center text-muted-foreground">
          Turn on Classroom in Settings to use seating charts and quick awards.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[min(70vh,640px)] flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-lime-600 to-amber-500 shadow-2xl shadow-emerald-900/20"
      >
        <LayoutGrid className="h-10 w-10 text-white" aria-hidden />
      </motion.div>

      <div className="max-w-md space-y-3">
        <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
          {CLASSROOM_TAB_LABEL}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          Classroom opens in its own teaching space — live awards, a student class screen, seating,
          and behavior notes, with a look you can pick for your school.
        </p>
      </div>

      <Button
        asChild
        size="lg"
        className="min-w-[14rem] rounded-full bg-gradient-to-r from-lime-700 to-amber-600 px-8 text-base font-bold shadow-lg hover:from-lime-600 hover:to-amber-500"
      >
        <a href={classroomUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="mr-2 h-5 w-5" aria-hidden />
          Open Classroom
        </a>
      </Button>

      <p className="text-xs text-muted-foreground">Opens in a new tab</p>
    </div>
  );
}
