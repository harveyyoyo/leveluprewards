/* LevelUp EDU service worker.
 *
 * This worker is deliberately online-first for pages and API reads so deploys
 * win over old cache entries. Offline support comes from falling back to the
 * last successful same-origin GET response and from Firebase's own IndexedDB
 * persistence inside the app.
 */

const VERSION = 'levelup-offline-v1';
const CACHE_PREFIX = 'levelup-';
const CACHES = {
  core: `${VERSION}-core`,
  pages: `${VERSION}-pages`,
  rsc: `${VERSION}-rsc`,
  static: `${VERSION}-static`,
  media: `${VERSION}-media`,
  api: `${VERSION}-api`,
};

const CORE_URLS = [
  '/manifest.json',
  '/logo.png',
  '/screenshot-wide.png',
  '/screenshot-mobile.png',
];

const MAX_ENTRIES = {
  [CACHES.pages]: 48,
  [CACHES.rsc]: 64,
  [CACHES.static]: 160,
  [CACHES.media]: 80,
  [CACHES.api]: 32,
};

const API_NETWORK_TIMEOUT_MS = 6000;

/** Local dev must never be controlled by this worker (stale SW breaks `next dev` / HMR). */
function isLocalDevHost(hostname = self.location.hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}
const LEGACY_CACHE_NAMES = new Set([
  'start-url',
  'google-fonts-webfonts',
  'google-fonts-stylesheets',
  'static-font-assets',
  'static-image-assets',
  'next-static-js-assets',
  'next-image',
  'static-audio-assets',
  'static-video-assets',
  'static-js-assets',
  'static-style-assets',
  'next-data',
  'static-data-assets',
  'apis',
  'pages-rsc-prefetch',
  'pages-rsc',
  'pages',
  'cross-origin',
]);

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHES.core)
      .then((cache) => cache.addAll(CORE_URLS))
      .catch(() => undefined),
  );
});

self.addEventListener('activate', (event) => {
  if (isLocalDevHost()) {
    event.waitUntil(
      caches
        .keys()
        .then((names) => Promise.all(names.map((name) => caches.delete(name))))
        .then(() => self.registration.unregister())
        .catch(() => undefined),
    );
    return;
  }

  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names.map((name) => {
            const belongsToLevelUp =
              name.startsWith(CACHE_PREFIX) || name.includes('workbox') || LEGACY_CACHE_NAMES.has(name);
            const current = Object.values(CACHES).includes(name);
            return belongsToLevelUp && !current ? caches.delete(name) : undefined;
          }),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'LEVELUP_CACHE_URLS') return;
  const urls = Array.isArray(event.data.urls) ? event.data.urls : [];
  event.waitUntil(
    Promise.all(
      urls
        .filter((url) => typeof url === 'string')
        .map((url) => networkFirst(new Request(url, { credentials: 'same-origin' }), CACHES.pages)),
    ),
  );
});

self.addEventListener('fetch', (event) => {
  if (isLocalDevHost()) return;

  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (!url.protocol.startsWith('http')) return;

  if (url.origin !== self.location.origin) {
    if (isCacheableCrossOriginAsset(url)) {
      event.respondWith(staleWhileRevalidate(request, CACHES.static));
    }
    return;
  }

  if (isAuthOrMutationLikeApi(url)) return;

  if (isNavigationRequest(request)) {
    event.respondWith(
      networkFirst(request, CACHES.pages, {
        event,
        ignoreSearchFallback: true,
        waitForCacheWrite: true,
      }),
    );
    return;
  }

  if (isRscRequest(request)) {
    event.respondWith(networkFirst(request, CACHES.rsc, { event }));
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, CACHES.api, { event, timeoutMs: API_NETWORK_TIMEOUT_MS }));
    return;
  }

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, CACHES.static, event));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(staleWhileRevalidate(request, isMediaAsset(url) ? CACHES.media : CACHES.static, event));
  }
});

function isNavigationRequest(request) {
  return request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html');
}

function isRscRequest(request) {
  return request.headers.get('RSC') === '1' || request.headers.get('Next-Router-Prefetch') === '1';
}

function isAuthOrMutationLikeApi(url) {
  return (
    url.pathname.startsWith('/api/auth/') ||
    url.pathname.startsWith('/api/generate-theme') ||
    url.pathname.startsWith('/api/parse-') ||
    url.pathname.startsWith('/api/extract-document') ||
    url.pathname.startsWith('/api/staff-help-chat') ||
    url.pathname.startsWith('/api/tech-support-message')
  );
}

