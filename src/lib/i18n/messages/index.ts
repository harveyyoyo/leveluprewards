import type { AppLocale } from '@/lib/i18n/locales';
import type { MessageTree } from '@/lib/i18n/messages/types';
import en from '@/lib/i18n/messages/en';
import he from '@/lib/i18n/messages/he';

const MESSAGES: Record<AppLocale, MessageTree> = {
  en,
  he,
};

export function getMessages(locale: AppLocale): MessageTree {
  return MESSAGES[locale] ?? en;
}

export type { MessageTree };
