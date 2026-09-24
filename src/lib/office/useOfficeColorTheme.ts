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
