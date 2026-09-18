import {
  GoogleAuthProvider,
  linkWithPopup,
  signInWithPopup,
  type Auth,
  type UserCredential,
} from 'firebase/auth';
import { refreshGoogleIdToken } from '@/lib/google/googleAuthSession';

/**
 * Prompt user to sign in with Google via popup, linking with any existing anonymous session.
 */
export async function signInWithGooglePopup(auth: Auth): Promise<UserCredential> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  const result = auth.currentUser?.isAnonymous
    ? await linkWithPopup(auth.currentUser, provider).catch((linkErr: unknown) => {
        const code = String((linkErr as { code?: string })?.code ?? '');
        if (code === 'auth/credential-already-in-use') {
          return signInWithPopup(auth, provider);
        }
        throw linkErr;
      })
    : await signInWithPopup(auth, provider);

  await refreshGoogleIdToken(result.user);
  return result;
}
