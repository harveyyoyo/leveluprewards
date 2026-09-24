import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminFirestore } from '@/lib/server/firebaseAdminAuth';
import { clientIp, rateLimit } from '@/lib/server/apiSecurity';
import { latestTripForRoute, transportPhoneStatusText } from '@/lib/office/officeTransport';
import type { OfficeBusRoute, OfficeBusRun, OfficeBusTrip } from '@/lib/office/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SCHOOL_ID_RE = /^[a-z0-9_-]{1,80}$/;
const ROUTE_ID_RE = /^[A-Za-z0-9_-]{1,120}$/;

type ResponseFormat = 'json' | 'twilio';

function responseHeaders(contentType = 'application/json'): HeadersInit {
  return { 'Cache-Control': 'no-store', 'Content-Type': contentType };
}

function tokenMatches(expected: string, actual: string): boolean {
  const expectedBytes = Buffer.from(expected);
  const actualBytes = Buffer.from(actual);
  return expectedBytes.length === actualBytes.length && timingSafeEqual(expectedBytes, actualBytes);
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function requestToken(req: NextRequest): string {
  const bearer = req.headers.get('authorization') ?? '';
  if (bearer.startsWith('Bearer ')) return bearer.slice(7).trim();
  return (req.headers.get('x-phone-status-token') ?? '').trim();
}

function parseRun(value: string | null): OfficeBusRun {
  if (value === 'am' || value === 'pm') return value;
  return new Date().getHours() >= 12 ? 'pm' : 'am';
}

export async function GET(req: NextRequest) {
  if (!rateLimit(`office-phone-status:${clientIp(req)}`, 60)) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429, headers: responseHeaders() });
  }

  const expectedToken = process.env.TRANSPORT_PHONE_STATUS_TOKEN?.trim();
  if (!expectedToken) {
    return NextResponse.json({ error: 'Phone status is not set up yet.' }, { status: 503, headers: responseHeaders() });
  }
  if (!tokenMatches(expectedToken, requestToken(req))) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401, headers: responseHeaders() });
  }

  const schoolId = (req.nextUrl.searchParams.get('schoolId') ?? '').trim().toLowerCase();
  const routeId = (req.nextUrl.searchParams.get('routeId') ?? '').trim();
  const formatParam = (req.nextUrl.searchParams.get('format') ?? 'json').trim().toLowerCase();
  if (!SCHOOL_ID_RE.test(schoolId) || !ROUTE_ID_RE.test(routeId)) {
    return NextResponse.json({ error: 'A valid school and route are required.' }, { status: 400, headers: responseHeaders() });
  }
  if (formatParam !== 'json' && formatParam !== 'twilio') {
    return NextResponse.json({ error: 'The requested format is not supported.' }, { status: 400, headers: responseHeaders() });
  }
  const format: ResponseFormat = formatParam;

  try {
    const firestore = await getFirebaseAdminFirestore();
    const routeRef = firestore.collection('schools').doc(schoolId).collection('officeBusRoutes').doc(routeId);
    const routeSnap = await routeRef.get();
    if (!routeSnap.exists) {
      return NextResponse.json({ error: 'That bus route was not found.' }, { status: 404, headers: responseHeaders() });
    }
    const route = { id: routeSnap.id, ...routeSnap.data() } as OfficeBusRoute;
    const run = parseRun(req.nextUrl.searchParams.get('run'));
    const tripSnap = await firestore.collection('schools').doc(schoolId).collection('officeBusTrips').where('routeId', '==', routeId).limit(100).get();
    const trips = tripSnap.docs.map((snapshot) => ({ id: snapshot.id, ...snapshot.data() } as OfficeBusTrip));
    const trip = latestTripForRoute(trips, routeId, run);
    const status = transportPhoneStatusText(route, trip);

    if (format === 'twilio') {
      const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say>${escapeXml(status.text)}</Say></Response>`;
      return new NextResponse(xml, { status: 200, headers: responseHeaders('text/xml; charset=utf-8') });
    }
    return NextResponse.json(status, { status: 200, headers: responseHeaders() });
  } catch {
    return NextResponse.json({ error: 'The phone status is temporarily unavailable.' }, { status: 503, headers: responseHeaders() });
  }
}
