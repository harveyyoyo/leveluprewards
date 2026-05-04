
'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth, type LoginState } from './AuthProvider';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import { doc, setDoc, type DocumentData } from 'firebase/firestore';
import { removeUndefinedDeep } from '@/lib/db/helpers';
import { schoolPublicDocRef } from '@/lib/schoolPublic';
import {
    DEFAULT_PLAN,
    getSchoolEntitlements,
    isPlanFeatureKey,
    normalizePlan,
    PLAN_FEATURE_KEYS,
    PLANS,
    type PlanEntitlements,
    type PlanTier,
    type SchoolPlanConfig,
} from '@/lib/plans';
import type { StudentTheme } from '@/lib/types';
import { STUDENT_WELCOME_STYLES_LIVE } from '@/lib/studentWelcome';

type ColorScheme = 'default' | 'sky' | 'rose' | 'mint' | 'lavender' | 'peach';

interface Settings {
    graphicMode: 'classic' | 'graphics';
    displayMode: 'web' | 'app';
    colorScheme: ColorScheme;
    soundEnabled: boolean;
    language: string;
    darkMode: boolean;
    // Theme visuals
    enableThemeAnimations: boolean;
    /** When false, kiosk, rewards shop, and ID cards ignore per-student and school default themes (data is kept). */
    enableStudentThemes: boolean;
    // Engagement
    enableAchievements: boolean;
    enableBadges: boolean;
    enableLevels: boolean;
    enableStreaks: boolean;
    enableGoals: boolean;
    enableChallenges: boolean;
    // Analytics
    enableTeacherCharts: boolean;
    enableAdminAnalytics: boolean;
    // Social & Communication
    enableNotifications: boolean;
    notificationRewardsEnabled: boolean;
    notificationAttendanceEnabled: boolean;
    notificationMilestonesEnabled: boolean;
    notificationStudentsEnabled: boolean;
    notificationArtworkEnabled: boolean;
    notificationStaffAlertsEnabled: boolean;
    notificationWhatsAppEnabled: boolean;
    enableClassLeaderboard: boolean;
    /** Class-vs-class standings (combined balances); primary UI is Hall of Fame. Reserved for future surfaces. */
    enableClassAccumulations: boolean;
    enableShoutouts: boolean;
    // Prize/Rewards shop
    enablePrizeImages: boolean;
    enablePrizeAiSurprise: boolean;
    enablePrizeCategories: boolean;
    enableWishlist: boolean;
    enableSeasonalPrizes: boolean;
    enableVendingMachine: boolean;
    /** When on, include the student's theme emoji (or school default theme) on printed prize redeem vouchers. */
    enableStudentEmojiOnPrizeTickets: boolean;
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
    enableFaceLogin: boolean;
    /** Welcome styles picker on the kiosk (`/student/welcome`). Gated by `STUDENT_WELCOME_STYLES_LIVE` until shipped. */
    enableStudentWelcome: boolean;
    /** Short “welcome back” splash when a student lands on the kiosk dashboard. Can be turned off per student. */
    enableStudentWelcomeBackScreen: boolean;
    /** Auto-dismiss duration for the welcome back splash (seconds). */
    studentWelcomeBackDurationSec: number;
    /** School-wide default welcome style (used when student has no override). Empty = confetti. */
    defaultWelcomeGreetingStyleId?: string;
    /** Back-compat alias used by some pages/components. */
    enableAttendance: boolean;
    // Guidance
    enableHelperMode: boolean;
    showIntroWizard?: boolean;
    // Workflow
    enableTeacherBudgets: boolean;
    enableHomework: boolean;
    legacyMode: boolean;
    enableAnimatedBackground: boolean;
    calmMode?: boolean;
    // Image display: how logos and photos are fitted in their boxes
    logoDisplayMode: 'contain' | 'cover';
    photoDisplayMode: 'contain' | 'cover';
    // Upload styles
    logoBorderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
    logoDropShadow: 'none' | 'sm' | 'md' | 'lg';
    photoBorderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
    photoDropShadow: 'none' | 'sm' | 'md' | 'lg';
    // Visuals
    animatedBackgroundStyle: string;
    hiddenAnimatedBackgroundIds: string[];
    /** Admin-set palette for students with no individual `student.theme` (kiosk, prize/rewards shop, ID card). */
    defaultStudentTheme?: StudentTheme | null;
    // Security & Session
    adminSessionTimeoutMs?: number;
    kioskSessionTimeoutSec?: number;
    // Sponsor Banner (displayed at the bottom/top of student kiosk screens)
    kioskSponsorEnabled: boolean;
    kioskSponsorMessage: string;
    kioskSponsorLogoUrl?: string;
    kioskSponsorLink?: string;
    kioskSponsorSpeed?: 'slow' | 'normal' | 'fast' | 'very_fast' | 'static';
    kioskSponsorPosition?: 'top' | 'bottom';
    kioskSponsorBannerStyle?: 'primary' | 'subtle' | 'neon_gold' | 'electric' | 'gradient' | 'glass';
    kioskSponsorIcon?: string;
    kioskSponsorSchedules?: {
        id: string;
        date: string;
        message: string;
        link?: string;
        logoUrl?: string;
        bannerStyle?: 'primary' | 'subtle' | 'neon_gold' | 'electric' | 'gradient' | 'glass';
        speed?: 'slow' | 'normal' | 'fast' | 'very_fast' | 'static';
        position?: 'top' | 'bottom';
        icon?: string;
    }[];

