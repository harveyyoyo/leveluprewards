
'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth, type LoginState } from './AuthProvider';
import { useIsMobile, useIsTabletOrMobile } from '@/hooks/use-mobile';
import { useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import { doc, setDoc, type DocumentData } from 'firebase/firestore';
import { removeUndefinedDeep } from '@/lib/db/helpers';
import { schoolPublicDocRef } from '@/lib/schoolPublic';
import { DEFAULT_PLAN, normalizePlan, PLANS, type PlanTier, type SchoolPlanConfig } from '@/lib/plans';
import {
    applyPillarAccessToSettings,
    hasPillarAccess,
    isProductPillarKey,
    isSettingsKeyAllowed,
    type ProductPillarAccess,
    type ProductPillarKey,
} from '@/lib/productPillars';
import type { StudentTheme } from '@/lib/types';
import type { IdCardPrinterFamilyId, IdCardPrintProfile } from '@/lib/idCardPrintCatalog';
import { defaultPaperForFamily } from '@/lib/idCardPrintCatalog';
import type { PrizeVoucherPaperFormat } from '@/lib/prizes/prizeVoucherPrint';
import { STUDENT_WELCOME_STYLES_LIVE } from '@/lib/students/studentWelcome';
import { LEVELUP_BRAND_PRIMARY_HEX } from '@/lib/appBranding';
import {
    normalizeDisplayModePreference,
    resolveDisplayMode,
    type DisplayModePreference,
    type ResolvedDisplayMode,
} from '@/lib/displayMode';
import {
    getBrowserLegacyModeSignals,
    resolveLegacyModePreference,
    type LegacyModeSignals,
} from '@/lib/legacyMode';
import { isStudentKioskUiContext } from '@/lib/students/studentKioskRoute';
import { isPublicSampleSchoolId } from '@/lib/sampleSchools';

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
    displayMode: DisplayModePreference;
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
    /** School house system: rosters, house totals, sorting ceremony, Hall of Fame. */
    enableHouses: boolean;
    /** When on, teacher point awards also update each house's cached totals. */
    housesRollupPoints: boolean;
    /** House standings: roll up from student rewards (default on), or house points edited manually on Houses tab. */
    housePointsSource?: 'studentRollup' | 'manual';
    /** Show house name/color on the student kiosk header. */
    showHouseOnStudentKiosk: boolean;
    enableChallenges: boolean;
    // Analytics
    enableTeacherCharts: boolean;
    enableAdminAnalytics: boolean;
    /**
     * School raffle on the student kiosk. Teachers turn this on by pinning Raffle in their Add more.
     */
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
     * When on, parents who opted in on each student record can receive a weekly summary
     * (points activity and redemptions), subject to global notification toggles.
     */
    notificationParentWeeklyDigestEnabled: boolean;
    /**
     * Student names on shared displays (e.g. Hall of Fame): `full` shows preferred + surname;
     * `preferred_only` shows nickname or first name only.
     */
    privacyStudentNameDisplayMode: 'full' | 'preferred_only';
    /** Queue teacher bulk point awards locally when the device is offline; sync when back online. */
    enableTeacherOfflineAwardQueue: boolean;
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
    /** When on, the student kiosk adds an AI compliment (by coupon category) when a coupon is redeemed. */
    enableCouponRedeemCompliments?: boolean;
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
    /** Saved ID card print setups (printer family + paper) for Admin → Students. */
    idCardPrintProfiles?: IdCardPrintProfile[];
    /** Last selected saved profile id for ID card printing (optional). */
    lastIdCardPrintProfileId?: string;
    /** Active ID card printer/output when not using a named saved profile only. */
    idCardPrinterFamily?: IdCardPrinterFamilyId;
    /** Paper/stock id paired with `idCardPrinterFamily`. */
    idCardPaperId?: string;
    /** Student ID card corners: rounded (ID-1 look) or rectangular (easier to cut on plain paper). */
    idCardCornerStyle?: 'rounded' | 'rectangular';
    /** Optional staff reminder for prize redeem slips and printed coupon sheets. */
    printerReminderPrizeVouchers?: string;
    /** Browser print page size for prize redeem vouchers (thermal receipt vs small label). */
    prizeVoucherPaperFormat?: PrizeVoucherPaperFormat;
    // Admin Tools
    enableBulkPoints: boolean;
    enablePointApproval: boolean;
    enableAuditLog: boolean;
    enablePdfExport: boolean;
    /** Raffle: points per ticket (e.g. 25). Use 0 for a general raffle (one pool entry per student in scope; no point threshold). */
    rafflePointsPerTicket: number;
    /** Raffle: when on, pulling deducts ticket points from all eligible students after the draw. */
    raffleDeductPoints: boolean;
    /** When on, each qualifying student has exactly one entry in the pool; when off, entries scale with points (floor). */
    raffleOneEntryPerStudent: boolean;
    /** Raffle UI: jackpot reels or weighted wheel. */
    raffleDisplayMode: 'jackpot' | 'wheel';
    // Student & Access
    enableStudentProfiles: boolean;
    enableQrLogin: boolean;
    enableParentView: boolean;
    /** When on, admins see the school-wide behavior timeline under Classroom Management. */
    enablePrincipalBehaviorTimeline?: boolean;
    /** Shared quick-award buttons and quick-tap label for the classroom seating chart. */
    classroomQuickAwards?: Array<{ id: string; label: string; points: number; description: string }>;
    classroomQuickTapDescription?: string;
    /** Custom one-tap phrases per behavior note type (positive, comment, etc.). */
    classroomBehaviorQuickOptions?: Partial<Record<'p' | 'c' | 'i' | 'w' | 'h', string[]>>;
    /** Monitor: Ctrl+click desk deduct (legacy; use note deduct settings). */
    classroomDeductEnabled?: boolean;
    classroomDeductPoints?: number;
    classroomDeductLabel?: string;
    classroomDeductDescription?: string;
    /** Deduct points when saving selected behavior-note types. */
    classroomNoteDeductEnabled?: boolean;
    classroomNoteDeductPoints?: number;
    classroomNoteDeductTypes?: string[];
    /** If/then classroom alert rules (threshold in time window → auto behavior note). */
    classroomAlertRules?: Array<{
        id: string;
        name: string;
        enabled: boolean;
        windowHours: number;
        trigger: {
            type: 'classroom_points_total' | 'classroom_award_count' | 'behavior_note_count';
            minPoints?: number;
            minCount?: number;
            noteKind?: 'positive' | 'concern' | 'incident' | 'any';
        };
        action: {
            type: 'create_behavior_note';
            noteKind: 'positive' | 'concern' | 'incident';
            noteTemplate: string;
            visibleToParent: boolean;
        };
    }>;
    /** When on, staff get a Room display section tab (in-room projector/monitor view). */
    enableClassroomRoomDisplay?: boolean;
    enableMultiAdmin: boolean;
    enableStudentPortal: boolean;
    /** When true, every student must have a portal passcode set before they can sign in at home. */
    studentPortalRequirePasscode?: boolean;
    /** Failed passcode attempts before portal lockout (admin unlock required). */
    studentPortalMaxFailedAttempts?: number;
    /**
     * When true, the first student to sign in on a browser owns that browser until an admin resets it
     * (sign out does not free the browser). When false (default), sign out lets a sibling sign in on the same device.
     */
    studentPortalLockBrowserToStudent?: boolean;
    /** @deprecated No longer used — student home never shows the global site header. */
    studentPortalShowHeader?: boolean;
    /** When true, tuck the school header off-screen on portal pages (reveals at scroll top or top-edge hover on kiosks). */
    hideSiteHeaderOutsidePortal?: boolean;
    /**
     * When true, student kiosk screens (portal hub, sign-in, rewards shop) use a tall narrow
     * layout for portrait-mounted displays (e.g. a floor stand with a rotated monitor).
     */
    kioskPortraitDisplay?: boolean;
    /** @deprecated Use kioskPortraitDisplay */
    studentPortalPortraitDisplay?: boolean;
    enableClassSignIn: boolean;
    enableFaceLogin: boolean;
    /** Welcome styles picker on the kiosk (`/student/welcome`). Gated by `STUDENT_WELCOME_STYLES_LIVE` until shipped. */
    enableStudentWelcome: boolean;
    /** Short "welcome back" splash when a student lands on the kiosk dashboard. Can be turned off per student. */
    enableStudentWelcomeBackScreen: boolean;
    /** Auto-dismiss duration for the welcome back splash (seconds). */
    studentWelcomeBackDurationSec: number;
    /** School-wide default welcome style (used when student has no override). Empty = confetti. */
    defaultWelcomeGreetingStyleId?: string;
    /** Back-compat alias used by some pages/components. */
    enableAttendance: boolean;
    /** Classroom bathroom pass timer (requires attendance pillar + class sign-in). */
    enableBathroomTimer?: boolean;
    /** Max minutes before a bathroom pass is flagged as over limit. */
    bathroomMaxMinutes?: number;
    /** When true, only students who signed in today can start a bathroom pass. */
    bathroomRequirePresent?: boolean;
    // Guidance
    enableHelperMode: boolean;
    showIntroWizard?: boolean;
    // Workflow
    enableTeacherBudgets: boolean;
    /** Teacher portal: show a "Coupons" feature tab listing coupons created by the teacher. */
    enableTeacherGeneratedCouponsTab?: boolean;
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
    /** When false, staff sessions do not auto-log out on idle. Default on when unset. */
    adminAutoLogoutEnabled?: boolean;
    adminSessionTimeoutMs?: number;
    /** When false, kiosk / rewards shop sessions stay signed in until manual logout or kiosk lock. Default on when unset. */
    kioskAutoLogoutEnabled?: boolean;
    kioskSessionTimeoutSec?: number;
    /** When false, full-screen classroom view stays open until the teacher closes it. Default on when unset. */
    classroomAutoLogoutEnabled?: boolean;
    /** Idle time before leaving full-screen classroom (returns to portal). */
    classroomSessionTimeoutMs?: number;
    /** When false, hide the read-only class screen launch in Class Awards Live. Default on when unset. */
    classroomStudentDisplayEnabled?: boolean;
    /** Live monitor / class screen: how desk point totals are shown. */
    classroomMonitorPointsDisplay?: 'off' | 'balance' | 'session' | 'both';
    /** Include the latest award label on session badges. Default on when unset. */
    classroomMonitorIncludeSessionLastAward?: boolean;
    /** Append student last names on seating chart desks. */
    classroomMonitorIncludeLastName?: boolean;
    /** Show student sticker / theme emoji on desk avatars. */
    classroomMonitorIncludeStudentEmoji?: boolean;
    /** Seconds of kiosk inactivity before AI Fun is hidden until the next interaction. */
    kioskAiFunIdleOffSec?: number;
    /** @deprecated Voucher idle timeout removed; print-voucher prompts are always available. */
    kioskVoucherIdleOffSec?: number;
    /** @deprecated Use kioskAiFunIdleOffSec and kioskVoucherIdleOffSec. */
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
     * off = hide coupon redemption; manual = USB scanner (default); camera = webcam scan.
     */
    kioskCouponRedemptionInput?: 'off' | 'manual' | 'camera' | 'both';
    /**
     * When true, wedge-mode kiosk screens can scan via the front camera (for demos without a USB scanner).
     * Independent of the "Camera coupon scan" setting. Default off.
     */
    kioskWedgeDemoCameraEnabled?: boolean;
    /** Faint prize previews that pop in/out around the student kiosk sign-in scan screen. */
    enableKioskLoginPrizeTeasers?: boolean;
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
    /** When false, hides the small "Wowed Design" pill on the student kiosk card. */
    bulletinShowWowBadge?: boolean;
    /** '1' = single column; '2' = responsive two-column grid on wide screens. */
    bulletinColumns?: '1' | '2';
    /** Jewish Orthodox schools only: show today's Hebrew date on the bulletin display. */
    bulletinShowHebrewDate?: boolean;
    /** Jewish Orthodox schools only: show upcoming Jewish holidays on the bulletin display. */
    bulletinShowJewishHolidays?: boolean;

    // Smart Screen (admin-managed shared display)
    smartScreenEnabled?: boolean;
    smartScreenTitle?: string;
    smartScreenMessage?: string;
    smartScreenTheme?: 'midnight' | 'daylight' | 'studio';
    smartScreenLayout?: 'mirror' | 'dashboard' | 'portrait';
    /** Optional US ZIP code. When set, Smart Screen uses it for both weather and timezone. */
    smartScreenLocationZip?: string;
    smartScreenWeatherLabel?: string;
    smartScreenWeatherTemp?: string;
    smartScreenShowWeather?: boolean;
    smartScreenShowStats?: boolean;
    smartScreenShowCompliments?: boolean;
    smartScreenShowFocus?: boolean;
    smartScreenShowQuote?: boolean;
    smartScreenShowLeaderboard?: boolean;
    smartScreenShowHouses?: boolean;
    smartScreenShowClasses?: boolean;
    smartScreenShowBirthdays?: boolean;
    smartScreenShowBulletin?: boolean;
    smartScreenShowRewards?: boolean;
    smartScreenShowSchedule?: boolean;
    /** Multiple named Smart Screen versions; open with `?screenProfileId=<id>`. */
    smartScreenProfiles?: Record<string, SmartScreenProfile>;
    // Special Occasions
    enableBirthdayPoints: boolean;
    birthdayPointsAmount: number;
    // Product pillars
    payRewards?: boolean;
    payClassroom?: boolean;
    payAttendance?: boolean;
    payHomework?: boolean;
    payLibrary?: boolean;
    payOffice?: boolean;
    /** Default checkout loan length before a book is overdue. */
    libraryLoanPeriodDays?: number;
    /**
     * How returns affect balances: none | fines | app_points | isolated_points.
     * Legacy schools without this field infer from category + late/bonus settings.
     */
    libraryRewardMode?: 'none' | 'fines' | 'app_points' | 'isolated_points';
    /**
     * When true, signed-in students can check out/return books by scanning LIB barcodes on the
     * student kiosk coupon card (same scanner as coupons). Default on when unset.
     */
    libraryStudentKioskCheckoutEnabled?: boolean;
    /** When true, enable the shared library station at /library/self-checkout (scan ID, then books). */
    libraryAutoStudentPortalEnabled?: boolean;
    /** When true, overdue returns deduct points via the library category. */
    libraryLateFeesEnabled?: boolean;
    /** Points removed per calendar day late (applied on return). */
    libraryLatePointsPerDay?: number;
    /** Optional points added when returned on or before due date. */
    libraryOnTimeReturnPoints?: number;
    /** Category used for library late fees and on-time bonuses (app_points mode). */
    libraryPointsCategoryId?: string;

    // Student Portal Interface overrides (set by admin)
    studentDisplayMode?: DisplayModePreference;
    studentColorScheme?: ColorScheme;
    studentDarkMode?: boolean;
    studentDarkModeColorized?: boolean;
    studentEnableAnimatedBackground?: boolean;
    studentAnimatedBackgroundStyle?: string;
    studentAudioTheme?: 'retro_arcade' | 'modern_chime' | 'sci_fi_synth';

    // Teacher Portal Interface overrides (set by admin)
    teacherDisplayMode?: DisplayModePreference;
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
    /** Admin-only UI preference: main section tabs across the top or down the left sidebar. */
    adminNavLayout?: 'top' | 'sidebar';
    /** Teacher portal tab layout (defaults to side tabs). */
    teacherNavLayout?: 'top' | 'sidebar';
    /** When on, pinned extra-feature tabs use subtle per-tab accent colors. */
    adminPerTabColorScheme?: boolean;
    /** Admin-only UI preference: persists the main Admin tab order (including pinned add-ons). */
    adminMainTabOrder?: string[];
    /** Admin-only UI preference: persists the Extra features row order (unpinned add-ons). */
    adminExtraTabOrder?: string[];
    /** Teacher portal: hides specific add-on tabs without turning off features (optional soft-hide). */
    teacherHiddenAddOnTabs?: string[];
    /** Teacher portal: optional add-on tabs pinned into the main tab row (per teacher device / school settings). */
    teacherPinnedAddOnTabs?: string[];
    /** Teacher portal: persisted main tab order (core + pinned add-ons). */
    teacherMainTabOrder?: string[];

    // Hall of Fame (big screen defaults)
    hallOfFameRankType?: 'students' | 'classes' | 'houses' | 'goals';
    hallOfFameSortBy?: string;
    hallOfFameScope?: 'all' | string;
    hallOfFameLimit?: number;
    hallOfFamePodiumSize?: number;
    hallOfFameAutoScroll?: boolean;
    hallOfFameGridLayout?: boolean;
    hallOfFameGridColumns?: number;
    hallOfFameLayout?: 'landscape' | 'portrait';

    // House Hall of Fame (big screen — houses only)
    houseHallOfFameSortBy?: string;
    houseHallOfFameLimit?: number;
    houseHallOfFamePodiumSize?: number;
    houseHallOfFameAutoScroll?: boolean;
    houseHallOfFameGridLayout?: boolean;
    houseHallOfFameGridColumns?: number;
    houseHallOfFameLayout?: 'landscape' | 'portrait';
    /** Admin Houses tab: standings preview chart style. */
    houseStandingsChartFormat?:
      | 'bars'
      | 'columns'
      | 'horizontal'
      | 'line'
      | 'area'
      | 'pie'
      | 'donut'
      | 'radar'
      | 'radial'
      | 'thermometer';
    /** Admin Houses tab: whether the standings preview panel is expanded. */
    houseStandingsPreviewOpen?: boolean;

    // Kiosk Multiple Profiles
    kioskProfileId?: string;
    kioskProfiles?: Record<string, KioskProfile>;
}

