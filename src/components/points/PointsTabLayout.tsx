'use client';

import { useCallback, useState } from 'react';
import { useIntroTourSectionListener } from '@/lib/introTourSection';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Award, Ticket, Coins, ClipboardList } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { StaffPortalTabPanel } from '@/components/staff/StaffPortalTabHeader';
import { ContentSectionTreeNav } from '@/components/ui/content-section-tree-nav';
import { cn } from '@/lib/utils';

export type PointsTabSection = 'categories' | 'print' | 'manual' | 'manage';

const SECTION_LABELS: Record<PointsTabSection, string> = {
  categories: 'Categories',
  print: 'Print coupons',
  manual: 'Adjust points',
  manage: 'Inventory',
};

const SECTION_ICONS: Record<PointsTabSection, React.ComponentType<{ className?: string }>> = {
  categories: Award,
  print: Ticket,
  manual: Coins,
  manage: ClipboardList,
};

export type PointsTabLayoutProps = {
  /** Staff portal tab value — admin uses `categories`, teacher uses `coupons` (both labeled Points). */
  tabValue?: 'categories' | 'coupons';
  defaultSection?: PointsTabSection;
  sections?: PointsTabSection[];
  categoriesContent: React.ReactNode;
  printContent: React.ReactNode;
  manualContent: React.ReactNode;
  manageContent?: React.ReactNode;
  className?: string;
  /** @deprecated Tree nav no longer uses pill triggers; kept for call-site compatibility. */
  tabTriggerClassName?: string;
  /** @deprecated Tree nav no longer uses pill triggers; kept for call-site compatibility. */
  isGraphic?: boolean;
};

export function PointsTabLayout({
  tabValue = 'categories',
  defaultSection = 'categories',
  sections = ['categories', 'print', 'manual'],
  categoriesContent,
  printContent,
  manualContent,
  manageContent,
  className,
}: PointsTabLayoutProps) {
  const reduceMotion = useReducedMotion();
  const activeDefault = sections.includes(defaultSection) ? defaultSection : sections[0];
  const [section, setSection] = useState<PointsTabSection>(activeDefault);

  const handleIntroTourSection = useCallback(
    (sectionId: string) => {
      if (sections.includes(sectionId as PointsTabSection)) {
        setSection(sectionId as PointsTabSection);
      }
    },
    [sections],
  );
  useIntroTourSectionListener(handleIntroTourSection);

  const contentBySection: Record<PointsTabSection, React.ReactNode> = {
    categories: categoriesContent,
    print: printContent,
    manual: manualContent,
    manage: manageContent,
  };

  const resolvedSection = sections.includes(section) ? section : sections[0];
  const hasMultiple = sections.length >= 2;
  const sectionItems = sections.map((id) => ({
    id,
    label: SECTION_LABELS[id],
    icon: SECTION_ICONS[id],
  }));

  if (hasMultiple) {
    return (
      <StaffPortalTabPanel tabValue={tabValue} className={className}>
        <Card className="w-full overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
          <CardContent className="space-y-5 p-4 sm:space-y-6 sm:p-6">
            <ContentSectionTreeNav
              branchLabel="Points"
              items={sectionItems}
              value={resolvedSection}
              onValueChange={(val) => setSection(val as PointsTabSection)}
              className="rounded-2xl border bg-muted/30 p-1.5"
              aria-label="Points sections"
            />

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={resolvedSection}
                layout
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: reduceMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 420, damping: 34, mass: 0.8, staggerChildren: 0.04 },
                }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34, mass: 0.8 }}
                className="focus-visible:outline-none"
              >
                {contentBySection[resolvedSection]}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>
      </StaffPortalTabPanel>
    );
  }

  return (
    <div className={cn('focus-visible:outline-none', className)}>
      {contentBySection[resolvedSection]}
    </div>
  );
}
