import { NextResponse } from 'next/server';

/**
 * Reports which integration env vars are set (never returns secret values).
 * Extend with real OAuth checks when Google / Clever / ClassLink are wired.
 */
export async function GET() {
  const googleClassroomConfigured = !!(
    process.env.GOOGLE_CLASSROOM_CLIENT_ID &&
    process.env.GOOGLE_CLASSROOM_CLIENT_SECRET &&
    process.env.GOOGLE_CLASSROOM_REFRESH_TOKEN
  );
  const cleverConfigured = !!(process.env.CLEVER_CLIENT_ID && process.env.CLEVER_CLIENT_SECRET);
  const classlinkConfigured = !!(
    process.env.CLASSLINK_CLIENT_ID && process.env.CLASSLINK_CLIENT_SECRET
  );

  return NextResponse.json({
    googleClassroomConfigured,
    cleverConfigured,
    classlinkConfigured,
    message:
      'Set the listed environment variables on your Next.js host (or Firebase) to enable server-side roster sync.',
  });
}
