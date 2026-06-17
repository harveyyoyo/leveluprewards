const net = require('net');

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 3000;

function isGuardSkipped() {
  const flag = String(process.env.SKIP_DEV_SERVER_GUARD ?? '').trim().toLowerCase();
  return flag === '1' || flag === 'true' || flag === 'yes';
}

function isPortListening(host, port, timeoutMs = 600) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      try {
        socket.destroy();
      } catch {
        /* ignore */
      }
      resolve(value);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
}

async function isDevServerRunning({
  host = process.env.HOST || DEFAULT_HOST,
  port = Number(process.env.PORT || DEFAULT_PORT),
} = {}) {
  if (!Number.isInteger(port) || port <= 0) return false;

  const hosts = [...new Set([host, DEFAULT_HOST, 'localhost'])];
  for (const probeHost of hosts) {
    if (await isPortListening(probeHost, port)) return true;
  }
  return false;
}

async function assertDevServerStopped({
  action,
  host = process.env.HOST || DEFAULT_HOST,
  port = Number(process.env.PORT || DEFAULT_PORT),
} = {}) {
  if (isGuardSkipped()) return false;

  const running = await isDevServerRunning({ host, port });
  if (!running) return false;

  const label = action || 'This command';
  throw new Error(
    [
      `${label} cannot run while the local dev server is active on port ${port}.`,
      'Mixed writes to .next corrupt the dev server (blank pages, missing chunks, "missing required error components").',
      'Stop dev first, or run: npm run dev:recover',
      'Override only if you know what you are doing: SKIP_DEV_SERVER_GUARD=1',
    ].join('\n'),
  );
}

module.exports = {
  DEFAULT_HOST,
  DEFAULT_PORT,
  isGuardSkipped,
  isDevServerRunning,
  assertDevServerStopped,
};
