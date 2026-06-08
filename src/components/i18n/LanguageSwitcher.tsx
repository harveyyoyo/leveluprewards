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
  /** Show icon + "Language" label beside the dropdown (recommended on portal). */
  showLabel?: boolean;
};

export function LanguageSwitcher({ className, showLabel = true }: LanguageSwitcherProps) {
  const { locale, setLocale, localeOptions, t } = useTranslation();

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-xl border border-border/60 bg-background/90 px-2.5 py-1.5 shadow-sm backdrop-blur-sm',
        className,
      )}
    >
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
        <Languages className="h-4 w-4 shrink-0" aria-hidden />
        {showLabel ? <span>{t('settings.language.title')}</span> : null}
      </span>
      <Select value={locale} onValueChange={(value) => setLocale(value as AppLocale)}>
        <SelectTrigger
          className="h-8 w-[6.75rem] rounded-lg border-border/70 bg-background font-semibold shadow-none sm:w-[7.25rem]"
          aria-label={t('settings.language.title')}
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