    // Bulletin Board
    bulletinEnabled?: boolean;
    bulletinTitle?: string;
    bulletinTheme?: string;
    /** Shown under the title on kiosk, portal board, and admin preview. */
    bulletinSubtitle?: string;
    /** Logo size in the bulletin header. */
    bulletinLogoSize?: 'sm' | 'md' | 'lg';
    /** When false, hides the small “Wowed Design” pill on the student kiosk card. */
    bulletinShowWowBadge?: boolean;
    /** '1' = single column; '2' = responsive two-column grid on wide screens. */
    bulletinColumns?: '1' | '2';
    // Special Occasions
    enableBirthdayPoints: boolean;
    birthdayPointsAmount: number;
    enableSpecialDayPoints: boolean;
    specialDayPointsAmount: number;
    specialDayLabel: string;
    specialDayDate: string;
    // Product pillars
    payRewards?: boolean;
    payAttendance?: boolean;
    payHomework?: boolean;
    payLibrary?: boolean;
}

interface SettingsContextType {
    settings: Settings;
    updateSettings: (updates: Partial<Settings>) => void;
    planTier: PlanTier;
    planLabel: string;
    featureEntitlements: PlanEntitlements;
    isFeatureAllowed: (key: string) => boolean;
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
    enableThemeAnimations: false,
    enableStudentThemes: true,
    enableAchievements: false,
    enableBadges: false,
    enableLevels: false,
    enableStreaks: false,
    enableGoals: false,
    enableChallenges: false,
    enableTeacherCharts: false,
    enableAdminAnalytics: false,
    enableNotifications: true,
    notificationRewardsEnabled: true,
    notificationAttendanceEnabled: true,
    notificationMilestonesEnabled: true,
    notificationStudentsEnabled: false,
    notificationArtworkEnabled: true,
    notificationStaffAlertsEnabled: true,
    notificationWhatsAppEnabled: false,
    enableClassLeaderboard: false,
    enableClassAccumulations: false,
    enableShoutouts: false,
    enablePrizeImages: false,
    enablePrizeAiSurprise: false,
    enablePrizeCategories: false,
    enableWishlist: false,
    enableSeasonalPrizes: false,
    enableVendingMachine: false,
    enableStudentEmojiOnPrizeTickets: false,
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
    enableFaceLogin: false,
    enableStudentWelcome: false,
    enableStudentWelcomeBackScreen: false,
    studentWelcomeBackDurationSec: 3,
    defaultWelcomeGreetingStyleId: '',
    enableAttendance: false,
    enableHelperMode: true,
    showIntroWizard: false,
    enableTeacherBudgets: false,
    enableHomework: false,
    legacyMode: false,
    enableAnimatedBackground: true,
    calmMode: false,
    logoDisplayMode: 'contain',
    photoDisplayMode: 'cover',
    logoBorderRadius: 'md',
    logoDropShadow: 'md',
    photoBorderRadius: 'full',
    photoDropShadow: 'md',
    animatedBackgroundStyle: 'arcade',
    hiddenAnimatedBackgroundIds: [],
    defaultStudentTheme: {
        fontScale: 1.15,
        background: '#f8fafc',
        text: '#020617',
        primary: '#0ea5e9',
        cardBackground: '#ffffff',
        accent: '#64748b',
    },
    adminSessionTimeoutMs: 5 * 60 * 1000,
    kioskSessionTimeoutSec: 15,
    kioskSponsorEnabled: false,
    kioskSponsorMessage: '',
    kioskSponsorLogoUrl: '',
    kioskSponsorLink: '',
    kioskSponsorSpeed: 'normal',
    kioskSponsorPosition: 'bottom',
    kioskSponsorBannerStyle: 'primary',
    kioskSponsorIcon: '🎉',
    kioskSponsorSchedules: [],

