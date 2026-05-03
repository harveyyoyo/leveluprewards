export const HOME_LOGO_MODE_KEY = 'levelup:home-logo-mode';

export type HomeLogoMode = 'animated' | 'static';

export const HOME_LOGO_MODE_EVENT = 'levelup:home-logo-mode-change';

export function getHomeLogoMode(): HomeLogoMode {
  if (typeof window === 'undefined') return 'animated';
  try {
    const v = localStorage.getItem(HOME_LOGO_MODE_KEY);
    return v === 'static' ? 'static' : 'animated';
  } catch {
    return 'animated';
  }
}

export function setHomeLogoMode(mode: HomeLogoMode): void {
  try {
    localStorage.setItem(HOME_LOGO_MODE_KEY, mode);
    window.dispatchEvent(new Event(HOME_LOGO_MODE_EVENT));
  } catch {
    /* ignore quota */
  }
}

export function subscribeHomeLogoMode(onChange: () => void): () => void {
  const handler = () => onChange();
  window.addEventListener(HOME_LOGO_MODE_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(HOME_LOGO_MODE_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}
