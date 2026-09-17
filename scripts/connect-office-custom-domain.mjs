/**
 * Prints the one-time Firebase Console steps to point office.leveluprewards.app
 * at the School Office hosting site (levelup-office), not the main rewards site.
 *
 * Usage: node scripts/connect-office-custom-domain.mjs
 */
const OFFICE_SITE = 'levelup-office';
const OFFICE_DOMAIN = 'office.leveluprewards.app';
const REWARDS_SITE = 'studio-1273073612-71183';
const PROJECT_ID = 'studio-1273073612-71183';

function pageKind(html) {
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() || '';
  if (title.includes('School Office') || html.includes('office-bootstrap')) return 'office';
  if (title.includes('levelUp EDU') || html.includes('LevelUp rewards hub')) return 'rewards';
  return 'unknown';
}

async function probe(url, { follow = false } = {}) {
  try {
    const res = await fetch(url, { redirect: follow ? 'follow' : 'manual' });
    const location = res.headers.get('location') || '';
    const body = res.status === 200 ? await res.text() : '';
    return {
      status: res.status,
      location,
      body,
      kind: body ? pageKind(body) : location.includes('office-bootstrap') ? 'office' : 'unknown',
      finalUrl: res.url,
    };
  } catch (error) {
    return { error: error?.message || String(error) };
  }
}

console.log('School Office live domain check\n');
console.log(`Project: ${PROJECT_ID}`);
console.log(`Office site id: ${OFFICE_SITE}`);
console.log(`Custom domain: ${OFFICE_DOMAIN}\n`);

const sampleSchool = (process.env.OFFICE_SCHOOL_ID || 'yeshiva').trim().toLowerCase();

const [custom, customFollow, customSchool, officeSite, officeSchool, rewardsSite] = await Promise.all([
  probe(`https://${OFFICE_DOMAIN}/`),
  probe(`https://${OFFICE_DOMAIN}/`, { follow: true }),
  probe(`https://${OFFICE_DOMAIN}/${sampleSchool}`),
  probe(`https://${OFFICE_SITE}.web.app/`),
  probe(`https://${OFFICE_SITE}.web.app/${sampleSchool}`),
  probe(`https://${REWARDS_SITE}.web.app/`, { follow: true }),
]);

function label(result) {
  if (result.error) return `error: ${result.error}`;
  const bits = [`HTTP ${result.status}`];
  if (result.location) bits.push(`→ ${result.location}`);
  if (result.kind === 'office') bits.push('(School Office)');
  if (result.kind === 'rewards') bits.push('(Rewards homepage)');
  return bits.join(' ');
}

console.log(`${OFFICE_DOMAIN}: ${label(custom)}`);
console.log(`${OFFICE_DOMAIN} (follow): ${label(customFollow)}`);
console.log(`${OFFICE_DOMAIN}/${sampleSchool}: ${label(customSchool)}`);
console.log(`${OFFICE_SITE}.web.app: ${label(officeSite)}`);
console.log(`${OFFICE_SITE}.web.app/${sampleSchool}: ${label(officeSchool)}`);
console.log(`${REWARDS_SITE}.web.app: ${label(rewardsSite)}`);

const customKind = customFollow.kind || custom.kind;
const officeSiteLooksCorrect = officeSite.kind === 'office';
const customLooksLikeRewards = customKind === 'rewards';
const customSchool404 = customSchool.status === 404;
const officeSchoolRedirects = officeSchool.status >= 300 && officeSchool.status < 400;

if (officeSiteLooksCorrect && customLooksLikeRewards) {
  console.log('\nDiagnosis: the office app is published on levelup-office, but the custom domain still points at the main rewards site.\n');
  console.log('Fix in Firebase Console (one time):');
  console.log(`  1. Open https://console.firebase.google.com/project/${PROJECT_ID}/hosting/sites`);
  console.log(`  2. Open site "${REWARDS_SITE}" → Custom domains → remove "${OFFICE_DOMAIN}" if listed`);
  console.log(`  3. Open site "${OFFICE_SITE}" → Add custom domain → "${OFFICE_DOMAIN}"`);
  console.log('  4. Follow the DNS verify steps if prompted (usually already correct)');
  console.log('  5. After deploy, run: npm run test:live-office');
} else if (officeSiteLooksCorrect && customKind === 'office') {
  console.log('\nDiagnosis: custom domain already serves School Office. Run npm run test:live-office to verify login flow.');
  if (customSchool404 && officeSchoolRedirects) {
    console.log(`\nNote: /${sampleSchool} on the custom domain returned 404 but the office site redirects — republish or wait for CDN after code fixes.`);
  }
} else {
  console.log('\nDiagnosis: deploy School Office first (merge + publish), then connect the custom domain to levelup-office.');
}
