/**
 * Block production builds while `next dev` is listening on PORT (default 3000).
 * Prevents corrupted .next output that breaks the live dev server.
 */
const { assertDevServerStopped } = require('./lib/dev-server-guard.cjs');

async function main() {
  try {
    await assertDevServerStopped({ action: 'npm run build' });
  } catch (error) {
    console.error(`[build-guard] ${error.message}`);
    process.exit(1);
  }
}

main();
