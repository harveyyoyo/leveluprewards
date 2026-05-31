export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

type LatLonLocation = {
  latitude: number;
  longitude: number;
  city?: string;
  region?: string;
  country?: string;
  source: 'zip' | 'ip';
};

const WEATHER_LABELS: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mostly clear',
  2: 'Partly cloudy',
  3: 'Cloudy',
  45: 'Fog',
  48: 'Freezing fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Heavy drizzle',
  56: 'Freezing drizzle',
  57: 'Freezing drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  66: 'Freezing rain',
  67: 'Freezing rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Rain showers',
  81: 'Rain showers',
  82: 'Heavy showers',
  85: 'Snow showers',
  86: 'Snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm',
  99: 'Thunderstorm',
};

function cleanZip(value: string | null) {
  const zip = (value || '').trim();
  return /^\d{5}$/.test(zip) ? zip : '';
}

function requestIp(req: NextRequest) {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const real = req.headers.get('x-real-ip')?.trim();
  const cf = req.headers.get('cf-connecting-ip')?.trim();
  return forwarded || real || cf || '';
}

function publicIpOrBlank(ip: string) {
  const value = ip.trim().replace(/^::ffff:/, '');
  if (
    !value ||
    value === '::1' ||
    value === '127.0.0.1' ||
    value.startsWith('10.') ||
    value.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(value)
  ) {
    return '';
  }
  return value;
}

async function locationFromZip(zip: string): Promise<LatLonLocation | null> {
  const response = await fetch(`https://api.zippopotam.us/us/${encodeURIComponent(zip)}`, {
    next: { revalidate: 3600 },
  });
  if (!response.ok) return null;
  const data = (await response.json()) as {
    places?: Array<{
      latitude?: string;
      longitude?: string;
      'place name'?: string;
      state?: string;
      'state abbreviation'?: string;
    }>;
  };
  const place = data.places?.[0];
  const latitude = Number(place?.latitude);
  const longitude = Number(place?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    latitude,
    longitude,
    city: place?.['place name'],
    region: place?.['state abbreviation'] || place?.state,
    country: 'US',
    source: 'zip',
  };
}

async function locationFromIp(req: NextRequest): Promise<LatLonLocation | null> {
  const ip = publicIpOrBlank(requestIp(req));
  const params = new URLSearchParams({
    fields: 'status,message,country,regionName,city,lat,lon',
  });
  const url = ip
    ? `http://ip-api.com/json/${encodeURIComponent(ip)}?${params.toString()}`
    : `http://ip-api.com/json/?${params.toString()}`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) return null;
  const data = (await response.json()) as {
    status?: string;
    lat?: number | string;
    lon?: number | string;
    city?: string;
    regionName?: string;
    country?: string;
  };
  if (data.status && data.status !== 'success') return null;
  const latitude = Number(data.lat);
  const longitude = Number(data.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    latitude,
    longitude,
    city: data.city,
    region: data.regionName,
    country: data.country,
    source: 'ip',
  };
}

async function weatherForLocation(location: LatLonLocation) {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: 'temperature_2m,weather_code',
    temperature_unit: 'fahrenheit',
    timezone: 'auto',
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
    next: { revalidate: 600 },
  });
  if (!response.ok) throw new Error('weather fetch failed');
  const data = (await response.json()) as {
    timezone?: string;
    current?: {
      temperature_2m?: number;
      weather_code?: number;
      time?: string;
    };
  };
  const code = Number(data.current?.weather_code);
  const temperature = Number(data.current?.temperature_2m);
  return {
    timeZone: data.timezone || '',
    temperatureF: Number.isFinite(temperature) ? Math.round(temperature) : null,
    condition: Number.isFinite(code) ? WEATHER_LABELS[code] || 'Current weather' : 'Current weather',
    observedAt: data.current?.time || null,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const zip = cleanZip(searchParams.get('zip'));

  try {
    const location = zip ? await locationFromZip(zip) : await locationFromIp(req);
    if (!location) {
      return NextResponse.json(
        { ok: false, error: zip ? 'ZIP code not found' : 'Location unavailable' },
        { status: zip ? 404 : 200 },
      );
    }

    const weather = await weatherForLocation(location);
    return NextResponse.json({
      ok: true,
      source: location.source,
      locationName: [location.city, location.region].filter(Boolean).join(', '),
      country: location.country || '',
      latitude: location.latitude,
      longitude: location.longitude,
      ...weather,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Weather unavailable' },
      { status: 200 },
    );
  }
}