function isStaticAsset(url) {
  return (
    /\.(?:css|js|mjs|json|png|jpg|jpeg|gif|svg|ico|webp|avif|woff2?|ttf|otf|eot|mp3|wav|ogg|mp4|webm|pdf)$/i.test(
      url.pathname,
    ) || url.pathname.startsWith('/_next/image')
  );
}

function isMediaAsset(url) {
  return /\.(?:png|jpg|jpeg|gif|svg|ico|webp|avif|mp3|wav|ogg|mp4|webm|pdf)$/i.test(url.pathname);
}

function isCacheableCrossOriginAsset(url) {
  return (
    /^https:\/\/fonts\.(?:googleapis|gstatic)\.com$/i.test(url.origin) ||
    /^https:\/\/(?:images\.unsplash\.com|picsum\.photos|placehold\.co|api\.dicebear\.com)$/i.test(url.origin)
  );
}

async function networkFirst(request, cacheName, options = {}) {
  const cache = await caches.open(cacheName);
  let timeoutId;
  try {
    const networkPromise = fetch(request);
    const response = await (options.timeoutMs
      ? Promise.race([
          networkPromise,
          new Promise((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error('network timeout')), options.timeoutMs);
          }),
        ])
      : networkPromise);

    if (timeoutId) clearTimeout(timeoutId);
    if (isCacheableResponse(response)) {
      const write = putCachedResponse(cache, request, response.clone(), cacheName);
      if (options.waitForCacheWrite) {
        await write;
      } else {
        options.event?.waitUntil(write);
      }
    }
    return response;
  } catch {
    if (timeoutId) clearTimeout(timeoutId);
    const cached = await cache.match(request);
    if (cached) return cached;

    if (options.ignoreSearchFallback) {
      const cachedIgnoringSearch = await cache.match(request, { ignoreSearch: true });
      if (cachedIgnoringSearch) return cachedIgnoringSearch;
    }

    if (isNavigationRequest(request)) {
      return offlineDocument();
    }

    throw new Error('offline and no cached response');
  }
}

async function cacheFirst(request, cacheName, event) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (isCacheableResponse(response)) {
    event?.waitUntil(putCachedResponse(cache, request, response.clone(), cacheName));
  }
  return response;
}

async function staleWhileRevalidate(request, cacheName, event) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const refresh = fetch(request)
    .then((response) => {
      if (isCacheableResponse(response)) {
        const write = putCachedResponse(cache, request, response.clone(), cacheName);
        event?.waitUntil(write);
      }
      return response;
    })
    .catch(() => undefined);

  if (cached) return cached;
  const response = await refresh;
  if (response) return response;
  throw new Error('offline and no cached response');
}

function putCachedResponse(cache, request, response, cacheName) {
  return cache
    .put(request, response)
    .then(() => trimCache(cacheName))
    .catch(() => undefined);
}

function isCacheableResponse(response) {
  return response && (response.status === 200 || response.status === 0 || response.type === 'opaqueredirect');
}

async function trimCache(cacheName) {
  const max = MAX_ENTRIES[cacheName];
  if (!max) return;

  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= max) return;

  await Promise.all(keys.slice(0, keys.length - max).map((request) => cache.delete(request)));
}

function offlineDocument() {
  return new Response(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Offline | levelUp EDU</title>
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f7faf9; color: #11231f; }
      main { width: min(520px, calc(100vw - 32px)); border: 1px solid #cfe5dd; background: white; border-radius: 8px; padding: 28px; box-shadow: 0 16px 40px rgba(17,35,31,.12); }
      h1 { margin: 0 0 8px; font-size: 1.5rem; }
      p { margin: 0; line-height: 1.5; color: #42554f; }
    </style>
  </head>
  <body>
    <main>
      <h1>Offline</h1>
      <p>This page has not been saved on this device yet. Reconnect once, open the kiosk or portal page, then it can be reopened offline.</p>
    </main>
    <script>
      (function () {
        var host = self.location.hostname;
        if (host !== '127.0.0.1' && host !== 'localhost' && host !== '[::1]') return;
        if (!('serviceWorker' in navigator)) return;
        navigator.serviceWorker.getRegistrations().then(function (regs) {
          return Promise.all(regs.map(function (r) { return r.unregister(); }));
        }).then(function () { self.location.reload(); });
      })();
    </script>
  </body>
</html>`,
    {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      status: 503,
      statusText: 'Offline',
    },
  );
}
