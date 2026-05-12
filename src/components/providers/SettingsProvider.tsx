
'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth, type LoginState } from './AuthProvider';
import { useIsMobile, useIsTabletOrMobile } from '@/hooks/use-mobile';
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
import type { IdCardPrinterFamilyId, IdCardPrintProfile } from '@/lib/id-card-print-catalog';
import { defaultPaperForFamily } from '@/lib/id-card-print-catalog';
import type { PrizeVoucherPaperFormat } from '@/lib/prize-voucher-print';
import { STUDENT_WELCOME_STYLES_LIVE } from '@/lib/studentWelcome';
import { LEVELUP_BRAND_PRIMARY_HEX } from '@/lib/app-branding';

type ColorScheme =
    | 'default'
    | 'sky'
    | 'rose'
    | 'mint'
    | 'lavender'
    | 'peach'
    /** Dual-tone presets (primary + complement accents in nav, charts, rings). */
    | 'ocean'
    | 'sunset'
    | 'sapphire'
    | 'coral';

type AppearanceColorPair = {
    primary?: string;
    secondary?: string;
};

type AppearanceColorOverrides = Partial<Record<ColorScheme, AppearanceColorPair>>;

interface Settings {
    graphicMode: 'classic' | 'graphics';
    displayMode: 'web' | 'app';
    colorScheme: ColorScheme;
    customAppearanceColors?: AppearanceColorOverrides;
    soundEnabled: boolean;
    language: string;
    darkMode: boolean;
    /** When dark mode is on, adds richer accents and a subtle color wash on the page background. */
    darkModeColorized?: boolean;
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
    /** Weekly raffle wheel (Teacher portal): convert points into raffle entries. */
    enableWeeklyRaffle: boolean;
    // Social & Communication
    enableNotifications: boolean;
    notificationRewardsEnabled: boolean;
    notificationAttendanceEnabled: boolean;
    /** Library-related activity alerts (checkout/return). */
    notificationLibraryEnabled: boolean;
    notificationMilestonesEnabled: boolean;
    notificationStudentsEnabled: boolean;
    notificationArtworkEnabled: boolean;
    notificationStaffAlertsEnabled: boolean;
    notificationWhatsAppEnabled: boolean;
    /** When on, staff can receive prize inventory alerts (low stock / empty shop). */
    notificationPrizeInventoryEnabled: boolean;
    /** Low-stock threshold (inclusive) when inventory alerts are on. */
    notificationPrizeLowStockThreshold: number;
    /** When on, staff can receive a "shop empty" alert when no prizes are available. */
    notificationPrizeEmptyShopEnabled: boolean;
    /**
     * Internal: last time we sent an "empty shop" alert (ms since epoch).
     * Used by Cloud Functions to rate-limit notifications.
     */
    inventoryLastEmptyShopAlertAt?: number;
    enableClassLeaderboard: boolean;
    /** Class-vs-class standings (combined balances); primary UI is Hall of Fame. Reserved for future surfaces. */
    enableClassAccumulations: boolean;
    enableShoutouts: boolean;
    // Prize/Rewards shop
    enablePrizeImages: boolean;
    enablePrizeAiSurprise: boolean;
    /** Point cost for the built-in Fun AI reward shown when AI surprise is enabled. */
    prizeAiSurpriseDefaultPoints: number;
    enablePrizeCategories: boolean;
    enableWishlist: boolean;
    enableSeasonalPrizes: boolean;
    enableVendingMachine: boolean;
    /** When on, include the student's theme emoji (or school default theme) on printed prize redeem vouchers. */
    enableStudentEmojiOnPrizeTickets: boolean;
    enableColorPrinting: boolean;
    /** Optional staff reminder shown near student ID / bulk card print (browser cannot pick a printer). */
    printerReminderIdCards?: string;
    /** When on, Admin -> Students shows a one-click DTC card-machine print button for exactly one selected student. */
    showSingleStudentCardMachinePrintButton: boolean;
    /** Saved ID card print setups (printer family + paper) for Admin → Students. */
    idCardPrintProfiles?: IdCardPrintProfile[];
    /** Last selected saved profile id for ID card printing (optional). */
    lastIdCardPrintProfileId?: string;
    /** Active ID card printer/output when not using a named saved profile only. */
    idCardPrinterFamily?: IdCardPrinterFamilyId;
    /** Paper/stock id paired with `idCardPrinterFamily`. */
    idCardPaperId?: string;
    /** Optional staff reminder for prize redeem slips and printed coupon sheets. */
    printerReminderPrizeVouchers?: string;
    /** Browser print page size for prize redeem vouchers (thermal receipt vs small label). */
    prizeVoucherPaperFormat?: PrizeVoucherPaperFormat;
    // Admin Tools
    enableBulkPoints: boolean;
    enablePointApproval: boolean;
    enableAuditLog: boolean;
    enablePdfExport: boolean;
    /** Weekly raffle: points per ticket (e.g. 25). Use 0 for a general raffle (one pool entry per student in scope; no point threshold). */
    rafflePointsPerTicket: number;
    /** Weekly raffle: when on, pulling the wheel deducts ticket points from all eligible students after the spin. */
    raffleDeductPoints: boolean;
    /** When on, each qualifying student has exactly one entry in the pool; when off, entries scale with points (floor). */
    raffleOneEntryPerStudent: boolean;
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
    /** Minutes of kiosk inactivity before AI Fun and redeem print vouchers are hidden until the next interaction. */
    kioskAiFunAndVoucherIdleOffMin?: number;
    /**
     * When on, the kiosk freezes a student that has signed in too many times in a row.
     * Useful to stop the same card being tapped repeatedly (e.g. abuse, accidental loops).
     */
    studentSignInThrottleEnabled?: boolean;
    /** Max successful sign-ins by the same student within the rolling window before they are frozen. */
    studentSignInThrottleMaxAttempts?: number;
    /** Rolling window (in minutes) used to count repeated sign-ins for the throttle. */
    studentSignInThrottleWindowMin?: number;
    /**
     * When > 0, a student who just signed in at the kiosk cannot sign in again
     * for this many seconds (anti-spam / anti-double-scan). 0 disables the freeze.
     */
    studentSignInFreezeSec?: number;
    /** Student kiosk login: show/hide each login method tab (Card / Type / Scan / Face). */
    kioskLoginTabCardEnabled?: boolean;
    kioskLoginTabTypeEnabled?: boolean;
    kioskLoginTabScanEnabled?: boolean;
    kioskLoginTabFaceEnabled?: boolean;
    /** Student kiosk coupon redemption: show/hide entry methods. If both are off, coupon redemption is hidden. */
    kioskCouponRedemptionManualEnabled?: boolean;
    kioskCouponRedemptionCameraEnabled?: boolean;
    /**
     * Student kiosk rewards shop: how coupon codes are entered.
     * off = hide coupon redemption; manual/camera = single method (no student-facing tabs); both = Manual + Webcam tabs.
     */
    kioskCouponRedemptionInput?: 'off' | 'manual' | 'camera' | 'both';
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

