/**
 * Quick health check for local dev (port 3000 + /login).
 * Usage: npm run dev:doctor
 */
const host = process.env.HOST || '127.0.0.1';
const port = process.env.PORT || '3000';
const base = `http://${host}:${port}`;

async function check(path) {
  const url = `${base}${path}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(45000) });
    const text = await res.text();
    const ok = res.ok && /LevelUp|School Login|Sign in/i.test(text);
    console.log(`${res.status} ${path} ${ok ? 'OK' : 'unexpected body'}`);
    return res.ok;
  } catch (e) {
    console.log(`FAIL ${path} — ${e.message}`);
    return false;
  }
}

console.log(`Checking ${base} …\n`);
const home = await check('/');
const login = await check('/login');

if (!home && !login) {
  console.log('\nDev server not healthy. Try:');
  console.log('  1. Stop all terminals running next dev');
  console.log('  2. npm run dev:reset');
  console.log('  3. npm run dev:doctor');
  process.exit(1);
}

if (!login) {
  console.log('\n/login failed — run: npm run dev:reset');
  process.exit(1);
}

console.log('\nLocal dev looks healthy.');
