/**
 * Remove `.next` so Webpack dev/build output never mixes with Turbopack dev output
 * (avoids "Expected to use Turbopack bindings ... Webpack bindings" crashes).
 *
 * Refuses to run while `next dev` is listening unless SKIP_DEV_SERVER_GUARD=1.
 */
const fs = require('fs');
const path = require('path');
const { assertDevServerStopped } = require('./lib/dev-server-guard.cjs');

const root = path.join(__dirname, '..');
const nextDir = path.join(root, '.next');

function sleepMs(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    /* spin — avoids adding async to callers */
  }
}

function rmNextWithRetries(dir, attempts = 5) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
      return;
    } catch (e) {
      lastErr = e;
      sleepMs(150 * (i + 1));
    }
  }
  throw lastErr;
}

async function main() {
  try {
    await assertDevServerStopped({ action: 'npm run clean:next' });
  } catch (error) {
    console.error(`[clean-next] ${error.message}`);
    process.exit(1);
  }

  try {
    rmNextWithRetries(nextDir);
    console.log('[clean-next] Removed .next');
  } catch (e) {
    console.error('[clean-next] Failed to remove .next:', (e && e.message) || e);
    process.exit(1);
  }
}

main();
