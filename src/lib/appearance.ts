import type { CSSProperties } from 'react';
import type { Settings } from '@/components/providers/SettingsProvider';
import { complementTripletForNavId, rainbowTripletForNavId } from '@/lib/rainbowNav';

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

function hexToHslTriplet(hex: string): { h: number; s: number; l: number } | null {
  if (!HEX_COLOR_RE.test(hex)) return null;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToTriplet(hsl: { h: number; s: number; l: number }) {
  return `${hsl.h} ${hsl.s}% ${hsl.l}%`;
}

function contrastForegroundTriplet(hex: string) {
  if (!HEX_COLOR_RE.test(hex)) return '0 0% 100%';
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.62 ? '222 47% 11%' : '0 0% 100%';
}

export function appearanceVarsForSurface(
  settings: Pick<Settings, 'colorScheme' | 'customAppearanceColors' | 'darkMode'>,
  navId: string,
): CSSProperties {
  const scheme = settings.colorScheme ?? 'default';
  const custom = settings.customAppearanceColors?.[scheme];
  const primaryHsl = custom?.primary ? hexToHslTriplet(custom.primary) : null;
  const secondaryHsl = custom?.secondary ? hexToHslTriplet(custom.secondary) : null;
  const primaryTriplet = primaryHsl ? hslToTriplet(primaryHsl) : rainbowTripletForNavId(navId, scheme);
  const secondaryTriplet = secondaryHsl ? hslToTriplet(secondaryHsl) : complementTripletForNavId(navId, scheme);

  const secondaryLightness = settings.darkMode ? 18 : 86;
  const secondaryForegroundLightness = settings.darkMode ? 88 : 26;
  const accentLightness = settings.darkMode ? 18 : 94;
  const accentForegroundLightness = settings.darkMode ? 84 : 30;
  const secondaryHue = secondaryHsl?.h;
  const fallbackSecondarySat = Number(secondaryTriplet.split(/\s+/)[1]?.replace('%', '') ?? '') || 55;
  const secondarySat = Math.min(62, Math.max(30, secondaryHsl?.s ?? fallbackSecondarySat));

  return {
    ['--primary' as string]: primaryTriplet,
    ['--primary-foreground' as string]: custom?.primary ? contrastForegroundTriplet(custom.primary) : undefined,
    ['--secondary' as string]: secondaryHue == null ? undefined : `${secondaryHue} ${secondarySat}% ${secondaryLightness}%`,
    ['--secondary-foreground' as string]: secondaryHue == null ? undefined : `${secondaryHue} ${Math.max(35, secondarySat)}% ${secondaryForegroundLightness}%`,
    ['--accent' as string]: secondaryHue == null ? undefined : `${secondaryHue} ${secondarySat}% ${accentLightness}%`,
    ['--accent-foreground' as string]: secondaryHue == null ? undefined : `${secondaryHue} ${Math.max(35, secondarySat)}% ${accentForegroundLightness}%`,
    ['--chart-1' as string]: primaryTriplet,
    ['--chart-2' as string]: secondaryTriplet,
    ['--chart-3' as string]: primaryTriplet,
    ['--chart-4' as string]: secondaryTriplet,
    ['--chart-5' as string]: primaryTriplet,
    ['--ring' as string]: secondaryTriplet,
  } as CSSProperties;
}
