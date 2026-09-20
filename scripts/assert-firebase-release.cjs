const { readFileSync } = require('node:fs');

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function assertFirebaseRelease(log, options = {}) {
  // gh log exports render ESC as ^[; accept both exports and the raw tee output.
  const plain = log.replace(/(?:\x1b|\^\[)\[[0-9;]*m/g, '');
  if (/unable to queue the operation|failed to (?:update|create|deploy) function/i.test(plain)) {
    throw new Error('Firebase did not update the app backend. The CLI exit code alone is not a deployment confirmation.');
  }

  const expectedSitesRaw = options.expectedSites ?? process.env.FIREBASE_EXPECT_HOSTING_SITES ?? '';
  const expectedSites = Array.isArray(expectedSitesRaw)
    ? expectedSitesRaw.map((site) => String(site).trim()).filter(Boolean)
    : String(expectedSitesRaw)
        .split(',')
        .map((site) => site.trim())
        .filter(Boolean);

  if (expectedSites.length > 0) {
    for (const site of expectedSites) {
      const pattern = new RegExp(`hosting\\[${escapeRegExp(site)}\\]:\\s*release complete`, 'i');
      if (!pattern.test(plain)) {
        throw new Error(`Firebase did not confirm a Hosting release for ${site}. Refusing to mark this deployment successful.`);
      }
    }
    return;
  }

  if (!/hosting\[[^\]]+\]:\s*release complete/i.test(plain)) {
    throw new Error('Firebase did not confirm a Hosting release. Refusing to mark this deployment successful.');
  }
}

if (require.main === module) {
  try {
    assertFirebaseRelease(readFileSync(process.argv[2], 'utf8'));
    console.log('Firebase Hosting release confirmed.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { assertFirebaseRelease };