    // Student Portal Interface overrides (set by admin)
    studentDisplayMode?: 'web' | 'app';
    studentColorScheme?: ColorScheme;
    studentDarkMode?: boolean;
    studentDarkModeColorized?: boolean;
    studentEnableAnimatedBackground?: boolean;
    studentAnimatedBackgroundStyle?: string;

    // Teacher Portal Interface overrides (set by admin)
    teacherDisplayMode?: 'web' | 'app';
    teacherColorScheme?: ColorScheme;
    teacherDarkMode?: boolean;
    teacherDarkModeColorized?: boolean;
    teacherEnableAnimatedBackground?: boolean;
    teacherAnimatedBackgroundStyle?: string;

    // Teacher Feature Toggles (controlled by admin)
    teacherFeatures?: Record<string, boolean>;
    expertMode: boolean;
    /** Admin-only UI preference: hides specific add-on tabs/chips without turning off the underlying feature toggles. */
    adminHiddenAddOnTabs?: string[];
    /** Admin-only UI preference: pins enabled add-on tabs into the main Admin tab row. */
    adminPinnedAddOnTabs?: string[];
    /** Admin-only UI preference: persists the main Admin tab order (including pinned add-ons). */
    adminMainTabOrder?: string[];
    /** Admin-only UI preference: persists the Extra features row order (unpinned add-ons). */
    adminExtraTabOrder?: string[];
    /** Teacher portal: hides specific add-on tabs without turning off features (optional soft-hide). */
    teacherHiddenAddOnTabs?: string[];

