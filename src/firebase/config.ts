/**
 * Default web SDK values for this Firebase project (from `firebase apps:sdkconfig WEB`).
 * The API key is a public client identifier; restrict abuse via Firebase App Check and
 * HTTP referrer / API key restrictions in Google Cloud Console.
 *
 * Override with NEXT_PUBLIC_FIREBASE_* at build time for forks or alternate projects.
 */
const defaultWebApiKey = 'AIzaSyBUH3r37IqZkJ9SmvWaaAJ5HU29Wa_hJLY';
const defaultStorageBucket = 'studio-1273073612-71183.firebasestorage.app';

export const firebaseConfig = {
  projectId: 'studio-1273073612-71183',
  appId: '1:12494403927:web:60c2e4367b55c7921ee612',
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || defaultWebApiKey,
  authDomain: 'studio-1273073612-71183.firebaseapp.com',
  databaseURL: 'https://studio-1273073612-71183.firebaseio.com',
  measurementId: '',
  messagingSenderId: '12494403927',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || defaultStorageBucket,
};
