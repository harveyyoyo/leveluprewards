
'use client';

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useLayoutEffect,
    useMemo,
    useState,
} from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { useIsMobile } from '@/hooks/use-mobile';
import type { AnimatedBackgroundStyle } from '@/lib/animatedBackdrop';
import {
  normalizeAnimatedBackgroundStyle,
  resolveAnimatedBackgroundStyle,
  sanitizeHiddenAnimatedBackgroundIds,
} from '@/lib/animatedBackdrop';

type ColorScheme =
    | 'default'
    | 'rainbow'
    | 'sky'
    | 'rose'
    | 'mint'
    | 'lavender'
    | 'peach'
    | 'pastel'
    | 'darkerPastel'
    | 'slate'
    | 'forest'
    | 'ocean'
    | 'sunset'
    | 'berry'
    | 'coral'
    | 'golden'
    | 'indigo'
    | 'sapphire'
    | 'plum'
    | 'tropics';

interface Settings {
    graphicMode: 'classic' | 'graphics';
    displayMode: 'web' | 'app';
    colorScheme: ColorScheme;
    soundEnabled: boolean;
    language: string;
    darkMode: boolean;
    // Engagement
    enableAchievements: boolean;
    enableBadges: boolean;
    enableLevels: boolean;
    enableStreaks: boolean;
    enableChallenges: boolean;
    // Analytics
    enableTeacherCharts: boolean;
    enableAdminAnalytics: boolean;
    enableStudentReports: boolean;
    // Social & Communication
    enableNotifications: boolean;
    enableClassLeaderboard: boolean;
    enableShoutouts: boolean;
    // Prize Shop
    enablePrizeImages: boolean;
    enablePrizeCategories: boolean;
    enableWishlist: boolean;
    enableSeasonalPrizes: boolean;
    enableColorPrinting: boolean;
    // Admin Tools
    enableBulkPoints: boolean;
    enablePointApproval: boolean;
    enableAuditLog: boolean;
    enablePdfExport: boolean;
    // Student & Access
    enableStudentProfiles: boolean;
    enableQrLogin: boolean;
    /** Enables kiosk face enrollment + recognition (convenience-grade). */
    enableFaceLogin: boolean;
    enableParentView: boolean;
    enableMultiAdmin: boolean;
    enableStudentPortal: boolean;
    /** When off, student kiosk does not record attendance and Teacher portal hides the Attendance tab. */
    enableAttendance: boolean;
    // Guidance
    enableHelperMode: boolean;
    /** Floating sparkles / gradient behind the whole app (not print). */
    enableAnimatedBackground: boolean;
    animatedBackgroundStyle: AnimatedBackgroundStyle;
    /** Catalog entries hidden from the style picker (can be restored in Settings). */
    hiddenAnimatedBackgroundIds: AnimatedBackgroundStyle[];
    showIntroWizard?: boolean;
    // Workflow
    enableTeacherBudgets: boolean;
    legacyMode: boolean;
    // Image display: how logos and photos are fitted in their boxes
    logoDisplayMode: 'contain' | 'cover';
    photoDisplayMode: 'contain' | 'cover';
}

/** Unsaved appearance tweaks from Settings modal (live preview until Apply). */
export type AppearancePreviewSettings = Partial<
    Pick<Settings, 'colorScheme' | 'animatedBackgroundStyle' | 'enableAnimatedBackground'>
>;

interface SettingsContextType {
    settings: Settings;
    /** Merged settings + in-modal appearance preview — use for theme/backdrop visuals. */
    visualSettings: Settings;
    /** Pending appearance changes (not yet saved to localStorage). */
    appearancePreview: AppearancePreviewSettings | null;
    setAppearancePreview: React.Dispatch<React.SetStateAction<AppearancePreviewSettings | null>>;
    hasAppearancePreview: boolean;
    discardAppearancePreview: () => void;
    /** True after localStorage (and school scope) has been applied — avoids a frame of default/wrong theme + backdrop. */
    isLoaded: boolean;
    updateSettings: (updates: Partial<Settings>) => void;
}

