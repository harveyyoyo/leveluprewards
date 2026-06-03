/**
 * Recapture one media asset by logical path (used by developer media library).
 *
 * Usage:
 *   node scripts/recapture-media-asset.mjs --path=capture-library/student-kiosk/kiosk-type-entry.mp4
 *   node scripts/recapture-media-asset.mjs --path=marketing/screenshots/kiosk-welcome.png
 */

import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

/** Clips defined only in promo-broll extras (need --promo-broll prep). */
const PROMO_BROLL_CLIP_NAMES = new Set([
  'kiosk-prize-shop',
  'kiosk-scan-tab',
  'portal-hub-overview',
  'teacher-award-points-flow',
  'teacher-jackpot-pull',
  'teacher-wheel-spin',
]);

function runNode(scriptRel, args) {
  const script = path.join(ROOT, scriptRel);
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env,
  });
  process.exit(result.status ?? 1);
}

function buildCaptureArgs(relPath) {
  const normalized = relPath.replace(/\\/g, '/');

  if (normalized.startsWith('marketing/screenshots/')) {
    const name = path.basename(normalized, '.png');
    if (!name) throw new Error('Invalid screenshot path');
    return {
      script: 'scripts/capture-marketing-flyer-screenshots.mjs',
      args: [`--shot=${name}`],
    };
  }

  if (!normalized.startsWith('capture-library/')) {
    throw new Error(`Unknown asset path: ${relPath}`);
  }

  const inner = normalized.slice('capture-library/'.length).replace(/\.mp4$/, '');
  if (!inner.includes('/')) {
    throw new Error(`Invalid capture-library path: ${relPath}`);
  }

  const couponMatch = inner.match(/^student-kiosk\/kiosk-coupon-redeem-(\d+)$/);
  if (couponMatch) {
    return {
      script: 'scripts/capture-walkthrough-videos.mjs',
      args: ['--kiosk-coupons', `--clip=${couponMatch[1]}`],
    };
  }

  const clipName = inner.split('/').pop() ?? '';
  if (PROMO_BROLL_CLIP_NAMES.has(clipName) || inner.startsWith('raffle/')) {
    return {
      script: 'scripts/capture-walkthrough-videos.mjs',
      args: ['--promo-broll', `--clip=${clipName}`],
    };
  }

  return {
    script: 'scripts/capture-walkthrough-videos.mjs',
    args: ['--library', `--clip=${inner}`],
  };
}

const relPath = process.argv.find((a) => a.startsWith('--path='))?.split('=')[1];
if (!relPath) {
  console.error('Usage: node scripts/recapture-media-asset.mjs --path=<logical-path>');
  process.exit(1);
}

try {
  const plan = buildCaptureArgs(relPath);
  console.log(`Recapturing ${relPath}…\n`);
  runNode(plan.script, plan.args);
} catch (err) {
  console.error(err.message ?? err);
  process.exit(1);
}
