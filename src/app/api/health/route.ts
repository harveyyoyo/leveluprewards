import { NextResponse } from 'next/server';

/**
 * GET /api/health
 *
 * Lightweight health-check endpoint for uptime monitoring and deploy smoke tests.
 * Returns 200 with basic diagnostics. Does NOT require authentication.
 *
 * Usage:
 *   curl https://your-domain.com/api/health
 *   npm run test:live-auth  (existing smoke test can hit this first)
 */
export async function GET() {
  const now = Date.now();

  // Basic Firebase Admin SDK reachability check (lazy — only if the module is already loaded).
  let firebaseAdmin: 'ok' | 'unavailable' | 'error' = 'unavailable';
  try {
    const { getFirebaseAdminAuth } = await import('@/lib/server/firebaseAdminAuth');
    const auth = await getFirebaseAdminAuth();
    // A minimal call: listing 0 users just to verify the SDK can talk to Firebase.
    await auth.listUsers(1);
    firebaseAdmin = 'ok';
  } catch {
    firebaseAdmin = 'error';
  }

  return NextResponse.json({
    status: 'ok',
    timestamp: now,
    uptime: process.uptime(),
    firebase: firebaseAdmin,
    node: process.version,
    env: process.env.NODE_ENV ?? 'unknown',
  });
}
