'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { LayoutGrid, BookOpenCheck, Monitor } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { StaffPortalTabPanel } from '@/components/staff/StaffPortalTabHeader';
import { ContentSectionTreeNav } from '@/components/ui/content-section-tree-nav';
import type { ClassroomTabSection } from '@/lib/classroom/classroomTabSections';
import { CLASSROOM_SEATING_SECTION_LABEL, CLASSROOM_TAB_LABEL } from '@/lib/classroom/classroomTabSections';
import { cn } from '@/lib/utils';

export type { ClassroomTabSection };

const SECTION_LABELS: Record<ClassroomTabSection, string> = {
  seating: CLASSROOM_SEATING_SECTION_LABEL,
  behavior: 'Behavior',
  'room-display': 'Room display',
};

const SECTION_ICONS: Record<ClassroomTabSection, React.ComponentType<{ className?: string }>> = {
  seating: LayoutGrid,
  behavior: BookOpenCheck,
  'room-display': Monitor,
};

export type ClassroomTabLayoutProps = {
  defaultSection?: ClassroomTabSection;
  sections: ClassroomTabSection[];
  seatingContent: React.ReactNode;
  behaviorContent?: React.ReactNode;
  roomDisplayContent?: React.ReactNode;
  headerAction?: React.ReactNode;
  className?: string;
};

export function ClassroomTabLayout({
  defaultSection = 'seating',
  sections,
  seatingContent,
  behaviorContent,
  roomDisplayContent,
  headerAction,
  className,
}: ClassroomTabLayoutProps) {
  const reduceMotion = useReducedMotion();
  const activeDefault = sections.includes(defaultSection) ? defaultSection : sections[0];
  const [section, setSection] = useState<ClassroomTabSection>(activeDefault);
  const [mountedSections, setMountedSections] = useState<Set<ClassroomTabSection>>(
    () => new Set([activeDefault]),
  );

  const resolvedSection = sections.includes(section) ? section : sections[0];

  useEffect(() => {
    if (!sections.includes(section)) {
      setSection(sections[0] ?? 'seating');
    }
  }, [sections, section]);

  useEffect(() => {
    setMountedSections((prev) => {
      if (prev.has(resolvedSection)) return prev;
      const next = new Set(prev);
      next.add(resolvedSection);
      return next;
    });
  }, [resolvedSection]);

  const contentBySection: Record<ClassroomTabSection, React.ReactNode> = {
    seating: seatingContent,
    behavior: behaviorContent,
    'room-display': roomDisplayContent,
  };

  const hasMultiple = sections.length >= 2;
  const sectionItems = sections.map((id) => ({
    id,
    label: SECTION_LABELS[id],
    icon: SECTION_ICONS[id],
  }));

  const contentCardClassName = cn(
    'w-full overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm [contain:layout_paint]',
  );

  if (!hasMultiple) {
    return (
      <StaffPortalTabPanel
        tabValue="classroom"
        className={className}
        trailing={
          headerAction ? (
            <div className="flex shrink-0 flex-wrap items-center gap-3">{headerAction}</div>
          ) : undefined
        }
      >
        <Card className={contentCardClassName}>
          <CardContent className="p-4 sm:p-6">{contentBySection[resolvedSection]}</CardContent>
        </Card>
      </StaffPortalTabPanel>
    );
  }

  return (
    <StaffPortalTabPanel
      tabValue="classroom"
      className={className}
      trailing={
        headerAction ? (
          <div className="flex shrink-0 flex-wrap items-center gap-3">{headerAction}</div>
        ) : undefined
      }
    >
      <Card className={contentCardClassName}>
        <CardContent className="space-y-5 p-4 sm:space-y-6 sm:p-6">
          <ContentSectionTreeNav
            items={sectionItems}
            value={resolvedSection}
            onValueChange={(val) => setSection(val as ClassroomTabSection)}
            fullWidth
            className="w-full"
            aria-label={`${CLASSROOM_TAB_LABEL} sections`}
          />

          <div className="space-y-0">
            {sections.map((id) => {
              if (!mountedSections.has(id)) return null;
              const active = id === resolvedSection;
              return (
                <div
                  key={id}
                  id={`classroom-section-${id}`}
                  role="tabpanel"
                  aria-labelledby={`classroom-section-tab-${id}`}
                  hidden={!active}
                  className={cn(!active && 'hidden')}
                >
                  <motion.div
                    initial={false}
                    animate={
                      active && !reduceMotion
                        ? { opacity: 1, transition: { duration: 0.16, ease: 'easeOut' } }
                        : { opacity: 1, transition: { duration: 0 } }
                    }
                    className="focus-visible:outline-none"
                  >
                    {contentBySection[id]}
                  </motion.div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </StaffPortalTabPanel>
  );
}
