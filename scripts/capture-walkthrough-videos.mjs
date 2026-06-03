/**
 * Records promo walkthrough clips (Playwright + ffmpeg).
 *
 * Clips are recorded only after auth + UI are ready (no login replay in every clip).
 *
 * Default target: https://portal.leveluprewards.app (no local dev server required).
 * Use `--local` to capture against http://localhost:3000 (`npm run dev` must be running).
 * If localhost is unreachable, production is used automatically.
 *
 * Usage:
 *   node scripts/capture-walkthrough-videos.mjs
 *   node scripts/capture-walkthrough-videos.mjs --clip=student-kiosk
 *   node scripts/capture-walkthrough-videos.mjs --local
 *   node scripts/capture-walkthrough-videos.mjs --concat-only
 *   node scripts/capture-walkthrough-videos.mjs --library
 *   node scripts/capture-walkthrough-videos.mjs --library --category=login
 *   node scripts/capture-walkthrough-videos.mjs --library --promote-defaults
 *   node scripts/capture-walkthrough-videos.mjs --kiosk-clips
 *   node scripts/capture-walkthrough-videos.mjs --kiosk-coupons
 *   node scripts/capture-walkthrough-videos.mjs --kiosk-coupons --clip=132403
 *   node scripts/capture-walkthrough-videos.mjs --promo-broll
 *   CAPTURE_BASE_URL=https://portal.leveluprewards.app node scripts/capture-walkthrough-videos.mjs
 */

import { chromium } from '@playwright/test';
import { execSync, execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'promo-video', 'public');
const LIBRARY_DIR = path.join(OUT_DIR, 'capture-library');
const RAW_DIR = path.join(OUT_DIR, '_capture-raw');
const REJECTED_DIR = path.join(LIBRARY_DIR, '_rejected');
// Allow overriding to avoid Windows path/lock quirks (especially with spaces in repo paths).
const AUTH_DIR = path.resolve(process.env.CAPTURE_AUTH_DIR || path.join(OUT_DIR, '.capture-auth'));
const SCHOOL_AUTH = path.join(AUTH_DIR, 'school.json');
const TEACHER_AUTH = path.join(AUTH_DIR, 'teacher.json');
const ADMIN_AUTH = path.join(AUTH_DIR, 'admin.json');
const ADMIN_PASSCODE = process.env.DEMO_ADMIN_PASSCODE || '1234';

const PRODUCTION_PORTAL = 'https://portal.leveluprewards.app';
const LOCAL_DEV = 'http://localhost:3000';

/** Do not use generic BASE_URL — it is often localhost from dev shells. */
function resolveCaptureBaseFromArgs() {
  const explicit = process.env.CAPTURE_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  if (process.argv.includes('--local')) return LOCAL_DEV;
  return PRODUCTION_PORTAL;
}

let BASE = resolveCaptureBaseFromArgs();
const USE_LOCAL_DEV = () => /localhost|127\.0\.0\.1/.test(BASE);

async function probeLoginUrl(base) {
  try {
    const res = await fetch(`${base.replace(/\/+$/, '')}/login`, {
      signal: AbortSignal.timeout(15000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Prefer production when localhost is down or redirects away. */
async function resolveReachableCaptureBase() {
  const preferred = resolveCaptureBaseFromArgs();
  if (await probeLoginUrl(preferred)) return preferred;

  const isLocal = /localhost|127\.0\.0\.1/.test(preferred);
  if (isLocal && preferred !== PRODUCTION_PORTAL) {
    if (await probeLoginUrl(PRODUCTION_PORTAL)) {
      console.warn(
        `\n⚠ ${preferred} is not reachable — capturing from ${PRODUCTION_PORTAL}\n`,
      );
      return PRODUCTION_PORTAL;
    }
  }

  if (preferred !== LOCAL_DEV && (await probeLoginUrl(LOCAL_DEV))) {
    console.warn(`\n⚠ ${preferred} is not reachable — capturing from ${LOCAL_DEV}\n`);
    return LOCAL_DEV;
  }

  return null;
}
const SCHOOL = (process.env.DEMO_SCHOOL_ID || 'schoolabc').trim().toLowerCase();
/** Keep in sync with `SAMPLE_SCHOOL_ACCESS_PASSCODE` in src/lib/sampleSchools.ts */
const DEFAULT_SCHOOL_PASSCODE = '1234';
const SCHOOL_PASSCODE = (
  process.env.DEMO_SCHOOL_PASSCODE ||
  process.env.DEV_PASSCODE ||
  DEFAULT_SCHOOL_PASSCODE
).trim();
const TEACHER_NAME = process.env.DEMO_TEACHER_NAME || 'Mr. Smith';
const TEACHER_PASSCODE = process.env.DEMO_TEACHER_PASSCODE || '1234';
/** Student card / portal ID for kiosk and student-home (School ABC demo) */
/** School ABC demo students use nfcId 100–107 (see src/lib/schoolData.ts) */
const STUDENT_BADGE_ID = (process.env.DEMO_STUDENT_BADGE_ID || '100').trim();
const STUDENT_PORTAL_PASSCODE = (
  process.env.DEMO_STUDENT_PORTAL_PASSCODE || '1234'
).trim();

/** Wide enough for admin main tabs row (not mobile select only). */
const VIEWPORT = { width: 1400, height: 900 };
const MAX_CAPTURE_ATTEMPTS = 3;

/** Visible failure copy — reject takes that show these */
const UI_ERROR_RE =
  /Lookup failed|Sign-in failed|Could not load portal|Could not open student portal|failed to load|Permission denied|Student not found|Account Not Signed In|Something went wrong|An error occurred|error occurred|Student Lookup Failed|Could not look up|Could not load portal/i;

/** Trim leading blank frames and cap length after ffmpeg encode */
const POST_TRIM = {
  'walkthrough-login.mp4': { startSec: 0.35, maxDurationSec: 5.2 },
  'walkthrough-selector.mp4': { startSec: 0.2, maxDurationSec: 4.8 },
  'walkthrough-student-kiosk.mp4': { startSec: 2.4, maxDurationSec: 4.5 },
  'walkthrough-student-home.mp4': { startSec: 1.5, maxDurationSec: 4.8 },
  'walkthrough-dashboard.mp4': { startSec: 2.1, maxDurationSec: 4.2 },
  'walkthrough-action.mp4': { startSec: 2.6, maxDurationSec: 4.8 },
};

const DEFAULT_TRIM = { startSec: 0.25, maxDurationSec: 5 };

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function ensureFfmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
  } catch {
    throw new Error('ffmpeg is required. Install ffmpeg and ensure it is on PATH.');
  }
}

function probeVideoDuration(filePath) {
  const out = execFileSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      filePath,
    ],
    { encoding: 'utf8' },
  );
  const n = parseFloat(String(out).trim());
  return Number.isFinite(n) ? n : 0;
}

function localOrigin() {
  return new URL(BASE).origin;
}

/** localhost and 127.0.0.1 are equivalent for saved Playwright auth. */
function normalizeCaptureOrigin(origin) {
  if (!origin) return origin;
  if (!USE_LOCAL_DEV()) return origin;
  try {
    const u = new URL(origin);
    if (u.hostname === '127.0.0.1' || u.hostname === 'localhost') {
      u.hostname = '127.0.0.1';
      return u.origin;
    }
  } catch {
    /* ignore */
  }
  return origin;
}

async function forceLocalOrigin(page) {
  if (!USE_LOCAL_DEV()) return;
  const url = page.url();
  if (!url.includes('portal.leveluprewards.app')) return;
  const target = new URL(url.replace('https://portal.leveluprewards.app', localOrigin()));
  await page.goto(target.toString(), { waitUntil: 'domcontentloaded', timeout: 30000 });
}

function rewriteStorageStateOrigin(authPath) {
  if (!fs.existsSync(authPath)) return;
  const data = JSON.parse(fs.readFileSync(authPath, 'utf8'));
  const targetOrigin = normalizeCaptureOrigin(localOrigin());
  if (Array.isArray(data.origins)) {
    data.origins = data.origins.map((entry) => ({
      ...entry,
      origin:
        entry.origin?.includes('leveluprewards.app') || USE_LOCAL_DEV()
          ? targetOrigin
          : entry.origin,
    }));
  }
  fs.writeFileSync(authPath, JSON.stringify(data, null, 2));
}

function storageStateOrigin(authPath) {
  if (!fs.existsSync(authPath)) return '';
  try {
    const data = JSON.parse(fs.readFileSync(authPath, 'utf8'));
    return normalizeCaptureOrigin(data.origins?.[0]?.origin ?? '');
  } catch {
    return '';
  }
}

/** Saved auth from localhost does not apply on production (and vice versa). */
function authNeedsRefresh(authPath) {
  if (!fs.existsSync(authPath)) return true;
  return storageStateOrigin(authPath) !== normalizeCaptureOrigin(localOrigin());
}

function appOrigin(page) {
  try {
    const url = page.url();
    if (url && !url.startsWith('about:')) {
      return new URL(url).origin;
    }
  } catch {
    /* ignore */
  }
  return localOrigin();
}

async function waitNoAppLoading(page) {
  await page.waitForFunction(
    () => {
      const t = document.body?.innerText ?? '';
      return !/Loading Teacher Portal|Loading LevelUp|Loading kiosk|Loading your rewards|Signing in|Initializing|Preparing secure connection/i.test(
        t,
      );
    },
    { timeout: 90000, polling: 250 },
  );
}

async function pageBodyText(page) {
  return page.evaluate(() => document.body?.innerText ?? '');
}

async function hasUiErrors(page) {
  const t = await pageBodyText(page);
  return UI_ERROR_RE.test(t);
}

/** Wait for error toasts to disappear */
async function waitForCleanUi(page, { timeoutMs = 8000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!(await hasUiErrors(page))) return true;
    await sleep(400);
  }
  return !(await hasUiErrors(page));
}

async function assertCleanUi(page, label) {
  if (await hasUiErrors(page)) {
    const snippet = (await pageBodyText(page)).slice(0, 400).replace(/\s+/g, ' ');
    throw new Error(`UI errors visible during ${label}: ${snippet}`);
  }
}

async function dismissToasts(page) {
  await page.keyboard.press('Escape').catch(() => {});
  await sleep(200);
}

async function waitForPortalHub(page) {
  await page.waitForURL((url) => url.pathname.includes('/portal'), { timeout: 45000 });
  await page
    .getByRole('link', { name: /Student Kiosk/i })
    .first()
    .waitFor({ state: 'visible', timeout: 45000 });
  await waitNoAppLoading(page);
  await page
    .waitForFunction(() => !/SYNCING/i.test(document.body.innerText), {
      timeout: 60000,
      polling: 400,
    })
    .catch(() => {});
  await sleep(350);
}