    bulletinEnabled: true,
    bulletinTitle: 'School Bulletin Board',
    bulletinTheme: 'default',
    bulletinSubtitle: '',
    bulletinLogoSize: 'md',
    bulletinShowWowBadge: true,
    bulletinColumns: '2',
    enableBirthdayPoints: false,
    birthdayPointsAmount: 100,
    enableSpecialDayPoints: false,
    specialDayPointsAmount: 50,
    specialDayLabel: 'School Spirit Day',
    specialDayDate: '',
    payRewards: true,
    payAttendance: true,
    payHomework: true,
    payLibrary: true,
};

const publicLoginSettings: Partial<Settings> = {
    graphicMode: 'classic',
    displayMode: 'web',
    colorScheme: 'default',
    soundEnabled: false,
    darkMode: false,
    enableAnimatedBackground: false,
    // Keep feature toggles as-is; this only enforces a neutral look/feel.
};

export { colorSchemes };
export type { ColorScheme, Settings };

const SettingsContext = createContext<SettingsContextType | null>(null);

/** Per-browser settings: students and staff keep separate theme and UI prefs on shared devices. */
function getLocalArcadeSettingsKey(schoolId: string | null, loginState: LoginState): string {
    if (!schoolId) return 'arcade_settings_global';
    if (loginState === 'student') return `arcade_settings_${schoolId}_student`;
    return `arcade_settings_${schoolId}_staff`;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const { schoolId, isInitialized, loginState } = useAuth();
    const { firestore } = useFirebase();
    const [settings, setSettings] = useState<Settings>(defaultSettings);
    const [isLoaded, setIsLoaded] = useState(false);
    const isMobile = useIsMobile();
    const pathname = usePathname();
    const isStaff = loginState === 'admin' || loginState === 'developer' || loginState === 'teacher' || loginState === 'secretary' || loginState === 'prizeClerk' || loginState === 'reports';
    const schoolDocRef = useMemoFirebase(() => {
        if (!firestore || !schoolId) return null;
        const sid = schoolId.trim().toLowerCase();
        if (isStaff) return doc(firestore, 'schools', sid);
        return schoolPublicDocRef(firestore, sid);
    }, [firestore, schoolId, isStaff]);
    const { data: schoolData } = useDoc<SchoolPlanConfig & { appSettings?: Partial<Settings> }>(schoolDocRef);

    /** Stable deps so unrelated school doc fields do not re-run the hydration merge every snapshot. */
    const stableRemoteAppSettingsJson = useMemo(() => {
        const rs = schoolData?.appSettings;
        if (!rs || typeof rs !== 'object') return null;
        try {
            return JSON.stringify(rs);
        } catch {
            return null;
        }
    }, [schoolData?.appSettings]);

    const stableFeatureDefaultsJson = useMemo(() => {
        const fd = schoolData?.featureSettingsDefaults;
        if (!fd || typeof fd !== 'object') return null;
        try {
            return JSON.stringify(fd);
        } catch {
            return null;
        }
    }, [schoolData?.featureSettingsDefaults]);

    const planTier = useMemo(
        () => (schoolId ? normalizePlan(schoolData?.plan) : 'enterprise'),
        [schoolId, schoolData],
    );
    const featureEntitlements = useMemo(
        () => getSchoolEntitlements(schoolId ? schoolData : { plan: 'enterprise' }),
        [schoolId, schoolData],
    );
    const planLabel = PLANS[planTier]?.label ?? PLANS[DEFAULT_PLAN].label;
    const isPublicLoginRoute =
        pathname === '/' ||
        pathname === '/portal' ||
        pathname === '/login' ||
        (typeof pathname === 'string' && pathname.startsWith('/s/'));

    const isAllowed = useCallback((key: string) => {
        if (key === 'enableClassSignIn') {
            return featureEntitlements.enableClassSignIn || featureEntitlements.enableAttendance;
        }
        if (!isPlanFeatureKey(key)) return true;
        return featureEntitlements[key];
    }, [featureEntitlements]);

    const applyEntitlements = useCallback((input: Settings): Settings => {
        const next = { ...input };
        for (const key of PLAN_FEATURE_KEYS) {
            if (!isAllowed(key)) {
                (next as Record<string, unknown>)[key] = false;
            }
        }
        if (!isAllowed('enableClassSignIn')) {
            next.enableClassSignIn = false;
            next.enableAttendance = false;
        }
        return next;
    }, [isAllowed]);

    const latestForFirestoreRef = useRef<Settings | null>(null);
    const lastScheduledFlushSchoolIdRef = useRef<string | null>(null);
    const firestoreFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const firestoreRef = useRef(firestore);
    firestoreRef.current = firestore;
    const loginStateRef = useRef(loginState);
    loginStateRef.current = loginState;

    useEffect(() => {
        if (!isInitialized) {
            return; // Wait for auth provider to be ready
        }

        const settingsKey = getLocalArcadeSettingsKey(schoolId, loginState);
        const legacySchoolKey = schoolId ? `arcade_settings_${schoolId}` : null;
        let saved = localStorage.getItem(settingsKey);
        if (!saved && legacySchoolKey && loginState !== 'student') {
            const legacy = localStorage.getItem(legacySchoolKey);
            if (legacy) {
                saved = legacy;
                localStorage.setItem(settingsKey, legacy);
                localStorage.removeItem(legacySchoolKey);
            }
        }
        const remoteSettings =
            schoolId && stableRemoteAppSettingsJson
                ? (JSON.parse(stableRemoteAppSettingsJson) as Partial<Settings>)
                : null;
        let featureDefaultsFromRemote: Partial<Settings> = {};
        if (stableFeatureDefaultsJson) {
            try {
                featureDefaultsFromRemote = JSON.parse(stableFeatureDefaultsJson) as Partial<Settings>;
            } catch {
                featureDefaultsFromRemote = {};
            }
        }

        if (remoteSettings || saved) {
            try {
                const parsed = remoteSettings ? { ...remoteSettings } : JSON.parse(saved || '{}');
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
                if (typeof parsed.enableStudentWelcomeBackScreen !== 'boolean') {
                    parsed.enableStudentWelcomeBackScreen = !!parsed.enableStudentWelcome;
                }
                if (!STUDENT_WELCOME_STYLES_LIVE) {
                    parsed.enableStudentWelcome = false;
                }
                if (typeof parsed.studentWelcomeBackDurationSec !== 'number' || !Number.isFinite(parsed.studentWelcomeBackDurationSec)) {
                    parsed.studentWelcomeBackDurationSec = defaultSettings.studentWelcomeBackDurationSec;
                } else {
                    parsed.studentWelcomeBackDurationSec = Math.min(60, Math.max(1, Math.round(parsed.studentWelcomeBackDurationSec)));
                }
                // Demo school: production defaults are applied only on first-run (see no-saved-settings branch below).
                const nextSettings = applyEntitlements({ 
                    ...defaultSettings, 
                    ...featureDefaultsFromRemote,
                    ...parsed 
                });
                setSettings(nextSettings);
                localStorage.setItem(settingsKey, JSON.stringify(nextSettings));
            } catch (e) {
                setSettings(applyEntitlements({ 
                    ...defaultSettings, 
                    ...featureDefaultsFromRemote,
                }));
            }
        } else {
            // No settings for this school, use defaults and show the intro wizard once.
            const initialSettings: Settings = {
                ...defaultSettings,
                ...featureDefaultsFromRemote,
                showIntroWizard: !!schoolId,
                // Demo school: apply sky theme and sound to match production
                ...(schoolId === 'schoolabc' ? { 
                    colorScheme: 'sky' as ColorScheme, 
                    graphicMode: 'graphics',
                    soundEnabled: true,
                    enableHelperMode: true
                } : {}),
            };
            if (isMobile) {
                initialSettings.displayMode = 'app';
            }
            setSettings(applyEntitlements(initialSettings));
        }
        setIsLoaded(true);
    }, [schoolId, isInitialized, isMobile, applyEntitlements, stableRemoteAppSettingsJson, stableFeatureDefaultsJson, loginState]);

    const flushAppSettingsToFirestore = useCallback((next: Settings, sid: string) => {
        const fs = firestoreRef.current;
        const ls = loginStateRef.current;
        if (!sid || !fs || (ls !== 'admin' && ls !== 'developer')) return;
        const schoolWritePayload = removeUndefinedDeep({
            appSettings: next,
            updatedAt: Date.now(),
        }) as DocumentData;
        void setDoc(doc(fs, 'schools', sid), schoolWritePayload, { merge: true }).catch((error) => {
            console.error('Failed to save school settings', error);
        });
        const publicWritePayload = removeUndefinedDeep({
            appSettings: next,
            active: true,
            updatedAt: Date.now(),
        }) as DocumentData;
        void setDoc(schoolPublicDocRef(fs, sid), publicWritePayload, { merge: true }).catch((error) => {
            console.error('Failed to save public school settings mirror', error);
        });
    }, []);

    useEffect(() => {
        const capturedSid = schoolId?.trim().toLowerCase() ?? '';
        return () => {
            if (firestoreFlushTimerRef.current) {
                clearTimeout(firestoreFlushTimerRef.current);
                firestoreFlushTimerRef.current = null;
            }
            const pending = latestForFirestoreRef.current;
            const flushSid = lastScheduledFlushSchoolIdRef.current;
            const ls = loginStateRef.current;
            if (
                pending &&
                flushSid &&
                flushSid === capturedSid &&
                (ls === 'admin' || ls === 'developer')
            ) {
                flushAppSettingsToFirestore(pending, flushSid);
            }
        };
    }, [schoolId, loginState, flushAppSettingsToFirestore]);

    const updateSettings = (updates: Partial<Settings>) => {
        const settingsKey = getLocalArcadeSettingsKey(schoolId, loginState);
        setSettings((prev) => {
            const allowedUpdates = { ...updates };
            if (typeof allowedUpdates.enableClassSignIn === 'boolean') {
                allowedUpdates.enableAttendance = allowedUpdates.enableClassSignIn;
            }
            if (typeof allowedUpdates.enableAttendance === 'boolean') {
                allowedUpdates.enableClassSignIn = allowedUpdates.enableAttendance;
            }
            for (const key of Object.keys(allowedUpdates)) {
                if (!isAllowed(key)) {
                    delete (allowedUpdates as Record<string, unknown>)[key];
                }
            }
            const next = applyEntitlements({ ...prev, ...allowedUpdates });

            localStorage.setItem(settingsKey, JSON.stringify(next));
            latestForFirestoreRef.current = next;

            if (schoolId && firestore && (loginState === 'admin' || loginState === 'developer')) {
                const flushSid = schoolId.trim().toLowerCase();
                lastScheduledFlushSchoolIdRef.current = flushSid;
                if (firestoreFlushTimerRef.current) {
                    clearTimeout(firestoreFlushTimerRef.current);
                }
                firestoreFlushTimerRef.current = setTimeout(() => {
                    firestoreFlushTimerRef.current = null;
                    const payload = latestForFirestoreRef.current;
                    const scheduledSid = lastScheduledFlushSchoolIdRef.current;
                    if (payload && scheduledSid) {
                        flushAppSettingsToFirestore(payload, scheduledSid);
                    }
                }, 450);
            }

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

    // Force a neutral public appearance on public/login routes regardless of saved settings.
    useEffect(() => {
        if (!isLoaded) return;
        if (!isPublicLoginRoute) return;

        const root = document.documentElement;
        const next = { ...settings, ...publicLoginSettings };

        if (next.darkMode) root.classList.add('dark');
        else root.classList.remove('dark');

        root.classList.toggle('legacy', !!next.legacyMode);
        root.setAttribute('data-color-scheme', next.colorScheme ?? 'default');
    }, [isLoaded, isPublicLoginRoute, settings]);

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, planTier, planLabel, featureEntitlements, isFeatureAllowed: isAllowed, isLoaded }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const ctx = useContext(SettingsContext);
    if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
    return ctx;
}
