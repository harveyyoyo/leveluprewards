'use client';

import { Award, Printer, Tag } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export type PointsTabSection = 'categories' | 'print' | 'manual';

const SECTION_LABELS: Record<PointsTabSection, string> = {
  categories: 'Award Categories',
  print: 'Print Coupons',
  manual: 'Manually Add or Deduct',
};

const SECTION_ICONS: Record<PointsTabSection, typeof Tag> = {
  categories: Tag,
  print: Printer,
  manual: Award,
};

export type PointsTabLayoutProps = {
  defaultSection?: PointsTabSection;
  sections?: PointsTabSection[];
  categoriesContent: React.ReactNode;
  printContent: React.ReactNode;
  manualContent: React.ReactNode;
  className?: string;
  tabTriggerClassName?: string;
  isGraphic?: boolean;
};

export function PointsTabLayout({
  defaultSection = 'categories',
  sections = ['categories', 'print', 'manual'],
  categoriesContent,
  printContent,
  manualContent,
  className,
  tabTriggerClassName,
  isGraphic = false,
}: PointsTabLayoutProps) {
  const activeDefault = sections.includes(defaultSection) ? defaultSection : sections[0];
  const gridCols =
    sections.length === 1 ? 'grid-cols-1' : sections.length === 2 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-3';

  const contentBySection: Record<PointsTabSection, React.ReactNode> = {
    categories: categoriesContent,
    print: printContent,
    manual: manualContent,
  };

  return (
    <div className={cn('space-y-6', className)}>
      <Tabs defaultValue={activeDefault} className="w-full">
        <TabsList
          className={cn(
            'grid h-auto w-full gap-1 rounded-2xl border p-1.5 shadow-sm',
            gridCols,
            isGraphic ? 'border-white/10 bg-muted/30' : 'bg-muted/50',
          )}
          aria-label="Points tab sections"
        >
          {sections.map((section) => {
            const Icon = SECTION_ICONS[section];
            return (
              <TabsTrigger
                key={section}
                value={section}
                className={cn(
                  'h-11 rounded-xl px-3 text-xs font-bold sm:text-sm gap-2',
                  tabTriggerClassName,
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="truncate">{SECTION_LABELS[section]}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {sections.map((section) => (
          <TabsContent key={section} value={section} className="mt-6 focus-visible:outline-none">
            {contentBySection[section]}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
