'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth, User, getRedirectResult, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { Functions } from 'firebase/functions';
import { FirebaseStorage } from 'firebase/storage';
import { FirebaseErrorListener } from '@/firebase/FirebaseErrorListener';
import { hasPendingDeveloperGoogleRedirect } from '@/lib/googleAuthRedirect';

const waitForAuthUser = async (auth: Auth, maxMs: number): Promise<User | null> => {
  const stepMs = 100;
  const attempts = Math.ceil(maxMs / stepMs);
  for (let i = 0; i < attempts; i++) {
    if (auth.currentUser) return auth.currentUser;
    await new Promise((resolve) => setTimeout(resolve, stepMs));
  }
  return auth.currentUser;
};

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  functions: Functions;
  storage: FirebaseStorage;
}

// Internal state for user authentication
interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Combined state for the Firebase context
export interface FirebaseContextState {
  areServicesAvailable: boolean; // True if core services (app, firestore, auth instance) are provided
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null; // The Auth service instance
  functions: Functions | null;
  storage: FirebaseStorage | null;
  // User authentication state
  user: User | null;
  isUserLoading: boolean; // True during initial auth check
  userError: Error | null; // Error from auth listener
}

// Return type for useFirebase()
export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  functions: Functions;
  storage: FirebaseStorage;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Return type for useUser() - specific to user auth state
export interface UserHookResult { // Renamed from UserAuthHookResult for consistency if desired, or keep as UserAuthHookResult
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// React Context
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
  functions,
  storage,
}) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    isUserLoading: true,
    userError: null,
  });

  useEffect(() => {
    if (!auth) {
      setUserAuthState({ user: null, isUserLoading: false, userError: new Error("Auth service not available.") });
      return;
    }

    let cancelled = false;
    let bootstrapComplete = false;

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        if (cancelled) return;
        console.log("FirebaseProvider: onAuthStateChanged fired", firebaseUser ? "User found" : "No user");
        if (firebaseUser) {
          setUserAuthState({ user: firebaseUser, isUserLoading: false, userError: null });
        } else if (bootstrapComplete) {
          // User signed out after initial bootstrap finished.
          setUserAuthState({ user: null, isUserLoading: false, userError: null });
        }
      },
      (error) => {
        if (cancelled) return;
        console.error("FirebaseProvider: onAuthStateChanged error:", error);
        setUserAuthState({ user: null, isUserLoading: false, userError: error });
      }
    );

    void (async () => {
      let redirectUser: User | null = null;
      try {
        // Must finish pending Google/OAuth redirects before anonymous sign-in.
        // Otherwise redirect credentials are lost and /developer Google login loops forever.
        const redirectResult = await getRedirectResult(auth);
        redirectUser = redirectResult?.user ?? null;
        if (redirectUser && !cancelled) {
          setUserAuthState({ user: redirectUser, isUserLoading: false, userError: null });
        }
      } catch (error) {
        console.error("FirebaseProvider: getRedirectResult failed:", error);
        if (!cancelled) {
          setUserAuthState((prev) => ({
            ...prev,
            userError: error instanceof Error ? error : new Error(String(error)),
            isUserLoading: false,
          }));
        }
      }

      if (cancelled) return;
      bootstrapComplete = true;

      if (auth.currentUser) {
        return;
      }

      if (hasPendingDeveloperGoogleRedirect()) {
        const waitedUser = await waitForAuthUser(auth, 5_000);
        if (cancelled) return;
        if (waitedUser) {
          setUserAuthState({ user: waitedUser, isUserLoading: false, userError: null });
          return;
        }
        console.warn(
          'FirebaseProvider: pending Google redirect did not produce a signed-in user; continuing with anonymous bootstrap.',
        );
      }

      if (auth.currentUser) {
        return;
      }

      console.log("FirebaseProvider: No user found. Attempting anonymous sign-in...");
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("FirebaseProvider: Anonymous sign-in failed:", error);
        if (!cancelled) {
          setUserAuthState({
            user: null,
            isUserLoading: false,
            userError: error instanceof Error ? error : new Error(String(error)),
          });
        }
      }
    })();

    // Fail-safe timeout: Force isUserLoading to false if Firebase takes too long (> 10s)
    const timeoutId = setTimeout(() => {
      setUserAuthState(prev => {
        if (prev.isUserLoading) {
          console.warn("FirebaseProvider: Auth initialization timed out after 10s. Forcing Loading=false.");
          return { ...prev, isUserLoading: false };
        }
        return prev;
      });
    }, 10000);

    return () => {
      cancelled = true;
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [auth]);

  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth && functions && storage);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      functions: servicesAvailable ? functions : null,
      storage: servicesAvailable ? storage : null,
      user: userAuthState.user,
      isUserLoading: userAuthState.isUserLoading,
      userError: userAuthState.userError,
    };
  }, [firebaseApp, firestore, auth, functions, storage, userAuthState]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);

  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }

  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth || !context.functions) {
    throw new Error('Firebase core services not available. Check FirebaseProvider props.');
  }

  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
    functions: context.functions,
    storage: context.storage!,
    user: context.user,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
  };
};

export const useAuth = (): Auth => {
  const { auth } = useFirebase();
  return auth;
};

export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  return firestore;
};

export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  return firebaseApp;
};

export const useFunctions = (): Functions => {
  const { functions } = useFirebase();
  return functions;
}

export const useStorage = (): FirebaseStorage => {
  const { storage } = useFirebase();
  return storage;
}

type MemoFirebase<T> = T & { __memo?: boolean };

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoized = useMemo(factory, deps);

  if (typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;

  return memoized;
}

export const useUser = (): UserHookResult => {
  const { user, isUserLoading, userError } = useFirebase();
  return { user, isUserLoading, userError };
};
