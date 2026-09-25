/**
 * Smoke test: School Office entry URL (main site or optional office subdomain).
 * Usage:
 *   node scripts/office-login-smoke.mjs
 *   OFFICE_BASE_URL=https://leveluprewards.app OFFICE_SCHOOL_ID=yeshiva node scripts/office-login-smoke.mjs
 */
const officeBase = (process.env.OFFICE_BASE_URL || 'https://leveluprewards.app').replace(/\/+$/, '');
const schoolId = (process.env.OFFICE_SCHOOL_ID || 'yeshiva').trim().toLowerCase();
const portalBase = (process.env.PORTAL_BASE_URL || 'https://leveluprewards.app').replace(/\/+$/, '');
const useMainSiteOfficePath = process.env.OFFICE_MAIN_SITE_PATH !== '0';

function officeSchoolUrl() {
  return useMainSiteOfficePath
    ? `${officeBase}/${schoolId}/office`
    : `${officeBase}/${schoolId}`;
}

function expectedLoginNextUrl() {
  return officeSchoolUrl();
}

function fail(message, detail = '') {
  console.error(`[office-login-smoke] FAIL: ${message}`);
  if (detail) console.error(detail.slice(0, 2000));
  process.exit(1);
}

function ok(message) {
  console.log(`[office-login-smoke] OK: ${message}`);
}

async function main() {
  const targetUrl = officeSchoolUrl();
  console.log(`[office-login-smoke] Checking ${targetUrl} (no cookies)`);

  const res = await fetch(targetUrl, { redirect: 'manual' });
  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get('location') || '';
    if (!location) fail('Redirect had no Location header');

    const loginUrl = new URL(location, officeBase);
    ok(`Redirect → ${loginUrl.toString()}`);

    if (!loginUrl.pathname.includes('/login')) {
      fail('Expected login redirect', location);
    }

    const next = loginUrl.searchParams.get('next') || '';
    const school = loginUrl.searchParams.get('school') || '';
    if (school.toLowerCase() !== schoolId) {
      fail(`Login school param mismatch: ${school} (expected ${schoolId})`);
    }

    const expectedOfficeNext = expectedLoginNextUrl();
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

  if (!useMainSiteOfficePath) {
    const rootRes = await fetch(`${officeBase}/`, { redirect: 'manual' });
    const rootLocation = rootRes.headers.get('location') || '';
    if (rootRes.status < 300 || rootRes.status >= 400 || !rootLocation.includes('office-bootstrap')) {
      fail(`Office root should redirect to office-bootstrap`, `status=${rootRes.status} location=${rootLocation}`);
    }
    ok(`Office root → ${rootLocation}`);
  } else {
    ok(`Main-site mode — skipping office-bootstrap root check (${portalBase})`);
  }

  console.log('[office-login-smoke] All checks passed.');
}

main().catch((err) => {
  fail(err?.message || String(err));
});