    // Hall of Fame (big screen defaults)
    hallOfFameRankType?: 'students' | 'classes' | 'goals';
    hallOfFameSortBy?: string;
    hallOfFameScope?: 'all' | string;
    hallOfFameLimit?: number;
    hallOfFamePodiumSize?: number;
    hallOfFameAutoScroll?: boolean;
    hallOfFameGridLayout?: boolean;
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

const colorSchemes: Record<ColorScheme, { bg: string; card: string; accent: string; border: string; label: string; swatch: string; swatchColors: readonly [string, string] }> = {
    /* Swatch must stay a literal `bg-[…]` so Tailwind JIT includes it (matches LEVELUP_BRAND_PRIMARY_HEX). */
    default: { bg: 'bg-slate-50', card: 'bg-white', accent: 'text-slate-800', border: 'border-slate-200', label: 'Default', swatch: 'bg-[#102a45]', swatchColors: ['#102a45', '#64748b'] },
    sky: { bg: 'bg-sky-50', card: 'bg-white', accent: 'text-sky-700', border: 'border-sky-200', label: 'Sky', swatch: 'bg-sky-300', swatchColors: ['#0ea5e9', '#10b981'] },
    rose: { bg: 'bg-rose-50', card: 'bg-white', accent: 'text-rose-700', border: 'border-rose-200', label: 'Rose', swatch: 'bg-rose-300', swatchColors: ['#e11d48', '#f97316'] },
    mint: { bg: 'bg-emerald-50', card: 'bg-white', accent: 'text-emerald-700', border: 'border-emerald-200', label: 'Mint', swatch: 'bg-emerald-300', swatchColors: ['#10b981', '#0ea5e9'] },
    lavender: { bg: 'bg-violet-50', card: 'bg-white', accent: 'text-violet-700', border: 'border-violet-200', label: 'Lavender', swatch: 'bg-violet-300', swatchColors: ['#8b5cf6', '#0ea5e9'] },
    peach: { bg: 'bg-orange-50', card: 'bg-white', accent: 'text-orange-700', border: 'border-orange-200', label: 'Peach', swatch: 'bg-orange-300', swatchColors: ['#f97316', '#e11d48'] },
    ocean: {
        bg: 'bg-sky-50',
        card: 'bg-white',
        accent: 'text-sky-800',
        border: 'border-sky-200',
        label: 'Ocean + sand',
        swatch: 'bg-[linear-gradient(135deg,#176b80,#d6a74a)]',
        swatchColors: ['#176b80', '#d6a74a'],
    },
    sunset: {
        bg: 'bg-orange-50',
        card: 'bg-white',
        accent: 'text-orange-800',
        border: 'border-orange-200',
        label: 'Sunset + indigo',
        swatch: 'bg-[linear-gradient(135deg,#d86143,#5967a6)]',
        swatchColors: ['#d86143', '#5967a6'],
    },
    sapphire: {
        bg: 'bg-blue-50',
        card: 'bg-white',
        accent: 'text-blue-800',
        border: 'border-blue-200',
        label: 'Sapphire + amber',
        swatch: 'bg-[linear-gradient(135deg,#2557a7,#cf9b32)]',
        swatchColors: ['#2557a7', '#cf9b32'],
    },
    coral: {
        bg: 'bg-orange-50',
        card: 'bg-white',
        accent: 'text-orange-800',
        border: 'border-orange-200',
        label: 'Coral + teal',
        swatch: 'bg-[linear-gradient(135deg,#d95f56,#2c8f8a)]',
        swatchColors: ['#d95f56', '#2c8f8a'],
    },
};

const defaultSettings: Settings = {
    graphicMode: 'classic',
    displayMode: 'web',
    colorScheme: 'default',
    customAppearanceColors: {},
    soundEnabled: true,
    language: 'English',
    darkMode: false,
    darkModeColorized: false,
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
    enableWeeklyRaffle: false,
    enableNotifications: true,
    notificationRewardsEnabled: true,
    notificationAttendanceEnabled: true,
    notificationLibraryEnabled: false,
    notificationMilestonesEnabled: true,
    notificationStudentsEnabled: false,
    notificationArtworkEnabled: true,
    notificationStaffAlertsEnabled: true,
    notificationWhatsAppEnabled: false,
    notificationPrizeInventoryEnabled: false,
    notificationPrizeLowStockThreshold: 5,
    notificationPrizeEmptyShopEnabled: false,
    enableClassLeaderboard: false,
    enableClassAccumulations: false,
    enableShoutouts: false,
    enablePrizeImages: false,
    enablePrizeAiSurprise: false,
    prizeAiSurpriseDefaultPoints: 1,
    enablePrizeCategories: false,
    enableWishlist: false,
    enableSeasonalPrizes: false,
    enableVendingMachine: false,
    enableStudentEmojiOnPrizeTickets: false,
    enableColorPrinting: true,
    printerReminderIdCards: '',
    showSingleStudentCardMachinePrintButton: false,
    idCardPrintProfiles: [],
    lastIdCardPrintProfileId: undefined,
    idCardPrinterFamily: 'browser_sheet',
    idCardPaperId: defaultPaperForFamily('browser_sheet'),
    printerReminderPrizeVouchers: '',
    prizeVoucherPaperFormat: 'label_50x70',
    enableBulkPoints: false,
    enablePointApproval: false,
    enableAuditLog: false,
    enablePdfExport: false,
    rafflePointsPerTicket: 25,
    raffleDeductPoints: false,
    raffleOneEntryPerStudent: false,
    enableStudentProfiles: false,
    enableQrLogin: true,
    enableParentView: false,
    enableMultiAdmin: false,
    enableStudentPortal: false,
    enableClassSignIn: false,
    enableFaceLogin: false,
    enableStudentWelcome: false,
    enableStudentWelcomeBackScreen: false,
    studentWelcomeBackDurationSec: 2,
    defaultWelcomeGreetingStyleId: '',
    enableAttendance: false,
    enableHelperMode: true,
    showIntroWizard: false,
    enableTeacherBudgets: false,
    enableHomework: false,
    legacyMode: false,
    enableAnimatedBackground: true,
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
        primary: LEVELUP_BRAND_PRIMARY_HEX,
        cardBackground: '#ffffff',
        accent: '#64748b',
    },
    adminSessionTimeoutMs: 5 * 60 * 1000,
    kioskSessionTimeoutSec: 10,
    kioskAiFunAndVoucherIdleOffMin: 6,
    studentSignInThrottleEnabled: false,
    studentSignInThrottleMaxAttempts: 10,
    studentSignInThrottleWindowMin: 2,
    studentSignInFreezeSec: 0,
    kioskLoginTabCardEnabled: true,
    kioskLoginTabTypeEnabled: true,
    kioskLoginTabScanEnabled: true,
    kioskLoginTabFaceEnabled: false,
    kioskCouponRedemptionManualEnabled: true,
    kioskCouponRedemptionCameraEnabled: true,
    kioskCouponRedemptionInput: 'both',
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

