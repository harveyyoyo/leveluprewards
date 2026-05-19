/**
 * Captures many walkthrough variants into promo-video/public/capture-library/
 * for choosing the best takes. Skips/retry when error toasts or failure UI appear.
 *
 * Usage:
 *   node scripts/capture-walkthrough-library.mjs
 *   node scripts/capture-walkthrough-library.mjs --refresh-auth
 *   node scripts/capture-walkthrough-library.mjs --category=student-kiosk
 *   node scripts/capture-walkthrough-library.mjs --promote-defaults
 */

import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CAPTURE_SCRIPT = path.join(__dirname, 'capture-walkthrough-videos.mjs');

const argv = process.argv.slice(2);
const refreshAuth = argv.includes('--refresh-auth');
const promoteDefaults = argv.includes('--promote-defaults');
const categoryFilter = argv.find((a) => a.startsWith('--category='))?.split('=')[1];

const args = ['--library'];
if (refreshAuth) args.push('--refresh-auth');
if (categoryFilter) args.push(`--category=${categoryFilter}`);
if (promoteDefaults) args.push('--promote-defaults');

console.log(`Running: node ${path.basename(CAPTURE_SCRIPT)} ${args.join(' ')}\n`);

const result = spawnSync(process.execPath, [CAPTURE_SCRIPT, ...args], {
  cwd: ROOT,
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status ?? 1);
