'use client';

import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { collectOfficeTermOptions, getSuggestedTermLabel } from '@/lib/office/officeUtils';
import type { OfficeGradeEntry } from '@/lib/office/types';
import { cn } from '@/lib/utils';

type OfficeWorkingTermSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  gradeEntries?: Pick<OfficeGradeEntry, 'termLabel'>[];
  schoolDefaultTerm?: string | null;
  configuredTerms?: string[] | null;
  label?: string;
  layout?: 'inline' | 'stacked';
  triggerClassName?: string;
  id?: string;
};

export function OfficeWorkingTermSelect({
  value,
  onValueChange,
  gradeEntries,
  schoolDefaultTerm,
  configuredTerms,
  label = 'Term',
  layout = 'stacked',
  triggerClassName,
  id = 'office-working-term',
}: OfficeWorkingTermSelectProps) {
  const suggested = getSuggestedTermLabel();
  const trimmed = value.trim();

  const options = useMemo(() => {
    const base = collectOfficeTermOptions({
      gradeEntries,
      activeTerm: trimmed,
      schoolDefaultTerm: schoolDefaultTerm ?? undefined,
      configuredTerms: configuredTerms ?? undefined,
    });
    if (trimmed && !base.includes(trimmed)) return [trimmed, ...base];
    return base;
  }, [gradeEntries, trimmed, schoolDefaultTerm, configuredTerms]);

  const selectValue = trimmed && options.includes(trimmed) ? trimmed : options[0] ?? suggested;

  const control = (
    <Select value={selectValue} onValueChange={onValueChange}>
      <SelectTrigger
        id={id}
        className={cn('h-9 rounded-lg', layout === 'inline' ? 'w-44' : 'w-full max-w-xs', triggerClassName)}
      >
        <SelectValue placeholder="Select term" />
      </SelectTrigger>
      <SelectContent>
        {options.map((t) => (
          <SelectItem key={t} value={t}>
            {t === suggested ? `${t} (this season)` : t}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (layout === 'inline') {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Label htmlFor={id} className="font-medium text-foreground">
          {label}
        </Label>
        {control}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </Label>
      {control}
    </div>
  );
}
