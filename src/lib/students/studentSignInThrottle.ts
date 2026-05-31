/**
 * Per-student kiosk sign-in throttle.
 *
 * Tracks recent successful sign-in timestamps per (school, student) in
 * localStorage and reports whether the student is currently frozen.
 *
 * This is a UX deterrent against the same card being tapped over and over.
 * Storage is per-browser; this is intentional because each kiosk usually
 * runs in a single browser and the goal is to gate the interactive flow,
 * not to enforce server-side rate limits.
 */

/** Hard cap so the stored array stays small even on a busy kiosk. */
const MAX_KEPT_TIMESTAMPS = 200;

/** How long old entries are allowed to linger before we prune them on read. */
const PRUNE_OLDER_THAN_MS = 24 * 60 * 60 * 1000;

function safeLocalStorage(): Storage | null {
    if (typeof window === 'undefined') return null;
    try {
        return window.localStorage;
    } catch {
        return null;
    }
}

function storageKey(schoolId: string, studentId: string): string {
    const sid = (schoolId ?? '').trim().toLowerCase();
    const uid = (studentId ?? '').trim();
    return `arcade_student_signins_${sid}_${uid}`;
}

function readTimestamps(schoolId: string, studentId: string): number[] {
    const ls = safeLocalStorage();
    if (!ls) return [];
    try {
        const raw = ls.getItem(storageKey(schoolId, studentId));
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        const cutoff = Date.now() - PRUNE_OLDER_THAN_MS;
        return parsed
            .filter((n): n is number => typeof n === 'number' && Number.isFinite(n) && n >= cutoff)
            .sort((a, b) => a - b);
    } catch {
        return [];
    }
}

function writeTimestamps(schoolId: string, studentId: string, list: number[]): void {
    const ls = safeLocalStorage();
    if (!ls) return;
    try {
        const trimmed = list.length > MAX_KEPT_TIMESTAMPS ? list.slice(-MAX_KEPT_TIMESTAMPS) : list;
        ls.setItem(storageKey(schoolId, studentId), JSON.stringify(trimmed));
    } catch {
        // localStorage may be full or disabled — silently ignore; the throttle
        // is a UX deterrent and is not safety-critical.
    }
}

export interface StudentSignInThrottleConfig {
    enabled?: boolean;
    /** Max sign-ins allowed in the window before the freeze kicks in. */
    maxAttempts?: number;
    /** Rolling window length in minutes. */
    windowMin?: number;
}

export interface StudentSignInThrottleStatus {
    /** True when the student must wait before another sign-in is allowed. */
    frozen: boolean;
    /** Milliseconds remaining until the freeze ends (0 when not frozen). */
    msRemaining: number;
    /** Whole seconds remaining (rounded up), suitable for UI messages. */
    secondsRemaining: number;
    /** Count of sign-ins inside the current window. */
    countInWindow: number;
}

function normalizeConfig(cfg: StudentSignInThrottleConfig): {
    maxAttempts: number;
    windowMs: number;
} | null {
    if (!cfg?.enabled) return null;
    const maxAttempts = Math.max(1, Math.round(cfg.maxAttempts ?? 10));
    const windowMin = Math.max(1, Math.round(cfg.windowMin ?? 2));
    return { maxAttempts, windowMs: windowMin * 60 * 1000 };
}

/** Inspect the throttle state for a student without mutating storage. */
export function getStudentSignInThrottleStatus(
    schoolId: string,
    studentId: string,
    config: StudentSignInThrottleConfig,
    now: number = Date.now(),
): StudentSignInThrottleStatus {
    const idle: StudentSignInThrottleStatus = {
        frozen: false,
        msRemaining: 0,
        secondsRemaining: 0,
        countInWindow: 0,
    };
    if (!schoolId || !studentId) return idle;
    const norm = normalizeConfig(config);
    if (!norm) return idle;

    const all = readTimestamps(schoolId, studentId);
    const windowStart = now - norm.windowMs;
    const inWindow = all.filter((t) => t >= windowStart);
    if (inWindow.length < norm.maxAttempts) {
        return { ...idle, countInWindow: inWindow.length };
    }
    // Freeze ends when the oldest in-window entry ages out of the window.
    const oldest = inWindow[0];
    const msRemaining = Math.max(0, oldest + norm.windowMs - now);
    return {
        frozen: msRemaining > 0,
        msRemaining,
        secondsRemaining: Math.ceil(msRemaining / 1000),
        countInWindow: inWindow.length,
    };
}

/** Record a successful sign-in for the student. Safe no-op without ids. */
export function recordStudentSignIn(
    schoolId: string,
    studentId: string,
    now: number = Date.now(),
): void {
    if (!schoolId || !studentId) return;
    const all = readTimestamps(schoolId, studentId);
    all.push(now);
    writeTimestamps(schoolId, studentId, all);
}

/** Clear all stored sign-in history for the student (admin reset / tests). */
export function clearStudentSignInHistory(schoolId: string, studentId: string): void {
    const ls = safeLocalStorage();
    if (!ls) return;
    try {
        ls.removeItem(storageKey(schoolId, studentId));
    } catch {
        // ignore
    }
}
