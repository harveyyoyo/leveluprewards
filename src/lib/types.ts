export interface HistoryItem {
  id?: string;
  desc: string;
  amount: number;
  date: number;
  fulfilled?: boolean;
  teacherId?: string;
}

export interface LibraryItem {
  id: string;
  name: string;
  upc: string;
  status: 'available' | 'checked_out';
  checkedOutTo?: string | null;
  checkedOutAt?: number | null;
  addedBy?: string;
  createdAt?: number;
  /** Optional catalog fields for shelving and reporting. */
  author?: string;
  isbn?: string;
  category?: string;
  shelfLocation?: string;
  copyNumber?: string;
  notes?: string;
  /** Due date for overdue tracking (optional). */
  dueAt?: number | null;
}

export type LibraryItemInput = Pick<
  LibraryItem,
  'name' | 'upc' | 'author' | 'isbn' | 'category' | 'shelfLocation' | 'copyNumber' | 'notes'
>;

export interface Class {
  id: string;
  name: string;
  /** Optional primary teacher for this class, used for per-teacher attendance. */
  primaryTeacherId?: string;
}

/** How often a teacher’s point budget resets (local date on this device). */
export type TeacherBudgetPeriod = 'day' | 'week' | 'month';

/** Desk staff logins managed in Admin (not full teachers). */
export type StaffAccountRole = 'secretary' | 'prizeClerk' | 'reports' | 'librarian';

export interface StaffAccount {
  id: string;
  /** Login id (stored lowercase). */
  username: string;
  passcode: string;
  displayName: string;
  role: StaffAccountRole;
  roles?: StaffAccountRole[];
  email?: string;
  phone?: string;
}

export interface Teacher {
  id: string;
  name: string;
  username?: string;
  passcode?: string;
  email?: string;
  phone?: string;
  /** Max points this teacher may issue per `budgetPeriod` window (still named for Firestore compatibility). */
  monthlyBudget?: number;
  /** Defaults to `month` when `monthlyBudget` is set. */
  budgetPeriod?: TeacherBudgetPeriod;
  /** Identifies the active budget window (format depends on `budgetPeriod`). */
  budgetWindowKey?: string;
  spentThisMonth?: number;
}

/** One row in an optional category rubric (teacher quick-award). */
export interface CategoryRubricLevel {
  id: string;
  label: string;
  points: number;
}

export interface Category {
  id: string;
  name: string;
  points: number;
  color?: string;
  teacherId?: string;
  /** Optional preset levels (e.g. behavior tiers); shown as quick picks in the teacher portal. */
  rubricLevels?: CategoryRubricLevel[];
}

export interface BonusSpinType {
  id: string;
  /** Display name shown in Admin UI (e.g. "Behavior Spin", "Homework Spin"). */
  name: string;
  /** Optional category this spin is intended for. When set, Admin UI will suggest it for that category. */
  categoryId?: string;
  /** Exactly what the wheel can land on. */
  segments: number[];
  /** Optional UI accent for the wheel glow / border. */
  accentColor?: string;
}

export interface AttendanceRewardRule {
  id: string;
  teacherId: string;
  classId: string;
  className?: string;
  /** Period reference from universal periods, if used. */
  periodId?: string;
  /** Inline custom period (teacher-created), if used. */
  customPeriod?: { label: string; startTime: string; endTime: string };
  pointsForSignIn: number;
  pointsForOnTime: number;
  onTimeWindowMinutes: number;
  categoryId?: string;
  enabled: boolean;
  createdAt: number;
}

export interface StudentTheme {
  background: string;
  text: string;
  primary: string;
  cardBackground: string;
  accent: string;
  emoji?: string;
  fontFamily?: string;
  /** Full CSS background value (gradient or pattern). When set, used instead of solid background. */
  backgroundStyle?: string | null;
  /** Optional global font scale (1 = default, 1.1 = slightly larger). */
  fontScale?: number;
  /** Optional letter-spacing override for printed text (stored in `em`). */
  fontTracking?: number;
  /** Optional font style override. */
  fontStyle?: 'normal' | 'italic';
  /** Optional font weight override. */
  fontWeight?: number;
}

