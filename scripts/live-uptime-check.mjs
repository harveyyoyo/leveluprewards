const DEFAULT_BASE_URL = 'https://levelupenterprises.education';

const baseUrl = (process.env.LIVE_UPTIME_BASE_URL || process.env.LIVE_AUTH_BASE_URL || DEFAULT_BASE_URL).replace(
  /\/+$/,
  '',
);
const schoolId = (process.env.LIVE_UPTIME_SCHOOL_ID || process.env.LIVE_AUTH_SCHOOL_ID || 'yeshiva')
  .trim()
  .toLowerCase();
const timeoutMs = Number(process.env.LIVE_UPTIME_TIMEOUT_MS || 15000);
const portalMode = (process.env.LIVE_UPTIME_PORTAL_MODE || 'any').trim().toLowerCase();

function fail(message, detail = '') {
  console.error(`[live-uptime] ${message}`);
  if (detail) console.error(detail.slice(0, 1500));
  process.exit(1);
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    fail(`Request failed: ${url}`, error instanceof Error ? error.message : String(error));
  } finally {
    clearTimeout(timeout);
  }
}

async function readText(response) {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

async function checkRedirectTarget(location) {
  const target = new URL(location, baseUrl).toString();
  const response = await fetchWithTimeout(target, { redirect: 'follow' });
  if (!response.ok) {
    fail(`Portal redirect target returned HTTP ${response.status}.`, target);
  }
  console.log(`[live-uptime] Portal redirect target returned ${response.status}: ${target}`);
}

async function checkHealth() {
  const response = await fetchWithTimeout(`${baseUrl}/api/health`);
  const body = await readText(response);
  if (!response.ok) {
    fail(`/api/health returned HTTP ${response.status}.`, body);
  }

  let json;
  try {
    json = JSON.parse(body);
  } catch {
    fail('/api/health did not return JSON.', body);
  }
  if (json?.status !== 'ok') {
    fail('/api/health did not report ok.', body);
  }
  if (json?.firebase === 'error') {
    fail('/api/health reported Firebase Admin error.', body);
  }
  console.log(`[live-uptime] /api/health returned ${response.status}; firebase=${json.firebase ?? 'unknown'}.`);
}

async function checkLogin() {
  const next = `/${schoolId}/portal`;
  const response = await fetchWithTimeout(
    `${baseUrl}/login?school=${encodeURIComponent(schoolId)}&next=${encodeURIComponent(next)}`,
  );
  const body = await readText(response);
  if (!response.ok) {
    fail('/login returned a non-OK response.', `HTTP ${response.status}\n${body}`);
  }
  if (!body.includes('/_next/static/') || !body.includes('/login')) {
    fail('/login did not render the expected Next.js login shell.', body);
  }
  console.log(`[live-uptime] /login rendered for ${schoolId}.`);
}

async function checkPortal() {
  const response = await fetchWithTimeout(`${baseUrl}/${schoolId}/portal`, { redirect: 'manual' });
  const location = response.headers.get('location') || '';

  if (portalMode === 'strict') {
    if (!(response.status >= 300 && response.status < 400) || !location.includes('/login')) {
      fail(`Portal strict-mode check expected redirect to /login. HTTP ${response.status}`, location);
    }
    console.log(`[live-uptime] /${schoolId}/portal redirected to ${location} in strict mode.`);
    return;
  }

  if (portalMode === 'any') {
    if (response.ok) {
      console.log(`[live-uptime] /${schoolId}/portal returned ${response.status}.`);
      return;
    }
    if (response.status >= 300 && response.status < 400 && location.includes('/login')) {
      console.log(`[live-uptime] /${schoolId}/portal redirected to ${location}.`);
      return;
    }
    if (response.status >= 300 && response.status < 400 && location) {
      await checkRedirectTarget(location);
      return;
    }
    fail(`Portal check failed. HTTP ${response.status}`, location || (await readText(response)));
  }

  if (response.status >= 300 && response.status < 400) {
    fail(`Portal unexpectedly redirected in public mode. HTTP ${response.status}`, location);
  }
  if (!response.ok) {
    fail(`Portal returned a non-OK response. HTTP ${response.status}`, await readText(response));
  }
  console.log(`[live-uptime] /${schoolId}/portal returned ${response.status}.`);
}

console.log(`[live-uptime] Checking ${baseUrl} for school "${schoolId}".`);
await checkHealth();
await checkLogin();
await checkPortal();
console.log('[live-uptime] Uptime checks passed.');