function safeLocalStorageGet(key: string): string | null {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function settingsStorageKey(schoolIdForKey: string | null): string {
    return schoolIdForKey ? `arcade_settings_${schoolIdForKey}` : 'arcade_settings_global';
}

function mergeSettingsFromRaw(saved: string | null, isMobile: boolean): Settings {
    if (saved) {
        try {
            const parsed = JSON.parse(saved) as Record<string, unknown> & {
                graphicMode?: string;
                enableClassSignIn?: boolean;
                enableAttendance?: boolean;
            };
            parsed.graphicMode = 'graphics';
            if (typeof parsed.enableAttendance !== 'boolean' && typeof parsed.enableClassSignIn === 'boolean') {
                parsed.enableAttendance = parsed.enableClassSignIn;
            }
            delete parsed.enableClassSignIn;
            const merged = { ...defaultSettings, ...parsed } as Settings;
            merged.hiddenAnimatedBackgroundIds = sanitizeHiddenAnimatedBackgroundIds(
                (parsed as { hiddenAnimatedBackgroundIds?: unknown }).hiddenAnimatedBackgroundIds,
            );
            merged.animatedBackgroundStyle = normalizeAnimatedBackgroundStyle(
                (parsed as { animatedBackgroundStyle?: unknown }).animatedBackgroundStyle,
            );
            merged.animatedBackgroundStyle = resolveAnimatedBackgroundStyle(
                merged.animatedBackgroundStyle,
                merged.hiddenAnimatedBackgroundIds,
            );
            return merged;
        } catch {
            return defaultSettings;
        }
    }
    const initialSettings: Settings = {
        ...defaultSettings,
        showIntroWizard: true,
    };
    if (isMobile) {
        initialSettings.displayMode = 'app';
    }
    return initialSettings;
}

const colorSchemes: Record<ColorScheme, { bg: string; card: string; accent: string; border: string; label: string; swatch: string }> = {
    default: { bg: 'bg-slate-50', card: 'bg-white', accent: 'text-slate-700', border: 'border-slate-300', label: 'Default (Muted)', swatch: 'bg-slate-400' },
    rainbow: { bg: 'bg-slate-50', card: 'bg-white', accent: 'text-fuchsia-700', border: 'border-fuchsia-200', label: 'Rainbow', swatch: 'bg-fuchsia-400' },
    sky: { bg: 'bg-sky-50', card: 'bg-white', accent: 'text-sky-700', border: 'border-sky-200', label: 'Sky', swatch: 'bg-sky-300' },
    rose: { bg: 'bg-rose-50', card: 'bg-white', accent: 'text-rose-700', border: 'border-rose-200', label: 'Rose', swatch: 'bg-rose-300' },
    mint: { bg: 'bg-emerald-50', card: 'bg-white', accent: 'text-emerald-700', border: 'border-emerald-200', label: 'Mint', swatch: 'bg-emerald-300' },
    lavender: { bg: 'bg-violet-50', card: 'bg-white', accent: 'text-violet-700', border: 'border-violet-200', label: 'Lavender', swatch: 'bg-violet-300' },
    peach: { bg: 'bg-orange-50', card: 'bg-white', accent: 'text-orange-700', border: 'border-orange-200', label: 'Peach', swatch: 'bg-orange-300' },
    pastel: { bg: 'bg-pink-50', card: 'bg-white', accent: 'text-pink-700', border: 'border-pink-200', label: 'Pastel', swatch: 'bg-pink-300' },
    darkerPastel: { bg: 'bg-pink-100', card: 'bg-white', accent: 'text-pink-800', border: 'border-pink-400', label: 'Darker Pastel', swatch: 'bg-pink-500' },
    slate: { bg: 'bg-slate-100', card: 'bg-white', accent: 'text-slate-800', border: 'border-slate-400', label: 'Slate', swatch: 'bg-slate-600' },
    forest: { bg: 'bg-emerald-50', card: 'bg-white', accent: 'text-emerald-800', border: 'border-emerald-400', label: 'Forest', swatch: 'bg-emerald-600' },
    ocean: { bg: 'bg-sky-50', card: 'bg-white', accent: 'text-sky-800', border: 'border-sky-400', label: 'Ocean', swatch: 'bg-sky-600' },
    sunset: { bg: 'bg-amber-50', card: 'bg-white', accent: 'text-amber-800', border: 'border-amber-400', label: 'Sunset', swatch: 'bg-amber-500' },
    berry: { bg: 'bg-fuchsia-50', card: 'bg-white', accent: 'text-fuchsia-800', border: 'border-fuchsia-400', label: 'Berry', swatch: 'bg-fuchsia-500' },
    coral: { bg: 'bg-red-50', card: 'bg-white', accent: 'text-red-700', border: 'border-red-200', label: 'Coral & Teal', swatch: 'bg-red-400' },
    golden: { bg: 'bg-yellow-50', card: 'bg-white', accent: 'text-yellow-800', border: 'border-yellow-300', label: 'Golden Hour', swatch: 'bg-yellow-500' },
    indigo: { bg: 'bg-indigo-50', card: 'bg-white', accent: 'text-indigo-800', border: 'border-indigo-300', label: 'Indigo', swatch: 'bg-indigo-500' },
    sapphire: { bg: 'bg-blue-50', card: 'bg-white', accent: 'text-blue-800', border: 'border-blue-300', label: 'Sapphire & Amber', swatch: 'bg-blue-600' },
    plum: { bg: 'bg-purple-50', card: 'bg-white', accent: 'text-purple-800', border: 'border-purple-300', label: 'Plum & Sage', swatch: 'bg-purple-500' },
    tropics: { bg: 'bg-teal-50', card: 'bg-white', accent: 'text-teal-800', border: 'border-teal-300', label: 'Tropics', swatch: 'bg-teal-500' },
};

const defaultSettings: Settings = {
    graphicMode: 'graphics',
    displayMode: 'web',
    colorScheme: 'sky',
    soundEnabled: true,
    language: 'English',
    darkMode: false,
    enableAchievements: false,
    enableBadges: false,
    enableLevels: false,
    enableStreaks: false,
    enableChallenges: false,
    enableTeacherCharts: false,
    enableAdminAnalytics: false,
    enableStudentReports: false,
    enableNotifications: false,
    enableClassLeaderboard: false,
    enableShoutouts: false,
    enablePrizeImages: false,
    enablePrizeCategories: false,
    enableWishlist: false,
    enableSeasonalPrizes: false,
    enableColorPrinting: true,
    enableBulkPoints: false,
    enablePointApproval: false,
    enableAuditLog: false,
    enablePdfExport: false,
    enableStudentProfiles: false,
    enableQrLogin: false,
    enableFaceLogin: false,
    enableParentView: false,
    enableMultiAdmin: false,
    enableStudentPortal: false,
    enableAttendance: false,
    enableHelperMode: true,
    enableAnimatedBackground: true,
    animatedBackgroundStyle: 'arcade',
    hiddenAnimatedBackgroundIds: [],
    showIntroWizard: false,
    enableTeacherBudgets: false,
    legacyMode: false,
    logoDisplayMode: 'contain',
    photoDisplayMode: 'cover',
};

// Public/login pages should not be school-themed.
const publicLoginSettings: Settings = {
    ...defaultSettings,
    darkMode: false,
    colorScheme: 'default',
    legacyMode: false,
    enableAnimatedBackground: false,
    soundEnabled: false,
    // Ensure a consistent web layout for sign-in screens.
    displayMode: 'web',
};

export { colorSchemes };
export type { ColorScheme };

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { schoolId, isInitialized } = useAuth();
    const [settings, setSettings] = useState<Settings>(defaultSettings);
    const [appearancePreview, setAppearancePreview] = useState<AppearancePreviewSettings | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const isMobile = useIsMobile();
    const isPublicLoginRoute = pathname === '/' || pathname.startsWith('/s/');

    const visualSettings = useMemo(
        (): Settings => ({ ...settings, ...(appearancePreview ?? {}) }),
        [settings, appearancePreview],
    );

    const hasAppearancePreview = Boolean(
        appearancePreview && Object.keys(appearancePreview).length > 0,
    );

    const discardAppearancePreview = useCallback(() => setAppearancePreview(null), []);

    // Before paint: merge localStorage so backdrop/theme don’t flash defaults (arcade) then jump to saved style.
    // Prefer auth schoolId when set; until auth restores, use the same schoolId key Auth stores in localStorage.
    useLayoutEffect(() => {
        if (typeof window === 'undefined') return;
        if (isPublicLoginRoute) {
            setSettings(publicLoginSettings);
            setIsLoaded(true);
            const root = document.documentElement;
            root.classList.remove('dark');
            root.setAttribute('data-color-scheme', publicLoginSettings.colorScheme ?? 'default');
            root.classList.remove('legacy');
            return;
        }
        const lsSchoolId = safeLocalStorageGet('schoolId');
        const sid = schoolId ?? lsSchoolId;
        const key = settingsStorageKey(sid);
        const saved = safeLocalStorageGet(key);
        const merged = mergeSettingsFromRaw(saved, isMobile);
        setSettings(merged);
        setIsLoaded(true);
        const root = document.documentElement;
        root.classList.toggle('dark', merged.darkMode);
        root.setAttribute('data-color-scheme', merged.colorScheme ?? 'default');
        root.classList.toggle('legacy', merged.legacyMode);
    }, [schoolId, isInitialized, isMobile, isPublicLoginRoute]);

    const updateSettings = useCallback((updates: Partial<Settings>) => {
        const lsSid = typeof window !== 'undefined' ? safeLocalStorageGet('schoolId') : null;
        const sid = schoolId ?? lsSid;
        const settingsKey = settingsStorageKey(sid);
        setSettings((prev) => {
            let next = { ...prev, ...updates } as Settings;
            if (updates.hiddenAnimatedBackgroundIds !== undefined) {
                next.hiddenAnimatedBackgroundIds = sanitizeHiddenAnimatedBackgroundIds(
                    updates.hiddenAnimatedBackgroundIds,
                );
            }
            if (updates.animatedBackgroundStyle !== undefined) {
                next.animatedBackgroundStyle = normalizeAnimatedBackgroundStyle(
                    updates.animatedBackgroundStyle,
                );
            }
            next.animatedBackgroundStyle = resolveAnimatedBackgroundStyle(
                next.animatedBackgroundStyle,
                next.hiddenAnimatedBackgroundIds,
            );

            if (typeof window !== 'undefined') {
                try {
                    localStorage.setItem(settingsKey, JSON.stringify(next));
                    window.dispatchEvent(new Event('settings-updated'));
                } catch {
                    /* ignore quota / private mode */
                }
            }

            return next;
        });
    }, [schoolId]);

    // Apply dark class to document root
    useEffect(() => {
        if (!isLoaded) return;
        const root = document.documentElement;
        if (settings.darkMode) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [settings.darkMode, isLoaded]);

    // Apply color scheme data attribute (includes live preview from Settings modal)
    useEffect(() => {
        if (!isLoaded) return;
        document.documentElement.setAttribute('data-color-scheme', visualSettings.colorScheme ?? 'default');
    }, [visualSettings.colorScheme, isLoaded]);

    // Apply legacy class to document root
    useEffect(() => {
        if (!isLoaded) return;
        const root = document.documentElement;
        if (settings.legacyMode) {
            root.classList.add('legacy');
        } else {
            root.classList.remove('legacy');
        }
    }, [settings.legacyMode, isLoaded]);

    const contextValue = useMemo(
        () => ({
            settings,
            visualSettings,
            appearancePreview,
            setAppearancePreview,
            hasAppearancePreview,
            discardAppearancePreview,
            isLoaded,
            updateSettings,
        }),
        [
            settings,
            visualSettings,
            appearancePreview,
            hasAppearancePreview,
            discardAppearancePreview,
            isLoaded,
            updateSettings,
        ],
    );

    return <SettingsContext.Provider value={contextValue}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
    const ctx = useContext(SettingsContext);
    if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
    return ctx;
}
