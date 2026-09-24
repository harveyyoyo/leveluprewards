#!/usr/bin/env node
/**
 * Send one test GPS update to a local tracker endpoint.
 * The private key is read from the command line or GPS_DEVICE_KEY and is never printed.
 *
 * Example:
 *   node scripts/simulate-gps-tracker.mjs --school yeshiva --trip 2026-09-24_route-am --device gpd_xxx --key gpk_xxx --lat 40.7 --lng -74.3
 */
const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i];
  if (!arg.startsWith('--')) continue;
  const key = arg.slice(2);
  const value = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : 'true';
  args.set(key, value);
}

const required = ['school', 'trip', 'device', 'key', 'lat', 'lng'];
for (const key of required) {
  if (!args.get(key)) {
    console.error(`Missing --${key}`);
    process.exit(2);
  }
}

const base = args.get('base') || 'http://127.0.0.1:3001';
const sequence = Number(args.get('sequence') || Date.now());
const response = await fetch(`${base.replace(/\/$/, '')}/api/office/transport/telemetry`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-GPS-Device-Id': args.get('device'),
    'X-GPS-Device-Key': args.get('key'),
  },
  body: JSON.stringify({
    schoolId: args.get('school'),
    tripId: args.get('trip'),
    sampleId: `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sessionId: args.get('session') || `test-session-${Date.now()}`,
    sequence: Number.isFinite(sequence) ? sequence : Date.now(),
    recordedAt: Date.now(),
    lat: Number(args.get('lat')),
    lng: Number(args.get('lng')),
    accuracyM: args.has('accuracy') ? Number(args.get('accuracy')) : 10,
    speedMps: args.has('speed') ? Number(args.get('speed')) : 7,
    headingDeg: args.has('heading') ? Number(args.get('heading')) : 90,
  }),
});
const data = await response.json().catch(() => ({}));
console.log(JSON.stringify({ status: response.status, ...data }, null, 2));
if (!response.ok) process.exit(1);
