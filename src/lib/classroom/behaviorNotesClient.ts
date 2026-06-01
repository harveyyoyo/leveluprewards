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
};

export type SaveBehaviorNoteResult = {
  success: boolean;
  message: string;
  id?: string;
  via?: 'api' | 'client';
  status?: number;
};

async function getIdToken(): Promise<string | undefined> {
  try {
    const user = getAuth().currentUser;
    if (user) return await user.getIdToken();
  } catch {
    /* ignore */
  }
  return undefined;
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
  const idToken = await getIdToken();
  const params = new URLSearchParams({ schoolId });
  if (idToken) params.set('idToken', idToken);

  const res = await fetch(`/api/classroom/behavior-notes?${params}`, {
    credentials: 'same-origin',
    cache: 'no-store',
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
      return {
        notes: [],
        error: `${error} Browser load failed: ${(e as Error).message}`,
        status: res.status,
      };
    }
  }

  return { notes: [], error, status: res.status };
}

export async function saveBehaviorNote(
  firestore: Firestore | null,
  body: SaveBehaviorNoteRequest,
): Promise<SaveBehaviorNoteResult> {
  const idToken = await getIdToken();
  const res = await fetch('/api/classroom/behavior-notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({
      ...body,
      ...(idToken ? { idToken } : {}),
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; id?: string; error?: string };

  if (res.ok && data.ok) {
    return {
      success: true,
      message: 'Saved.',
      id: typeof data.id === 'string' ? data.id : undefined,
      via: 'api',
      status: res.status,
    };
  }

  const message = typeof data.error === 'string' ? data.error : `Request failed (${res.status})`;

  if (firestore && shouldTryClientFallback(res.status, message)) {
    try {
      const { schoolId, ...input } = body;
      const id = await createBehaviorNote(firestore, schoolId, input);
      return { success: true, message: 'Saved.', id, via: 'client', status: res.status };
    } catch (e) {
      return {
        success: false,
        message: `${message} Browser save failed: ${(e as Error).message}`,
        status: res.status,
      };
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
