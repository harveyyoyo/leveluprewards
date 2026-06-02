'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { LayoutGrid, Settings2, BookOpenCheck, Monitor, BellRing } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Helper } from '@/components/ui/helper';
import { ContentSectionTreeNav } from '@/components/ui/content-section-tree-nav';
import type { ClassroomTabSection } from '@/lib/classroom/classroomTabSections';
import { CLASSROOM_SEATING_SECTION_LABEL } from '@/lib/classroom/classroomTabSections';
import { cn } from '@/lib/utils';

export type { ClassroomTabSection };

const SECTION_LABELS: Record<ClassroomTabSection, string> = {
  seating: CLASSROOM_SEATING_SECTION_LABEL,
  behavior: 'Behavior',
  alerts: 'Alerts',
  setup: 'Setup',
  'room-display': 'Room display',
};

const SECTION_ICONS: Record<ClassroomTabSection, React.ComponentType<{ className?: string }>> = {
  seating: LayoutGrid,
  behavior: BookOpenCheck,
  alerts: BellRing,
  setup: Settings2,
  'room-display': Monitor,
};

export type ClassroomTabLayoutProps = {
  defaultSection?: ClassroomTabSection;
  sections: ClassroomTabSection[];
  seatingContent: React.ReactNode;
  behaviorContent?: React.ReactNode;
  alertsContent?: React.ReactNode;
  roomDisplayContent?: React.ReactNode;
  setupContent?: React.ReactNode;
  headerAction?: React.ReactNode;
  className?: string;
};

export function ClassroomTabLayout({
  defaultSection = 'seating',
  sections,
  seatingContent,
  behaviorContent,
  alertsContent,
  roomDisplayContent,
  setupContent,
  headerAction,
  className,
}: ClassroomTabLayoutProps) {
  const reduceMotion = useReducedMotion();
  const activeDefault = sections.includes(defaultSection) ? defaultSection : sections[0];
  const [section, setSection] = useState<ClassroomTabSection>(activeDefault);

  useEffect(() => {
    if (!sections.includes(section)) {
      setSection(sections[0] ?? 'seating');
    }
  }, [sections, section]);

  const contentBySection: Record<ClassroomTabSection, React.ReactNode> = {
    seating: seatingContent,
    behavior: behaviorContent,
    alerts: alertsContent,
    'room-display': roomDisplayContent,
    setup: setupContent,
  };

  const resolvedSection = sections.includes(section) ? section : sections[0];
  const hasMultiple = sections.length >= 2;
  const sectionItems = sections.map((id) => ({
    id,
    label: SECTION_LABELS[id],
    icon: SECTION_ICONS[id],
  }));

  const header = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <Helper
        content={`${CLASSROOM_SEATING_SECTION_LABEL}, behavior notes, if/then alerts, room display, and optional principal or parent access configured in Setup.`}
      >
        <CardTitle className="flex items-center gap-2 text-xl font-black leading-tight tracking-tight text-foreground sm:text-2xl">
          <LayoutGrid className="h-5 w-5 shrink-0 text-violet-500 sm:h-6 sm:w-6" aria-hidden /> Classroom
          Management
        </CardTitle>
      </Helper>
      {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
    </div>
  );

  if (!hasMultiple) {
    return (
      <Card
        className={cn(
          'w-full border-t-4 border-violet-500 shadow-md overflow-hidden bg-background [contain:layout_paint]',
          className,
        )}
      >
        <CardHeader className="bg-secondary/35 border-b border-border/40 p-4 sm:p-6">{header}</CardHeader>
        <CardContent className="p-4 sm:p-6">{contentBySection[resolvedSection]}</CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'w-full border-t-4 border-violet-500 shadow-md overflow-hidden bg-background [contain:layout_paint]',
        className,
      )}
    >
      <CardHeader className="bg-secondary/35 border-b border-border/40 p-4 sm:p-6">{header}</CardHeader>

      <CardContent className="space-y-5 p-4 sm:space-y-6 sm:p-6">
        <ContentSectionTreeNav
          items={sectionItems}
          value={resolvedSection}
          onValueChange={(val) => setSection(val as ClassroomTabSection)}
          fullWidth
          className="w-full"
          aria-label="Classroom Management sections"
        />

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={resolvedSection}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{
              opacity: 1,
              transition: reduceMotion ? { duration: 0 } : { duration: 0.16, ease: 'easeOut' },
            }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, transition: { duration: 0.1 } }}
            className="focus-visible:outline-none"
          >
            {contentBySection[resolvedSection]}
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