export interface KioskProfile {
    id: string;
    name: string;
    createdAt: number;
    updatedAt: number;
    settings: Partial<Settings>;
}

export interface SmartScreenProfile {
    id: string;
    name: string;
    createdAt: number;
    updatedAt: number;
    /** Smart-screen-specific overrides for this profile. */
    settings: Partial<Settings>;
}

/** Settings with display mode resolved for rendering (`web` | `app` | `mobile`). */
type ResolvedSettings = Omit<Settings, 'displayMode'> & { displayMode: ResolvedDisplayMode };

interface SettingsContextType {
    settings: ResolvedSettings;
    /** Stored preferences (includes `displayMode: auto | web | app | mobile`). */
    settingsPreferences: Settings;
    updateSettings: (updates: Partial<Settings>) => void;
    planTier: PlanTier;
    planLabel: string;
    /** @deprecated Use pillar flags (`payAttendance`, `payLibrary`, `payHomework`) instead. Always true for non-pillar keys. */
    isFeatureAllowed: (key: string) => boolean;
    pillarAccess: ProductPillarAccess | null;
    isPillarAvailable: (pillar: ProductPillarKey) => boolean;
    /** True once settings have been loaded from storage. */
    isLoaded: boolean;
}

const colorSchemes: Record<ColorScheme, { bg: string; card: string; accent: string; border: string; label: string; swatch: string; swatchColors: readonly [string, string] }> = {
    /* Swatch must stay a literal `bg-[…]` so Tailwind JIT includes it (matches LEVELUP_BRAND_PRIMARY_HEX). */
    default: { bg: 'bg-blue-50', card: 'bg-white', accent: 'text-blue-950', border: 'border-blue-200', label: 'Default', swatch: 'bg-[#102a45]', swatchColors: ['#102a45', '#2563eb'] },
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
        bg: 'bg-amber-50',
        card: 'bg-white',
        accent: 'text-blue-800',
        border: 'border-amber-300/70',
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
    displayMode: 'auto',
    colorScheme: 'sapphire',
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
    enableHouses: false,
    housesRollupPoints: true,
    showHouseOnStudentKiosk: true,
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
    notificationParentWeeklyDigestEnabled: false,
    privacyStudentNameDisplayMode: 'full',
    enableTeacherOfflineAwardQueue: true,
    enableClassLeaderboard: false,
    enableClassAccumulations: false,
    enableShoutouts: false,
    enablePrizeImages: false,
    enablePrizeAiSurprise: false,
    enableCouponRedeemCompliments: true,
    prizeAiSurpriseDefaultPoints: 1,
    enablePrizeCategories: false,
    enableWishlist: false,
    enableSeasonalPrizes: false,
    enableVendingMachine: false,
    enableStudentEmojiOnPrizeTickets: false,
    enableColorPrinting: true,
    printerReminderIdCards: '',
    idCardPrintProfiles: [],
    lastIdCardPrintProfileId: undefined,
    idCardPrinterFamily: 'browser_sheet',
    idCardPaperId: defaultPaperForFamily('browser_sheet'),
    idCardCornerStyle: 'rounded',
    printerReminderPrizeVouchers: '',
    prizeVoucherPaperFormat: 'label_50x70',
    enableBulkPoints: false,
    enablePointApproval: false,
    enableAuditLog: false,
    enablePdfExport: false,
    rafflePointsPerTicket: 25,
    raffleDeductPoints: false,
    raffleOneEntryPerStudent: false,
    raffleDisplayMode: 'jackpot',
    enableStudentProfiles: false,
    enableQrLogin: true,
    enableParentView: false,
    enablePrincipalBehaviorTimeline: false,
    classroomDeductEnabled: false,
    classroomDeductPoints: 5,
    classroomDeductLabel: 'Deduct',
    classroomDeductDescription: 'Point deduction',
    classroomNoteDeductEnabled: false,
    classroomNoteDeductPoints: 5,
    classroomNoteDeductTypes: ['c', 'i', 'w'],
    enableClassroomRoomDisplay: false,
    enableMultiAdmin: false,
    enableStudentPortal: false,
    studentPortalRequirePasscode: true,
    studentPortalMaxFailedAttempts: 5,
    studentPortalLockBrowserToStudent: false,
    studentPortalShowHeader: false,
    hideSiteHeaderOutsidePortal: false,
    kioskPortraitDisplay: false,
    enableClassSignIn: false,
    enableFaceLogin: false,
    enableStudentWelcome: false,
    enableStudentWelcomeBackScreen: false,
    studentWelcomeBackDurationSec: 2,
    defaultWelcomeGreetingStyleId: '',
    enableAttendance: false,
    enableBathroomTimer: true,
    bathroomMaxMinutes: 5,
    bathroomRequirePresent: true,
    enableHelperMode: true,
    showIntroWizard: false,
    enableTeacherBudgets: false,
    enableTeacherGeneratedCouponsTab: false,
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
        fontScale: 1.1,
        fontTracking: 0.02,
        background: '#f3ece0',
        text: '#020617',
        primary: '#2557a7',
        cardBackground: '#ffffff',
        accent: '#cf9b32',
    },
    adminAutoLogoutEnabled: true,
    adminSessionTimeoutMs: 5 * 60 * 1000,
    kioskAutoLogoutEnabled: true,
    kioskSessionTimeoutSec: 10,
    classroomAutoLogoutEnabled: true,
    classroomSessionTimeoutMs: 15 * 60 * 1000,
    classroomStudentDisplayEnabled: true,
    classroomMonitorPointsDisplay: 'both',
    classroomMonitorIncludeSessionLastAward: true,
    classroomMonitorIncludeLastName: false,
    classroomMonitorIncludeStudentEmoji: false,
    kioskAiFunIdleOffSec: 360,
    studentSignInThrottleEnabled: false,
    studentSignInThrottleMaxAttempts: 10,
    studentSignInThrottleWindowMin: 2,
    studentSignInFreezeSec: 0,
    kioskLoginTabCardEnabled: true,
    kioskLoginTabTypeEnabled: true,
    kioskLoginTabScanEnabled: true,
    kioskLoginTabFaceEnabled: false,
    kioskCouponRedemptionManualEnabled: true,
    kioskCouponRedemptionCameraEnabled: false,
    kioskCouponRedemptionInput: 'manual',
    kioskWedgeDemoCameraEnabled: false,
    enableKioskLoginPrizeTeasers: false,
    kioskSponsorEnabled: false,
    kioskSponsorMessage: '',
    kioskSponsorLogoUrl: '',
    kioskSponsorLink: '',
    kioskSponsorSpeed: 'normal',
    kioskSponsorPosition: 'bottom',
    kioskSponsorBannerStyle: 'primary',
    kioskSponsorIcon: 'ðŸŽ‰',
    kioskSponsorSchedules: [],

    bulletinEnabled: true,
    bulletinTitle: 'School Bulletin Board',
    bulletinTheme: 'default',
    bulletinSubtitle: '',
    bulletinLogoSize: 'md',
    bulletinShowWowBadge: true,
    bulletinColumns: '2',
    bulletinShowHebrewDate: false,
    bulletinShowJewishHolidays: false,

    smartScreenEnabled: false,
    smartScreenTitle: 'Smart Screen',
    smartScreenMessage: 'Make today count.',
    smartScreenTheme: 'midnight',
    smartScreenLayout: 'mirror',
    smartScreenLocationZip: '',
    smartScreenWeatherLabel: 'Clear focus',
    smartScreenWeatherTemp: '72',
    smartScreenShowWeather: true,
    smartScreenShowStats: true,
    smartScreenShowCompliments: true,
    smartScreenShowFocus: true,
    smartScreenShowQuote: true,
    smartScreenShowLeaderboard: true,
    smartScreenShowHouses: true,
    smartScreenShowClasses: true,
    smartScreenShowBirthdays: true,
    smartScreenShowBulletin: true,
    smartScreenShowRewards: true,
    smartScreenShowSchedule: true,
    smartScreenProfiles: {},
    enableBirthdayPoints: false,
    birthdayPointsAmount: 100,
    payRewards: true,
    payClassroom: true,
    payAttendance: true,
    payHomework: true,
    payLibrary: true,
    payOffice: false,
    libraryLoanPeriodDays: 14,
    libraryStudentKioskCheckoutEnabled: true,
    libraryAutoStudentPortalEnabled: true,
    libraryLateFeesEnabled: true,
    libraryLatePointsPerDay: 2,
    libraryOnTimeReturnPoints: 0,

    // Role-based defaults
    // Additional (admin-controlled) teacher features should start OFF by default.
    // `isTeacherAllowed` treats missing keys as `false`, so an empty map is the safest default.
    teacherFeatures: {},
    expertMode: false,
    adminHiddenAddOnTabs: [],
    adminPinnedAddOnTabs: [],
    adminNavLayout: 'sidebar',
    teacherNavLayout: 'sidebar',
    adminPerTabColorScheme: false,
    adminMainTabOrder: [],
    adminExtraTabOrder: [],
    teacherHiddenAddOnTabs: [],
    teacherPinnedAddOnTabs: [],
    teacherMainTabOrder: [],

    hallOfFameRankType: 'students',
    hallOfFameSortBy: 'lifetimePoints',
    hallOfFameScope: 'all',
    hallOfFameLimit: 50,
    hallOfFamePodiumSize: 3,
    hallOfFameAutoScroll: false,
    hallOfFameGridLayout: true,
    hallOfFameGridColumns: 3,
    hallOfFameLayout: 'landscape',
    houseHallOfFamePodiumSize: 3,
    houseHallOfFameAutoScroll: false,
    houseHallOfFameLayout: 'landscape',
    houseHallOfFameGridLayout: true,
    houseHallOfFameGridColumns: 3,
    kioskProfileId: undefined,
    kioskProfiles: {},
};

