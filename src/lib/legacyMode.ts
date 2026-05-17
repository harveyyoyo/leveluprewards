export type LegacyModeSignals = {
  prefersReducedMotion?: boolean;
  saveData?: boolean;
  hardwareConcurrency?: number;
  deviceMemory?: number;
  isOldBrowser?: boolean;
};

function parseMajorVersion(userAgent: string, marker: RegExp): number | null {
  const match = userAgent.match(marker);
  if (!match?.[1]) return null;
  const version = Number.parseInt(match[1], 10);
  return Number.isFinite(version) ? version : null;
}

export function getBrowserLegacyModeSignals(): LegacyModeSignals {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return {};

  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean };
    deviceMemory?: number;
  };
  const ua = nav.userAgent || '';
  const chromeMajor = parseMajorVersion(ua, /\b(?:Chrome|CriOS)\/(\d+)/);
  const firefoxMajor = parseMajorVersion(ua, /\bFirefox\/(\d+)/);
  const safariMajor =
    /\bSafari\//.test(ua) && !/\b(?:Chrome|CriOS|FxiOS|Edg)\//.test(ua)
      ? parseMajorVersion(ua, /\bVersion\/(\d+)/)
      : null;

  return {
    prefersReducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
    saveData: nav.connection?.saveData === true,
    hardwareConcurrency: nav.hardwareConcurrency,
    deviceMemory: nav.deviceMemory,
    isOldBrowser:
      (chromeMajor !== null && chromeMajor < 96) ||
      (firefoxMajor !== null && firefoxMajor < 95) ||
      (safariMajor !== null && safariMajor < 15),
  };
}

export function shouldUseAutomaticLegacyMode(signals: LegacyModeSignals): boolean {
  if (signals.prefersReducedMotion || signals.saveData || signals.isOldBrowser) {
    return true;
  }

  const weakCpu = typeof signals.hardwareConcurrency === 'number' && signals.hardwareConcurrency <= 2;
  const lowMemory = typeof signals.deviceMemory === 'number' && signals.deviceMemory <= 2;

  return weakCpu && lowMemory;
}

export function resolveLegacyModePreference(
  savedLegacyMode: boolean,
  signals: LegacyModeSignals,
): boolean {
  return savedLegacyMode || shouldUseAutomaticLegacyMode(signals);
}
