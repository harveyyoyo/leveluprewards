import { classicFlyerHref, hasClassicFlyer } from '@/lib/classicFlyerManifest';
import type { PromotionFlyer } from '@/lib/marketingPromotions';

export type FlyerVisualTheme = 'bold' | 'classic';

export const FLYER_VISUAL_THEME_LABELS: Record<FlyerVisualTheme, string> = {
  bold: 'Bold Navy',
  classic: 'Original styles',
};

/** Resolve print URL for the selected visual theme. */
export function resolveFlyerHref(flyer: Pick<PromotionFlyer, 'href'>, theme: FlyerVisualTheme): string {
  if (theme === 'classic' && hasClassicFlyer(flyer.href)) {
    return classicFlyerHref(flyer.href);
  }
  return flyer.href;
}

export function flyerSupportsClassic(flyer: Pick<PromotionFlyer, 'href'>): boolean {
  return hasClassicFlyer(flyer.href);
}
