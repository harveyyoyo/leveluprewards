/**
 * Smoke test: office host redirects to portal login with an office-safe `next` URL.
 * Usage:
 *   node scripts/office-login-smoke.mjs
 *   OFFICE_BASE_URL=https://office.leveluprewards.app OFFICE_SCHOOL_ID=yeshiva node scripts/office-login-smoke.mjs
 */
const officeBase = (process.env.OFFICE_BASE_URL || 'https://office.leveluprewards.app').replace(/\/+$/, '');
const schoolId = (process.env.OFFICE_SCHOOL_ID || 'yeshiva').trim().toLowerCase();
const portalBase = (process.env.PORTAL_BASE_URL || 'https://portal.leveluprewards.app').replace(/\/+$/, '');

function fail(message, detail = '') {
  console.error(`[office-login-smoke] FAIL: ${message}`);
  if (detail) console.error(detail.slice(0, 2000));
  process.exit(1);
}

function ok(message) {
  console.log(`[office-login-smoke] OK: ${message}`);
}

async function main() {
  const officeSchoolUrl = `${officeBase}/${schoolId}`;
  console.log(`[office-login-smoke] Checking ${officeSchoolUrl} (no cookies)`);

  const res = await fetch(officeSchoolUrl, { redirect: 'manual' });
  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get('location') || '';
    if (!location) fail('Redirect had no Location header');

    const loginUrl = new URL(location, officeBase);
    ok(`Redirect → ${loginUrl.toString()}`);

    if (!loginUrl.hostname.includes('portal.') && !loginUrl.pathname.includes('/login')) {
      fail('Expected portal login redirect', location);
    }

    const next = loginUrl.searchParams.get('next') || '';
    const school = loginUrl.searchParams.get('school') || '';
    if (school.toLowerCase() !== schoolId) {
      fail(`Login school param mismatch: ${school} (expected ${schoolId})`);
    }

    const expectedOfficeNext = `${officeBase}/${schoolId}`;
    if (next !== expectedOfficeNext) {
      fail(`Login next param should be office URL`, `got: ${next}\nexpected: ${expectedOfficeNext}`);
    }
    ok(`next=${next}`);
  } else if (res.status === 200) {
    ok(`Edge enforcement relaxed (HTTP 200) — client gate handles sign-in`);
    const body = await res.text();
    if (!body.includes('School Office') && !body.includes('office')) {
      fail('Office school page did not render School Office content');
    }
  } else {
    fail(`Unexpected HTTP ${res.status} from office school URL`);
  }

  const rootRes = await fetch(`${officeBase}/`, { redirect: 'manual' });
  const rootLocation = rootRes.headers.get('location') || '';
  if (rootRes.status < 300 || rootRes.status >= 400 || !rootLocation.includes('office-bootstrap')) {
    fail(`Office root should redirect to office-bootstrap`, `status=${rootRes.status} location=${rootLocation}`);
  }
  ok(`Office root → ${rootLocation}`);

  console.log('[office-login-smoke] All checks passed.');
}

main().catch((err) => {
  fail(err?.message || String(err));
});
