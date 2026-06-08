import type { MessageTree } from '@/lib/i18n/messages/types';
import common from '@/lib/i18n/messages/he/common';
import header from '@/lib/i18n/messages/he/header';
import footer from '@/lib/i18n/messages/he/footer';
import layout from '@/lib/i18n/messages/he/layout';
import classroom from '@/lib/i18n/messages/he/classroom';
import portal from '@/lib/i18n/messages/he/portal';
import auth from '@/lib/i18n/messages/he/auth';
import staff from '@/lib/i18n/messages/he/staff';
import settings from '@/lib/i18n/messages/he/settings';
import student from '@/lib/i18n/messages/he/student';

const he = {
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

export default he;
