'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { LayoutGrid, BookOpenCheck, Monitor, Dices } from 'lucide-react';
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
  raffle: 'Raffle',
};

const SECTION_ICONS: Record<ClassroomTabSection, React.ComponentType<{ className?: string }>> = {
  seating: LayoutGrid,
  behavior: BookOpenCheck,
  'room-display': Monitor,
  raffle: Dices,
};

export type ClassroomTabLayoutProps = {
  defaultSection?: ClassroomTabSection;
  sections: ClassroomTabSection[];
  seatingContent: React.ReactNode;
  behaviorContent?: React.ReactNode;
  roomDisplayContent?: React.ReactNode;
  raffleContent?: React.ReactNode;
  headerAction?: React.ReactNode;
  className?: string;
  /** Render inside the Classroom realm shell (no staff portal tab chrome). */
  realmMode?: boolean;
};

function ClassroomTabLayoutInner({
  defaultSection = 'seating',
  sections,
  seatingContent,
  behaviorContent,
  roomDisplayContent,
  raffleContent,
  headerAction,
  className,
  realmMode = false,
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
    raffle: raffleContent,
  };

  const hasMultiple = sections.length >= 2;
  const sectionItems = sections.map((id) => ({
    id,
    label: SECTION_LABELS[id],
    icon: SECTION_ICONS[id],
  }));

  const contentCardClassName = cn(
    'w-full overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm [contain:layout_paint]',
    realmMode && 'border-white/12 bg-white/[0.06] text-white shadow-none',
  );

  const headerRow =
    headerAction ? (
      <div className="mb-4 flex shrink-0 flex-wrap items-center justify-end gap-3">{headerAction}</div>
    ) : null;

  const sectionNav = (
    <ContentSectionTreeNav
      items={sectionItems}
      value={resolvedSection}
      onValueChange={(val) => setSection(val as ClassroomTabSection)}
      fullWidth
      className="w-full"
      aria-label={`${CLASSROOM_TAB_LABEL} sections`}
    />
  );

  const sectionPanels = (
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
  );

  if (realmMode) {
    if (!hasMultiple) {
      return (
        <div className={className}>
          {headerRow}
          <Card className={contentCardClassName}>
            <CardContent className="p-4 sm:p-6">{contentBySection[resolvedSection]}</CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className={className}>
        {headerRow}
        <Card className={contentCardClassName}>
          <CardContent className="space-y-5 p-4 sm:space-y-6 sm:p-6">
            {sectionNav}
            {sectionPanels}
          </CardContent>
        </Card>
      </div>
    );
  }

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
          {sectionNav}
          {sectionPanels}
        </CardContent>
      </Card>
    </StaffPortalTabPanel>
  );
}

export function ClassroomTabLayout(props: ClassroomTabLayoutProps) {
  return <ClassroomTabLayoutInner {...props} />;
}
