import { getAuth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import {
  createBehaviorNote,
  listBehaviorNotes,
  type CreateBehaviorNoteInput,
} from '@/lib/db/behaviorNotes';
import type { BehaviorNote } from '@/lib/types';
import { parseBehaviorNoteCreatedAt } from '@/lib/classroom/behaviorNoteTime';

export type SaveBehaviorNoteRequest = CreateBehaviorNoteInput & {
  schoolId: string;
  shareToBulletinBoard?: boolean;
};

export type SaveBehaviorNoteResult = {
  success: boolean;
  message: string;
  id?: string;
  bulletinPosted?: boolean;
  bulletinMessage?: string;
  via?: 'api' | 'client';
  status?: number;
};

async function authHeaders(): Promise<Headers> {
  const headers = new Headers();
  try {
    const user = getAuth().currentUser;
    if (user) {
      headers.set('Authorization', `Bearer ${await user.getIdToken()}`);
    }
  } catch {
    /* ignore */
  }
  return headers;
}

function formatBehaviorNotesError(
  apiError: string,
  status?: number,
  browserErr?: string,
): { error: string; status?: number } {
  if (!browserErr) return { error: apiError, status };

  const perm = browserErr.toLowerCase().includes('permission');
  if (perm) {
    const serverBit = apiError ? ` Server: ${apiError}` : '';
    if (status === 403 || apiError.toLowerCase().includes('staff access')) {
      return {
        error: `Staff sign-in required for this school.${serverBit}`,
        status,
      };
    }
    return {
      error:
        `Your Firebase user cannot read behavior notes for this school. Sign out, open Admin or Teacher, and sign in with your passcode (not only the school lobby passcode).${serverBit}`,
      status,
    };
  }

  return { error: `${apiError} Browser load failed: ${browserErr}`, status };
}

function shouldTryClientFallback(status?: number, message?: string): boolean {
  if (status === 401 || status === 403 || status === 503) return true;
  const m = (message || '').toLowerCase();
  return (
    m.includes('staff access') ||
    m.includes('permission') ||
    m.includes('firebase_service_account') ||
    m.includes('request failed (503)')
  );
}

export async function fetchBehaviorNotes(
  schoolId: string,
  firestore: Firestore | null = null,
): Promise<{
  notes: BehaviorNote[];
  error?: string;
  status?: number;
}> {
  const params = new URLSearchParams({ schoolId });
  const headers = await authHeaders();

  const res = await fetch(`/api/classroom/behavior-notes?${params}`, {
    credentials: 'same-origin',
    cache: 'no-store',
    headers,
  });
  const data = (await res.json().catch(() => ({}))) as {
    notes?: BehaviorNote[];
    error?: string;
  };
  if (res.ok) {
    const notes = (data.notes ?? []).map((n) => ({
      ...n,
      createdAt: parseBehaviorNoteCreatedAt(n.createdAt),
      visibleToParent: n.visibleToParent !== false,
    })) as BehaviorNote[];
    return { notes };
  }

  const error = typeof data.error === 'string' ? data.error : `Request failed (${res.status})`;

  if (firestore && shouldTryClientFallback(res.status, error)) {
    try {
      const notes = await listBehaviorNotes(firestore, schoolId);
      return { notes };
    } catch (e) {
      const formatted = formatBehaviorNotesError(error, res.status, (e as Error).message);
      return { notes: [], error: formatted.error, status: formatted.status };
    }
  }

  return { notes: [], error, status: res.status };
}

export async function saveBehaviorNote(
  firestore: Firestore | null,
  body: SaveBehaviorNoteRequest,
): Promise<SaveBehaviorNoteResult> {
  const headers = await authHeaders();
  headers.set('Content-Type', 'application/json');
  const res = await fetch('/api/classroom/behavior-notes', {
    method: 'POST',
    headers,
    credentials: 'same-origin',
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    id?: string;
    error?: string;
    bulletinPosted?: boolean;
    bulletinMessage?: string;
  };

  if (res.ok && data.ok) {
    return {
      success: true,
      message: 'Saved.',
      id: typeof data.id === 'string' ? data.id : undefined,
      bulletinPosted: data.bulletinPosted === true,
      bulletinMessage: typeof data.bulletinMessage === 'string' ? data.bulletinMessage : undefined,
      via: 'api',
      status: res.status,
    };
  }

  const message = typeof data.error === 'string' ? data.error : `Request failed (${res.status})`;

  if (firestore && shouldTryClientFallback(res.status, message)) {
    try {
      const { schoolId, shareToBulletinBoard, ...input } = body;
      const id = await createBehaviorNote(firestore, schoolId, input);
      return {
        success: true,
        message: 'Saved.',
        id,
        bulletinPosted: false,
        bulletinMessage:
          shareToBulletinBoard
            ? 'Bulletin board sharing needs server access. The note saved, but the board post was skipped.'
            : undefined,
        via: 'client',
        status: res.status,
      };
    } catch (e) {
      const formatted = formatBehaviorNotesError(message, res.status, (e as Error).message);
      return { success: false, message: formatted.error, status: formatted.status };
    }
  }

  if (res.status === 403 && !getAuth().currentUser) {
    return {
      success: false,
      message: 'You are not signed in. Open Admin again from the school login page.',
      status: res.status,
    };
  }

  if (res.status === 503) {
    return {
      success: false,
      message:
        'Server could not write to Firebase. Add FIREBASE_SERVICE_ACCOUNT_KEY to .env.local, restart npm run dev, or deploy Firestore rules and try again.',
      status: res.status,
    };
  }

  return { success: false, message, status: res.status };
}
