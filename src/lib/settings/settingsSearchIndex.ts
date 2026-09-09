import type { SettingsView } from '@/components/settings/settingsModalConfig';

export type SettingsSearchGroup = 'hub' | 'interface' | 'general' | 'features' | 'pillars' | 'device';

export type SettingsSearchItem = {
  id: string;
  view: SettingsView;
  sectionId?: string;
  group: SettingsSearchGroup;
  adminOnly?: boolean;
  kioskOnly?: boolean;
  comingSoon?: boolean;
  label: string;
  description?: string;
  keywords: string[];
};

type Translate = (key: string) => string;

function item(
  partial: Omit<SettingsSearchItem, 'keywords'> & { keywords?: string[] },
): SettingsSearchItem {
  return {
    ...partial,
    keywords: partial.keywords ?? [],
  };
}

export function settingMatchesQuery(
  entry: Pick<SettingsSearchItem, 'id' | 'label' | 'description' | 'keywords'>,
  query: string,
): boolean {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;
  const hay = [entry.id, entry.label, entry.description ?? '', ...entry.keywords]
    .join(' ')
    .toLowerCase();
  return words.every((word) => hay.includes(word));
}

export function filterSettingsSearchItems(
  items: readonly SettingsSearchItem[],
  query: string,
  limit = 20,
): SettingsSearchItem[] {
  if (!query.trim()) return [];
  const matches: SettingsSearchItem[] = [];
  for (const entry of items) {
    if (!settingMatchesQuery(entry, query)) continue;
    matches.push(entry);
    if (matches.length >= limit) break;
  }
  return matches;
}

export function groupSettingsSearchItems(
  items: readonly SettingsSearchItem[],
): Array<{ group: SettingsSearchGroup; items: SettingsSearchItem[] }> {
  const order: SettingsSearchGroup[] = ['hub', 'interface', 'general', 'features', 'pillars', 'device'];
  return order
    .map((group) => ({ group, items: items.filter((entry) => entry.group === group) }))
    .filter((bucket) => bucket.items.length > 0);
}

