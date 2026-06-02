'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Award, Ticket, Coins, ClipboardList } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Helper } from '@/components/ui/helper';
import { ContentSectionTreeNav } from '@/components/ui/content-section-tree-nav';
import { cn } from '@/lib/utils';

export type PointsTabSection = 'categories' | 'print' | 'manual' | 'manage';

const SECTION_LABELS: Record<PointsTabSection, string> = {
  categories: 'Categories',
  print: 'Print coupons',
  manual: 'Adjust points',
  manage: 'Coupon inventory',
};

const SECTION_ICONS: Record<PointsTabSection, React.ComponentType<{ className?: string }>> = {
  categories: Award,
  print: Ticket,
  manual: Coins,
  manage: ClipboardList,
};

export type PointsTabLayoutProps = {
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
      <Card className={cn("w-full border-t-4 border-primary shadow-md overflow-hidden bg-background/95 backdrop-blur-md", className)}>
        <CardHeader className="bg-secondary/35 border-b border-border/40 p-4 sm:p-6">
          <Helper content="Configure categories, print coupons, review coupon inventory, and adjust points directly.">
            <CardTitle className="flex items-center gap-2 text-xl font-black leading-tight tracking-tight text-foreground sm:text-2xl">
              <Coins className="w-5 h-5 shrink-0 text-primary sm:w-6 sm:h-6" /> Categories &amp; coupons
            </CardTitle>
          </Helper>
        </CardHeader>

        <CardContent className="space-y-5 p-4 sm:space-y-6 sm:p-6">
          <ContentSectionTreeNav
            branchLabel="Categories & coupons"
            items={sectionItems}
            value={resolvedSection}
            onValueChange={(val) => setSection(val as PointsTabSection)}
            className="rounded-2xl border bg-muted/30 p-1.5"
            aria-label="Categories and coupons sections"
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
    );
  }

  return (
    <div className={cn('focus-visible:outline-none', className)}>
      {contentBySection[resolvedSection]}
    </div>
  );
}
