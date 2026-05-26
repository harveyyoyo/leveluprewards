import { spawnSync } from 'child_process';

const PROJECT_ID = 'studio-1273073612-71183';
const LIVE_URL = `https://${PROJECT_ID}.web.app`;
const AUTH_SMOKE_URL = process.env.LIVE_AUTH_BASE_URL || 'https://leveluprewards.app';
const EXPECTED_TEXT = 'School Login';

function run(command, args, options = {}) {
  console.log(`\n$ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function verifyLiveSite() {
  console.log(`\n[firebase-ssr-guard] Verifying ${LIVE_URL}`);
  const response = await fetch(LIVE_URL, { redirect: 'follow' });
  const body = await response.text();

  if (!response.ok) {
    console.error(`[firebase-ssr-guard] Live site returned HTTP ${response.status}.`);
    console.error(body.slice(0, 1000));
    process.exit(1);
  }

  if (!body.includes(EXPECTED_TEXT)) {
    console.error(`[firebase-ssr-guard] Live site did not contain expected text: ${EXPECTED_TEXT}`);
    console.error(body.slice(0, 1000));
    process.exit(1);
  }

  console.log(`[firebase-ssr-guard] Live site returned ${response.status} and rendered expected page text.`);
}

run('node', ['scripts/prepare-firebase-framework-deploy.mjs']);
run('npm', ['ci', '--prefix', 'functions']);
run('npm', ['run', 'build']);
run('npx', ['firebase-tools', 'deploy', '--only', 'hosting', '--project', PROJECT_ID], {
  env: {
    ...process.env,
    FIREBASE_DEPLOY_SSR_GUARD_PREPARED: '1',
  },
});

await verifyLiveSite();
run('node', ['scripts/live-auth-smoke.mjs'], {
  env: {
    ...process.env,
    LIVE_AUTH_BASE_URL: AUTH_SMOKE_URL,
  },
});