export interface Student {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  nickname?: string;
  photoUrl?: string;
  parentEmail?: string;
  parentPhone?: string;
  /** Optional student-owned contact address for direct alerts. */
  studentEmail?: string;
  /** Optional student-owned phone number for direct alerts. */
  studentPhone?: string;
  /**
   * Per-student notification overrides (in addition to school-wide settings).
   * When omitted, defaults to enabled.
   */
  notificationPrefs?: {
    /** If false, parent/guardian notifications are skipped for this student. */
    parentEnabled?: boolean;
    /** If false, direct-to-student notifications are skipped for this student. */
    studentEnabled?: boolean;
    /**
     * When true and the school enables weekly digests, parent/guardian receives a weekly
     * summary (requires parent contact on file and school notification settings).
     */
    parentWeeklyDigest?: boolean;
  };
  /** Optional image URL for a sticker shown by the student's name (set in admin, Students). */
  customEmojiUrl?: string;
  /** When the student record was created (ms since epoch). */
  createdAt?: number;
  /** When the student record was last modified (ms since epoch). */
  updatedAt?: number;
  points: number;
  lifetimePoints?: number;
  classId?: string;
  nfcId: string;
  categoryPoints?: { [key: string]: number };
  /** Total points within time periods (e.g. "2025-03-15" for day, "2025-W12" for week). */
  pointsByPeriod?: { [periodKey: string]: number };
  /** Category points within time periods (e.g. "2025-03" for month, "2025-H1" for semester). Used for category-based badges. */
  categoryPointsByPeriod?: { [periodKey: string]: { [categoryName: string]: number } };
  earnedAchievements?: { achievementId: string; earnedAt: number; wheelSpun?: boolean; bonusPointsWon?: number }[];
  /** Badges earned for reaching category point thresholds in a time period. */
  earnedBadges?: { badgeId: string; earnedAt: number; periodKey: string }[];
  teacherIds?: string[];
  /** When false, this student cannot open the style welcome page (school must also enable it). */
  welcomePageEnabled?: boolean;
  /** When false, the kiosk “welcome back” splash does not run (school must also enable it). */
  welcomeBackScreenEnabled?: boolean;
  /** Default or admin-set welcome animation style id (`WelcomeGreeting`). */
  welcomeGreetingStyleId?: string;
  theme?: StudentTheme;
  /** ISO date string (YYYY-MM-DD) for student's birthday. */
  birthday?: string;
  /** True when a portal passcode exists in admin-only secrets (not the hash itself). */
  portalPasscodeSet?: boolean;
  /** Portal locked after too many failed passcodes; admin unlock only. */
  portalLocked?: boolean;
  portalFailedAttempts?: number;
  portalLockedAt?: number;
  /** Tracks the last date (YYYY-MM-DD) special day points were awarded to prevent duplicates. */
  lastSpecialDayAwarded?: {
    birthday?: string;
    specialDay?: string;
  };
}

/** Who may redeem the coupon at the student kiosk. Omit or `school` = any student. */
export type CouponRedemptionScope = 'school' | 'creator' | 'classes' | 'teachers';

export interface Coupon {
  id: string;
  code: string;
  value: number;
  category: string;
  teacher: string;
  used: boolean;
  createdAt: number;
  description?: string;
  usedAt?: number;
  usedBy?: string;
  color?: string;
  /** When set, the coupon cannot be redeemed before this timestamp (ms since epoch). */
  startsAt?: number;
  /** When set, the coupon cannot be redeemed after this timestamp (ms since epoch). */
  expiresAt?: number;
  /** Firestore teacher id of the teacher who printed this coupon (for ownership and “creator” scope). */
  createdByTeacherId?: string;
  /** Defaults to school-wide when omitted (legacy coupons). */
  redemptionScope?: CouponRedemptionScope;
  /** When `redemptionScope` is `classes`, student’s `classId` must be in this list. */
  allowedClassIds?: string[];
  /** When `redemptionScope` is `teachers`, student must match via `teacherIds` or class `primaryTeacherId`. */
  allowedTeacherIds?: string[];
  /** Human-readable redemption limits for printing on the coupon (set when generated). */
  redemptionPrintNote?: string;
}

/**
 * Per-prize physical vending-machine motor configuration.
 *
 * Intended to drive a RAMPS 1.4 / Arduino Mega board running Marlin-style
 * firmware over USB serial (Web Serial API). When a prize is redeemed the
 * kiosk browser sends a short G-code sequence to the currently-connected
 * board to push the item out. When the kiosk option is enabled, Marlin
 * `M84` is also sent after each move to disable steppers while idle.
 */
