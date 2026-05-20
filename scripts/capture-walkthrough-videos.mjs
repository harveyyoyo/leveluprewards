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
const AUTH_DIR = path.join(OUT_DIR, '.capture-auth');
const SCHOOL_AUTH = path.join(AUTH_DIR, 'school.json');
const TEACHER_AUTH = path.join(AUTH_DIR, 'teacher.json');

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

const VIEWPORT = { width: 1280, height: 720 };
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

function localOrigin() {
  return new URL(BASE).origin;
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
  const targetOrigin = localOrigin();
  if (Array.isArray(data.origins)) {
    data.origins = data.origins.map((entry) => ({
      ...entry,
      origin: entry.origin?.includes('leveluprewards.app') ? targetOrigin : entry.origin,
    }));
  }
  fs.writeFileSync(authPath, JSON.stringify(data, null, 2));
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
  await page.waitForURL((url) => url.pathname.includes('/teacher'), { timeout: 60000 });
  await waitNoAppLoading(page);
  await page
    .getByRole('heading', { name: /Teacher Portal/i })
    .waitFor({ state: 'visible', timeout: 90000 });
  await page.getByRole('tab', { name: /^Students$/i }).waitFor({ state: 'visible', timeout: 90000 });
  await page
    .getByText(/Academics|Problem Solving|Good Behavior/i)
    .first()
    .waitFor({ state: 'visible', timeout: 90000 })
    .catch(() => {});
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
  await page
    .getByText(
      /Please scan your card|System Ready|LEVEL UP|Student Identification|Identify Student/i,
    )
    .first()
    .waitFor({ state: 'visible', timeout: 90000 });
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

async function signInStudentKiosk(page) {
  await ensureStudentKioskTypeTab(page);
  const manualInput = page.locator('input[placeholder="----"]');
  if (await manualInput.isVisible({ timeout: 8000 }).catch(() => false)) {
    await manualInput.fill(STUDENT_BADGE_ID);
    await page.getByRole('button', { name: /Identify Student/i }).click();
  } else {
    const input = page.getByRole('textbox').first();
    await input.click();
    await input.fill(STUDENT_BADGE_ID);
    await input.press('Enter');
  }
  await page.waitForFunction(
    () => {
      const t = document.body?.innerText ?? '';
      return (
        /Rewards|Wallet|Gift|WELCOME BACK|BALANCE|Eligible Rewards/i.test(t) &&
        !/Enter your Student ID|Loading kiosk/i.test(t)
      );
    },
    { timeout: 90000, polling: 300 },
  );
  await waitForCleanUi(page);
  await assertCleanUi(page, 'student kiosk signed in');
  await sleep(600);
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

async function ensureSchoolAuth(browser) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  const page = await ctx.newPage();
  await schoolLogin(page);
  await ctx.storageState({ path: SCHOOL_AUTH, indexedDB: true });
  await ctx.close();
  console.log('  auth: school session saved');
}

async function ensureTeacherAuth(browser) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  await ensureSchoolAuth(browser);
  const ctx = await browser.newContext({ viewport: VIEWPORT, storageState: SCHOOL_AUTH });
  const page = await ctx.newPage();
  const origin = localOrigin();
  await openTeacherPortal(page, origin);
  await ctx.storageState({ path: TEACHER_AUTH, indexedDB: true });
  if (USE_LOCAL_DEV()) rewriteStorageStateOrigin(TEACHER_AUTH);
  await ctx.close();
  console.log(`  auth: teacher session saved (${localOrigin()})`);
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

      execFileSync(
        'ffmpeg',
        [
          '-y',
          '-ss', String(trimOpts.startSec),
          '-i', trimmedPath,
          '-t', String(trimOpts.maxDurationSec),
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

async function captureLibrary({ categoryFilter } = {}) {
  fs.mkdirSync(LIBRARY_DIR, { recursive: true });
  const variants = categoryFilter
    ? LIBRARY_VARIANTS.filter((v) => v.category.includes(categoryFilter))
    : LIBRARY_VARIANTS;

  const manifest = {
    capturedAt: new Date().toISOString(),
    base: BASE,
    school: SCHOOL,
    variants: [],
  };

  const browser = await chromium.launch({ headless: true });
  const needsTeacher = variants.some((v) => v.storageState === TEACHER_AUTH);
  const needsSchool = variants.some((v) => v.storageState === SCHOOL_AUTH);
  if (needsTeacher && !fs.existsSync(TEACHER_AUTH)) await ensureTeacherAuth(browser);
  else if (needsSchool && !fs.existsSync(SCHOOL_AUTH)) await ensureSchoolAuth(browser);
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

  fs.writeFileSync(
    path.join(LIBRARY_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
  );
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

async function main() {
  const concatOnly = process.argv.includes('--concat-only');
  const libraryMode = process.argv.includes('--library');
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

  if (libraryMode) {
    await captureLibrary({ categoryFilter });
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

  if (needsTeacher && !fs.existsSync(TEACHER_AUTH)) {
    await ensureTeacherAuth(browser);
  } else if (needsSchool && !fs.existsSync(SCHOOL_AUTH)) {
    await ensureSchoolAuth(browser);
  }
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
