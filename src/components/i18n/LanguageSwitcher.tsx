'use client';

import { Languages } from 'lucide-react';
import { useTranslation } from '@/components/providers/LocaleProvider';
import type { AppLocale } from '@/lib/i18n/locales';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type LanguageSwitcherProps = {
  className?: string;
  compact?: boolean;
};

export function LanguageSwitcher({ className, compact = false }: LanguageSwitcherProps) {
  const { locale, setLocale, localeOptions } = useTranslation();

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {!compact ? (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Languages className="h-3.5 w-3.5" aria-hidden />
          <span className="sr-only">Language</span>
        </span>
      ) : null}
      <Select value={locale} onValueChange={(value) => setLocale(value as AppLocale)}>
        <SelectTrigger
          className={cn(
            'h-9 rounded-xl border-border/70 bg-background/80 font-semibold',
            compact ? 'w-[7.5rem]' : 'w-[9.5rem]',
          )}
          aria-label="Choose language"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {localeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.nativeLabel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
