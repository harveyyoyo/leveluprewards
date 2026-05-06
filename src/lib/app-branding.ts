/**
 * Default app branding used when appConfig does not override them.
 * Change these to rebrand the app name and tagline across the project.
 */
export const APP_NAME = 'LevelUp';
export const APP_TAGLINE = 'School Rewards System';

/** Matches `LevelUpLogo` arrow fill: `oklch(0.28 0.06 252)`. */
export const LEVELUP_BRAND_PRIMARY_HEX = '#003d42';

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
  return '/preschool/sign-in';
}
