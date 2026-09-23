import { NextRequest, NextResponse } from 'next/server';
import { sameOriginCheck, verifyIdToken } from '@/lib/server/kioskSnapshotAuth';
import { formatPhotonAddress, type PhotonAddressProps } from '@/lib/office/officeAddress';

export const dynamic = 'force-dynamic';

/**
 * Address suggestions for Office forms, fetched server-side so staff browsers only talk to us.
 * Uses Google Places when `GOOGLE_PLACES_API_KEY` is set; otherwise the free, keyless Photon
 * geocoder (OpenStreetMap data, photon.komoot.io).
 */
export async function GET(req: NextRequest) {
  if (!sameOriginCheck(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const authHeader = req.headers.get('authorization') ?? '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!idToken || !(await verifyIdToken(idToken))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const q = (req.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 200);
  if (q.length < 3) return NextResponse.json({ suggestions: [] });

  try {
    const googleKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
    const suggestions = googleKey ? await googleSuggestions(q, googleKey) : await photonSuggestions(q);
    return NextResponse.json({ suggestions: Array.from(new Set(suggestions)).slice(0, 6) });
  } catch (e) {
    console.error('office address-suggest', e);
    // Suggestions are a convenience — typing the address by hand still works.
    return NextResponse.json({ suggestions: [] });
  }
}

async function googleSuggestions(q: string, key: string): Promise<string[]> {
  const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key },
    body: JSON.stringify({ input: q, includedPrimaryTypes: ['street_address', 'premise', 'subpremise', 'route'] }),
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) throw new Error(`Places ${res.status}`);
  const data = (await res.json()) as {
    suggestions?: Array<{ placePrediction?: { text?: { text?: string } } }>;
  };
  return (data.suggestions ?? []).map((s) => s.placePrediction?.text?.text ?? '').filter(Boolean);
}

async function photonSuggestions(q: string): Promise<string[]> {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8&lang=en`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'LevelUp School Office address lookup' },
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) throw new Error(`Photon ${res.status}`);
  const data = (await res.json()) as { features?: Array<{ properties?: PhotonAddressProps }> };
  return (data.features ?? [])
    .map((f) => (f.properties ? formatPhotonAddress(f.properties) : null))
    .filter((s): s is string => !!s);
}