    // Role-based defaults
    // Additional (admin-controlled) teacher features should start OFF by default.
    // `isTeacherAllowed` treats missing keys as `false`, so an empty map is the safest default.
    teacherFeatures: {},
    expertMode: false,
    adminHiddenAddOnTabs: [],
    adminPinnedAddOnTabs: [],
    adminMainTabOrder: [],
    adminExtraTabOrder: [],
    teacherHiddenAddOnTabs: [],

    hallOfFameRankType: 'students',
    hallOfFameSortBy: 'lifetimePoints',
    hallOfFameScope: 'all',
    hallOfFameLimit: 50,
    hallOfFamePodiumSize: 3,
    hallOfFameAutoScroll: false,
    hallOfFameGridLayout: true,
};

const publicLoginSettings: Partial<Settings> = {
    graphicMode: 'classic',
    displayMode: 'web',
    colorScheme: 'default',
    soundEnabled: false,
    darkMode: false,
    darkModeColorized: false,
    enableAnimatedBackground: false,
    // Keep feature toggles as-is; this only enforces a neutral look/feel.
};

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;
const THEMED_ROOT_PROPS = [
    '--primary',
    '--primary-foreground',
    '--accent',
    '--accent-foreground',
    '--secondary',
    '--secondary-foreground',
    '--ring',
    '--chart-1',
    '--chart-2',
    '--chart-3',
    '--chart-4',
    '--chart-5',
];

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

