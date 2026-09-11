const { readFileSync } = require('node:fs');

function assertFirebaseRelease(log) {
  // gh log exports render ESC as ^[; accept both exports and the raw tee output.
  const plain = log.replace(/(?:\x1b|\^\[)\[[0-9;]*m/g, '');
  if (/unable to queue the operation|failed to (?:update|create|deploy) function/i.test(plain)) {
    throw new Error('Firebase did not update the app backend. The CLI exit code alone is not a deployment confirmation.');
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
