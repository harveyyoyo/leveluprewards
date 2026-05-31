/**
 * Quick health check for local dev (port 3000 + /login).
 * Usage: npm run dev:doctor
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { warnIfFirebaseAdminCredentialLooksWrong } from './lib/dev-startup-checks.cjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const configuredHost = process.env.HOST || '127.0.0.1';
const port = process.env.PORT || '3000';
const hosts = [...new Set([configuredHost, '127.0.0.1', 'localhost'])];

async function check(base, route) {
  const url = `${base}${route}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(45000) });
    const text = await res.text();
    const ok = res.ok && /LevelUp|School Login|School Rewards System|Sign in/i.test(text);
    console.log(`${res.status} ${url} ${ok ? 'OK' : 'unexpected body'}`);
    return ok;
  } catch (e) {
    console.log(`FAIL ${url} - ${e.message}`);
    return false;
  }
}

warnIfFirebaseAdminCredentialLooksWrong(root);
console.log(`Checking local dev on port ${port}...\n`);

const results = [];
for (const host of hosts) {
  const base = `http://${host}:${port}`;
  const home = await check(base, '/');
  const login = await check(base, '/login');
  results.push({ host, home, login });
}

const configured = results.find((r) => r.host === configuredHost);
const localhost = results.find((r) => r.host === 'localhost');

if (!configured?.home && !configured?.login) {
  console.log('\nDev server not healthy. Try:');
  console.log('  1. Stop all terminals running next dev');
  console.log('  2. npm run dev:reset');
  console.log('  3. npm run dev:doctor');
  process.exit(1);
}

if (!configured?.login) {
  console.log('\n/login failed on the configured host - run: npm run dev:reset');
  process.exit(1);
}

if (localhost && !localhost.login) {
  console.log(
    '\nlocalhost does not route to this app. Another process may own IPv6 localhost:3000; stop it before using Google sign-in.',
  );
  process.exit(1);
}

console.log('\nLocal dev looks healthy.');