export function buildSettingsSearchItems(input: {
  t: Translate;
  canManageSchoolSettings: boolean;
  showDevice: boolean;
}): SettingsSearchItem[] {
  const { t, canManageSchoolSettings, showDevice } = input;
  const catalog: SettingsSearchItem[] = [
    item({
      id: 'hub-interface',
      view: 'interface',
      group: 'hub',
      label: t('settings.hub.interfaceTitle'),
      description: t('settings.hub.interfaceDescription'),
      keywords: ['look', 'theme', 'display', 'colors', 'language'],
    }),
    item({
      id: 'hub-school',
      view: 'general',
      group: 'hub',
      label: t('settings.hub.schoolTitle'),
      description: t('settings.hub.schoolDescription'),
      keywords: ['school', 'sessions', 'kiosk', 'printing'],
    }),
    item({
      id: 'hub-pillars',
      view: 'pillars',
      group: 'hub',
      adminOnly: true,
      label: t('settings.hub.pillarsTitle'),
      description: t('settings.hub.pillarsDescription'),
      keywords: ['products', 'modules', 'subscription'],
    }),
    item({
      id: 'hub-device',
      view: 'device',
      group: 'hub',
      kioskOnly: true,
      label: t('settings.hub.deviceTitle'),
      description: t('settings.hub.deviceDescription'),
      keywords: ['kiosk', 'profile', 'device', 'screen'],
    }),

    item({
      id: 'language',
      view: 'interface',
      sectionId: 'settings-interface-appearance',
      group: 'interface',
      label: t('settings.language.title'),
      description: t('settings.language.description'),
      keywords: ['english', 'hebrew', 'locale', 'i18n'],
    }),
    item({
      id: 'colorScheme',
      view: 'interface',
      sectionId: 'settings-interface-appearance',
      group: 'interface',
      label: t('settings.interface.nav.colors'),
      keywords: ['palette', 'scheme', 'appearance'],
    }),
    item({
      id: 'darkMode',
      view: 'interface',
      sectionId: 'settings-interface-theme',
      group: 'interface',
      label: t('settings.interface.darkMode'),
      keywords: ['night', 'theme'],
    }),
    item({
      id: 'colorizeDark',
      view: 'interface',
      sectionId: 'settings-interface-theme',
      group: 'interface',
      label: t('settings.interface.colorizeDark'),
    }),
    item({
      id: 'legacyMode',
      view: 'interface',
      sectionId: 'settings-interface-theme',
      group: 'interface',
      label: t('settings.interface.legacyMode'),
    }),
    item({
      id: 'enableStudentThemes',
      view: 'interface',
      sectionId: 'settings-interface-theme',
      group: 'interface',
      label: t('settings.interface.studentThemes'),
    }),
    item({
      id: 'adminPerTabColorScheme',
      view: 'interface',
      sectionId: 'settings-interface-theme',
      group: 'interface',
      label: t('settings.interface.coloredFeatureTabs'),
    }),
    item({
      id: 'soundEnabled',
      view: 'interface',
      sectionId: 'settings-interface-motion',
      group: 'interface',
      label: t('settings.interface.soundFx'),
      keywords: ['audio', 'volume', 'sfx'],
    }),
    item({
      id: 'enableAnimatedBackground',
      view: 'interface',
      sectionId: 'settings-interface-motion',
      group: 'interface',
      label: t('settings.interface.animatedBackground'),
      keywords: ['motion', 'backdrop'],
    }),
    item({
      id: 'displayMode',
      view: 'interface',
      sectionId: 'settings-interface-layout',
      group: 'interface',
      label: t('settings.interface.nav.layout'),
      keywords: ['web', 'app', 'mobile', 'auto', 'display mode'],
    }),
    item({
      id: 'kioskPortraitDisplay',
      view: 'interface',
      sectionId: 'settings-interface-layout',
      group: 'interface',
      label: t('settings.interface.portraitDisplay'),
      description: t('settings.interface.portraitDisplayDesc'),
    }),
    item({
      id: 'hideSiteHeaderOutsidePortal',
      view: 'interface',
      sectionId: 'settings-interface-layout',
      group: 'interface',
      label: t('settings.interface.hideHeader'),
      description: t('settings.interface.hideHeaderDesc'),
    }),
    item({
      id: 'wideLayout',
      view: 'interface',
      sectionId: 'settings-interface-layout',
      group: 'interface',
      label: t('settings.interface.wideLayout'),
      description: t('settings.interface.wideLayoutDesc'),
    }),
    item({
      id: 'mainPortalCards',
      view: 'interface',
      sectionId: 'settings-interface-layout',
      group: 'interface',
      label: t('settings.interface.mainPortalCards'),
      description: t('settings.interface.mainPortalCardsDesc'),
    }),

    item({
      id: 'adminAutoLogoutEnabled',
      view: 'general',
      sectionId: 'settings-general-sessions',
      group: 'general',
      label: t('settings.general.adminAutoLogout'),
      keywords: ['timeout', 'idle', 'staff'],
    }),
    item({
      id: 'kioskAutoLogoutEnabled',
      view: 'general',
      sectionId: 'settings-general-sessions',
      group: 'general',
      label: t('settings.general.kioskAutoLogout'),
      keywords: ['timeout', 'idle', 'student'],
    }),
    item({
      id: 'studentSignInFreezeSec',
      view: 'general',
      sectionId: 'settings-general-kiosk',
      group: 'general',
      label: 'Duplicate tap freeze',
      keywords: ['repeat', 'signin', 'cooldown'],
    }),
    item({
      id: 'kioskLoginTabs',
      view: 'general',
      sectionId: 'settings-general-kiosk',
      group: 'general',
      label: 'Student kiosk sign-in tabs',
      keywords: ['card', 'type', 'scan', 'face', 'qr', 'login'],
    }),
    item({
      id: 'faceEnrollments',
      view: 'faceEnrollments',
      group: 'general',
      adminOnly: true,
      label: t('settings.views.faceEnrollments'),
      keywords: ['face', 'camera', 'biometric'],
    }),
    item({
      id: 'kioskCouponRedemptionCameraEnabled',
      view: 'general',
      sectionId: 'settings-general-kiosk',
      group: 'general',
      label: 'Camera coupon scan',
      keywords: ['barcode', 'redeem'],
    }),
    item({
      id: 'enableColorPrinting',
      view: 'general',
      sectionId: 'settings-general-printing',
      group: 'general',
      label: 'Color printing',
      keywords: ['printer', 'id card'],
    }),
    item({
      id: 'enableHelperMode',
      view: 'general',
      sectionId: 'settings-general-guidance',
      group: 'general',
      label: 'Helper mode',
      keywords: ['tour', 'guidance', 'tips'],
    }),

    item({
      id: 'enableTeacherBudgets',
      view: 'features',
      sectionId: 'settings-features-core',
      group: 'features',
      label: 'Teacher Budgets',
      keywords: ['allowance', 'points'],
    }),
    item({
      id: 'enableBulkPoints',
      view: 'features',
      sectionId: 'settings-features-core',
      group: 'features',
      comingSoon: true,
      label: 'Bulk Class Points',
    }),
    item({
      id: 'enableClassAccumulations',
      view: 'features',
      sectionId: 'settings-features-recognition',
      group: 'features',
      label: 'Class Accumulations',
      keywords: ['standings', 'hall of fame'],
    }),
    item({
      id: 'displaysEnabled',
      view: 'features',
      sectionId: 'settings-features-displays',
      group: 'features',
      label: 'Displays',
      keywords: ['tv', 'hallway', 'bulletin', 'smart screen'],
    }),
    item({
      id: 'enablePrizeAiSurprise',
      view: 'features',
      sectionId: 'settings-features-shop',
      group: 'features',
      label: 'AI reward surprises',
      keywords: ['fun', 'joke', 'riddle'],
    }),
    item({
      id: 'enableVendingMachine',
      view: 'features',
      sectionId: 'settings-features-shop',
      group: 'features',
      label: 'Vending Machine',
      keywords: ['motor', 'usb'],
    }),
    item({
      id: 'enableStudentEmojiOnPrizeTickets',
      view: 'features',
      sectionId: 'settings-features-shop',
      group: 'features',
      label: 'Student emoji on reward vouchers',
    }),
    item({
      id: 'enableStudentWelcomeBackScreen',
      view: 'features',
      sectionId: 'settings-features-students',
      group: 'features',
      label: 'Welcome back splash',
    }),
    item({
      id: 'enableThemeAnimations',
      view: 'features',
      sectionId: 'settings-features-students',
      group: 'features',
      label: 'Theme Animations',
    }),

    item({
      id: 'payRewards',
      view: 'pillars',
      group: 'pillars',
      adminOnly: true,
      label: 'levelup rewards',
      keywords: ['points', 'prizes', 'shop'],
    }),
    item({
      id: 'payClassroom',
      view: 'pillars',
      group: 'pillars',
      adminOnly: true,
      label: 'levelup classroom',
    }),
    item({
      id: 'payAttendance',
      view: 'pillars',
      group: 'pillars',
      adminOnly: true,
      label: 'levelup attendance',
    }),
    item({
      id: 'payLibrary',
      view: 'pillars',
      group: 'pillars',
      adminOnly: true,
      label: 'levelup library',
      keywords: ['books'],
    }),

    item({
      id: 'kioskProfile',
      view: 'device',
      group: 'device',
      kioskOnly: true,
      label: 'Select Layout Profile',
      keywords: ['kiosk', 'device', 'link'],
    }),
  ];

  return catalog.filter((entry) => {
    if (entry.adminOnly && !canManageSchoolSettings) return false;
    if (entry.kioskOnly && !showDevice) return false;
    return true;
  });
}