/** After redemption, the kiosk may show one AI-generated surprise (school-appropriate). */
/** `picker` = one shop item; student chooses joke/riddle/fortune/acrostic/random at redeem (`fortune` in data). */
export type PrizeAiFunReward = 'picker' | 'random' | 'joke' | 'riddle' | 'fortune' | 'acrostic';

export interface VendingMotorConfig {
  /** Master switch — when false, the motor is not triggered even if a port is connected. */
  enabled: boolean;
  /** Which RAMPS stepper driver to move. E = extruder (often the spiral/coil motor in DIY vending rigs). */
  axis: 'X' | 'Y' | 'Z' | 'E';
  /** Distance to move in firmware units (usually mm). One full spiral turn is typically ~360. */
  distance: number;
  /** Feed rate in mm/min (G-code F value). Defaults to 500 when unset. */
  feedRate?: number;
  /** When true, reverse the same distance after the forward move (useful for lift/drop mechanisms). */
  returnToStart?: boolean;
  /** Optional raw G-code override. If set, distance/axis are ignored and this is sent verbatim (one line per \n). */
  customGcode?: string;
}

export interface Prize {
  id: string;
  name: string;
  points: number;
  icon: string;
  /** Optional photo shown in the Prize/Rewards shop and admin list (Firebase Storage URL). */
  imageUrl?: string;
  inStock: boolean;
  /** Optional quantity on hand. Omit for unlimited. When set, listing requires count above zero; redeem decrements until empty. */
  stockCount?: number;
  /** When true, after redemption the shop offers to print a redeem voucher. Default is off when unset. */
  offerPrintTicketOnRedeem?: boolean;
  /** Optional physical vending motor trigger run on the kiosk browser after a successful redemption. */
  vendingMotor?: VendingMotorConfig;
  /**
   * When set, after a successful redemption the Prize/Rewards shop shows one AI-generated
   * clean joke, riddle (with answer), fortune-teller line, or name acrostic. `random` picks one kind per redemption.
   */
  aiFunReward?: PrizeAiFunReward;
  addedBy?: string;
  /**
   * When set, only these teachers' students see the prize (union with `teacherId` if present for legacy data).
   * Omit or empty = school-wide for teacher visibility rules.
   */
  teacherIds?: string[];
  /** @deprecated Prefer `teacherIds` (single id can be represented as a one-element array). */
  teacherId?: string;
  /** When a teacher created this prize in the teacher UI; used for delete vs "remove from me" rules. */
  createdByTeacherId?: string;
  classId?: string;
  /** Scannable shelf / ID card code (e.g. PZ4K7M2X). Unique per school when stored. */
  scanCode?: string;
  /** Optional accent for printed shelf / scan cards (hex, e.g. #3b82f6). Requires color printing in settings. */
  cardColor?: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  criteria: {
    type: 'points' | 'lifetimePoints' | 'coupons' | 'manual';
    threshold: number;
    categoryId?: string;
  };
  bonusPoints?: number;
  unlockedCount?: number;
  /** Visual tier for badge styling (bronze/silver/gold/platinum). */
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  /** Hex or CSS color for badge card border/glow. */
  accentColor?: string;
  enableWheelSpin?: boolean;
  /** Exact point values for the 6 wheel segments. If omitted, falls back to computed segments based on bonusPoints. */
  wheelSegments?: number[];
}

/** Real badge: earned for reaching a points threshold in a specific category within a time period (e.g. Good Behavior badge = 50 Good Behavior points this month). */
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** Category that counts toward this badge (e.g. Good Behavior). */
  categoryId: string;
  /** Points required in the category within the period to earn the badge. */
  pointsRequired: number;
  /** Time period over which points are counted. */
  period: 'month' | 'semester' | 'year' | 'all_time';
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  accentColor?: string;
  /** When false, this badge is not awarded (existing earners are unchanged). Default true. */
  enabled?: boolean;
}

/** Schedule slot for attendance periods (e.g. Period 1, 2). Times in "HH:mm" 24h format. */
export interface AttendanceScheduleSlot {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
}

/** Attendance configuration (kiosk sign-in, periods, rewards).
 *  Historically this was per-school; with per-teacher attendance, `teacherId`
 *  can be used to scope a config to a specific teacher.
 */
