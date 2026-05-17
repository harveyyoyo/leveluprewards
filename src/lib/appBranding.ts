import { buildSiteContactHref } from '@/lib/siteContact';

/**
 * Default app branding used when appConfig does not override them.
 * Change these to rebrand the app name and tagline across the project.
 */
export const APP_NAME = 'LevelUp';
export const APP_TAGLINE = 'School Rewards System';

/** Verified business contact for procurement and school inquiries. */
export const SITE_CONTACT_EMAIL = 'contact@leveluprewards.app';
/** @deprecated Use {@link getContactFormHref} in UI instead of mailto links. */
export const SITE_CONTACT_MAILTO =
  'mailto:contact@leveluprewards.app?subject=NYC%20DOE%20Procurement%20Inquiry';

/**
 * URL for "Request a Demo" CTAs (Calendly, HubSpot, etc.).
 * Set `NEXT_PUBLIC_SCHEDULE_DEMO_URL` to override per deployment; otherwise opens the contact form.
 */
export function getScheduleDemoHref(): string {
  const env =
    typeof process.env.NEXT_PUBLIC_SCHEDULE_DEMO_URL === 'string'
      ? process.env.NEXT_PUBLIC_SCHEDULE_DEMO_URL.trim()
      : '';
  if (env) return env;
  return buildSiteContactHref('demo');
}

/** Public contact form for general inquiries. */
export function getContactFormHref(): string {
  return buildSiteContactHref('contact');
}

/** Legal entity line shown in public footers (matches tax paperwork). */
export const SITE_LEGAL_UMBRELLA =
  'LevelUp Rewards is proudly developed, owned, and operated by LevelUp EdTech Enterprises LLC.';

/** Matches `LevelUpLogo` arrow fill: `oklch(0.28 0.06 252)`. */
export const LEVELUP_BRAND_PRIMARY_HEX = '#102a45';

/** Readable brand accent on dark surfaces (Default scheme + dark mode); `--primary` is intentionally light in `.dark`. */
export const LEVELUP_BRAND_PRIMARY_ON_DARK_HEX = '#7dd3fc';

/**
 * URL for the LevelUp logo / wordmark across the app (default: preschool org sign-in chooser).
 * Set `NEXT_PUBLIC_LEVELUP_LOGO_HREF` to override per deployment.
 */
export function getLevelUpLogoHref(): string {
  const env =
    typeof process.env.NEXT_PUBLIC_LEVELUP_LOGO_HREF === 'string'
      ? process.env.NEXT_PUBLIC_LEVELUP_LOGO_HREF.trim()
      : '';
  if (env) return env;
  // Default to the public login screen. (Avoid hardcoded schoolIds like "preschool".)
  return '/login';
}