function toTriplet(hsl: { h: number; s: number; l: number }) {
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

export { colorSchemes };
export type { AppearanceColorOverrides, ColorScheme, Settings };

const SettingsContext = createContext<SettingsContextType | null>(null);

/** Per-browser settings: students and staff keep separate theme and UI prefs on shared devices. */
function getLocalArcadeSettingsKey(schoolId: string | null, loginState: LoginState): string {
    if (!schoolId) return 'arcade_settings_global';
    if (loginState === 'student') return `arcade_settings_${schoolId}_student`;
    if (loginState === 'teacher') return `arcade_settings_${schoolId}_teacher`;
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
        if (settings.expertMode) return true;
        if (key === 'enableClassSignIn') {
            return featureEntitlements.enableClassSignIn || featureEntitlements.enableAttendance;
        }
        if (!isPlanFeatureKey(key)) return true;
        return featureEntitlements[key];
    }, [featureEntitlements, settings.expertMode]);

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
        if (!(next.payAttendance ?? true)) {
            next.enableClassSignIn = false;
            next.enableAttendance = false;
        }
        if (!(next.payHomework ?? true)) {
            next.enableHomework = false;
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
                // Back-compat: kiosk login tabs & coupon methods used to be controlled by `enableQrLogin`,
                // `enableFaceLogin`, and `kioskCouponRedemptionInput`. Prefer the new per-tab booleans.
                if (typeof parsed.kioskLoginTabScanEnabled !== 'boolean' && typeof parsed.enableQrLogin === 'boolean') {
                    parsed.kioskLoginTabScanEnabled = parsed.enableQrLogin;
                }
                if (typeof parsed.kioskLoginTabFaceEnabled !== 'boolean' && typeof parsed.enableFaceLogin === 'boolean') {
                    parsed.kioskLoginTabFaceEnabled = parsed.enableFaceLogin;
                }
                if (typeof parsed.kioskLoginTabCardEnabled !== 'boolean') parsed.kioskLoginTabCardEnabled = true;
                if (typeof parsed.kioskLoginTabTypeEnabled !== 'boolean') parsed.kioskLoginTabTypeEnabled = true;
                // Keep legacy flags aligned so older components still work.
                if (typeof parsed.kioskLoginTabScanEnabled === 'boolean') parsed.enableQrLogin = parsed.kioskLoginTabScanEnabled;
                if (typeof parsed.kioskLoginTabFaceEnabled === 'boolean') parsed.enableFaceLogin = parsed.kioskLoginTabFaceEnabled;

                if (
                    typeof parsed.kioskCouponRedemptionManualEnabled !== 'boolean' &&
                    typeof parsed.kioskCouponRedemptionCameraEnabled !== 'boolean' &&
                    typeof parsed.kioskCouponRedemptionInput === 'string'
                ) {
                    const mode = parsed.kioskCouponRedemptionInput;
                    parsed.kioskCouponRedemptionManualEnabled = mode === 'manual' || mode === 'both';
                    parsed.kioskCouponRedemptionCameraEnabled = mode === 'camera' || mode === 'both';
                }
                if (typeof parsed.kioskCouponRedemptionManualEnabled !== 'boolean') parsed.kioskCouponRedemptionManualEnabled = true;
                if (typeof parsed.kioskCouponRedemptionCameraEnabled !== 'boolean') parsed.kioskCouponRedemptionCameraEnabled = true;
                // Keep legacy mode aligned for any old reads.
                if (!parsed.kioskCouponRedemptionManualEnabled && !parsed.kioskCouponRedemptionCameraEnabled) {
                    parsed.kioskCouponRedemptionInput = 'off';
                } else if (parsed.kioskCouponRedemptionManualEnabled && parsed.kioskCouponRedemptionCameraEnabled) {
                    parsed.kioskCouponRedemptionInput = 'both';
                } else if (parsed.kioskCouponRedemptionManualEnabled) {
                    parsed.kioskCouponRedemptionInput = 'manual';
                } else {
                    parsed.kioskCouponRedemptionInput = 'camera';
                }
                if (!STUDENT_WELCOME_STYLES_LIVE) {
                    parsed.enableStudentWelcome = false;
                }
                if (typeof parsed.studentWelcomeBackDurationSec !== 'number' || !Number.isFinite(parsed.studentWelcomeBackDurationSec)) {
                    parsed.studentWelcomeBackDurationSec = defaultSettings.studentWelcomeBackDurationSec;
                } else {
                    parsed.studentWelcomeBackDurationSec = Math.min(60, Math.max(1, Math.round(parsed.studentWelcomeBackDurationSec)));
                }
                const psp = parsed.prizeAiSurpriseDefaultPoints;
                if (typeof psp !== 'number' || !Number.isFinite(psp) || psp < 0) {
                    delete (parsed as Partial<Settings>).prizeAiSurpriseDefaultPoints;
                }
                const kioskIdle = parsed.kioskAiFunAndVoucherIdleOffMin;
                if (
                    typeof kioskIdle !== 'number' ||
                    !Number.isFinite(kioskIdle) ||
                    kioskIdle < 1 ||
                    kioskIdle > 240
                ) {
                    delete (parsed as Partial<Settings>).kioskAiFunAndVoucherIdleOffMin;
                }
                const throttleMax = parsed.studentSignInThrottleMaxAttempts;
                if (
                    typeof throttleMax !== 'number' ||
                    !Number.isFinite(throttleMax) ||
                    throttleMax < 1 ||
                    throttleMax > 1000
                ) {
                    delete (parsed as Partial<Settings>).studentSignInThrottleMaxAttempts;
                } else {
                    parsed.studentSignInThrottleMaxAttempts = Math.round(throttleMax);
                }
                const throttleWindow = parsed.studentSignInThrottleWindowMin;
                if (
                    typeof throttleWindow !== 'number' ||
                    !Number.isFinite(throttleWindow) ||
                    throttleWindow < 1 ||
                    throttleWindow > 1440
                ) {
                    delete (parsed as Partial<Settings>).studentSignInThrottleWindowMin;
                } else {
                    parsed.studentSignInThrottleWindowMin = Math.round(throttleWindow);
                }
                const freezeSec = parsed.studentSignInFreezeSec;
                if (typeof freezeSec !== 'number' || !Number.isFinite(freezeSec) || freezeSec < 0) {
                    delete (parsed as Partial<Settings>).studentSignInFreezeSec;
                } else {
                    parsed.studentSignInFreezeSec = Math.min(3600, Math.round(freezeSec));
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
        if (!sid || !fs || (ls !== 'admin' && ls !== 'developer' && ls !== 'teacher')) return;
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
                (ls === 'admin' || ls === 'developer' || ls === 'teacher')
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

            if (schoolId && firestore && (loginState === 'admin' || loginState === 'developer' || loginState === 'teacher')) {
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

    /** Dark mode as seen on `html` for the active login surface (student/teacher overrides). */
    const effectiveDomDarkMode = useMemo(() => {
        if (loginState === 'student' && typeof settings.studentDarkMode === 'boolean') {
            return settings.studentDarkMode;
        }
        if (loginState === 'teacher' && typeof settings.teacherDarkMode === 'boolean') {
            return settings.teacherDarkMode;
        }
        return settings.darkMode;
    }, [loginState, settings.darkMode, settings.studentDarkMode, settings.teacherDarkMode]);

    const effectiveDomDarkColorized = useMemo(() => {
        let c = settings.darkModeColorized ?? false;
        if (loginState === 'student' && typeof settings.studentDarkModeColorized === 'boolean') {
            c = settings.studentDarkModeColorized;
        } else if (loginState === 'teacher' && typeof settings.teacherDarkModeColorized === 'boolean') {
            c = settings.teacherDarkModeColorized;
        }
        return c;
    }, [
        loginState,
        settings.darkModeColorized,
        settings.studentDarkModeColorized,
        settings.teacherDarkModeColorized,
    ]);

    // Apply dark class and optional colorized-dark marker on the document root.
    useEffect(() => {
        if (!isLoaded) return;
        const root = document.documentElement;
        if (effectiveDomDarkMode) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        if (effectiveDomDarkMode && effectiveDomDarkColorized) {
            root.setAttribute('data-dark-colorize', 'on');
        } else {
            root.removeAttribute('data-dark-colorize');
        }
    }, [effectiveDomDarkMode, effectiveDomDarkColorized, isLoaded]);

    // Apply color scheme data attribute and any saved color overrides.
    useEffect(() => {
        if (!isLoaded) return;
        let scheme = settings.colorScheme ?? 'default';
        if (loginState === 'student' && settings.studentColorScheme) {
            scheme = settings.studentColorScheme;
        } else if (loginState === 'teacher' && settings.teacherColorScheme) {
            scheme = settings.teacherColorScheme;
        }
        const root = document.documentElement;
        root.setAttribute('data-color-scheme', scheme);

        const custom = settings.customAppearanceColors?.[scheme];
        const primaryHex = custom?.primary;
        const secondaryHex = custom?.secondary;
        const primaryHsl = primaryHex ? hexToHslTriplet(primaryHex) : null;
        const secondaryHsl = secondaryHex ? hexToHslTriplet(secondaryHex) : null;
        THEMED_ROOT_PROPS.forEach((prop) => root.style.removeProperty(prop));
        if (primaryHsl && primaryHex) {
            const primaryTriplet = toTriplet(primaryHsl);
            root.style.setProperty('--primary', primaryTriplet);
            root.style.setProperty('--primary-foreground', contrastForegroundTriplet(primaryHex));
            root.style.setProperty('--chart-1', primaryTriplet);
            root.style.setProperty('--chart-3', primaryTriplet);
            root.style.setProperty('--chart-5', primaryTriplet);
        }
        if (secondaryHsl) {
            const secondaryTriplet = toTriplet(secondaryHsl);
            const accentLightness = effectiveDomDarkMode ? 18 : 94;
            const accentForegroundLightness = effectiveDomDarkMode ? 84 : 30;
            const secondaryLightness = effectiveDomDarkMode ? 18 : 86;
            const secondaryForegroundLightness = effectiveDomDarkMode ? 88 : 26;
            root.style.setProperty('--ring', secondaryTriplet);
            root.style.setProperty('--chart-2', secondaryTriplet);
            root.style.setProperty('--chart-4', secondaryTriplet);
            const secondarySurfaceSat = Math.min(62, Math.max(30, secondaryHsl.s));
            root.style.setProperty('--accent', `${secondaryHsl.h} ${secondarySurfaceSat}% ${accentLightness}%`);
            root.style.setProperty('--accent-foreground', `${secondaryHsl.h} ${Math.max(35, secondarySurfaceSat)}% ${accentForegroundLightness}%`);
            root.style.setProperty('--secondary', `${secondaryHsl.h} ${secondarySurfaceSat}% ${secondaryLightness}%`);
            root.style.setProperty('--secondary-foreground', `${secondaryHsl.h} ${Math.max(35, secondarySurfaceSat)}% ${secondaryForegroundLightness}%`);
        }
    }, [
        isLoaded,
        loginState,
        settings.colorScheme,
        settings.customAppearanceColors,
        effectiveDomDarkMode,
        settings.studentColorScheme,
        settings.teacherColorScheme,
    ]);

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
        root.removeAttribute('data-dark-colorize');
        THEMED_ROOT_PROPS.forEach((prop) => root.style.removeProperty(prop));
    }, [isLoaded, isPublicLoginRoute, settings]);

    const isTabletOrMobile = useIsTabletOrMobile();
    
    const effectiveSettings = useMemo(() => {
        const s = { ...settings };
        
        if (loginState === 'student') {
            if (s.studentDisplayMode) s.displayMode = s.studentDisplayMode;
            if (s.studentColorScheme) s.colorScheme = s.studentColorScheme;
            if (typeof s.studentDarkMode === 'boolean') s.darkMode = s.studentDarkMode;
            if (typeof s.studentDarkModeColorized === 'boolean') s.darkModeColorized = s.studentDarkModeColorized;
            if (typeof s.studentEnableAnimatedBackground === 'boolean') s.enableAnimatedBackground = s.studentEnableAnimatedBackground;
            if (s.studentAnimatedBackgroundStyle) s.animatedBackgroundStyle = s.studentAnimatedBackgroundStyle;
        } else if (loginState === 'teacher') {
            if (s.teacherDisplayMode) s.displayMode = s.teacherDisplayMode;
            if (s.teacherColorScheme) s.colorScheme = s.teacherColorScheme;
            if (typeof s.teacherDarkMode === 'boolean') s.darkMode = s.teacherDarkMode;
            if (typeof s.teacherDarkModeColorized === 'boolean') s.darkModeColorized = s.teacherDarkModeColorized;
            if (typeof s.teacherEnableAnimatedBackground === 'boolean') s.enableAnimatedBackground = s.teacherEnableAnimatedBackground;
            if (s.teacherAnimatedBackgroundStyle) s.animatedBackgroundStyle = s.teacherAnimatedBackgroundStyle;
        }

        // Tablet and mobile automatically switch to app mode overrides EVERYTHING else
        if (isTabletOrMobile) {
            s.displayMode = 'app';
        }

        return s;
    }, [settings, loginState, isTabletOrMobile]);

    const isTeacherAllowed = useCallback((key: string) => {
        if (!isAllowed(key)) return false;
        if (loginState !== 'teacher') return true;
        if (key === 'enableWeeklyRaffle') return !!settings.enableWeeklyRaffle;
        if (
            !!settings.enableWeeklyRaffle &&
            (key === 'rafflePointsPerTicket' || key === 'raffleOneEntryPerStudent' || key === 'raffleDeductPoints')
        ) {
            return true;
        }
        // Teachers only see features enabled for them by the admin
        return settings.teacherFeatures?.[key] ?? false;
    }, [isAllowed, loginState, settings.teacherFeatures, settings.enableWeeklyRaffle]);

    return (
        <SettingsContext.Provider value={{ 
            settings: effectiveSettings, 
            updateSettings, 
            planTier, 
            planLabel, 
            featureEntitlements, 
            isFeatureAllowed: loginState === 'teacher' ? isTeacherAllowed : isAllowed, 
            isLoaded 
        }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const ctx = useContext(SettingsContext);
    if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
    return ctx;
}
