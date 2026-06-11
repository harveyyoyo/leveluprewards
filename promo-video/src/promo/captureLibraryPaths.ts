/** Shared capture-library paths. Fallbacks used when canonical clips are missing locally. */

const clip = (path: string) => `capture-library/${path}`;
const screenshot = (path: string) => `marketing/screenshots/${path}`;

export const CAPTURE_PATHS = {
  adminBrandingTheme: clip("features/admin-branding-theme.mp4"),
  /** Canonical: features/admin-houses.mp4 */
  adminHouses: clip("features/admin-stats.mp4"),
  adminLibrary: clip("features/admin-library.mp4"),
  adminIdCard: clip("admin/admin-id-card-preview.mp4"),
  /** Canonical: teacher/teacher-tabs-cycle.mp4 */
  teacherPortal: clip("portal/portal-hub-overview.mp4"),
  /** Canonical: teacher/teacher-classes-tab.mp4 */
  teacherClassroom: clip("portal/portal-hub-overview.mp4"),
  adminAttendance: clip("features/admin-attendance.mp4"),
  adminBadges: clip("features/admin-badges.mp4"),
  /** Canonical: features/bulletin-board.mp4 */
  bulletinBoard: clip("features/admin-notifications.mp4"),
  hallOfFame: clip("features/hall-of-fame.mp4"),
  teacherRaffle: clip("features/teacher-raffle.mp4"),
  adminNotifications: clip("features/admin-notifications.mp4"),
  kioskSigninRewards: clip("student-kiosk/kiosk-signin-rewards.mp4"),
  /** Canonical: action/action-print-coupons.mp4 */
  printCoupons: clip("action/coupons.mp4"),
  adminStats: clip("features/admin-stats.mp4"),
  kioskPrizesHover: clip("student-kiosk/kiosk-prizes-hover.mp4"),
  /** Canonical: student-kiosk/kiosk-type-entry.mp4 */
  kioskScanEntry: clip("student-kiosk/kiosk-new-points-on-entry.mp4"),
  kioskNewPoints: clip("student-kiosk/kiosk-new-points-on-entry.mp4"),
  /** Canonical: student-kiosk/kiosk-signin-welcome-points.mp4 */
  kioskSignInPoints: clip("student-kiosk/kiosk-signin-rewards.mp4"),
  studentKiosk: clip("student-kiosk/kiosk-prizes-hover.mp4"),
  portalHub: clip("portal/portal-hub-overview.mp4"),
  marketingKioskReady: screenshot("kiosk-system-ready.png"),
  marketingKioskWelcome: screenshot("kiosk-welcome.png"),
  marketingKioskRewardsShop: screenshot("kiosk-rewards-shop.png"),
  marketingStudentHomePortal: screenshot("student-home-portal.png"),
  marketingAdminIdCard: screenshot("admin-id-card.png"),
  marketingPortalHub: screenshot("portal-hub.png"),
} as const;
