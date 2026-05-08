/**
 * Remove `.next` so Webpack dev/build output never mixes with Turbopack dev output
 * (avoids "Expected to use Turbopack bindings ... Webpack bindings" crashes).
 */
const fs = require('fs');
const path = require('path');

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

try {
  rmNextWithRetries(nextDir);
  console.log('[clean-next] Removed .next');
} catch (e) {
  console.error('[clean-next] Failed to remove .next:', (e && e.message) || e);
  process.exit(1);
}
