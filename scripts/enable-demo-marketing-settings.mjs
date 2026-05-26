/**
 * Enables add-on flags on demo school(s) for marketing screenshots.
 * Requires FIREBASE_SERVICE_ACCOUNT_KEY in .env.local
 */
import { patchDemoMarketingSettings } from './lib/demo-marketing-settings.mjs';

patchDemoMarketingSettings()
  .then((ok) => {
    if (!ok) {
      console.error('FIREBASE_SERVICE_ACCOUNT_KEY missing in .env.local');
      process.exit(1);
    }
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
