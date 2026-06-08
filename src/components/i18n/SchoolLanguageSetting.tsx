'use client';

import { Languages } from 'lucide-react';
import { useTranslation } from '@/components/providers/LocaleProvider';
import { LOCALE_OPTIONS, resolveLocaleFromLanguageSetting, type AppLocale } from '@/lib/i18n/locales';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type SchoolLanguageSettingProps = {
  language: string;
  onLanguageChange: (locale: AppLocale) => void;
  disabled?: boolean;
  className?: string;
  showSectionHeader?: boolean;
  id?: string;
};

export function SchoolLanguageSetting({
  language,
  onLanguageChange,
  disabled = false,
  className,
  showSectionHeader = true,
  id = 'settings-interface-language',
}: SchoolLanguageSettingProps) {
  const { t } = useTranslation();

  return (
    <div
      id={id}
      className={cn(
        'scroll-mt-[4.5rem] rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800/50 dark:bg-slate-800/30',
        className,
      )}
    >
      {showSectionHeader ? (
        <p className="flex items-center gap-2 pb-3 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          <Languages className="h-3.5 w-3.5" aria-hidden />
          {t('settings.language.title')}
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col pr-4">
          <span className="text-sm font-bold">{t('settings.language.title')}</span>
          <p className="text-[11px] text-muted-foreground">{t('settings.language.description')}</p>
        </div>
        <Select
          value={resolveLocaleFromLanguageSetting(language)}
          onValueChange={(value) => onLanguageChange(value as AppLocale)}
          disabled={disabled}
        >
          <SelectTrigger className="h-10 w-[9.5rem] rounded-xl border-border/50 bg-background/50 font-semibold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LOCALE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.nativeLabel}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
