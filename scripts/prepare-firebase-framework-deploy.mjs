import fs from 'fs';
import path from 'path';

const root = process.cwd();
const firebaseCacheDir = path.join(root, '.firebase');

function removeGeneratedFirebaseCache() {
  if (process.env.FIREBASE_DEPLOY_SSR_GUARD_PREPARED === '1') {
    console.log('[firebase-ssr-guard] .firebase packaging cache was already prepared by the safe deploy script.');
    return;
  }

  if (!fs.existsSync(firebaseCacheDir)) {
    console.log('[firebase-ssr-guard] No .firebase packaging cache found.');
    return;
  }

  const resolvedRoot = fs.realpathSync(root);
  const resolvedCache = fs.realpathSync(firebaseCacheDir);

  if (!resolvedCache.startsWith(resolvedRoot + path.sep)) {
    throw new Error(`Refusing to remove unexpected .firebase path: ${resolvedCache}`);
  }

  fs.rmSync(resolvedCache, { recursive: true, force: true });
  console.log('[firebase-ssr-guard] Removed generated .firebase packaging cache.');
}

removeGeneratedFirebaseCache();
