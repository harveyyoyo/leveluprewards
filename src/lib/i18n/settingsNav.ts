import { resolveLabel } from '@/lib/i18n/resolveLabel';
import type { TranslationParams } from '@/lib/i18n/translate';

type Translator = (key: string, params?: TranslationParams) => string;

const INTERFACE_KEY: Record<string, string> = {
  'settings-interface-appearance': 'colors',
  'settings-interface-motion': 'motion',
  'settings-interface-layout': 'layout',
};

const GENERAL_KEY: Record<string, string> = {
  'settings-general-sessions': 'sessions',
  'settings-general-kiosk': 'kiosk',
  'settings-general-printing': 'printing',
  'settings-general-guidance': 'guidance',
};

const FEATURES_KEY: Record<string, string> = {
  'settings-features-core': 'core',
  'settings-features-recognition': 'recognition',
  'settings-features-shop': 'shop',
  'settings-features-students': 'students',
};

export function translateInterfaceNav(
  sections: readonly { readonly id: string; readonly label: string }[],
  t: Translator,
) {
  return sections.map((section) => ({
    ...section,
    label: resolveLabel(
      t,
      `settings.interface.nav.${INTERFACE_KEY[section.id] ?? section.id}`,
      section.label,
    ),
  }));
}

export function translateGeneralNav(
  sections: readonly { readonly id: string; readonly label: string }[],
  t: Translator,
) {
  return sections.map((section) => ({
    ...section,
    label: resolveLabel(
      t,
      `settings.general.nav.${GENERAL_KEY[section.id] ?? section.id}`,
      section.label,
    ),
  }));
}

export function translateFeaturesNav(
  sections: readonly { readonly id: string; readonly label: string }[],
  t: Translator,
) {
  return sections.map((section) => ({
    ...section,
    label: resolveLabel(
      t,
      `settings.features.nav.${FEATURES_KEY[section.id] ?? section.id}`,
      section.label,
    ),
  }));
}
