import { NextRequest, NextResponse } from 'next/server';
import { sameOriginCheck, verifyIdToken } from '@/lib/server/kioskSnapshotAuth';
import { formatPhotonAddress, type PhotonAddressProps } from '@/lib/office/officeAddress';

export const dynamic = 'force-dynamic';

/**
 * Address → map position for Transportation (bus stops, the school). Uses the free, keyless
 * Photon geocoder (OpenStreetMap data), fetched server-side so staff browsers only talk to us.
 */
export async function GET(req: NextRequest) {
  if (!sameOriginCheck(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const authHeader = req.headers.get('authorization') ?? '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!idToken || !(await verifyIdToken(idToken))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const q = (req.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 200);
  if (q.length < 3) return NextResponse.json({ results: [] });
  const lat = Number(req.nextUrl.searchParams.get('lat'));
  const lng = Number(req.nextUrl.searchParams.get('lng'));
  // Prefer places near what the map is showing.
  const near = Number.isFinite(lat) && Number.isFinite(lng) && (lat || lng) ? `&lat=${lat}&lon=${lng}` : '';

  try {
    const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lang=en${near}`, {
      headers: { 'User-Agent': 'LevelUp School Office transportation' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`Photon ${res.status}`);
    const data = (await res.json()) as {
      features?: Array<{ properties?: PhotonAddressProps & { name?: string }; geometry?: { coordinates?: [number, number] } }>;
    };
    const results = (data.features ?? [])
      .map((f) => {
        const c = f.geometry?.coordinates;
        if (!c || !f.properties) return null;
        const label = formatPhotonAddress(f.properties) ?? f.properties.name ?? null;
        return label ? { label, lat: c[1], lng: c[0] } : null;
      })
      .filter((r): r is { label: string; lat: number; lng: number } => !!r);
    const seen = new Set<string>();
    return NextResponse.json({ results: results.filter((r) => !seen.has(r.label) && !!seen.add(r.label)).slice(0, 5) });
  } catch (e) {
    console.error('office geocode', e);
    // A convenience — staff can still drop a stop by tapping the map.
    return NextResponse.json({ results: [] });
  }
}
