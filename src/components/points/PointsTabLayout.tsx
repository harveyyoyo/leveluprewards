'use client';

import { useCallback, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useIntroTourSectionListener } from '@/lib/introTourSection';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Award, Ticket, Coins, ClipboardList, Palette } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { StaffPortalTabPanel } from '@/components/staff/StaffPortalTabHeader';
import { ContentSectionTreeNav } from '@/components/ui/content-section-tree-nav';
import { cn } from '@/lib/utils';

export type PointsTabSection = 'categories' | 'print' | 'manual' | 'manage' | 'currency';

const SECTION_LABELS: Record<PointsTabSection, string> = {
  categories: 'Categories',
  print: 'Print coupons',
  manual: 'Adjust points',
  manage: 'Inventory',
  currency: 'Currency & Design',
};

const SECTION_ICONS: Record<PointsTabSection, React.ComponentType<{ className?: string }>> = {
  categories: Award,
  print: Ticket,
  manual: Coins,
  manage: ClipboardList,
  currency: Palette,
};

export type PointsTabLayoutProps = {
  /** Staff portal tab value — admin uses `categories`, teacher uses `coupons` (both labeled Coupons). */
  tabValue?: 'categories' | 'coupons';
  defaultSection?: PointsTabSection;
  sections?: PointsTabSection[];
  categoriesContent: React.ReactNode;
  printContent: React.ReactNode;
  manualContent: React.ReactNode;
  manageContent?: React.ReactNode;
  currencyContent?: React.ReactNode;
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
  currencyContent,
  className,
}: PointsTabLayoutProps) {
  const reduceMotion = useReducedMotion();
  const activeDefault = sections.includes(defaultSection) ? defaultSection : sections[0];

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const [section, setSectionState] = useState<PointsTabSection>(() => {
    const raw = searchParams.get('section');
    return raw && sections.includes(raw as PointsTabSection) ? (raw as PointsTabSection) : activeDefault;
  });

  // Keeps the URL deep-linkable to a specific section (e.g. ?tab=coupons&section=print).
  const setSection = useCallback((next: PointsTabSection) => {
    setSectionState(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === activeDefault) {
      params.delete('section');
    } else {
      params.set('section', next);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [activeDefault, pathname, router, searchParams]);

  const handleIntroTourSection = useCallback(
    (sectionId: string) => {
      if (sections.includes(sectionId as PointsTabSection)) {
        setSection(sectionId as PointsTabSection);
      }
    },
    [sections, setSection],
  );
  useIntroTourSectionListener(handleIntroTourSection);

  const contentBySection: Record<PointsTabSection, React.ReactNode> = {
    categories: categoriesContent,
    print: printContent,
    manual: manualContent,
    manage: manageContent,
    currency: currencyContent,
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
              branchLabel="Coupons"
              items={sectionItems}
              value={resolvedSection}
              onValueChange={(val) => setSection(val as PointsTabSection)}
              fullWidth
              aria-label="Coupons sections"
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
