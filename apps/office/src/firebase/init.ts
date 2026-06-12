'use client';

import { firebaseConfig } from '@/firebase/config';
import {
  getFirebaseEmulatorHost,
  parseEmulatorPort,
  shouldConnectFirebaseEmulators,
  shouldConnectFunctionsEmulator,
} from '@/firebase/emulatorConfig';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  browserSessionPersistence,
  connectAuthEmulator,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  connectFirestoreEmulator,
} from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

/** Must match `firebase deploy` function labels, e.g. `enrollStudentFace(us-central1)`. */
export const FIREBASE_CLOUD_FUNCTIONS_REGION = 'us-central1';

export function initializeFirebase() {
  const apps = getApps();
  if (apps.length) {
    return getSdks(apps[0]);
  }

  const firebaseApp = initializeApp(firebaseConfig);
  return getSdks(firebaseApp);
}

declare global {
  interface Window {
    __SCHOOL_ARCADE_FIREBASE_EMULATORS__?: boolean;
  }
}

function createAuth(firebaseApp: FirebaseApp, isBrowser: boolean) {
  if (!isBrowser) {
    return getAuth(firebaseApp);
  }

  try {
    return initializeAuth(firebaseApp, {
      // IndexedDB survives Safari ITP / storage-partitioned redirect returns better than sessionStorage alone.
      persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence],
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch (error) {
    const code = String((error as { code?: string })?.code ?? '');
    if (code === 'auth/already-initialized') {
      return getAuth(firebaseApp);
    }
    throw error;
  }
}

export function getSdks(firebaseApp: FirebaseApp) {
  const isBrowser = typeof window !== 'undefined';
  const useEmulators = isBrowser && shouldConnectFirebaseEmulators();
  const useFunctionsEmulatorOnly =
    isBrowser && !useEmulators && shouldConnectFunctionsEmulator();

  let firestore;

  try {
    if (useEmulators) {
      firestore = getFirestore(firebaseApp);
    } else if (isBrowser) {
      firestore = initializeFirestore(firebaseApp, {
        localCache: persistentLocalCache(),
      });
    } else {
      firestore = getFirestore(firebaseApp);
    }
  } catch {
    firestore = getFirestore(firebaseApp);
  }

  const auth = createAuth(firebaseApp, isBrowser);
  const functions = getFunctions(firebaseApp, FIREBASE_CLOUD_FUNCTIONS_REGION);
  const storageBucket =
    (firebaseConfig as { storageBucket?: string }).storageBucket || `${firebaseConfig.projectId}.appspot.com`;
  const storage = getStorage(firebaseApp, storageBucket);

  if (useEmulators && !window.__SCHOOL_ARCADE_FIREBASE_EMULATORS__) {
    const host = getFirebaseEmulatorHost();
    const ports = {
      auth: parseEmulatorPort('auth', process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_AUTH_PORT),
      firestore: parseEmulatorPort('firestore', process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_FIRESTORE_PORT),
      functions: parseEmulatorPort(
        'functions',
        process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_FUNCTIONS_PORT,
      ),
      storage: parseEmulatorPort('storage', process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_STORAGE_PORT),
    };

    connectAuthEmulator(auth, `http://${host}:${ports.auth}`, { disableWarnings: true });
    connectFirestoreEmulator(firestore, host, ports.firestore);
    connectFunctionsEmulator(functions, host, ports.functions);
    connectStorageEmulator(storage, host, ports.storage);

    console.info('[Firebase] Using local Emulator Suite:', { host, ports });

    window.__SCHOOL_ARCADE_FIREBASE_EMULATORS__ = true;
  } else if (useFunctionsEmulatorOnly && !window.__SCHOOL_ARCADE_FIREBASE_EMULATORS__) {
    const host = getFirebaseEmulatorHost();
    const port = parseEmulatorPort(
      'functions',
      process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_FUNCTIONS_PORT,
    );

    connectFunctionsEmulator(functions, host, port);

    console.info('[Firebase] Using local Functions emulator:', { host, port });

    window.__SCHOOL_ARCADE_FIREBASE_EMULATORS__ = true;
  } else if (isBrowser && process.env.NODE_ENV === 'development') {
    const w = window as Window & { __FIREBASE_LOGGED_PROD_CALLABLES__?: boolean };
    if (!w.__FIREBASE_LOGGED_PROD_CALLABLES__) {
      w.__FIREBASE_LOGGED_PROD_CALLABLES__ = true;
      console.info(
        `[Firebase] Callable functions → HTTPS (${FIREBASE_CLOUD_FUNCTIONS_REGION}, production project endpoints)`,
      );
      const h = window.location.hostname;
      if (h === 'localhost' || h === '127.0.0.1' || h === '[::1]') {
        const emu =
          process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === '1' ||
          process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === 'true' ||
          process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR === '1' ||
          process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR === 'true';
        if (!emu) {
          console.info(
            '[Firebase] If callables fail on localhost: deploy functions to this project, or set NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR=true (or NEXT_PUBLIC_FIREBASE_EMULATORS=true), run firebase emulators:start, restart next dev.',
          );
        }
      }
    }
  }

  return {
    firebaseApp,
    auth,
    firestore,
    functions,
    storage,
  };
}
