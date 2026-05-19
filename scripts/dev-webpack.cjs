/**
 * Default local dev launcher (Webpack `next dev`).
 *
 * - Binds 127.0.0.1 (reliable on Windows; use HOST=0.0.0.0 for LAN/tunnel).
 * - Does NOT delete `.next` on every start (that caused missing chunk errors like ./1682.js).
 * - Run `npm run dev:reset` when the dev graph is corrupt (blank page / MODULE_NOT_FOUND).
 */
const { spawn } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const port = String(process.env.PORT || '3000').trim() || '3000';
const host = String(process.env.HOST || '127.0.0.1').trim() || '127.0.0.1';
const nextCli = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');

console.log(`[dev] http://${host}:${port}`);
console.log('[dev] If pages are blank or you see Cannot find module ./*.js → npm run dev:reset\n');

const child = spawn(process.execPath, [nextCli, 'dev', '-H', host, '-p', port], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code) => process.exit(code ?? 0));