export interface AttendanceSettings {
  pointsForSignIn: number;
  pointsForOnTime: number;
  onTimeWindowMinutes: number;
  /** If set and non-empty, only students in these classes get attendance points. Empty = all classes. */
  enabledClassIds?: string[];
  /** Legacy mapping of classId -> schedule slot id (period) for that class (applies to all days). */
  classPeriodAssignments?: Record<string, string>;
  /**
   * Optional day-specific mapping of classId -> schedule slot id (period) for that class.
   * - Keys are day-of-week: "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat"
   * - Special key "all" provides a fallback for all days.
   * - Use value "__none__" to explicitly say "use whatever period is active now" for that day/class.
   */
  classPeriodAssignmentsByDay?: Record<string, Record<string, string>>;
  categoryId?: string;
  schedule: AttendanceScheduleSlot[];
  /**
   * IANA time zone (e.g. `America/Chicago`) for interpreting period times, reward windows,
   * and session dates in cloud sign-in. Stored on school `attendance/config` only; resolvers
   * merge it onto the effective config for the kiosk.
   */
  attendanceTimeZone?: string;
  /** Optional owner for per-teacher attendance configuration. */
  teacherId?: string;
}

/** One sign-in event stored for admin reporting. */
export interface AttendanceLogEntry {
  id?: string;
  studentId: string;
  studentName?: string;
  signedInAt: number;
  pointsAwarded: number;
  onTime: boolean;
  periodLabel?: string;
  /** A deterministic per-session key used to prevent double sign-ins. */
  sessionId?: string;
   /** Optional owning teacher when using per-teacher attendance configs. */
  teacherId?: string;
}

export type RecordClassSignInReason =
  | 'recorded'
  | 'duplicate_same_session'
  | 'class_not_in_enabled_list';

export interface RecordClassSignInResult {
  pointsAwarded: number;
  onTime: boolean;
  periodLabel?: string;
  reason: RecordClassSignInReason;
}

export type AttendanceKioskReason =
  | RecordClassSignInReason
  | 'student_not_found'
  | 'no_attendance_configuration'
  | 'no_periods_for_school_legacy'
  | 'callable_failed';

export interface AttendanceKioskSignInResult {
  pointsAwarded: number;
  onTime: boolean;
  periodLabel?: string | null;
  reason: AttendanceKioskReason;
  usedServer: boolean;
  serverTimeMs?: number;
  source?: 'reward_rule' | 'teacher_legacy' | 'school_legacy' | 'default';
}

export interface BackupInfo {
  id: string;
  createdAt?: number;
  storagePath?: string;
  sha256?: string;
  sizeBytes?: number;
  type?: string;
  status?: string;
  error?: string;
  collections?: Record<string, number>;
  totalDocs?: number;
}

export interface Database {
  name: string;
  passcode: string;
  schoolAccessPasscode?: string;
  adminPasscode?: string;
  // All array fields are now subcollections
  students?: Student[];
  classes?: Class[];
  teachers?: Teacher[];
  categories?: Category[];
  coupons?: Coupon[];
  prizes?: Prize[];
  library?: LibraryItem[];
  homework?: HomeworkAssignment[];
  goals?: Goal[];
  updatedAt: number;
  hasMigratedStudents?: boolean;
  hasMigratedClasses?: boolean;
  hasMigratedTeachers?: boolean;
  hasMigratedPrizes?: boolean;
  hasMigratedCoupons?: boolean;
  hasMigratedCategories?: boolean;
}

export type GoalType = 'personal' | 'prize_savings' | 'class';

export interface Goal {
  id: string;
  title: string;
  description?: string;
  type: GoalType;
  
  // The target metric to reach
  targetPoints: number;
  
  // Optional: Restrict to a specific category (e.g., only "Good Behavior" points count)
  categoryId?: string; 
  
  // Who is this goal for?
  studentId?: string; // For personal/prize goals
  classId?: string;   // For class-wide goals
  teacherId?: string; // The teacher who created the goal
  prizeId?: string;   // If this is a prize savings goal
  
  // Time limits
  startDate?: number;
  endDate?: number;
  
  // Reward upon completion
  bonusPointsReward?: number;
  
  // Status tracking
  status: 'active' | 'completed' | 'expired';
  createdAt: number;
}

export interface HomeworkAssignment {
  id: string;
  teacherId: string;
  teacherName: string;
  title: string;
  description: string;
  points: number;
  dueDate?: number;
  createdAt: number;
  classId?: string;
}

export interface HomeworkSubmission {
  id: string; // matches assignmentId
  assignmentId: string;
  studentId: string;
  status: 'pending' | 'submitted' | 'completed';
  submissionDate?: number;
  completedAt?: number;
  pointsAwarded?: number;
  teacherNote?: string;
}
