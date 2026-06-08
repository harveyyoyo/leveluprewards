import type { MessageTree } from '@/lib/i18n/messages/types';
import common from '@/lib/i18n/messages/en/common';
import header from '@/lib/i18n/messages/en/header';
import footer from '@/lib/i18n/messages/en/footer';
import layout from '@/lib/i18n/messages/en/layout';
import classroom from '@/lib/i18n/messages/en/classroom';
import portal from '@/lib/i18n/messages/en/portal';
import auth from '@/lib/i18n/messages/en/auth';
import staff from '@/lib/i18n/messages/en/staff';
import settings from '@/lib/i18n/messages/en/settings';
import student from '@/lib/i18n/messages/en/student';

const en = {
  ...common,
  ...header,
  ...footer,
  ...layout,
  ...classroom,
  ...portal,
  ...auth,
  ...staff,
  ...settings,
  ...student,
} satisfies MessageTree;

export default en;
export type { MessageTree };
