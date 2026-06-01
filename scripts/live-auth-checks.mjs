const DEFAULT_FIREBASE_API_KEY = 'AIzaSyBUH3r37IqZkJ9SmvWaaAJ5HU29Wa_hJLY';

export function liveAuthConfig() {
  const baseUrl = (process.env.LIVE_AUTH_BASE_URL || 'https://leveluprewards.app').replace(/\/+$/, '');
  const schoolId = (process.env.LIVE_AUTH_SCHOOL_ID || 'yeshiva').trim().toLowerCase();
  const passcode = process.env.LIVE_AUTH_PASSCODE || '1234';
  const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || DEFAULT_FIREBASE_API_KEY;
  return { baseUrl, schoolId, passcode, firebaseApiKey };
}

export async function createAnonymousIdToken(firebaseApiKey) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(firebaseApiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnSecureToken: true }),
    },
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok || typeof body.idToken !== 'string') {
    throw new Error(`Could not create anonymous Firebase test user. HTTP ${response.status}`);
  }
  return body.idToken;
}

/** Direct HTTP check for the SSR school-access route (must not 503 after deploy). */
export async function verifySchoolAccessApiRoute({ baseUrl, schoolId, passcode, idToken }) {
  const response = await fetch(`${baseUrl}/api/auth/verify-school-access`, {
    method: 'POST',
    headers: {
      Origin: baseUrl,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ idToken, schoolId, passcode }),
  });
  const body = await response.text();
  return { response, body };
}
