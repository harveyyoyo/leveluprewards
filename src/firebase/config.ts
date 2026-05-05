/**
 * Default web SDK values for this Firebase project (from `firebase apps:sdkconfig WEB`).
 * The API key is a public client identifier; restrict abuse via Firebase App Check and
 * HTTP referrer / API key restrictions in Google Cloud Console.
 *
 * Override with NEXT_PUBLIC_FIREBASE_* at build time for forks or alternate projects.
 */
const defaultWebApiKey = 'AIzaSyBUH3r37IqZkJ9SmvWaaAJ5HU29Wa_hJLY';
const defaultStorageBucket = 'studio-1273073612-71183.firebasestorage.app';

function validFirebaseApiKey(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  // Firebase web API keys currently use the AIza + 35 URL-safe character shape.
  // Ignore placeholders or accidentally injected non-Firebase values so deployed
  // SSR cannot crash before the client app renders.
  if (/^AIza[0-9A-Za-z_-]{35}$/.test(trimmed)) {
    return trimmed;
  }

  return undefined;
}

export const firebaseConfig = {
  projectId: 'studio-1273073612-71183',
  appId: '1:12494403927:web:60c2e4367b55c7921ee612',
  apiKey: validFirebaseApiKey(process.env.NEXT_PUBLIC_FIREBASE_API_KEY) || defaultWebApiKey,
  authDomain: 'studio-1273073612-71183.firebaseapp.com',
  databaseURL: 'https://studio-1273073612-71183.firebaseio.com',
  measurementId: '',
  messagingSenderId: '12494403927',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || defaultStorageBucket,
};