async function waitForTeacherReady(page) {
  // Local dev can take a while to compile the teacher bundle; don't wait for full "load".
  await page.waitForURL(
    (url) => url.pathname.includes('/teacher') || url.pathname.includes('/admin'),
    {
      timeout: USE_LOCAL_DEV() ? 150000 : 90000,
      waitUntil: 'domcontentloaded',
    },
  );
  if (page.url().includes('/admin') && !page.url().includes('/teacher')) {
    await page.goto(`${localOrigin()}/${SCHOOL}/teacher`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await forceLocalOrigin(page);
    await page.waitForURL((url) => url.pathname.includes('/teacher'), {
      timeout: 60000,
      waitUntil: 'domcontentloaded',
    });
  }
  await waitNoAppLoading(page);
  await page
    .getByRole('tab', { name: /^Students$/i })
    .first()
    .waitFor({ state: 'visible', timeout: 120000 });
  await sleep(600);
}

async function waitForPrintCouponsReady(page) {
  await waitForTeacherReady(page);
  await page.getByRole('tab', { name: /^Points$/i }).click();
  await page.getByRole('tab', { name: /Print Coupons/i }).click();
  await page.getByRole('combobox').first().waitFor({ state: 'visible', timeout: 45000 });
  await page.locator('input[type="number"]').first().waitFor({ state: 'visible', timeout: 45000 });
  await waitNoAppLoading(page);
  await sleep(700);
}

async function schoolLogin(page, { useDemoPicker = true } = {}) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator('#schoolId').waitFor({ state: 'visible', timeout: 15000 });

  if (useDemoPicker) {
    await page.locator('summary:has-text("Try a demo school")').click();
    await page.locator('button:has-text("School ABC")').click();
    await sleep(250);
    await page.locator('#passcode').fill(SCHOOL_PASSCODE);
    await page.getByRole('button', { name: /Sign in to school/i }).click();
  } else {
    await page.locator('#schoolId').fill(SCHOOL);
    await page.locator('#passcode').fill(SCHOOL_PASSCODE);
    await page.getByRole('button', { name: /Sign in to school/i }).click();
  }

  await page
    .waitForURL((url) => url.pathname.includes('/portal'), { timeout: 45000 })
    .catch(() => {});
  await forceLocalOrigin(page);
  if (USE_LOCAL_DEV() && !page.url().includes('/portal')) {
    await page.goto(`${localOrigin()}/${SCHOOL}/portal`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
  }
  await waitForPortalHub(page);
  return localOrigin();
}

async function openTeacherPortal(page, origin) {
  const portalUrl = `${origin}/${SCHOOL}/portal`;
  if (!page.url().includes('/portal')) {
    await page.goto(portalUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  }
  await waitForPortalHub(page);
  await page.getByRole('link', { name: /Teacher Portal/i }).first().click();
  await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByRole('combobox').click();
  await page.getByRole('option', { name: TEACHER_NAME }).click();
  await page.locator('#teacher-passcode').fill(TEACHER_PASSCODE);
  await page.getByRole('button', { name: /^Continue$/i }).click();
  await forceLocalOrigin(page);
  await page
    .waitForURL(
      (url) => url.pathname.includes('/teacher') || url.pathname.includes('/admin'),
      { timeout: 60000, waitUntil: 'domcontentloaded' },
    )
    .catch(() => {});
  if (page.url().includes('/admin') && !page.url().includes('/teacher')) {
    await page.goto(`${origin}/${SCHOOL}/teacher`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await forceLocalOrigin(page);
  }
  await waitForTeacherReady(page);
}

async function gotoTeacher(page, origin) {
  await page.goto(`${origin}/${SCHOOL}/teacher`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await forceLocalOrigin(page);
  await waitForTeacherReady(page);
}

async function waitForStudentKioskReady(page) {
  await page.waitForURL(
    (url) =>
      url.pathname.includes('/student') && !url.pathname.includes('student-home'),
    { timeout: 60000 },
  );
  await forceLocalOrigin(page);
  await waitNoAppLoading(page);

  const kioskReady =
    /Please scan your card|System Ready|LEVEL UP|Student Identification|Identify Student|Enter your Student ID|Manual Entry/i;

  await page.waitForFunction(
    () => {
      const t = document.body?.innerText ?? '';
      if (/Check-in Unavailable/i.test(t)) return true;
      return /Please scan your card|System Ready|LEVEL UP|Student Identification|Identify Student|Enter your Student ID|Manual Entry/i.test(
        t,
      );
    },
    { timeout: 120000, polling: 500 },
  );

  const body = await pageBodyText(page);
  if (/Check-in Unavailable/i.test(body)) {
    throw new Error(`Student kiosk unavailable: ${body.slice(0, 280)}`);
  }
  if (!kioskReady.test(body)) {
    throw new Error('Student kiosk UI did not reach ready state');
  }

  await ensureStudentKioskTypeTab(page);
  await sleep(400);
}

async function ensureStudentKioskTypeTab(page) {
  const manualHint = page.getByText(/Enter your Student ID/i);
  if (await manualHint.isVisible().catch(() => false)) return;
  const typeTab = page.getByRole('tab', { name: /^Type$/i });
  if (await typeTab.isVisible().catch(() => false)) {
    await typeTab.click();
    await manualHint.waitFor({ state: 'visible', timeout: 30000 });
  }
}

async function openStudentKiosk(page, origin) {
  await page.goto(`${origin}/${SCHOOL}/student`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await waitForStudentKioskReady(page);
}

async function dismissWelcomeOverlayIfPresent(page) {
  const letsGo = page.getByRole('button', { name: /Let'?s Go!/i });
  if (await letsGo.isVisible({ timeout: 2500 }).catch(() => false)) {
    await letsGo.click();
    await sleep(500);
    return;
  }
  const welcome = page.getByText(/^WELCOME BACK!/i);
  if (await welcome.isVisible({ timeout: 1500 }).catch(() => false)) {
    await sleep(2200);
  }
}

async function signInStudentKiosk(page, { slowType = false, badgeId = STUDENT_BADGE_ID, timeoutMs = 90000 } = {}) {
  const studentId = String(badgeId).trim();
  await ensureStudentKioskTypeTab(page);
  const manualInput = page.locator('input[placeholder="----"]');
  if (await manualInput.isVisible({ timeout: 8000 }).catch(() => false)) {
    await manualInput.click();
    if (slowType) {
      await manualInput.pressSequentially(studentId, { delay: 140 });
    } else {
      await manualInput.fill(studentId);
    }
    await page.getByRole('button', { name: /Identify Student/i }).click();
  } else {
    const input = page.getByRole('textbox').first();
    await input.click();
    if (slowType) {
      await input.pressSequentially(studentId, { delay: 140 });
    } else {
      await input.fill(studentId);
    }
    await input.press('Enter');
  }
  await page.waitForFunction(
    () => {
      const t = document.body?.innerText ?? '';
      return (
        /Rewards|Wallet|Gift|WELCOME BACK|BALANCE|Eligible Rewards|Student found/i.test(t) &&
        !/Enter your Student ID|Loading kiosk/i.test(t)
      );
    },
    { timeout: timeoutMs, polling: 300 },
  );
  await waitForCleanUi(page);
  await assertCleanUi(page, 'student kiosk signed in');
  await sleep(600);
}

async function signOutStudentKiosk(page) {
  const logout = page.getByRole('button', { name: /^Logout$/i });
  if (await logout.isVisible({ timeout: 4000 }).catch(() => false)) {
    await logout.click();
    await page.waitForFunction(
      () => {
        const t = document.body?.innerText ?? '';
        return /Enter your Student ID|Identify Student|Please scan your card/i.test(t);
      },
      { timeout: 45000, polling: 300 },
    );
    await sleep(500);
    return;
  }
  await page.goto(`${localOrigin()}/${SCHOOL}/student`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await waitForStudentKioskReady(page);
}

/** Set by captureKioskClips before recording redeem clip. */
let resolvedCaptureCouponCode = null;

/** When Firebase reset fails, filled from a teacher print sheet (10 fresh codes). */
let activeCouponRedeemScenes = null;

const DEFAULT_COUPON_STUDENT_BADGES = ['100', '101', '102', '103', '104', '105', '106', '107', '108', '109'];

async function mintCouponScenesViaTeacherPrint(browser) {
  const ctx = await browser.newContext({ viewport: VIEWPORT, storageState: SCHOOL_AUTH });
  const page = await ctx.newPage();
  try {
    await openTeacherPortal(page, localOrigin());
    await waitForPrintCouponsReady(page);
    await page.locator('input[type="number"]').nth(1).fill('1');
    await page.getByRole('button', { name: /Generate.*print/i }).click();
    await page
      .getByText(/Coupons ready to print|coupon.*generated/i)
      .first()
      .waitFor({ state: 'visible', timeout: 90000 });
    await sleep(900);
    const barcodeSvgs = page.locator('[data-print-barcode]');
    await barcodeSvgs.first().waitFor({ state: 'visible', timeout: 30000 });
    const ariaLabels = await barcodeSvgs.evaluateAll((els) =>
      els
        .map((el) => el.getAttribute('aria-label') || '')
        .filter(Boolean),
    );
    const codes = ariaLabels
      .map((label) => label.replace(/\D/g, ''))
      .map((digits) => (digits.length >= 6 ? digits.slice(-6) : digits))
      .filter((c) => c.length === 6);
    const scenes = [];
    const n = Math.min(codes.length, DEFAULT_COUPON_STUDENT_BADGES.length);
    for (let i = 0; i < n; i++) {
      scenes.push({
        couponCode: codes[i],
        studentBadgeId: DEFAULT_COUPON_STUDENT_BADGES[i],
      });
      console.log(`  fresh coupon: student ${DEFAULT_COUPON_STUDENT_BADGES[i]} → ${codes[i]}`);
    }
    if (!scenes.length) throw new Error('Could not read coupon codes from teacher print preview');
    return scenes;
  } finally {
    await contextClose(ctx);
  }
}

async function resolveCouponRedeemScenes(browser) {
  const marketing = await import('./lib/demo-marketing-settings.mjs');
  marketing.loadEnvLocal();
  const configured = marketing.CAPTURE_COUPON_REDEEM_SCENES;
  try {
    if (await marketing.ensureCaptureCouponsUnused(configured.map((s) => s.couponCode))) {
      console.log('  coupons: reset configured codes to unused via Firebase');
      return configured;
    }
  } catch (err) {
    console.warn(`  coupons: Firebase reset failed (${err.message})`);
  }
  console.log('  coupons: minting a fresh print sheet (teacher portal)…');
  return mintCouponScenesViaTeacherPrint(browser);
}

async function resolveCaptureCouponCode(browser) {
  const { ensureCapturePromoCoupon, CAPTURE_PROMO_COUPON_CODE } = await import(
    './lib/demo-marketing-settings.mjs',
  );
  if (await ensureCapturePromoCoupon()) {
    resolvedCaptureCouponCode = CAPTURE_PROMO_COUPON_CODE;
    return resolvedCaptureCouponCode;
  }

  if (authNeedsRefresh(TEACHER_AUTH)) await ensureTeacherAuth(browser);
  const ctx = await browser.newContext({ viewport: VIEWPORT, storageState: TEACHER_AUTH });
  const page = await ctx.newPage();
  try {
    await gotoTeacher(page, localOrigin());
    await waitForPrintCouponsReady(page);
    const sheetsField = page.locator('input[type="number"]').first();
    await sheetsField.fill('1');
    await page.getByRole('button', { name: /Generate.*print/i }).click();
    await page
      .getByText(/Coupons ready to print|coupon.*generated/i)
      .first()
      .waitFor({ state: 'visible', timeout: 60000 })
      .catch(() => {});
    await sleep(800);
    const barcode = page.locator('.coupon-barcode').first();
    await barcode.waitFor({ state: 'visible', timeout: 30000 });
    const raw = (await barcode.innerText()).trim();
    const digits = raw.replace(/\D/g, '');
    if (digits.length >= 6) {
      resolvedCaptureCouponCode = digits.slice(-6);
      console.log(`  capture coupon (teacher print): ${resolvedCaptureCouponCode}`);
      return resolvedCaptureCouponCode;
    }
    throw new Error(`Could not read coupon code from print preview: "${raw}"`);
  } finally {
    await contextClose(ctx);
  }
}

async function redeemCaptureCouponOnKiosk(page, couponCode, { slowType = false } = {}) {
  const code = (couponCode || resolvedCaptureCouponCode || '').trim().toUpperCase();
  if (!code) throw new Error('No capture coupon code available');

  await dismissWelcomeOverlayIfPresent(page);
  await page.getByText(/^Redeem Coupon$/i).first().scrollIntoViewIfNeeded().catch(() => {});
  await sleep(400);

  const couponInput = page
    .getByPlaceholder(/type coupon code|Code appears here when scanned/i)
    .first();
  await couponInput.waitFor({ state: 'visible', timeout: 45000 });
  await couponInput.click();
  if (slowType) {
    await couponInput.fill('');
    await couponInput.pressSequentially(code, { delay: 110 });
  } else {
    await couponInput.fill(code);
  }
  await page.getByRole('button', { name: /^Redeem$/i }).click();
  await page.waitForFunction(
    () => {
      const t = document.body?.innerText ?? '';
      return (
        /\+\d+\s*PTS|You gained \d+ points|Coupon Redeemed/i.test(t) &&
        !/Redemption Failed|already been used|not found/i.test(t)
      );
    },
    { timeout: 45000, polling: 250 },
  );
  await sleep(1200);
}

async function isStudentKioskSignedIn(page) {
  const t = await pageBodyText(page);
  return /WELCOME BACK|BALANCE|Eligible Rewards|Redeem Coupon/i.test(t);
}

async function fillStudentHomeLoginForm(page, badgeId = STUDENT_BADGE_ID) {
  await page.locator('#portal-student-id').click();
  await page.locator('#portal-student-id').fill('');
  await page.locator('#portal-student-id').pressSequentially(badgeId, { delay: 90 });
  await sleep(400);
}

async function tryStudentHomeSignIn(page) {
  await fillStudentHomeLoginForm(page);
  await page.getByRole('button', { name: /^Continue$/i }).click();
  const passcodeField = page.getByRole('dialog').locator('input');
  if (await passcodeField.isVisible({ timeout: 8000 }).catch(() => false)) {
    await passcodeField.fill(STUDENT_PORTAL_PASSCODE);
    await page.getByRole('button', { name: /^Sign in$/i }).click();
  }
  await sleep(2000);
  await dismissToasts(page);
  const signedIn = await page
    .getByRole('button', { name: /Sign out/i })
    .isVisible()
    .catch(() => false);
  if (!signedIn) return false;
  await waitForCleanUi(page);
  if (await hasUiErrors(page)) return false;
  return true;
}

async function openStudentHome(page, origin) {
  await page.goto(`${origin}/${SCHOOL}/student-home`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await forceLocalOrigin(page);
  await waitNoAppLoading(page);
  await page
    .waitForFunction(
      () => {
        const t = document.body?.innerText ?? '';
        return (
          /Student home|Enter your student ID to view|Sign out|Your points|not turned on the student home portal/i.test(
            t,
          ) && !/Preparing secure connection/i.test(t)
        );
      },
      { timeout: 90000, polling: 300 },
    )
    .catch(() => {});
  await sleep(400);
}

async function signInStudentHome(page) {
  const loginVisible = await page
    .locator('#portal-student-id')
    .isVisible()
    .catch(() => false);
  if (!loginVisible) {
    await assertCleanUi(page, 'student home already signed in');
    await sleep(600);
    return true;
  }
  const ok = await tryStudentHomeSignIn(page);
  if (ok) await assertCleanUi(page, 'student home signed in');
  return ok;
}

async function saveContextStorageState(ctx, authPath) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  let lastErr;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      await ctx.storageState({ path: authPath, indexedDB: true });
      return;
    } catch (err) {
      lastErr = err;
      await sleep(350 * attempt);
    }
  }
  throw lastErr;
}

async function ensureSchoolAuth(browser) {
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  const page = await ctx.newPage();
  await schoolLogin(page);
  await saveContextStorageState(ctx, SCHOOL_AUTH);
  await ctx.close();
  console.log('  auth: school session saved');
}

async function ensureTeacherAuth(browser) {
  if (!fs.existsSync(SCHOOL_AUTH) || authNeedsRefresh(SCHOOL_AUTH)) {
    await ensureSchoolAuth(browser);
  }
  const ctx = await browser.newContext({ viewport: VIEWPORT, storageState: SCHOOL_AUTH });
  const page = await ctx.newPage();
  const origin = localOrigin();
  await openTeacherPortal(page, origin);
  await saveContextStorageState(ctx, TEACHER_AUTH);
  if (USE_LOCAL_DEV()) rewriteStorageStateOrigin(TEACHER_AUTH);
  await ctx.close();
  console.log(`  auth: teacher session saved (${localOrigin()})`);
}

async function isAdminPasscodeGate(page) {
  return page
    .getByRole('button', { name: /Enter Dashboard/i })
    .isVisible({ timeout: 2500 })
    .catch(() => false);
}

async function submitAdminPasscodeGate(page) {
  const pass = page.locator('input[name="adminPasscode"], input[type="password"]').first();
  await pass.waitFor({ state: 'visible', timeout: 15000 });
  await pass.fill(ADMIN_PASSCODE);
  await page.getByRole('button', { name: /Enter Dashboard/i }).click();
  await waitNoAppLoading(page);
  await sleep(2000);
}

async function adminDashboardReady(page) {
  const tablist = page.getByRole('tablist', { name: /Admin portal main tabs/i });
  if (await tablist.isVisible({ timeout: 5000 }).catch(() => false)) return true;
  const mobile = page.getByLabel(/Admin portal section/i);
  if (await mobile.isVisible({ timeout: 3000 }).catch(() => false)) return true;
  return /Add Student|Manage students/i.test(await pageBodyText(page));
}

async function adminLogin(page) {
  const origin = localOrigin();
  if (!page.url().includes('/portal')) {
    await schoolLogin(page);
  }
  await page.goto(`${origin}/${SCHOOL}/admin`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await forceLocalOrigin(page);
  await waitNoAppLoading(page);
  if (await isAdminPasscodeGate(page)) {
    await submitAdminPasscodeGate(page);
  } else if (page.url().includes('admin-sign-in')) {
    await page.locator('input[type="password"]').first().fill(ADMIN_PASSCODE);
    await page.locator('form').getByRole('button').first().click();
    await sleep(3500);
    await page.goto(`${origin}/${SCHOOL}/admin`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await waitNoAppLoading(page);
    if (await isAdminPasscodeGate(page)) await submitAdminPasscodeGate(page);
  }
  const cancel = page.getByRole('button', { name: /^Cancel$/i }).first();
  if (await cancel.isVisible({ timeout: 3000 }).catch(() => false)) {
    await cancel.click();
  }
  await page
    .waitForFunction(() => /Add Student|Manage students|Admin portal/i.test(document.body?.innerText ?? ''), {
      timeout: 120000,
      polling: 400,
    })
    .catch(() => {});
  await sleep(600);
}

async function gotoAdmin(page, origin) {
  await page.goto(`${origin}/${SCHOOL}/admin`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await forceLocalOrigin(page);
  await waitNoAppLoading(page);
  if (page.url().includes('admin-sign-in') || (await isAdminPasscodeGate(page))) {
    await adminLogin(page);
  } else if (!(await adminDashboardReady(page))) {
    await adminLogin(page);
  }
  await sleep(400);
}

async function gotoTeacherTab(page, origin, tabLabel) {
  await gotoTeacher(page, origin);
  const pattern = new RegExp(tabLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const tab = page.getByRole('tab', { name: pattern }).first();
  await tab.waitFor({ state: 'visible', timeout: 20000 });
  await tab.click({ timeout: 20000 });
  await waitNoAppLoading(page);
  await sleep(900);
}

async function ensureAdminAddOnTab(page, label) {
  const addMore = page.getByRole('button', { name: /^Add more$/i }).first();
  if (!(await addMore.isVisible({ timeout: 8000 }).catch(() => false))) return false;
  await addMore.click();
  await sleep(400);
  const item = page
    .getByRole('menuitemcheckbox', { name: new RegExp(label, 'i') })
    .first();
  if (await item.isVisible({ timeout: 3000 }).catch(() => false)) {
    if ((await item.getAttribute('aria-checked')) !== 'true') await item.click();
    await sleep(800);
  }
  await page.keyboard.press('Escape').catch(() => {});
  await sleep(500);
  return true;
}

/** Tab labels include icon whitespace — do not anchor with ^$. */
function adminTabLocator(page, tabLabel) {
  const pattern = new RegExp(tabLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const scoped = page
    .getByRole('tablist', { name: /Admin portal main tabs/i })
    .getByRole('tab', { name: pattern })
    .first();
  return scoped.or(page.getByRole('tab', { name: pattern }).first());
}

async function openBrandingThemeDesigner(page) {
  const themeNav = page.getByRole('tab', { name: /ID Card Theme/i }).first();
  await themeNav.waitFor({ state: 'visible', timeout: 20000 });
  await themeNav.click();
  await sleep(700);
  const themeBtn = page
    .getByRole('button', { name: /Configure Brand Theme|Customize Theme/i })
    .first();
  await themeBtn.waitFor({ state: 'visible', timeout: 20000 });
  await themeBtn.click();
  const designer = page.getByRole('dialog').filter({ hasText: /Generate theme/i });
  await designer.waitFor({ state: 'visible', timeout: 25000 });
  return designer;
}

/** Show theme being created: prompt entry + gradient/colors updating live preview. */
async function demonstrateThemeCreation(page) {
  const designer = await openBrandingThemeDesigner(page);
  const prompt = designer.locator('#prompt');
  await prompt.click();
  await prompt.fill('');
  await prompt.pressSequentially('School spirit navy blue and gold accents', { delay: 35 });
  await sleep(500);

  const styleMode = designer.locator('#theme-bg-style-mode');
  if (await styleMode.isVisible({ timeout: 5000 }).catch(() => false)) {
    await styleMode.click();
    await page.getByRole('option', { name: /^Gradient$/i }).first().click();
    await sleep(600);
  }

  const primaryPicker = designer
    .locator('label')
    .filter({ hasText: /^Primary$/i })
    .locator('input[type="color"]');
  const accentPicker = designer
    .locator('label')
    .filter({ hasText: /^Accent$/i })
    .locator('input[type="color"]');

  if (await primaryPicker.count()) {
    await primaryPicker.evaluate((el) => {
      el.value = '#1e3a8a';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await sleep(700);
  }
  if (await accentPicker.count()) {
    await accentPicker.evaluate((el) => {
      el.value = '#eab308';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await sleep(900);
  }

  const generateBtn = designer.getByRole('button', { name: /^Generate$/i }).first();
  if (await generateBtn.isEnabled().catch(() => false)) {
    await generateBtn.click();
    await sleep(1200);
  }

  await designer.getByText(/Student Portal Preview|Fine.?tune|Gradient/i).first().waitFor({
    state: 'visible',
    timeout: 20000,
  });
  await sleep(1600);
}

const ADMIN_ADDON_TAB_LABELS = [
  'Branding',
  'Raffle',
  'Houses',
  'Notifications',
  'Library',
  'Badges',
  'Insights',
  'Attendance',
  'Hall of Fame',
  'Bulletin',
  'Goals',
  'Bonus Points',
];

async function ensurePromoAdminAddOnTabs(page) {
  for (const label of ADMIN_ADDON_TAB_LABELS) {
    await ensureAdminAddOnTab(page, label);
  }
}

async function gotoTeacherRaffle(page, origin) {
  await gotoTeacher(page, origin);
  const tab = page.getByRole('tab', { name: /^Raffle$/i }).first();
  const btn = page.getByRole('button', { name: /^Raffle$/i }).first();
  const link = page.getByRole('link', { name: /^Raffle$/i }).first();
  const target = tab.or(btn).or(link);
  const visible = await target.isVisible({ timeout: 2500 }).catch(() => false);
  if (!visible) {
    const addMore = page.getByRole('button', { name: /^Add more$/i }).first();
    if (await addMore.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addMore.click();
      const item = page.getByRole('menuitemcheckbox', { name: /Raffle/i }).first();
      if (await item.isVisible({ timeout: 5000 }).catch(() => false)) {
        if ((await item.getAttribute('aria-checked')) !== 'true') await item.click();
      }
      await page.keyboard.press('Escape').catch(() => {});
      await sleep(500);
    }
  }
  await target.waitFor({ state: 'visible', timeout: 45000 });
  await target.click();
  await waitNoAppLoading(page);
  await page
    .getByText(/Run draw|Jackpot \(reels\)|Spinning wheel/i)
    .first()
    .waitFor({ state: 'visible', timeout: 60000 });
  await sleep(700);
}

async function prepareAdminRaffleDraw(page, origin) {
  await gotoAdmin(page, origin);
  await ensureAdminAddOnTab(page, 'Raffle');
  const ok = await gotoAdminTab(page, origin, 'Raffle');
  if (!ok) throw new Error('Admin Raffle tab not visible (enable Raffle on school or pin Raffle tab)');
  const eligible = page.getByText(/^Eligible$/i).first();
  await eligible.waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
  const body = await pageBodyText(page);
  if (/In pool[\s\S]*\b0\b/.test(body) && !/In pool[\s\S]*[1-9]/.test(body)) {
    throw new Error('Raffle pool has no tickets — check demo students / raffle settings');
  }
}

async function recordRaffleJackpotPull(page) {
  await page.getByRole('button', { name: /Jackpot \(reels\)/i }).click();
  await page.getByRole('button', { name: 'PULL!' }).waitFor({ state: 'visible', timeout: 25000 });
  await sleep(700);
  await page.getByRole('button', { name: 'PULL!' }).click();
  await page.waitForFunction(
    () => /SPINNING|🎉/i.test(document.body?.innerText ?? ''),
    { timeout: 15000, polling: 200 },
  );
  await page.waitForFunction(
    () => /🎉[\s\S]{2,}/i.test(document.body?.innerText ?? ''),
    { timeout: 12000, polling: 250 },
  );
  await sleep(1400);
}

async function recordRaffleWheelSpin(page) {
  await page.getByRole('button', { name: /Spinning wheel/i }).click();
  const spinBtn = page.getByRole('button', { name: 'SPIN!' });
  await spinBtn.waitFor({ state: 'visible', timeout: 25000 });
  await sleep(700);
  await spinBtn.click();
  await page.waitForFunction(
    () => /The winner is|SPINNING/i.test(document.body?.innerText ?? ''),
    { timeout: 15000, polling: 200 },
  );
  await page.waitForFunction(
    () => /The winner is/i.test(document.body?.innerText ?? ''),
    { timeout: 12000, polling: 300 },
  );
  await sleep(1200);
}

async function gotoAdminTab(page, origin, tabLabel) {
  await gotoAdmin(page, origin);
  if (await isAdminPasscodeGate(page)) await submitAdminPasscodeGate(page);
  const needsAddOn = ADMIN_ADDON_TAB_LABELS.some(
    (name) => name.toLowerCase() === tabLabel.toLowerCase(),
  );
  if (needsAddOn) await ensureAdminAddOnTab(page, tabLabel);

  const tab = adminTabLocator(page, tabLabel);
  if (await tab.isVisible({ timeout: 20000 }).catch(() => false)) {
    await tab.scrollIntoViewIfNeeded({ timeout: 15000 }).catch(() => {});
    await tab.click({ timeout: 20000 });
    await waitNoAppLoading(page);
    await sleep(1200);
    return true;
  }

  const mobile = page.getByLabel(/Admin portal section/i);
  if (await mobile.isVisible({ timeout: 5000 }).catch(() => false)) {
    await mobile.click();
    const option = page.getByRole('option', { name: new RegExp(tabLabel, 'i') }).first();
    if (await option.isVisible({ timeout: 8000 }).catch(() => false)) {
      await option.click();
      await waitNoAppLoading(page);
      await sleep(1200);
      return true;
    }
  }

  return false;
}

async function ensureAdminAuth(browser) {
  if (!fs.existsSync(SCHOOL_AUTH) || authNeedsRefresh(SCHOOL_AUTH)) {
    await ensureSchoolAuth(browser);
  }
  const ctx = await browser.newContext({ viewport: VIEWPORT, storageState: SCHOOL_AUTH });
  const page = await ctx.newPage();
  await adminLogin(page);
  await ensurePromoAdminAddOnTabs(page);
  await saveContextStorageState(ctx, ADMIN_AUTH);
  if (USE_LOCAL_DEV()) rewriteStorageStateOrigin(ADMIN_AUTH);
  await ctx.close();
  console.log(`  auth: admin session saved (${localOrigin()})`);
}

async function recordClipReady({
  file,
  outputPath,
  storageState,
  prepare,
  record,
  trim,
  validate,
  maxAttempts = 1,
}) {
  const TEMP_DIR = 'C:/Users/Administrator/capture-temp';
  fs.mkdirSync(TEMP_DIR, { recursive: true });

  const dest = outputPath ?? path.join(OUT_DIR, file);
  fs.mkdirSync(path.dirname(dest), { recursive: true });

  const trimOpts = trim ?? POST_TRIM[path.basename(dest)] ?? DEFAULT_TRIM;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Clean temp dir before capture
    if (fs.existsSync(TEMP_DIR)) {
      fs.readdirSync(TEMP_DIR).forEach(f => {
        try { fs.unlinkSync(path.join(TEMP_DIR, f)); } catch {}
      });
    }

    const browser = await chromium.launch({ headless: true });

    try {
      if (prepare) {
        const prepCtx = await browser.newContext({
          viewport: VIEWPORT,
          ...(storageState ? { storageState } : {}),
        });
        const prepPage = await prepCtx.newPage();
        await prepare(prepPage);
        await assertCleanUi(prepPage, `${file} prepare`);
        await prepCtx.close();
      }

      const ctx = await browser.newContext({
        viewport: VIEWPORT,
        ...(storageState ? { storageState } : {}),
        recordVideo: { dir: TEMP_DIR, size: VIEWPORT },
      });
      const page = await ctx.newPage();
      if (USE_LOCAL_DEV()) {
        page.on('framenavigated', (frame) => {
          if (frame === page.mainFrame() && frame.url().includes('portal.leveluprewards.app')) {
            forceLocalOrigin(page).catch(() => {});
          }
        });
      }

      try {
        await record(page);
        await sleep(400);
        if (validate) await validate(page);
        await assertCleanUi(page, `${file} record end`);
      } finally {
        await contextClose(ctx);
      }

      const created = fs
        .readdirSync(TEMP_DIR)
        .filter((f) => f.endsWith('.webm'));
      if (!created.length) throw new Error('No webm recording produced');

      const webmPath = path.join(TEMP_DIR, created.sort().pop()).replace(/\\/g, '/');
      const trimmedPath = path.join(TEMP_DIR, `_trim-${path.basename(dest)}`).replace(/\\/g, '/');
      const tempDest = path.join(TEMP_DIR, `_out-${path.basename(dest)}`).replace(/\\/g, '/');

      execFileSync(
        'ffmpeg',
        [
          '-y',
          '-i', webmPath,
          '-c:v', 'libx264',
          '-preset', 'fast',
          '-crf', '23',
          '-pix_fmt', 'yuv420p',
          '-movflags', '+faststart',
          trimmedPath
        ],
        { stdio: 'pipe' }
      );
      try { fs.unlinkSync(webmPath); } catch {}

      let ss = trimOpts.startSec ?? 0;
      let duration = trimOpts.maxDurationSec;
      if (trimOpts.tailSec) {
        const fullDur = probeVideoDuration(trimmedPath);
        ss = Math.max(0, fullDur - trimOpts.tailSec);
        duration = Math.min(trimOpts.maxDurationSec, trimOpts.tailSec);
      }

      execFileSync(
        'ffmpeg',
        [
          '-y',
          '-ss', String(ss),
          '-i', trimmedPath,
          '-t', String(duration),
          '-c:v', 'libx264',
          '-preset', 'fast',
          '-crf', '23',
          '-pix_fmt', 'yuv420p',
          '-movflags', '+faststart',
          tempDest
        ],
        { stdio: 'pipe' }
      );
      try { fs.unlinkSync(trimmedPath); } catch {}

      fs.copyFileSync(tempDest, dest);

      console.log(`✓ ${path.relative(ROOT, dest)}${attempt > 1 ? ` (attempt ${attempt})` : ''}`);
      return dest;
    } catch (err) {
      lastError = err;
      console.warn(`  ✗ attempt ${attempt}/${maxAttempts} ${file}: ${err.message}`);
      try {
        fs.mkdirSync(REJECTED_DIR, { recursive: true });
        const rejectNote = path.join(
          REJECTED_DIR,
          `${path.basename(file, '.mp4')}-attempt${attempt}.txt`,
        );
        fs.writeFileSync(rejectNote, `${err.message}\n${err.stack ?? ''}`);
      } catch {
        /* ignore */
      }
    } finally {
      await browser.close().catch(() => {});
    }
  }

  throw lastError ?? new Error(`Failed to capture ${file}`);
}

async function contextClose(ctx) {
  try {
    await ctx.close();
  } catch {
    /* ignore */
  }
}

const CLIPS = [
  {
    file: 'walkthrough-login.mp4',
    async capture() {
      await recordClipReady({
        maxAttempts: MAX_CAPTURE_ATTEMPTS,
        file: 'walkthrough-login.mp4',
        prepare: async (page) => {
          await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
          await page.locator('#schoolId').waitFor({ state: 'visible', timeout: 15000 });
        },
        record: async (page) => {
          await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
          await page.locator('#schoolId').waitFor({ state: 'visible', timeout: 15000 });
          await page.locator('#schoolId').pressSequentially(SCHOOL, { delay: 70 });
          await page.locator('#passcode').pressSequentially(SCHOOL_PASSCODE, { delay: 80 });
          await page.getByRole('button', { name: /Sign in to school/i }).click();
          await waitForPortalHub(page);
          await sleep(500);
        },
      });
    },
  },
  {
    file: 'walkthrough-selector.mp4',
    storageState: SCHOOL_AUTH,
    async capture() {
      await recordClipReady({
        maxAttempts: MAX_CAPTURE_ATTEMPTS,
        file: 'walkthrough-selector.mp4',
        storageState: SCHOOL_AUTH,
        prepare: async (page) => {
          const origin = localOrigin();
          await page.goto(`${origin}/${SCHOOL}/portal`, { waitUntil: 'domcontentloaded' });
          await waitForPortalHub(page);
        },
        record: async (page) => {
          const origin = localOrigin();
          await page.goto(`${origin}/${SCHOOL}/portal`, { waitUntil: 'domcontentloaded' });
          await waitForPortalHub(page);
          await page.mouse.move(640, 400);
          await sleep(350);
          await page.mouse.move(520, 520);
          await sleep(350);
          await page.mouse.move(760, 380);
          await sleep(350);
          await page.mouse.move(900, 480);
          await sleep(400);
        },
      });
    },
  },
  {
    file: 'walkthrough-student-kiosk.mp4',
    storageState: SCHOOL_AUTH,
    async capture() {
      await recordClipReady({
        maxAttempts: MAX_CAPTURE_ATTEMPTS,
        file: 'walkthrough-student-kiosk.mp4',
        storageState: SCHOOL_AUTH,
        prepare: async (page) => {
          await openStudentKiosk(page, localOrigin());
          await signInStudentKiosk(page);
        },
        record: async (page) => {
          await openStudentKiosk(page, localOrigin());
          await signInStudentKiosk(page);
          await page.mouse.move(700, 420);
          await sleep(500);
          await page.mouse.move(520, 380);
          await sleep(700);
        },
      });
    },
  },
  {
    file: 'walkthrough-student-home.mp4',
    storageState: SCHOOL_AUTH,
    async capture() {
      await recordClipReady({
        maxAttempts: MAX_CAPTURE_ATTEMPTS,
        file: 'walkthrough-student-home.mp4',
        storageState: SCHOOL_AUTH,
        prepare: async (page) => {
          await openStudentHome(page, localOrigin());
          await assertCleanUi(page, 'student home prepare');
        },
        record: async (page) => {
          await openStudentHome(page, localOrigin());
          await fillStudentHomeLoginForm(page);
          await page.mouse.move(640, 360);
          await sleep(500);
          await page.mouse.move(900, 480);
          await sleep(800);
        },
      });
    },
  },
  {
    file: 'walkthrough-dashboard.mp4',
    storageState: TEACHER_AUTH,
    async capture() {
      await recordClipReady({
        maxAttempts: MAX_CAPTURE_ATTEMPTS,
        file: 'walkthrough-dashboard.mp4',
        storageState: TEACHER_AUTH,
        prepare: async (page) => {
          await gotoTeacher(page, localOrigin());
        },
        record: async (page) => {
          await gotoTeacher(page, localOrigin());
          await page.getByRole('tab', { name: /^Students$/i }).click();
          await sleep(700);
          await page.getByRole('tab', { name: /^Classes$/i }).click();
          await sleep(900);
          await page.getByRole('tab', { name: /^Students$/i }).click();
          await sleep(1100);
        },
      });
    },
  },
  {
    file: 'walkthrough-action.mp4',
    storageState: TEACHER_AUTH,
    async capture() {
      await recordClipReady({
        maxAttempts: MAX_CAPTURE_ATTEMPTS,
        file: 'walkthrough-action.mp4',
        storageState: TEACHER_AUTH,
        prepare: async (page) => {
          await gotoTeacher(page, localOrigin());
          await waitForPrintCouponsReady(page);
          await sleep(300);
        },
        record: async (page) => {
          await gotoTeacher(page, localOrigin());
          await waitForPrintCouponsReady(page);
          await page.getByRole('combobox').first().click();
          await page.getByRole('option').nth(1).click();
          await sleep(400);
          const pointField = page.locator('input[type="number"]').first();
          await pointField.click();
          await pointField.fill('25');
          await sleep(500);
          await page
            .getByRole('button', { name: /Print|Generate|Preview/i })
            .first()
            .click({ timeout: 8000 })
            .catch(() => {});
          await sleep(1200);
        },
      });
    },
  },
];

function libraryPath(category, name) {
  return path.join(LIBRARY_DIR, category, `${name}.mp4`);
}

/** Raffle spins, kiosk b-roll, and other high-value Remotion clips (see --promo-broll). */
function buildPromoBrollExtraVariants() {
  const raffleTrim = { startSec: 0.7, maxDurationSec: 9 };
  return [
    {
      category: 'raffle',
      name: 'teacher-jackpot-pull',
      storageState: TEACHER_AUTH,
      trim: raffleTrim,
      prepare: async (page) => {
        await gotoTeacherRaffle(page, localOrigin());
      },
      record: async (page) => {
        await gotoTeacherRaffle(page, localOrigin());
        await recordRaffleJackpotPull(page);
      },
      validate: async (page) => {
        if (!/🎉/.test(await pageBodyText(page))) {
          throw new Error('Teacher jackpot winner not visible');
        }
        await assertCleanUi(page, 'teacher jackpot');
      },
    },
    {
      category: 'raffle',
      name: 'teacher-wheel-spin',
      storageState: TEACHER_AUTH,
      trim: raffleTrim,
      prepare: async (page) => {
        await gotoTeacherRaffle(page, localOrigin());
      },
      record: async (page) => {
        await gotoTeacherRaffle(page, localOrigin());
        await recordRaffleWheelSpin(page);
      },
      validate: async (page) => {
        if (!/The winner is/i.test(await pageBodyText(page))) {
          throw new Error('Teacher wheel winner not visible');
        }
        await assertCleanUi(page, 'teacher wheel');
      },
    },
    {
      category: 'student-kiosk',
      name: 'kiosk-prize-shop',
      storageState: SCHOOL_AUTH,
      trim: { startSec: 1.2, maxDurationSec: 5.5 },
      prepare: async (page) => {
        await openStudentKiosk(page, localOrigin());
        await signInStudentKiosk(page, { badgeId: '106' });
        await dismissWelcomeOverlayIfPresent(page);
      },
      record: async (page) => {
        await openStudentKiosk(page, localOrigin());
        await signInStudentKiosk(page, { badgeId: '106' });
        await dismissWelcomeOverlayIfPresent(page);
        await page.goto(`${localOrigin()}/${SCHOOL}/student?shop=prizes`, {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        });
        await waitNoAppLoading(page);
        await dismissWelcomeOverlayIfPresent(page);
        await sleep(1200);
        await page.mouse.move(640, 400);
        await sleep(800);
      },
      validate: async (page) => {
        const t = await pageBodyText(page);
        if (!/Prize|Rewards|Redeem|Shop/i.test(t)) {
          throw new Error('Prize shop not visible');
        }
        await assertCleanUi(page, 'kiosk prize shop');
      },
    },
    {
      category: 'student-kiosk',
      name: 'kiosk-scan-tab',
      storageState: SCHOOL_AUTH,
      trim: { startSec: 0.35, maxDurationSec: 4.5 },
      prepare: async (page) => {
        await openStudentKiosk(page, localOrigin());
        if (await isStudentKioskSignedIn(page)) await signOutStudentKiosk(page);
      },
      record: async (page) => {
        await openStudentKiosk(page, localOrigin());
        const scanTab = page.getByRole('tab', { name: /^Scan$/i });
        if (await scanTab.isVisible().catch(() => false)) {
          await scanTab.click();
          await sleep(1100);
        }
        await assertCleanUi(page, 'kiosk scan tab');
      },
    },
    {
      category: 'portal',
      name: 'portal-hub-overview',
      storageState: SCHOOL_AUTH,
      trim: { startSec: 0.2, maxDurationSec: 5 },
      prepare: async (page) => {
        await page.goto(`${localOrigin()}/${SCHOOL}/portal`, { waitUntil: 'domcontentloaded' });
        await waitForPortalHub(page);
      },
      record: async (page) => {
        await page.goto(`${localOrigin()}/${SCHOOL}/portal`, { waitUntil: 'domcontentloaded' });
        await waitForPortalHub(page);
        const links = ['Student Kiosk', 'Teacher Portal', 'Admin'];
        for (const label of links) {
          const link = page.getByRole('link', { name: new RegExp(label, 'i') }).first();
          if (await link.isVisible().catch(() => false)) {
            await link.hover();
            await sleep(550);
          }
        }
      },
    },
    {
      category: 'teacher',
      name: 'teacher-award-points-flow',
      storageState: TEACHER_AUTH,
      trim: { startSec: 1.8, maxDurationSec: 5 },
      prepare: async (page) => {
        await gotoTeacher(page, localOrigin());
        await page.getByRole('tab', { name: /^Students$/i }).click();
        await waitNoAppLoading(page);
      },
      record: async (page) => {
        await gotoTeacher(page, localOrigin());
        await page.getByRole('tab', { name: /^Students$/i }).click();
        await sleep(600);
        const firstStudent = page.locator('[data-student-row], tr').filter({ hasText: /\d+/ }).first();
        if (await firstStudent.isVisible({ timeout: 8000 }).catch(() => false)) {
          await firstStudent.click();
          await sleep(900);
        }
        await page.mouse.move(700, 420);
        await sleep(700);
      },
    },
  ];
}

/** Library clip ids included in --promo-broll (plus coupon redeems + buildPromoBrollExtraVariants). */
const PROMO_BROLL_LIBRARY_IDS = [
  'login/login-portal-settle',
  'selector/selector-hover-kiosk',
  'selector/selector-hub-pan',
  'student-kiosk/kiosk-mode-idle',
  'student-kiosk/kiosk-type-entry',
  'student-kiosk/kiosk-signin-welcome-points',
  'student-kiosk/kiosk-new-points-on-entry',
  'student-kiosk/kiosk-signin-rewards',
  'student-kiosk/kiosk-prizes-hover',
  'student-kiosk/kiosk-welcome-balance',
  'student-kiosk/kiosk-card-tab',
  'action/action-print-coupons',
  'action/action-print-preview-hold',
  'admin/admin-id-card-preview',
  'features/admin-branding-theme',
  'features/hall-of-fame',
  'features/bulletin-board',
  'features/admin-houses',
  'features/admin-badges',
  'features/admin-notifications',
  'features/admin-library',
  'features/admin-stats',
  'features/admin-attendance',
  'raffle/teacher-jackpot-pull',
  'raffle/teacher-wheel-spin',
  'teacher/teacher-students-roster',
  'teacher/teacher-points-tab',
  'teacher/teacher-tabs-cycle',
];

async function collectPromoBrollVariants() {
  const coupons = await buildKioskCouponRedeemVariants();
  const extras = buildPromoBrollExtraVariants();
  const fromLibrary = LIBRARY_VARIANTS.filter((v) =>
    PROMO_BROLL_LIBRARY_IDS.includes(`${v.category}/${v.name}`),
  );
  const seen = new Set();
  const merged = [];
  for (const v of [...coupons, ...extras, ...fromLibrary]) {
    const key = `${v.category}/${v.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(v);
  }
  return merged;
}

async function buildKioskCouponRedeemVariants() {
  const { CAPTURE_COUPON_REDEEM_SCENES: configured } = await import(
    './lib/demo-marketing-settings.mjs',
  );
  const scenes = activeCouponRedeemScenes ?? configured;
  return scenes.map(({ couponCode, studentBadgeId }) => {
    const code = couponCode.trim();
    const badge = studentBadgeId.trim();
    return {
      category: 'student-kiosk',
      name: `kiosk-coupon-redeem-${code}`,
      storageState: SCHOOL_AUTH,
      trim: { startSec: 0.55, maxDurationSec: 6.8 },
      prepare: async (page) => {
        await openStudentKiosk(page, localOrigin());
        if (await isStudentKioskSignedIn(page)) await signOutStudentKiosk(page);
        await signInStudentKiosk(page, { badgeId: badge });
        await dismissWelcomeOverlayIfPresent(page);
      },
      record: async (page) => {
        await openStudentKiosk(page, localOrigin());
        if (await isStudentKioskSignedIn(page)) await signOutStudentKiosk(page);
        await signInStudentKiosk(page, { badgeId: badge, slowType: true });
        await dismissWelcomeOverlayIfPresent(page);
        await redeemCaptureCouponOnKiosk(page, code, { slowType: true });
        await sleep(1000);
      },
      validate: async (page) => {
        const t = await pageBodyText(page);
        if (/already been used|not found|Redemption Failed/i.test(t)) {
          throw new Error(`Student ${badge} / coupon ${code}: redeem error on screen`);
        }
        if (!/\+\d+\s*PTS|You gained \d+ points|Coupon Redeemed/i.test(t)) {
          throw new Error(
            `Student ${badge} / coupon ${code}: points celebration not visible (${t.slice(0, 200)})`,
          );
        }
        await assertCleanUi(page, `kiosk coupon ${code}`);
      },
    };
  });
}

/** Extra takes for choosing in Remotion / manual review */
const LIBRARY_VARIANTS = [
  {
    category: 'login',
    name: 'login-demo-picker',
    storageState: null,
    trim: { startSec: 0.3, maxDurationSec: 5.5 },
    prepare: async (page) => {
      await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
      await page.locator('#schoolId').waitFor({ state: 'visible', timeout: 15000 });
    },
    record: async (page) => {
      await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
      await page.locator('summary:has-text("Try a demo school")').click();
      await page.locator('button:has-text("School ABC")').click();
      await sleep(300);
      await page.locator('#passcode').fill(SCHOOL_PASSCODE);
      await page.getByRole('button', { name: /Sign in to school/i }).click();
      await waitForPortalHub(page);
      await sleep(600);
    },
  },
  {
    category: 'login',
    name: 'login-type-schoolid',
    storageState: null,
    trim: { startSec: 0.35, maxDurationSec: 5.2 },
    prepare: async (page) => {
      await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
      await page.locator('#schoolId').waitFor({ state: 'visible', timeout: 15000 });
    },
    record: async (page) => {
      await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
      await page.locator('#schoolId').pressSequentially(SCHOOL, { delay: 75 });
      await page.locator('#passcode').pressSequentially(SCHOOL_PASSCODE, { delay: 85 });
      await page.getByRole('button', { name: /Sign in to school/i }).click();
      await waitForPortalHub(page);
      await sleep(600);
    },
  },
  {
    category: 'login',
    name: 'login-portal-settle',
    storageState: SCHOOL_AUTH,
    trim: { startSec: 0.2, maxDurationSec: 4 },
    prepare: async (page) => {
      await page.goto(`${localOrigin()}/${SCHOOL}/portal`, { waitUntil: 'domcontentloaded' });
      await waitForPortalHub(page);
    },
    record: async (page) => {
      await page.goto(`${localOrigin()}/${SCHOOL}/portal`, { waitUntil: 'domcontentloaded' });
      await waitForPortalHub(page);
      await sleep(1200);
    },
  },
  {
    category: 'selector',
    name: 'selector-hub-pan',
    storageState: SCHOOL_AUTH,
    trim: { startSec: 0.15, maxDurationSec: 5 },
    prepare: async (page) => {
      await page.goto(`${localOrigin()}/${SCHOOL}/portal`, { waitUntil: 'domcontentloaded' });
      await waitForPortalHub(page);
    },
    record: async (page) => {
      await page.goto(`${localOrigin()}/${SCHOOL}/portal`, { waitUntil: 'domcontentloaded' });
      await waitForPortalHub(page);
      const moves = [
        [640, 380],
        [480, 520],
        [760, 420],
        [900, 500],
        [560, 360],
      ];
      for (const [x, y] of moves) {
        await page.mouse.move(x, y);
        await sleep(450);
      }
    },
  },
  {
    category: 'selector',
    name: 'selector-hover-kiosk',
    storageState: SCHOOL_AUTH,
    trim: { startSec: 0.2, maxDurationSec: 4.5 },
    prepare: async (page) => {
      await page.goto(`${localOrigin()}/${SCHOOL}/portal`, { waitUntil: 'domcontentloaded' });
      await waitForPortalHub(page);
    },
    record: async (page) => {
      await page.goto(`${localOrigin()}/${SCHOOL}/portal`, { waitUntil: 'domcontentloaded' });
      await waitForPortalHub(page);
      const kiosk = page.getByRole('link', { name: /Student Kiosk/i }).first();
      await kiosk.hover();
      await sleep(900);
      await page.mouse.move(700, 450);
      await sleep(500);
    },
  },
  {
    category: 'selector',
    name: 'selector-hover-teacher',
    storageState: SCHOOL_AUTH,
    trim: { startSec: 0.2, maxDurationSec: 4.5 },
    prepare: async (page) => {
      await page.goto(`${localOrigin()}/${SCHOOL}/portal`, { waitUntil: 'domcontentloaded' });
      await waitForPortalHub(page);
    },
    record: async (page) => {
      await page.goto(`${localOrigin()}/${SCHOOL}/portal`, { waitUntil: 'domcontentloaded' });
      await waitForPortalHub(page);
      const teacher = page.getByRole('link', { name: /Teacher Portal/i }).first();
      await teacher.hover();
      await sleep(900);
    },
  },
  {
    category: 'student-kiosk',
    name: 'kiosk-type-entry',
    storageState: SCHOOL_AUTH,
    trim: { startSec: 0.5, maxDurationSec: 4.8 },
    prepare: async (page) => {
      await openStudentKiosk(page, localOrigin());
    },
    record: async (page) => {
      await openStudentKiosk(page, localOrigin());
      await ensureStudentKioskTypeTab(page);
      const manualInput = page.locator('input[placeholder="----"]');
      await manualInput.click();
      await manualInput.pressSequentially(STUDENT_BADGE_ID, { delay: 120 });
      await sleep(800);
    },
    validate: async (page) => {
      await assertCleanUi(page, 'kiosk type entry');
    },
  },
  {
    category: 'student-kiosk',
    name: 'kiosk-signin-rewards',
    storageState: SCHOOL_AUTH,
    trim: { startSec: 2.2, maxDurationSec: 5 },
    prepare: async (page) => {
      await openStudentKiosk(page, localOrigin());
      await signInStudentKiosk(page);
    },
    record: async (page) => {
      await openStudentKiosk(page, localOrigin());
      await signInStudentKiosk(page);
      await page.mouse.move(720, 400);
      await sleep(600);
      await page.mouse.move(540, 360);
      await sleep(700);
    },
    validate: async (page) => {
      if (!(await isStudentKioskSignedIn(page))) {
        throw new Error('Kiosk not signed in');
      }
    },
  },
  {
    category: 'student-kiosk',
    name: 'kiosk-welcome-balance',
    storageState: SCHOOL_AUTH,
    trim: { startSec: 1.8, maxDurationSec: 4.5 },
    prepare: async (page) => {
      await openStudentKiosk(page, localOrigin());
      await signInStudentKiosk(page);
    },
    record: async (page) => {
      await openStudentKiosk(page, localOrigin());
      await signInStudentKiosk(page);
      await page.mouse.move(640, 320);
      await sleep(1100);
    },
    validate: async (page) => {
      const t = await pageBodyText(page);
      if (!/WELCOME BACK|BALANCE|PTS/i.test(t)) {
        throw new Error('Expected welcome / balance UI');
      }
    },
  },
  {
    category: 'student-kiosk',
    name: 'kiosk-prizes-hover',
    storageState: SCHOOL_AUTH,
    trim: { startSec: 2.4, maxDurationSec: 5 },
    prepare: async (page) => {
      await openStudentKiosk(page, localOrigin());
      await signInStudentKiosk(page);
    },
    record: async (page) => {
      await openStudentKiosk(page, localOrigin());
      await signInStudentKiosk(page);
      await page.getByText(/Eligible Rewards|CLICK HERE FOR MORE PRIZES/i).first().scrollIntoViewIfNeeded().catch(() => {});
      await sleep(400);
      await page.mouse.move(700, 480);
      await sleep(500);
      await page.mouse.move(520, 520);
      await sleep(800);
    },
    validate: async (page) => {
      if (!(await isStudentKioskSignedIn(page))) throw new Error('Kiosk not signed in');
    },
  },
  {
    category: 'student-kiosk',
    name: 'kiosk-card-tab',
    storageState: SCHOOL_AUTH,
    trim: { startSec: 0.4, maxDurationSec: 4 },
    prepare: async (page) => {
      await openStudentKiosk(page, localOrigin());
    },
    record: async (page) => {
      await openStudentKiosk(page, localOrigin());
      const cardTab = page.getByRole('tab', { name: /^Card$/i });
      if (await cardTab.isVisible().catch(() => false)) {
        await cardTab.click();
        await sleep(900);
      }
      await assertCleanUi(page, 'kiosk card tab');
    },
  },
  {
    category: 'student-kiosk',
    name: 'kiosk-mode-idle',
    storageState: SCHOOL_AUTH,
    trim: { startSec: 0.35, maxDurationSec: 5.5 },
    prepare: async (page) => {
      await openStudentKiosk(page, localOrigin());
      if (await isStudentKioskSignedIn(page)) await signOutStudentKiosk(page);
    },
    record: async (page) => {
      await openStudentKiosk(page, localOrigin());
      if (await isStudentKioskSignedIn(page)) await signOutStudentKiosk(page);
      await ensureStudentKioskTypeTab(page);
      await sleep(1400);
      await page.mouse.move(700, 420);
      await sleep(600);
    },
    validate: async (page) => {
      const t = await pageBodyText(page);
      if (!/Enter your Student ID|Identify Student|Please scan your card|System Ready/i.test(t)) {
        throw new Error('Kiosk sign-in screen not visible');
      }
      await assertCleanUi(page, 'kiosk idle');
    },
  },
  {
    category: 'student-kiosk',
    name: 'kiosk-signin-welcome-points',
    storageState: SCHOOL_AUTH,
    trim: { startSec: 0.2, maxDurationSec: 7.5 },
    prepare: async (page) => {
      await openStudentKiosk(page, localOrigin());
      if (await isStudentKioskSignedIn(page)) await signOutStudentKiosk(page);
    },
    record: async (page) => {
      await openStudentKiosk(page, localOrigin());
      if (await isStudentKioskSignedIn(page)) await signOutStudentKiosk(page);
      await signInStudentKiosk(page, { slowType: true });
      await page.waitForFunction(
        () => /WELCOME BACK|Your Balance|Student found/i.test(document.body?.innerText ?? ''),
        { timeout: 60000, polling: 200 },
      );
      await sleep(2800);
    },
    validate: async (page) => {
      const t = await pageBodyText(page);
      if (!/WELCOME BACK|Your Balance|PTS/i.test(t)) {
        throw new Error('Welcome back / balance overlay not visible (enable welcome splash in school settings)');
      }
      await assertCleanUi(page, 'kiosk welcome points');
    },
  },
  {
    category: 'student-kiosk',
    name: 'kiosk-new-points-on-entry',
    storageState: SCHOOL_AUTH,
    trim: { startSec: 0.8, maxDurationSec: 6.5 },
    prepare: async (page) => {
      await openStudentKiosk(page, localOrigin());
      if (await isStudentKioskSignedIn(page)) await signOutStudentKiosk(page);
    },
    record: async (page) => {
      await openStudentKiosk(page, localOrigin());
      if (await isStudentKioskSignedIn(page)) await signOutStudentKiosk(page);
      await signInStudentKiosk(page, { slowType: true });
      await page.waitForFunction(
        () => {
          const t = document.body?.innerText ?? '';
          return (
            /\+\d+\s*PTS|You gained \d+ points|Attendance recorded/i.test(t) ||
            /WELCOME BACK|Your Balance/i.test(t)
          );
        },
        { timeout: 90000, polling: 250 },
      );
      await sleep(1600);
    },
    validate: async (page) => {
      const t = await pageBodyText(page);
      if (!/\+\d+\s*PTS|You gained \d+ points|WELCOME BACK|Your Balance|PTS/i.test(t)) {
        throw new Error('Expected points celebration or welcome balance on kiosk sign-in');
      }
      await assertCleanUi(page, 'kiosk points on entry');
    },
  },
  {
    category: 'student-kiosk',
    name: 'kiosk-coupon-points-redeem',
    storageState: SCHOOL_AUTH,
    skipIf: async () => !resolvedCaptureCouponCode,
    trim: { startSec: 0.5, maxDurationSec: 6.5 },
    prepare: async (page) => {
      await openStudentKiosk(page, localOrigin());
      await signInStudentKiosk(page);
    },
    record: async (page) => {
      await openStudentKiosk(page, localOrigin());
      if (!(await isStudentKioskSignedIn(page))) {
        await signInStudentKiosk(page);
      }
      await redeemCaptureCouponOnKiosk(page, resolvedCaptureCouponCode);
      await sleep(800);
    },
    validate: async (page) => {
      const t = await pageBodyText(page);
      if (!/\+\d+\s*PTS|You gained \d+ points/i.test(t)) {
        throw new Error('Points earned fly-up / message not visible after coupon redeem');
      }
      await assertCleanUi(page, 'kiosk points redeem');
    },
  },
  {
    category: 'student-home',
    name: 'home-login-type-id',
    storageState: SCHOOL_AUTH,
    trim: { startSec: 0.4, maxDurationSec: 5 },
    prepare: async (page) => {
      await openStudentHome(page, localOrigin());
    },
    record: async (page) => {
      await openStudentHome(page, localOrigin());
      await fillStudentHomeLoginForm(page);
      await sleep(900);
    },
    validate: async (page) => {
      await assertCleanUi(page, 'home login typing');
    },
  },
  {
    category: 'student-home',
    name: 'home-login-form-static',
    storageState: SCHOOL_AUTH,
    trim: { startSec: 0.3, maxDurationSec: 4.5 },
    prepare: async (page) => {
      await openStudentHome(page, localOrigin());
    },
    record: async (page) => {
      await openStudentHome(page, localOrigin());
      await page.locator('#portal-student-id').click();
      await sleep(1200);
    },
    validate: async (page) => {
      const t = await pageBodyText(page);
      if (!/Student home|Enter your student ID/i.test(t)) {
        throw new Error('Student home login form not visible');
      }
      await assertCleanUi(page, 'home static form');
    },
  },
  {
    category: 'student-home',
    name: 'home-signed-in-dashboard',
    storageState: SCHOOL_AUTH,
    trim: { startSec: 0.5, maxDurationSec: 5 },
    skipIf: async () => false,
    prepare: async (page) => {
      await openStudentHome(page, localOrigin());
      const ok = await tryStudentHomeSignIn(page);
      if (!ok) throw new Error('Student home sign-in unavailable on this environment');
      await assertCleanUi(page, 'home signed in prepare');
    },
    record: async (page) => {
      await openStudentHome(page, localOrigin());
      const ok = await tryStudentHomeSignIn(page);
      if (!ok) throw new Error('Student home sign-in failed');
      await page.mouse.move(640, 380);
      await sleep(700);
      await page.mouse.move(880, 460);
      await sleep(900);
    },
    validate: async (page) => {
      const t = await pageBodyText(page);
      if (!/Sign out|points|Rewards/i.test(t)) throw new Error('Not on student home dashboard');
      await assertCleanUi(page, 'home dashboard');
    },
  },
  {
    category: 'teacher',
    name: 'teacher-students-roster',
    storageState: TEACHER_AUTH,
    trim: { startSec: 1.5, maxDurationSec: 4.5 },
    prepare: async (page) => {
      await gotoTeacher(page, localOrigin());
    },
    record: async (page) => {
      await gotoTeacher(page, localOrigin());
      await page.getByRole('tab', { name: /^Students$/i }).click();
      await sleep(1100);
      await page.mouse.move(700, 420);
      await sleep(600);
    },
  },
  {
    category: 'teacher',
    name: 'teacher-classes-tab',
    storageState: TEACHER_AUTH,
    trim: { startSec: 1.5, maxDurationSec: 4.5 },
    prepare: async (page) => {
      await gotoTeacher(page, localOrigin());
    },
    record: async (page) => {
      await gotoTeacher(page, localOrigin());
      await page.getByRole('tab', { name: /^Classes$/i }).click();
      await sleep(1100);
    },
  },
  {
    category: 'teacher',
    name: 'teacher-tabs-cycle',
    storageState: TEACHER_AUTH,
    trim: { startSec: 2, maxDurationSec: 5 },
    prepare: async (page) => {
      await gotoTeacher(page, localOrigin());
    },
    record: async (page) => {
      await gotoTeacher(page, localOrigin());
      for (const tab of ['Students', 'Classes', 'Students']) {
        await page.getByRole('tab', { name: new RegExp(`^${tab}$`, 'i') }).click();
        await sleep(750);
      }
    },
  },
  {
    category: 'teacher',
    name: 'teacher-points-tab',
    storageState: TEACHER_AUTH,
    trim: { startSec: 1.8, maxDurationSec: 4.5 },
    prepare: async (page) => {
      await gotoTeacher(page, localOrigin());
      await page.getByRole('tab', { name: /^Points$/i }).click();
      await waitNoAppLoading(page);
    },
    record: async (page) => {
      await gotoTeacher(page, localOrigin());
      await page.getByRole('tab', { name: /^Points$/i }).click();
      await sleep(1000);
      await page.mouse.move(620, 400);
      await sleep(800);
    },
  },
  {
    category: 'action',
    name: 'action-print-coupons',
    storageState: TEACHER_AUTH,
    trim: { startSec: 2.4, maxDurationSec: 5 },
    prepare: async (page) => {
      await gotoTeacher(page, localOrigin());
      await waitForPrintCouponsReady(page);
    },
    record: async (page) => {
      await gotoTeacher(page, localOrigin());
      await waitForPrintCouponsReady(page);
      await page.getByRole('combobox').first().click();
      await page.getByRole('option').nth(1).click();
      await sleep(400);
      const pointField = page.locator('input[type="number"]').first();
      await pointField.click();
      await pointField.fill('25');
      await sleep(500);
      await page
        .getByRole('button', { name: /Print|Generate|Preview/i })
        .first()
        .click({ timeout: 8000 })
        .catch(() => {});
      await sleep(1200);
    },
  },
  {
    category: 'action',
    name: 'action-print-preview-hold',
    storageState: TEACHER_AUTH,
    trim: { startSec: 2.8, maxDurationSec: 4.8 },
    prepare: async (page) => {
      await gotoTeacher(page, localOrigin());
      await waitForPrintCouponsReady(page);
      await page.getByRole('combobox').first().click();
      await page.getByRole('option').nth(1).click();
      const pointField = page.locator('input[type="number"]').first();
      await pointField.fill('10');
    },
    record: async (page) => {
      await gotoTeacher(page, localOrigin());
      await waitForPrintCouponsReady(page);
      await sleep(1400);
    },
  },
  {
    category: 'admin',
    name: 'admin-id-card-preview',
    storageState: ADMIN_AUTH,
    /** Recording includes admin login — keep only the last seconds (ID dialog). */
    trim: { tailSec: 4.5, maxDurationSec: 5 },
    prepare: async (page) => {
      const ok = await gotoAdminTab(page, localOrigin(), 'Students');
      if (!ok) throw new Error('Admin Students tab not visible');
      const idBtn = page.locator('button[title="Preview ID Card"]').first();
      await idBtn.scrollIntoViewIfNeeded();
      await idBtn.click({ timeout: 15000 });
      await page.getByRole('dialog', { name: /ID Card Preview/i }).waitFor({ state: 'visible', timeout: 20000 });
      await page.locator('.student-id-card-screen-preview').waitFor({ state: 'visible', timeout: 20000 });
    },
    record: async (page) => {
      const ok = await gotoAdminTab(page, localOrigin(), 'Students');
      if (!ok) throw new Error('Admin Students tab not visible');
      const idBtn = page.locator('button[title="Preview ID Card"]').first();
      await idBtn.scrollIntoViewIfNeeded();
      await idBtn.click({ timeout: 15000 });
      await page.getByRole('dialog', { name: /ID Card Preview/i }).waitFor({ state: 'visible', timeout: 20000 });
      await page.locator('.student-id-card-screen-preview').waitFor({ state: 'visible', timeout: 20000 });
      await sleep(2800);
    },
    validate: async (page) => {
      const visible = await page
        .locator('.student-id-card-screen-preview')
        .isVisible()
        .catch(() => false);
      if (!visible) throw new Error('Student ID card preview not visible in dialog');
    },
  },
  {
    category: 'features',
    name: 'admin-branding-theme',
    storageState: ADMIN_AUTH,
    trim: { tailSec: 7.5, maxDurationSec: 7.5 },
    prepare: async (page) => {
      const ok = await gotoAdminTab(page, localOrigin(), 'Branding');
      if (!ok) throw new Error('Admin Branding tab not visible');
      await demonstrateThemeCreation(page);
    },
    record: async (page) => {
      const ok = await gotoAdminTab(page, localOrigin(), 'Branding');
      if (!ok) throw new Error('Admin Branding tab not visible');
      await demonstrateThemeCreation(page);
      await sleep(800);
    },
    validate: async (page) => {
      const t = await pageBodyText(page);
      if (!/Generate theme/i.test(t)) {
        throw new Error('Theme designer modal not visible');
      }
      if (!/Student Portal Preview|Fine.?tune|Gradient|Prompt/i.test(t)) {
        throw new Error('Theme creation UI not visible');
      }
    },
  },
  {
    category: 'portal',
    name: 'portal-student-home-link',
    storageState: SCHOOL_AUTH,
    trim: { startSec: 0.2, maxDurationSec: 4.5 },
    prepare: async (page) => {
      await page.goto(`${localOrigin()}/${SCHOOL}/portal`, { waitUntil: 'domcontentloaded' });
      await waitForPortalHub(page);
    },
    record: async (page) => {
      await page.goto(`${localOrigin()}/${SCHOOL}/portal`, { waitUntil: 'domcontentloaded' });
      await waitForPortalHub(page);
      const homeLink = page.getByRole('link', { name: /Student home|student home portal/i }).first();
      if (await homeLink.isVisible().catch(() => false)) {
        await homeLink.hover();
        await sleep(900);
      } else {
        await page.mouse.move(640, 400);
        await sleep(800);
      }
    },
  },
  {
    category: 'features',
    name: 'teacher-raffle',
    storageState: ADMIN_AUTH,
    trim: { tailSec: 4.5, maxDurationSec: 5 },
    prepare: async (page) => {
      const ok = await gotoAdminTab(page, localOrigin(), 'Raffle');
      if (!ok) throw new Error('Admin Raffle tab not visible (pin from Add more)');
    },
    record: async (page) => {
      const ok = await gotoAdminTab(page, localOrigin(), 'Raffle');
      if (!ok) throw new Error('Admin Raffle tab not visible');
      await sleep(1400);
    },
    validate: async (page) => {
      if (!/Raffle|Ticket|Winner|Draw|Jackpot|Spin/i.test(await pageBodyText(page))) {
        throw new Error('Raffle UI not visible');
      }
    },
  },
  {
    category: 'features',
    name: 'hall-of-fame',
    storageState: SCHOOL_AUTH,
    trim: { startSec: 0.6, maxDurationSec: 5.5 },
    prepare: async (page) => {
      await page.goto(`${localOrigin()}/${SCHOOL}/hall-of-fame?fullscreen=1`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      await waitNoAppLoading(page);
    },
    record: async (page) => {
      await page.goto(`${localOrigin()}/${SCHOOL}/hall-of-fame?fullscreen=1`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      await waitNoAppLoading(page);
      await sleep(1200);
      await page.mouse.move(640, 360);
      await sleep(800);
    },
  },
  {
    category: 'features',
    name: 'bulletin-board',
    storageState: SCHOOL_AUTH,
    trim: { startSec: 0.4, maxDurationSec: 5 },
    prepare: async (page) => {
      await page.goto(`${localOrigin()}/${SCHOOL}/bulletin-board`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      await waitNoAppLoading(page);
    },
    record: async (page) => {
      await page.goto(`${localOrigin()}/${SCHOOL}/bulletin-board`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      await waitNoAppLoading(page);
      await sleep(1400);
    },
  },
  {
    category: 'features',
    name: 'admin-houses',
    storageState: ADMIN_AUTH,
    trim: { tailSec: 4.5, maxDurationSec: 5 },
    prepare: async (page) => {
      const ok = await gotoAdminTab(page, localOrigin(), 'Houses');
      if (!ok) throw new Error('Admin Houses tab not visible');
    },
    record: async (page) => {
      const ok = await gotoAdminTab(page, localOrigin(), 'Houses');
      if (!ok) throw new Error('Admin Houses tab not visible');
      await sleep(1400);
    },
    validate: async (page) => {
      if (!/House|Sorting|Students/i.test(await pageBodyText(page))) {
        throw new Error('Houses UI not visible');
      }
    },
  },
  {
    category: 'features',
    name: 'admin-notifications',
    storageState: ADMIN_AUTH,
    trim: { tailSec: 4.5, maxDurationSec: 5 },
    prepare: async (page) => {
      const ok = await gotoAdminTab(page, localOrigin(), 'Notifications');
      if (!ok) throw new Error('Admin Notifications tab not visible');
    },
    record: async (page) => {
      const ok = await gotoAdminTab(page, localOrigin(), 'Notifications');
      if (!ok) throw new Error('Admin Notifications tab not visible');
      await sleep(1400);
    },
    validate: async (page) => {
      if (!/Notification|Alert|Inventory/i.test(await pageBodyText(page))) {
        throw new Error('Notifications UI not visible');
      }
    },
  },
  {
    category: 'features',
    name: 'admin-library',
    storageState: ADMIN_AUTH,
    trim: { tailSec: 4.5, maxDurationSec: 5 },
    prepare: async (page) => {
      const ok = await gotoAdminTab(page, localOrigin(), 'Library');
      if (!ok) throw new Error('Admin Library tab not visible');
    },
    record: async (page) => {
      const ok = await gotoAdminTab(page, localOrigin(), 'Library');
      if (!ok) throw new Error('Admin Library tab not visible');
      await sleep(1400);
    },
    validate: async (page) => {
      if (!/Library|Checkout|Book/i.test(await pageBodyText(page))) {
        throw new Error('Library UI not visible');
      }
    },
  },
  {
    category: 'features',
    name: 'admin-badges',
    storageState: ADMIN_AUTH,
    trim: { tailSec: 4.5, maxDurationSec: 5 },
    prepare: async (page) => {
      const ok = await gotoAdminTab(page, localOrigin(), 'Badges');
      if (!ok) throw new Error('Admin Badges tab not visible');
    },
    record: async (page) => {
      const ok = await gotoAdminTab(page, localOrigin(), 'Badges');
      if (!ok) throw new Error('Admin Badges tab not visible');
      await sleep(1400);
    },
    validate: async (page) => {
      if (!/Badge|Goal|Milestone/i.test(await pageBodyText(page))) {
        throw new Error('Badges UI not visible');
      }
    },
  },
  {
    category: 'features',
    name: 'admin-stats',
    storageState: ADMIN_AUTH,
    trim: { tailSec: 4.5, maxDurationSec: 5 },
    prepare: async (page) => {
      const ok = await gotoAdminTab(page, localOrigin(), 'Insights');
      if (!ok) await gotoAdminTab(page, localOrigin(), 'Students');
    },
    record: async (page) => {
      const ok = await gotoAdminTab(page, localOrigin(), 'Insights');
      if (!ok) await gotoAdminTab(page, localOrigin(), 'Students');
      await page.mouse.move(640, 380);
      await sleep(1100);
    },
  },
  {
    category: 'features',
    name: 'admin-attendance',
    storageState: ADMIN_AUTH,
    trim: { tailSec: 4.5, maxDurationSec: 5 },
    prepare: async (page) => {
      const ok = await gotoAdminTab(page, localOrigin(), 'Attendance');
      if (!ok) throw new Error('Admin Attendance tab not visible');
    },
    record: async (page) => {
      const ok = await gotoAdminTab(page, localOrigin(), 'Attendance');
      if (!ok) throw new Error('Admin Attendance tab not visible');
      await sleep(1400);
    },
    validate: async (page) => {
      if (!/Attendance|Sign.?in|Present/i.test(await pageBodyText(page))) {
        throw new Error('Attendance UI not visible');
      }
    },
  },
];

const PROMOTE_DEFAULTS = {
  'walkthrough-login.mp4': 'login/login-type-schoolid.mp4',
  'walkthrough-selector.mp4': 'selector/selector-hub-pan.mp4',
  'walkthrough-student-kiosk.mp4': 'student-kiosk/kiosk-signin-rewards.mp4',
  'walkthrough-student-home.mp4': 'student-home/home-login-type-id.mp4',
  'walkthrough-dashboard.mp4': 'teacher/teacher-tabs-cycle.mp4',
  'walkthrough-action.mp4': 'action/action-print-coupons.mp4',
};

async function captureLibraryVariant(variant) {
  if (variant.skipIf && (await variant.skipIf())) {
    console.log(`⊘ skip ${variant.category}/${variant.name}`);
    return null;
  }

  const out = libraryPath(variant.category, variant.name);
  console.log(`Recording library/${variant.category}/${variant.name}.mp4...`);

  return recordClipReady({
    file: `${variant.category}/${variant.name}.mp4`,
    outputPath: out,
    storageState: variant.storageState,
    prepare: variant.prepare,
    record: variant.record,
    validate: variant.validate,
    trim: variant.trim,
    maxAttempts: MAX_CAPTURE_ATTEMPTS,
  });
}

/** Clips for the simple widescreen promo (fresh captures) */
const PROMO_SIMPLE_LIBRARY = [
  'admin/admin-id-card-preview',
  'student-kiosk/kiosk-card-tab',
  'student-kiosk/kiosk-signin-rewards',
  'student-kiosk/kiosk-prizes-hover',
  'student-kiosk/kiosk-type-entry',
  'action/action-print-coupons',
];

/** Kiosk + “new points” clips for Remotion b-roll */
const KIOSK_PROMO_LIBRARY = [
  'student-kiosk/kiosk-mode-idle',
  'student-kiosk/kiosk-signin-welcome-points',
  'student-kiosk/kiosk-new-points-on-entry',
  'student-kiosk/kiosk-type-entry',
  'student-kiosk/kiosk-signin-rewards',
  'student-kiosk/kiosk-coupon-points-redeem',
];

/** Clips for long feature showcase promos */
const PROMO_FEATURE_LIBRARY = [
  'admin/admin-id-card-preview',
  'features/admin-branding-theme',
  'features/teacher-raffle',
  'features/hall-of-fame',
  'features/bulletin-board',
  'features/admin-houses',
  'features/admin-notifications',
  'features/admin-library',
  'features/admin-badges',
  'features/admin-stats',
  'features/admin-attendance',
];

async function captureLibrary({ categoryFilter, nameFilter, variantsOverride, skipAuthRefresh = false } = {}) {
  fs.mkdirSync(LIBRARY_DIR, { recursive: true });
  let variants = variantsOverride ?? LIBRARY_VARIANTS;
  if (nameFilter?.length) {
    if (variantsOverride) {
      variants = variants.filter((v) =>
        nameFilter.includes(`${v.category}/${v.name}`),
      );
    } else {
      const extras = buildPromoBrollExtraVariants();
      let coupons = [];
      try {
        coupons = await buildKioskCouponRedeemVariants();
      } catch {
        /* optional */
      }
      const byId = new Map(
        [...LIBRARY_VARIANTS, ...extras, ...coupons].map((v) => [
          `${v.category}/${v.name}`,
          v,
        ]),
      );
      variants = nameFilter
        .map((id) => byId.get(id))
        .filter(Boolean);
      if (!variants.length) {
        throw new Error(`No capture definitions for: ${nameFilter.join(', ')}`);
      }
    }
  } else if (categoryFilter) {
    variants = variants.filter((v) => v.category.includes(categoryFilter));
  }

  const manifest = {
    capturedAt: new Date().toISOString(),
    base: BASE,
    school: SCHOOL,
    variants: [],
  };

  const browser = await chromium.launch({ headless: true });
  const needsTeacher = variants.some((v) => v.storageState === TEACHER_AUTH);
  const needsSchool = variants.some((v) => v.storageState === SCHOOL_AUTH);
  const needsAdmin = variants.some((v) => v.storageState === ADMIN_AUTH);
  const refreshAuth = process.argv.includes('--refresh-auth');
  if (!skipAuthRefresh) {
    if (needsSchool && (refreshAuth || authNeedsRefresh(SCHOOL_AUTH))) await ensureSchoolAuth(browser);
    if (needsTeacher && (refreshAuth || authNeedsRefresh(TEACHER_AUTH))) await ensureTeacherAuth(browser);
    if (needsAdmin && (refreshAuth || authNeedsRefresh(ADMIN_AUTH))) await ensureAdminAuth(browser);
  } else if (needsSchool && !fs.existsSync(SCHOOL_AUTH)) {
    await ensureSchoolAuth(browser);
  } else if (needsTeacher && !fs.existsSync(TEACHER_AUTH)) {
    await ensureTeacherAuth(browser);
  } else if (needsAdmin && !fs.existsSync(ADMIN_AUTH)) {
    await ensureAdminAuth(browser);
  }
  await browser.close();

  let ok = 0;
  let fail = 0;
  for (const variant of variants) {
    try {
      const resultPath = await captureLibraryVariant(variant);
      if (resultPath) {
        ok += 1;
        manifest.variants.push({
          category: variant.category,
          name: variant.name,
          path: path.relative(OUT_DIR, resultPath),
          status: 'ok',
        });
      }
    } catch (err) {
      fail += 1;
      manifest.variants.push({
        category: variant.category,
        name: variant.name,
        status: 'failed',
        error: err.message,
      });
    }
  }

  try {
    fs.writeFileSync(
      path.join(LIBRARY_DIR, 'manifest.json'),
      JSON.stringify(manifest, null, 2),
    );
  } catch (err) {
    console.warn(`⚠ Could not write capture manifest: ${err.message}`);
  }
  console.log(`\nLibrary: ${ok} captured, ${fail} failed → ${LIBRARY_DIR}`);
  console.log('Browse: promo-video/public/capture-library/<category>/*.mp4\n');
}

function promoteDefaultsToWalkthrough() {
  for (const [destName, rel] of Object.entries(PROMOTE_DEFAULTS)) {
    const src = path.join(LIBRARY_DIR, ...rel.split('/'));
    const dest = path.join(OUT_DIR, destName);
    if (!fs.existsSync(src)) {
      console.warn(`⊘ promote skip (missing): ${rel}`);
      continue;
    }
    fs.copyFileSync(src, dest);
    console.log(`↑ promoted ${destName} ← ${rel}`);
  }
  concatFastWalkthrough();
}

function concatFastWalkthrough() {
  const TEMP_DIR = 'C:/Users/Administrator/capture-temp';
  fs.mkdirSync(TEMP_DIR, { recursive: true });

  const tempConcats = CLIPS.map(c => {
    const src = path.join(OUT_DIR, c.file);
    const tempSrc = path.join(TEMP_DIR, c.file);
    try { fs.copyFileSync(src, tempSrc); } catch {}
    return tempSrc;
  });

  const listPath = path.join(TEMP_DIR, '_concat-list.txt').replace(/\\/g, '/');
  const lines = CLIPS.map((c) => `file '${c.file.replace(/'/g, "'\\''")}'`).join('\n');
  fs.writeFileSync(listPath, lines);

  const tempOut = path.join(TEMP_DIR, 'walkthrough-fast.mp4').replace(/\\/g, '/');
  const out = path.join(OUT_DIR, 'walkthrough-fast.mp4');

  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', listPath,
      '-c', 'copy',
      tempOut
    ],
    {
      stdio: 'inherit',
      cwd: TEMP_DIR,
    }
  );

  fs.copyFileSync(tempOut, out);
  console.log('✓ walkthrough-fast.mp4 (concat)');
}

async function prepPromoBroll(browser) {
  const marketing = await import('./lib/demo-marketing-settings.mjs');
  marketing.loadEnvLocal();
  try {
    if (await marketing.patchDemoMarketingSettings()) {
      console.log('  demo: school settings patched for captures');
    } else {
      console.warn('  ⚠ Could not patch demo school settings (Firebase admin unavailable)');
    }
  } catch (err) {
    console.warn(`  ⚠ Settings patch failed: ${err.message}`);
  }
  if (authNeedsRefresh(SCHOOL_AUTH) || !fs.existsSync(SCHOOL_AUTH)) {
    await ensureSchoolAuth(browser);
  }
  if (authNeedsRefresh(TEACHER_AUTH) || !fs.existsSync(TEACHER_AUTH)) {
    try {
      await ensureTeacherAuth(browser);
    } catch (err) {
      console.warn(`  ⚠ Teacher auth failed (teacher clips may fail): ${err.message}`);
    }
  }
  if (authNeedsRefresh(ADMIN_AUTH) || !fs.existsSync(ADMIN_AUTH)) {
    await ensureAdminAuth(browser);
    const ctx = await browser.newContext({ viewport: VIEWPORT, storageState: ADMIN_AUTH });
    const page = await ctx.newPage();
    try {
      await gotoAdmin(page, localOrigin());
      await ensurePromoAdminAddOnTabs(page);
    } finally {
      await contextClose(ctx);
    }
  }
  try {
    activeCouponRedeemScenes = await resolveCouponRedeemScenes(browser);
  } catch (err) {
    console.warn(`  ⚠ Coupon prep failed: ${err.message}`);
    activeCouponRedeemScenes = null;
  }
}

async function capturePromoBroll() {
  console.log('\n=== Promo b-roll batch (kiosk, coupons, raffle, admin, teacher) ===\n');
  const browser = await chromium.launch({ headless: true });
  try {
    await prepPromoBroll(browser);
  } catch (e) {
    console.warn(`  ⚠ Prep failed: ${e.message}\n`);
  } finally {
    await browser.close();
  }

  let variants = await collectPromoBrollVariants();
  const clipFilter = process.argv.find((a) => a.startsWith('--clip='))?.split('=')[1]?.trim();
  if (clipFilter) {
    variants = variants.filter(
      (v) => v.name.includes(clipFilter) || v.name.endsWith(`-${clipFilter}`),
    );
    if (!variants.length) throw new Error(`No promo b-roll clips match --clip=${clipFilter}`);
  }

  console.log(`Capturing ${variants.length} clip(s)…\n`);
  const nameFilter = variants.map((v) => `${v.category}/${v.name}`);
  await captureLibrary({ nameFilter, variantsOverride: variants, skipAuthRefresh: true });
  console.log('\n✓ Promo b-roll → promo-video/public/capture-library/\n');
}

async function captureKioskCoupons() {
  console.log('\n=== Kiosk coupon redeems (one student + code per clip) ===\n');
  const marketing = await import('./lib/demo-marketing-settings.mjs');

  const browser = await chromium.launch({ headless: true });
  try {
    await prepPromoBroll(browser);
  } catch (e) {
    console.warn(`  ⚠ Prep failed: ${e.message}\n`);
  } finally {
    await browser.close();
  }

  let variants = await buildKioskCouponRedeemVariants();
  const clipFilter = process.argv.find((a) => a.startsWith('--clip='))?.split('=')[1]?.trim();
  if (clipFilter) {
    variants = variants.filter(
      (v) => v.name.includes(clipFilter) || v.name.endsWith(`-${clipFilter}`),
    );
    if (!variants.length) {
      throw new Error(`No coupon redeem clips match --clip=${clipFilter}`);
    }
  }

  const nameFilter = variants.map((v) => `${v.category}/${v.name}`);
  console.log(`Capturing ${variants.length} coupon redeem clip(s)…\n`);
  await captureLibrary({ nameFilter, variantsOverride: variants });
  console.log('\n✓ Coupon clips → promo-video/public/capture-library/student-kiosk/kiosk-coupon-redeem-*.mp4\n');
}

async function captureKioskClips() {
  console.log('\n=== Kiosk promo clips (idle, welcome points, coupon redeem) ===\n');
  const browser = await chromium.launch({ headless: true });
  try {
    const { patchDemoMarketingSettings } = await import('./lib/demo-marketing-settings.mjs');
    const patched = await patchDemoMarketingSettings();
    if (!patched) {
      console.warn(
        '  ⚠ FIREBASE_SERVICE_ACCOUNT_KEY not set — welcome splash uses production settings; coupon via teacher print\n',
      );
    }
    if (authNeedsRefresh(SCHOOL_AUTH)) await ensureSchoolAuth(browser);
    try {
      await resolveCaptureCouponCode(browser);
    } catch (couponErr) {
      console.warn(`  ⚠ Coupon seed skipped: ${couponErr.message}`);
    }
  } catch (e) {
    console.warn(`  ⚠ Demo prep failed: ${e.message}\n`);
  } finally {
    await browser.close();
  }
  const clipFilter = process.argv.find((a) => a.startsWith('--clip='))?.split('=')[1];
  const nameFilter = clipFilter
    ? KIOSK_PROMO_LIBRARY.filter((n) => n.includes(clipFilter))
    : KIOSK_PROMO_LIBRARY;
  if (clipFilter && !nameFilter.length) {
    throw new Error(`No kiosk clips match --clip=${clipFilter}`);
  }
  await captureLibrary({ nameFilter });
  console.log('\n✓ Kiosk clips → promo-video/public/capture-library/student-kiosk/\n');
}

async function captureFeaturePromo() {
  console.log('\n=== Long feature promo — addon screen captures ===\n');
  try {
    const { patchDemoMarketingSettings } = await import('./lib/demo-marketing-settings.mjs');
    const patched = await patchDemoMarketingSettings();
    if (!patched) {
      console.warn(
        '  ⚠ FIREBASE_SERVICE_ACCOUNT_KEY not set — optional demo settings patch skipped\n',
      );
    }
  } catch (e) {
    console.warn(`  ⚠ Could not patch demo school settings: ${e.message}`);
  }
  const clipFilter = process.argv.find((a) => a.startsWith('--clip='))?.split('=')[1];
  const nameFilter = clipFilter
    ? PROMO_FEATURE_LIBRARY.filter((name) => name.includes(clipFilter))
    : PROMO_FEATURE_LIBRARY;
  if (!nameFilter.length) {
    throw new Error(`No feature promo library clips match --clip=${clipFilter}`);
  }
  await captureLibrary({ nameFilter });
  console.log('\n✓ Feature clips ready under capture-library/features/\n');
}

async function capturePromoSimple() {
  console.log('\n=== Simple widescreen promo — fresh library captures ===\n');
  await captureLibrary({ nameFilter: PROMO_SIMPLE_LIBRARY });

  const actionClip = CLIPS.find((c) => c.file === 'walkthrough-action.mp4');
  if (actionClip) {
    console.log('\nRecording walkthrough-action.mp4 (teacher print backup)...\n');
    const browser = await chromium.launch({ headless: true });
    if (authNeedsRefresh(TEACHER_AUTH)) await ensureTeacherAuth(browser);
    await browser.close();
    await actionClip.capture();
  }

  console.log('\n✓ Promo clips ready under promo-video/public/capture-library/\n');
}

async function main() {
  const concatOnly = process.argv.includes('--concat-only');
  const libraryMode = process.argv.includes('--library');
  const promoSimple = process.argv.includes('--promo-simple');
  const featurePromo = process.argv.includes('--feature-promo');
  const kioskClips = process.argv.includes('--kiosk-clips');
  const kioskCoupons = process.argv.includes('--kiosk-coupons');
  const promoBroll = process.argv.includes('--promo-broll');
  const promoteDefaults = process.argv.includes('--promote-defaults');
  const categoryFilter = process.argv.find((a) => a.startsWith('--category='))?.split('=')[1];

  ensureFfmpeg();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  if (concatOnly) {
    concatFastWalkthrough();
    return;
  }

  const reachable = await resolveReachableCaptureBase();
  if (!reachable) {
    console.error(
      `\nCould not reach ${PRODUCTION_PORTAL} or ${LOCAL_DEV}/login.\n` +
        `Check network or set CAPTURE_BASE_URL=https://portal.leveluprewards.app\n`,
    );
    process.exit(1);
  }
  BASE = reachable;

  console.log(`Using capture base: ${BASE}\n`);

  if (promoSimple) {
    await capturePromoSimple();
    return;
  }

  if (featurePromo) {
    await captureFeaturePromo();
    return;
  }

  if (kioskClips) {
    await captureKioskClips();
    return;
  }

  if (kioskCoupons) {
    await captureKioskCoupons();
    return;
  }

  if (promoBroll) {
    await capturePromoBroll();
    return;
  }

  if (libraryMode) {
    const clipFilter = process.argv.find((a) => a.startsWith('--clip='))?.split('=')[1]?.trim();
    let nameFilter;
    if (clipFilter) {
      const normalized = clipFilter.replace(/\.mp4$/, '');
      if (normalized.includes('/')) {
        nameFilter = [normalized];
      } else {
        nameFilter = LIBRARY_VARIANTS.filter(
          (v) => v.name === normalized || v.name.includes(normalized),
        ).map((v) => `${v.category}/${v.name}`);
        for (const v of buildPromoBrollExtraVariants()) {
          const id = `${v.category}/${v.name}`;
          if (
            (v.name === normalized || v.name.includes(normalized)) &&
            !nameFilter.includes(id)
          ) {
            nameFilter.push(id);
          }
        }
      }
      if (!nameFilter.length) {
        throw new Error(`No library clips match --clip=${clipFilter}`);
      }
    }
    await captureLibrary({ categoryFilter, nameFilter });
    if (promoteDefaults) promoteDefaultsToWalkthrough();
    return;
  }

  if (promoteDefaults) {
    promoteDefaultsToWalkthrough();
    return;
  }

  const clipFilter = process.argv.find((a) => a.startsWith('--clip='))?.split('=')[1];
  const clips = clipFilter ? CLIPS.filter((c) => c.file.includes(clipFilter)) : CLIPS;
  if (!clips.length) {
    throw new Error(`No clips match --clip=${clipFilter}`);
  }

  const refreshAuth = process.argv.includes('--refresh-auth');
  if (refreshAuth) {
    for (const f of [SCHOOL_AUTH, TEACHER_AUTH]) {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
  }

  console.log(`Capturing walkthrough clips → ${OUT_DIR}\n`);

  const browser = await chromium.launch({ headless: true });
  const needsTeacher = clips.some((c) => c.storageState === TEACHER_AUTH);
  const needsSchool = clips.some((c) => c.storageState === SCHOOL_AUTH);

  if (needsSchool && authNeedsRefresh(SCHOOL_AUTH)) await ensureSchoolAuth(browser);
  if (needsTeacher && authNeedsRefresh(TEACHER_AUTH)) await ensureTeacherAuth(browser);
  await browser.close();

  for (const clip of clips) {
    console.log(`Recording ${clip.file}...`);
    await clip.capture();
  }

  concatFastWalkthrough();

  console.log(
    '\nDone. Library: node scripts/capture-walkthrough-videos.mjs --library',
  );
  console.log(
    'Re-render: cd promo-video && npx remotion render src/index.ts CapturedPromo ../assets/levelup-promo-captured.mp4',
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
