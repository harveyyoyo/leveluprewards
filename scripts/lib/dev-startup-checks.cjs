const fs = require('fs');
const net = require('net');
const path = require('path');

function appProjectIdFromSource(root) {
  try {
    const configPath = path.join(root, 'src', 'firebase', 'config.ts');
    const source = fs.readFileSync(configPath, 'utf8');
    return source.match(/projectId:\s*['"]([^'"]+)['"]/)?.[1] || null;
  } catch {
    return null;
  }
}

function parseServiceAccountProjectId(raw) {
  if (!raw || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw.trim());
    return parsed.project_id || parsed.projectId || null;
  } catch {
    return 'INVALID_JSON';
  }
}

function loadNextEnv(root) {
  try {
    require('@next/env').loadEnvConfig(root);
  } catch {
    // Next will still load env during boot; this preflight is best-effort.
  }
}

function warnIfFirebaseAdminCredentialLooksWrong(root) {
  loadNextEnv(root);

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw || !raw.trim()) return;

  const appProjectId = appProjectIdFromSource(root);
  const serviceAccountProjectId = parseServiceAccountProjectId(raw);

  if (serviceAccountProjectId === 'INVALID_JSON') {
    console.warn(
      '[dev:firebase] FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON. Local Admin API routes will fail.',
    );
    return;
  }

  if (appProjectId && serviceAccountProjectId && appProjectId !== serviceAccountProjectId) {
    console.warn(
      `[dev:firebase] FIREBASE_SERVICE_ACCOUNT_KEY is for ${serviceAccountProjectId}, but this app uses ${appProjectId}.`,
    );
    console.warn(
      '[dev:firebase] Replace the key or remove it locally; otherwise Admin-backed login/session routes may fail.\n',
    );
  }
}

function portProbe(host, port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', (error) => {
      if (error.code === 'EAFNOSUPPORT' || error.code === 'EINVAL') {
        resolve(false);
        return;
      }
      reject(error);
    });
    server.listen({ host, port, exclusive: true }, () => {
      server.close(() => resolve(true));
    });
  });
}

async function ensureLoopbackPortAvailable({ host, port }) {
  const n = Number(port);
  if (!Number.isInteger(n) || n <= 0) return;

  const hosts = new Set(['127.0.0.1', '::1']);
  if (host && host !== '0.0.0.0' && host !== '::') hosts.add(host);

  for (const probeHost of hosts) {
    try {
      await portProbe(probeHost, n);
    } catch (error) {
      if (error.code !== 'EADDRINUSE') throw error;
      const localhostHint =
        probeHost.includes(':') || probeHost === '::1'
          ? ' Chrome can prefer IPv6 for localhost, so this can steal Google OAuth redirects even when 127.0.0.1 is free.'
          : '';
      throw new Error(
        `Port ${n} is already in use on ${probeHost}.${localhostHint} Stop the other dev server or start this app with PORT=${n + 1}.`,
      );
    }
  }
}

module.exports = {
  ensureLoopbackPortAvailable,
  warnIfFirebaseAdminCredentialLooksWrong,
};
