'use client';

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';

/**
 * The School Office color theme, a personal choice on this device (Customize). It swaps the
 * accent color (every `teal-*` color in the office) and the side menu color; see globals.css.
 */
export const OFFICE_COLOR_THEMES = [
  { id: 'teal', label: 'Teal', swatch: '#0d9488', menu: '#0f3d4a' },
  { id: 'blue', label: 'Blue', swatch: '#2563eb', menu: '#1e3a5f' },
  { id: 'purple', label: 'Purple', swatch: '#7c3aed', menu: '#35205c' },
  { id: 'rose', label: 'Rose', swatch: '#e11d48', menu: '#561a2c' },
  { id: 'green', label: 'Green', swatch: '#059669', menu: '#0f3b2e' },
  { id: 'orange', label: 'Orange', swatch: '#ea580c', menu: '#4a2614' },
  { id: 'gray', label: 'Gray', swatch: '#475569', menu: '#1e293b' },
] as const;

export type OfficeColorTheme = (typeof OFFICE_COLOR_THEMES)[number]['id'];

const STORAGE_KEY = 'school-office-color-theme';
const CHANGE_EVENT = 'school-office-color-theme-change';

function isTheme(value: unknown): value is OfficeColorTheme {
  return OFFICE_COLOR_THEMES.some((t) => t.id === value);
}

function readStoredTheme(): OfficeColorTheme {
  if (typeof window === 'undefined') return 'teal';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isTheme(stored) ? stored : 'teal';
  } catch {
    return 'teal';
  }
}

export function useOfficeColorTheme() {
  // Read right away (the theme isn't drawn into the page's text, so this can't mismatch).
  const [theme, setThemeState] = useState<OfficeColorTheme>(readStoredTheme);

  useEffect(() => {
    setThemeState(readStoredTheme());
    const onChange = (e: Event) => {
      const next = (e as CustomEvent<OfficeColorTheme>).detail;
      setThemeState(isTheme(next) ? next : readStoredTheme());
    };
    const onStorage = () => setThemeState(readStoredTheme());
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const setTheme = useCallback((next: OfficeColorTheme) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage can be blocked (private mode); the choice then lasts for this page only.
    }
    window.dispatchEvent(new CustomEvent<OfficeColorTheme>(CHANGE_EVENT, { detail: next }));
  }, []);

  return { theme, setTheme };
}

/** Page frame: puts the chosen theme on the page while the office is open. */
export function useApplyOfficeColorTheme() {
  const { theme } = useOfficeColorTheme();
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (theme === 'teal') delete root.dataset.officeTheme;
    else root.dataset.officeTheme = theme;
    return () => {
      delete root.dataset.officeTheme;
    };
  }, [theme]);
}

/** Light or dark screens in the School Office, a personal choice on this device (Customize). */
export const OFFICE_APPEARANCES = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'device', label: 'Match this computer' },
] as const;

export type OfficeAppearance = (typeof OFFICE_APPEARANCES)[number]['id'];

const APPEARANCE_KEY = 'school-office-appearance';
const APPEARANCE_EVENT = 'school-office-appearance-change';
const DARK_MEDIA = '(prefers-color-scheme: dark)';

/** Null until someone picks one: the office then keeps the look the rest of the app gives it. */
function readStoredAppearance(): OfficeAppearance | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(APPEARANCE_KEY);
    return OFFICE_APPEARANCES.some((a) => a.id === stored) ? (stored as OfficeAppearance) : null;
  } catch {
    return null;
  }
}

export function useOfficeAppearance() {
  const [appearance, setAppearanceState] = useState<OfficeAppearance | null>(readStoredAppearance);

  useEffect(() => {
    setAppearanceState(readStoredAppearance());
    const onChange = () => setAppearanceState(readStoredAppearance());
    window.addEventListener(APPEARANCE_EVENT, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(APPEARANCE_EVENT, onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  const setAppearance = useCallback((next: OfficeAppearance) => {
    setAppearanceState(next);
    try {
      window.localStorage.setItem(APPEARANCE_KEY, next);
    } catch {
      // Storage can be blocked (private mode); the choice then lasts for this page only.
    }
    window.dispatchEvent(new Event(APPEARANCE_EVENT));
  }, []);

  return { appearance, setAppearance };
}

/**
 * Page frame: makes the office light or dark while it's open. The rest of the app also sets the
 * page's dark mode (from school settings), so the choice is kept applied if that changes it, and
 * the page is put back as it was when the office closes.
 */
export function useApplyOfficeAppearance() {
  const { appearance } = useOfficeAppearance();
  useLayoutEffect(() => {
    if (!appearance) return;
    const root = document.documentElement;
    const hadDark = root.classList.contains('dark');
    const media = window.matchMedia(DARK_MEDIA);
    const wantDark = () => appearance === 'dark' || (appearance === 'device' && media.matches);
    const apply = () => {
      if (root.classList.contains('dark') !== wantDark()) root.classList.toggle('dark', wantDark());
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    media.addEventListener('change', apply);
    return () => {
      observer.disconnect();
      media.removeEventListener('change', apply);
      root.classList.toggle('dark', hadDark);
    };
  }, [appearance]);
}
