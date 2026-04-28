'use client';

import { firebaseConfig } from '@/firebase/config';
import {
  getFirebaseEmulatorHost,
  parseEmulatorPort,
  shouldConnectFirebaseEmulators,
} from '@/firebase/emulatorConfig';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  connectFirestoreEmulator,
} from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

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

export function getSdks(firebaseApp: FirebaseApp) {
  const isBrowser = typeof window !== 'undefined';
  const useEmulators = isBrowser && shouldConnectFirebaseEmulators();

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

  const auth = getAuth(firebaseApp);
  const functions = getFunctions(firebaseApp);
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
  }

  return {
    firebaseApp,
    auth,
    firestore,
    functions,
    storage,
  };
}