const publicLoginSettings: Partial<Settings> = {
    graphicMode: 'classic',
    displayMode: 'web',
    colorScheme: 'sapphire',
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
export type { DisplayModePreference } from '@/lib/displayMode';

const SettingsContext = createContext<SettingsContextType | null>(null);

/** Per-browser settings: kiosk, teacher, and staff keep separate theme and UI prefs on shared devices. */
function getLocalArcadeSettingsKey(
    schoolId: string | null,
    loginState: LoginState,
    pathname: string | null,
): string {
    if (!schoolId) return 'arcade_settings_global';
    if (isStudentKioskUiContext(loginState, pathname, schoolId)) {
        return `arcade_settings_${schoolId}_student`;
    }
    if (loginState === 'teacher') return `arcade_settings_${schoolId}_teacher`;
    return `arcade_settings_${schoolId}_staff`;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const { schoolId, isInitialized, loginState } = useAuth();
    const { firestore } = useFirebase();
    const [settings, setSettings] = useState<Settings>(defaultSettings);
    const [isLoaded, setIsLoaded] = useState(false);
    const [automaticLegacySignals, setAutomaticLegacySignals] = useState<LegacyModeSignals>({});
    const pathname = usePathname();
    const studentKioskUi = useMemo(
        () => isStudentKioskUiContext(loginState, pathname, schoolId),
        [loginState, pathname, schoolId],
    );
    const isStaff =
        loginState === 'admin' ||
        loginState === 'developer' ||
        loginState === 'teacher' ||
        loginState === 'secretary' ||
        loginState === 'prizeClerk' ||
        loginState === 'reports' ||
        loginState === 'librarian' ||
        loginState === 'office' ||
        loginState === 'houseCoordinator';
    const schoolDocRef = useMemoFirebase(() => {
        if (!firestore || !schoolId) return null;
        const sid = schoolId.trim().toLowerCase();
        if (isStaff) return doc(firestore, 'schools', sid);
        return schoolPublicDocRef(firestore, sid);
    }, [firestore, schoolId, isStaff]);
    const { data: schoolData } = useDoc<
        SchoolPlanConfig & {
            appSettings?: Partial<Settings>;
            pillarAccess?: ProductPillarAccess;
        }
    >(schoolDocRef);

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

    const stablePillarAccessJson = useMemo(() => {
        const access = schoolData?.pillarAccess;
        if (!access || typeof access !== 'object') return null;
        try {
            return JSON.stringify(access);
        } catch {
            return null;
        }
    }, [schoolData?.pillarAccess]);

    const pillarAccess = useMemo<ProductPillarAccess | null>(() => {
        if (!stablePillarAccessJson) return null;
        try {
            return JSON.parse(stablePillarAccessJson) as ProductPillarAccess;
        } catch {
            return null;
        }
    }, [stablePillarAccessJson]);

    const isPillarAvailable = useCallback(
        (pillar: ProductPillarKey) => hasPillarAccess(pillarAccess, pillar),
        [pillarAccess],
    );

    const planTier = useMemo(
        () => (schoolId ? normalizePlan(schoolData?.plan) : 'enterprise'),
        [schoolId, schoolData],
    );
    const planLabel = PLANS[planTier]?.label ?? PLANS[DEFAULT_PLAN].label;
    const isPublicLoginRoute =
        pathname === '/' ||
        pathname === '/portal' ||
        pathname === '/office-bootstrap' ||
        pathname === '/login' ||
        (typeof pathname === 'string' && pathname.startsWith('/s/'));

    const isAllowed = useCallback(
        (key: string) =>
            isSettingsKeyAllowed(settings, key, {
                expertMode: settings.expertMode,
                pillarAccess,
            }),
        [settings, pillarAccess],
    );

    const applyEntitlements = useCallback((input: Settings, access: ProductPillarAccess | null = pillarAccess): Settings => {
        const next = applyPillarAccessToSettings({ ...input }, access);
        if (!(next.payClassroom ?? true)) {
            next.enableParentView = false;
            next.enablePrincipalBehaviorTimeline = false;
            next.enableClassroomRoomDisplay = false;
        }
        if (!(next.payAttendance ?? true)) {
            next.enableClassSignIn = false;
            next.enableAttendance = false;
            next.enableBathroomTimer = false;
        }
        if (!(next.payHomework ?? true)) {
            next.enableHomework = false;
        }
        return next;
    }, [pillarAccess]);

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

        const settingsKey = getLocalArcadeSettingsKey(schoolId, loginState, pathname);
        const legacySchoolKey = schoolId ? `arcade_settings_${schoolId}` : null;
        let saved = localStorage.getItem(settingsKey);
        if (!saved && legacySchoolKey && !isStudentKioskUiContext(loginState, pathname, schoolId)) {
            const legacy = localStorage.getItem(legacySchoolKey);
            if (legacy) {
                saved = legacy;
                localStorage.setItem(settingsKey, legacy);
                localStorage.removeItem(legacySchoolKey);
            }
        }

        let activeProfileId: string | null = null;
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const queryProfileId = params.get('kioskProfileId');
            if (queryProfileId) {
                activeProfileId = queryProfileId;
                localStorage.setItem('current_kiosk_profile_id', queryProfileId);
                try {
                    const url = new URL(window.location.href);
                    url.searchParams.delete('kioskProfileId');
                    window.history.replaceState({}, '', url.pathname + url.search);
                } catch (e) {
                    console.error('Failed to clean kioskProfileId from URL', e);
                }
            } else {
                activeProfileId = localStorage.getItem('current_kiosk_profile_id');
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
                let parsed = remoteSettings ? { ...remoteSettings } : JSON.parse(saved || '{}');

                if (isStudentKioskUiContext(loginState, pathname, schoolId)) {
                    if (activeProfileId) {
                        parsed.kioskProfileId = activeProfileId;
                        const profile = parsed.kioskProfiles?.[activeProfileId];
                        if (profile && profile.settings) {
                            parsed = {
                                ...parsed,
                                ...profile.settings,
                                kioskProfileId: activeProfileId,
                                kioskProfiles: parsed.kioskProfiles,
                            };
                        }
                    } else {
                        parsed.kioskProfileId = undefined;
                    }
                }

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
                if (typeof parsed.enableParentView !== 'boolean') {
                    parsed.enableParentView = false;
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
                if (typeof parsed.kioskCouponRedemptionCameraEnabled !== 'boolean') parsed.kioskCouponRedemptionCameraEnabled = false;
                if (typeof parsed.enableCouponRedeemCompliments !== 'boolean') {
                    parsed.enableCouponRedeemCompliments = true;
                }
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
                if (parsed.raffleDisplayMode === 'loto') {
                    parsed.raffleDisplayMode = 'jackpot';
                } else if (parsed.raffleDisplayMode !== 'jackpot' && parsed.raffleDisplayMode !== 'wheel') {
                    delete (parsed as Partial<Settings>).raffleDisplayMode;
                }
                if (parsed.privacyStudentNameDisplayMode !== 'full' && parsed.privacyStudentNameDisplayMode !== 'preferred_only') {
                    delete (parsed as Partial<Settings>).privacyStudentNameDisplayMode;
                }
                parsed.displayMode = normalizeDisplayModePreference(parsed.displayMode);
                if (parsed.studentDisplayMode !== undefined) {
                    parsed.studentDisplayMode = normalizeDisplayModePreference(parsed.studentDisplayMode);
                }
                if (parsed.teacherDisplayMode !== undefined) {
                    parsed.teacherDisplayMode = normalizeDisplayModePreference(parsed.teacherDisplayMode);
                }
                const psp = parsed.prizeAiSurpriseDefaultPoints;
                if (typeof psp !== 'number' || !Number.isFinite(psp) || psp < 0) {
                    delete (parsed as Partial<Settings>).prizeAiSurpriseDefaultPoints;
                }
                const normalizeIdleSeconds = (value: unknown, fallback: number): number | undefined => {
                    if (typeof value !== 'number' || !Number.isFinite(value) || value < 1 || value > 14400) {
                        return fallback;
                    }
                    return Math.round(value);
                };
                const legacyKioskIdleMin = parsed.kioskAiFunAndVoucherIdleOffMin;
                const legacyKioskIdleSec =
                    typeof legacyKioskIdleMin === 'number' &&
                    Number.isFinite(legacyKioskIdleMin) &&
                    legacyKioskIdleMin >= 1 &&
                    legacyKioskIdleMin <= 240
                        ? Math.round(legacyKioskIdleMin * 60)
                        : undefined;
                parsed.kioskAiFunIdleOffSec = normalizeIdleSeconds(
                    parsed.kioskAiFunIdleOffSec,
                    legacyKioskIdleSec ?? defaultSettings.kioskAiFunIdleOffSec ?? 360,
                );
                parsed.kioskVoucherIdleOffSec = normalizeIdleSeconds(
                    parsed.kioskVoucherIdleOffSec,
                    legacyKioskIdleSec ?? defaultSettings.kioskVoucherIdleOffSec ?? 360,
                );
                delete (parsed as Partial<Settings>).kioskAiFunAndVoucherIdleOffMin;
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
                if (parsed.adminNavLayout !== 'top' && parsed.adminNavLayout !== 'sidebar') {
                    delete (parsed as Partial<Settings>).adminNavLayout;
                }
                if (parsed.teacherNavLayout !== 'top' && parsed.teacherNavLayout !== 'sidebar') {
                    delete (parsed as Partial<Settings>).teacherNavLayout;
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
                ...(isPublicSampleSchoolId(schoolId) ? { payOffice: true } : {}),
            };
            setSettings(applyEntitlements(initialSettings));
        }
        setIsLoaded(true);
    }, [schoolId, isInitialized, applyEntitlements, stableRemoteAppSettingsJson, stableFeatureDefaultsJson, loginState, pathname]);

    useEffect(() => {
        if (!isLoaded) return;

        const updateAutomaticLegacySignals = () => {
            setAutomaticLegacySignals(getBrowserLegacyModeSignals());
        };

        updateAutomaticLegacySignals();
        const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
        reducedMotion?.addEventListener?.('change', updateAutomaticLegacySignals);
        window.addEventListener('online', updateAutomaticLegacySignals);
        window.addEventListener('offline', updateAutomaticLegacySignals);

        return () => {
            reducedMotion?.removeEventListener?.('change', updateAutomaticLegacySignals);
            window.removeEventListener('online', updateAutomaticLegacySignals);
            window.removeEventListener('offline', updateAutomaticLegacySignals);
        };
    }, [isLoaded]);

    const effectiveLegacyMode = useMemo(
        () => resolveLegacyModePreference(settings.legacyMode, automaticLegacySignals),
        [settings.legacyMode, automaticLegacySignals],
    );

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
        const settingsKey = getLocalArcadeSettingsKey(schoolId, loginState, pathname);
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
                    if (isProductPillarKey(key) && allowedUpdates[key] === false) continue;
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
        if (studentKioskUi && typeof settings.studentDarkMode === 'boolean') {
            return settings.studentDarkMode;
        }
        if (loginState === 'teacher' && typeof settings.teacherDarkMode === 'boolean') {
            return settings.teacherDarkMode;
        }
        return settings.darkMode;
    }, [studentKioskUi, loginState, settings.darkMode, settings.studentDarkMode, settings.teacherDarkMode]);

    const effectiveDomDarkColorized = useMemo(() => {
        let c = settings.darkModeColorized ?? false;
        if (studentKioskUi && typeof settings.studentDarkModeColorized === 'boolean') {
            c = settings.studentDarkModeColorized;
        } else if (loginState === 'teacher' && typeof settings.teacherDarkModeColorized === 'boolean') {
            c = settings.teacherDarkModeColorized;
        }
        return c;
    }, [
        studentKioskUi,
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
        let scheme = settings.colorScheme ?? 'sapphire';
        if (studentKioskUi && settings.studentColorScheme) {
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
        studentKioskUi,
        settings.colorScheme,
        settings.customAppearanceColors,
        effectiveDomDarkMode,
        settings.studentColorScheme,
        settings.teacherColorScheme,
    ]);

    // Apply saved-or-automatic legacy class to document root.
    useEffect(() => {
        if (!isLoaded) return;
        const root = document.documentElement;
        if (effectiveLegacyMode) {
            root.classList.add('legacy');
        } else {
            root.classList.remove('legacy');
        }
    }, [effectiveLegacyMode, isLoaded]);

    // Force a neutral public appearance on public/login routes regardless of saved settings.
    useEffect(() => {
        if (!isLoaded) return;
        if (!isPublicLoginRoute) return;

        const root = document.documentElement;
        const next = { ...settings, legacyMode: effectiveLegacyMode, ...publicLoginSettings };

        if (next.darkMode) root.classList.add('dark');
        else root.classList.remove('dark');

        root.classList.toggle('legacy', !!next.legacyMode);
        root.setAttribute('data-color-scheme', next.colorScheme ?? 'sapphire');
        root.removeAttribute('data-dark-colorize');
        THEMED_ROOT_PROPS.forEach((prop) => root.style.removeProperty(prop));
    }, [isLoaded, isPublicLoginRoute, settings, effectiveLegacyMode]);

    const isTabletOrMobile = useIsTabletOrMobile();
    const isPhone = useIsMobile();

    const effectiveSettings = useMemo((): ResolvedSettings => {
        const s = { ...settings, legacyMode: effectiveLegacyMode };
        let displayPreference = normalizeDisplayModePreference(s.displayMode);

        if (studentKioskUi) {
            if (s.studentDisplayMode !== undefined) {
                displayPreference = normalizeDisplayModePreference(s.studentDisplayMode);
            }
            if (s.studentColorScheme) s.colorScheme = s.studentColorScheme;
            if (typeof s.studentDarkMode === 'boolean') s.darkMode = s.studentDarkMode;
            if (typeof s.studentDarkModeColorized === 'boolean') s.darkModeColorized = s.studentDarkModeColorized;
            if (typeof s.studentEnableAnimatedBackground === 'boolean') s.enableAnimatedBackground = s.studentEnableAnimatedBackground;
            if (s.studentAnimatedBackgroundStyle) s.animatedBackgroundStyle = s.studentAnimatedBackgroundStyle;
        } else if (loginState === 'teacher') {
            if (s.teacherDisplayMode !== undefined) {
                displayPreference = normalizeDisplayModePreference(s.teacherDisplayMode);
            }
            if (s.teacherColorScheme) s.colorScheme = s.teacherColorScheme;
            if (typeof s.teacherDarkMode === 'boolean') s.darkMode = s.teacherDarkMode;
            if (typeof s.teacherDarkModeColorized === 'boolean') s.darkModeColorized = s.teacherDarkModeColorized;
            if (typeof s.teacherEnableAnimatedBackground === 'boolean') s.enableAnimatedBackground = s.teacherEnableAnimatedBackground;
            if (s.teacherAnimatedBackgroundStyle) s.animatedBackgroundStyle = s.teacherAnimatedBackgroundStyle;
        }

        return {
            ...s,
            displayMode: resolveDisplayMode(displayPreference, { isPhone, isTabletOrMobile }),
        };
    }, [settings, studentKioskUi, loginState, isPhone, isTabletOrMobile, effectiveLegacyMode]);

    const isTeacherAllowed = useCallback((key: string) => {
        if (!isAllowed(key)) return false;
        if (loginState !== 'teacher') return true;
        if (key === 'enableWeeklyRaffle') return !!settings.enableWeeklyRaffle;
        if (
            !!settings.enableWeeklyRaffle &&
            (key === 'rafflePointsPerTicket' ||
                key === 'raffleOneEntryPerStudent' ||
                key === 'raffleDeductPoints' ||
                key === 'raffleDisplayMode')
        ) {
            return true;
        }
        // Teachers only see features enabled for them by the admin
        return settings.teacherFeatures?.[key] ?? false;
    }, [isAllowed, loginState, settings.teacherFeatures, settings.enableWeeklyRaffle]);

    return (
        <SettingsContext.Provider value={{ 
            settings: effectiveSettings,
            settingsPreferences: settings,
            updateSettings, 
            planTier, 
            planLabel, 
            isFeatureAllowed: loginState === 'teacher' ? isTeacherAllowed : isAllowed,
            pillarAccess,
            isPillarAvailable,
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
