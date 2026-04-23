
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';
import { useIsMobile } from '@/hooks/use-mobile';

type ColorScheme = 'default' | 'sky' | 'rose' | 'mint' | 'lavender' | 'peach';

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
    enableParentView: boolean;
    enableMultiAdmin: boolean;
    enableStudentPortal: boolean;
    enableClassSignIn: boolean;
    /** Back-compat alias used by some pages/components. */
    enableAttendance: boolean;
    // Guidance
    enableHelperMode: boolean;
    showIntroWizard?: boolean;
    // Workflow
    enableTeacherBudgets: boolean;
    legacyMode: boolean;
    enableAnimatedBackground: boolean;
    calmMode?: boolean;
    // Image display: how logos and photos are fitted in their boxes
    logoDisplayMode: 'contain' | 'cover';
    photoDisplayMode: 'contain' | 'cover';
    // Visuals
    animatedBackgroundStyle: string;
    hiddenAnimatedBackgroundIds: string[];
}

interface SettingsContextType {
    settings: Settings;
    updateSettings: (updates: Partial<Settings>) => void;
    /** True once settings have been loaded from storage. */
    isLoaded: boolean;
}

const colorSchemes: Record<ColorScheme, { bg: string; card: string; accent: string; border: string; label: string; swatch: string }> = {
    default: { bg: 'bg-slate-50', card: 'bg-white', accent: 'text-slate-800', border: 'border-slate-200', label: 'Default', swatch: 'bg-slate-200' },
    sky: { bg: 'bg-sky-50', card: 'bg-white', accent: 'text-sky-700', border: 'border-sky-200', label: 'Sky', swatch: 'bg-sky-300' },
    rose: { bg: 'bg-rose-50', card: 'bg-white', accent: 'text-rose-700', border: 'border-rose-200', label: 'Rose', swatch: 'bg-rose-300' },
    mint: { bg: 'bg-emerald-50', card: 'bg-white', accent: 'text-emerald-700', border: 'border-emerald-200', label: 'Mint', swatch: 'bg-emerald-300' },
    lavender: { bg: 'bg-violet-50', card: 'bg-white', accent: 'text-violet-700', border: 'border-violet-200', label: 'Lavender', swatch: 'bg-violet-300' },
    peach: { bg: 'bg-orange-50', card: 'bg-white', accent: 'text-orange-700', border: 'border-orange-200', label: 'Peach', swatch: 'bg-orange-300' },
};

const defaultSettings: Settings = {
    graphicMode: 'classic',
    displayMode: 'web',
    colorScheme: 'default',
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
    enableParentView: false,
    enableMultiAdmin: false,
    enableStudentPortal: false,
    enableClassSignIn: false,
    enableAttendance: false,
    enableHelperMode: true,
    showIntroWizard: false,
    enableTeacherBudgets: false,
    legacyMode: false,
    enableAnimatedBackground: true,
    calmMode: false,
    logoDisplayMode: 'contain',
    photoDisplayMode: 'cover',
    animatedBackgroundStyle: 'arcade',
    hiddenAnimatedBackgroundIds: [],
};

export { colorSchemes };
export type { ColorScheme };

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const { schoolId, isInitialized } = useAuth();
    const [settings, setSettings] = useState<Settings>(defaultSettings);
    const [isLoaded, setIsLoaded] = useState(false);
    const isMobile = useIsMobile();

    useEffect(() => {
        if (!isInitialized) {
            return; // Wait for auth provider to be ready
        }

        const settingsKey = schoolId ? `arcade_settings_${schoolId}` : 'arcade_settings_global';
        const saved = localStorage.getItem(settingsKey);

        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.graphicMode === 'arcade') {
                    parsed.graphicMode = 'graphics';
                }
                // Back-compat: some code uses enableAttendance, some uses enableClassSignIn.
                if (typeof parsed.enableAttendance !== 'boolean' && typeof parsed.enableClassSignIn === 'boolean') {
                    parsed.enableAttendance = parsed.enableClassSignIn;
                }
                if (typeof parsed.enableClassSignIn !== 'boolean' && typeof parsed.enableAttendance === 'boolean') {
                    parsed.enableClassSignIn = parsed.enableAttendance;
                }
                setSettings({ ...defaultSettings, ...parsed });
            } catch (e) {
                setSettings(defaultSettings);
            }
        } else {
            // No settings for this school, use defaults and show the intro wizard once.
            const initialSettings: Settings = {
                ...defaultSettings,
                showIntroWizard: true,
            };
            if (isMobile) {
                initialSettings.displayMode = 'app';
            }
            setSettings(initialSettings);
        }
        setIsLoaded(true);
    }, [schoolId, isInitialized, isMobile]);

    const updateSettings = (updates: Partial<Settings>) => {
        const settingsKey = schoolId ? `arcade_settings_${schoolId}` : 'arcade_settings_global';
        setSettings((prev) => {
            const next = { ...prev, ...updates };

            localStorage.setItem(settingsKey, JSON.stringify(next));

            // Dispatch a custom event so non-react code or other tabs can listen if needed
            window.dispatchEvent(new Event('settings-updated'));

            return next;
        });
    };

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

    // Apply color scheme data attribute for classic mode
    useEffect(() => {
        if (!isLoaded) return;
        document.documentElement.setAttribute('data-color-scheme', settings.colorScheme ?? 'default');
    }, [settings.colorScheme, isLoaded]);

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

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, isLoaded }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const ctx = useContext(SettingsContext);
    if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
    return ctx;
}
