'use client';

import { useState } from 'react';
import { Award, Ticket, Coins } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export type PointsTabSection = 'categories' | 'print' | 'manual';

const SECTION_LABELS: Record<PointsTabSection, string> = {
  categories: 'Award Categories',
  print: 'Print Coupons',
  manual: 'Manual Adjust',
};

const SECTION_ICONS: Record<PointsTabSection, React.ComponentType<{ className?: string }>> = {
  categories: Award,
  print: Ticket,
  manual: Coins,
};

export type PointsTabLayoutProps = {
  defaultSection?: PointsTabSection;
  sections?: PointsTabSection[];
  categoriesContent: React.ReactNode;
  printContent: React.ReactNode;
  manualContent: React.ReactNode;
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
  className,
}: PointsTabLayoutProps) {
  const activeDefault = sections.includes(defaultSection) ? defaultSection : sections[0];
  const [section, setSection] = useState<PointsTabSection>(activeDefault);

  const contentBySection: Record<PointsTabSection, React.ReactNode> = {
    categories: categoriesContent,
    print: printContent,
    manual: manualContent,
  };

  const resolvedSection = sections.includes(section) ? section : sections[0];
  const colsClass =
    sections.length === 3
      ? 'grid-cols-3'
      : sections.length === 2
        ? 'grid-cols-2'
        : 'grid-cols-1';

  const hasMultiple = sections.length >= 2;

  const tabList = (
    <TabsList className={cn('grid w-full max-w-2xl rounded-2xl bg-secondary/80 p-1 border border-border/40', colsClass)}>
      {sections.map((id) => {
        const Icon = SECTION_ICONS[id];
        return (
          <TabsTrigger
            key={id}
            value={id}
            className="rounded-xl py-2 font-bold flex items-center justify-center gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
          >
            <Icon className="h-4 w-4 shrink-0" />
            {SECTION_LABELS[id]}
          </TabsTrigger>
        );
      })}
    </TabsList>
  );

  if (hasMultiple) {
    return (
      <Card className={cn("w-full border-t-4 border-primary shadow-md overflow-hidden bg-background/95 backdrop-blur-md", className)}>
        <CardHeader className="py-6 bg-secondary/35 border-b border-border/40">
          <div>
            <CardTitle className="flex items-center gap-2 text-2xl font-black tracking-tight text-foreground">
              <Coins className="w-6 h-6 text-primary" /> Points &amp; Rewards
            </CardTitle>
            <CardDescription className="mt-1 text-sm font-medium">
              Configure reward categories, print point coupons, and apply direct points additions or deductions.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <Tabs
            value={resolvedSection}
            onValueChange={(val) => setSection(val as PointsTabSection)}
            className="w-full space-y-6"
          >
            {tabList}

            {sections.map((id) => (
              <TabsContent key={id} value={id} className="focus-visible:outline-none mt-4 animate-in fade-in-50 duration-200">
                {contentBySection[id]}
              </TabsContent>
            ))}
          </Tabs>
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
