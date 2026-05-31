'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { MonitorPlay, PhoneOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useFirebase } from '@/firebase';
import { cn } from '@/lib/utils';

type RemoteSupportSession = {
  id: string;
  schoolId?: string;
  kind?: string;
  requesterLabel?: string;
  loginState?: string;
  pathname?: string;
  status?: string;
  startedAt?: number;
  offer?: RTCSessionDescriptionInit;
};

const rtcConfig: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

function SupportViewerDialog({
  session,
  open,
  onOpenChange,
}: {
  session: RemoteSupportSession | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { firestore } = useFirebase();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const unsubRefs = useRef<Array<() => void>>([]);
  const [viewerStatus, setViewerStatus] = useState<'idle' | 'connecting' | 'connected' | 'ended'>('idle');

  const closeConnection = useCallback(async (markEnded: boolean) => {
    unsubRefs.current.forEach((unsub) => unsub());
    unsubRefs.current = [];
    pcRef.current?.close();
    pcRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    if (markEnded && session?.schoolId && session.id) {
      try {
        await updateDoc(doc(firestore, 'schools', session.schoolId, 'supportSessions', session.id), {
          status: 'ended',
          endedAt: Date.now(),
        });
      } catch {
        // Best effort.
      }
    }
  }, [firestore, session?.id, session?.schoolId]);

  useEffect(() => {
    if (!open || !session?.schoolId || !session.id || !session.offer) return;
    const offer = session.offer;
    let cancelled = false;
    setViewerStatus('connecting');

    const connect = async () => {
      const sessionRef = doc(firestore, 'schools', session.schoolId!, 'supportSessions', session.id);
      const pc = new RTCPeerConnection(rtcConfig);
      pcRef.current = pc;

      pc.ontrack = (event) => {
        if (!videoRef.current) return;
        videoRef.current.srcObject = event.streams[0] || null;
        setViewerStatus('connected');
      };

      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        const candidateRef = doc(collection(sessionRef, 'viewerCandidates'));
        void setDoc(candidateRef, event.candidate.toJSON()).catch(() => {});
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await updateDoc(sessionRef, {
        answer: { type: answer.type, sdp: answer.sdp },
        status: 'sharing',
        viewerConnectedAt: Date.now(),
        updatedAt: Date.now(),
      });

      unsubRefs.current.push(
        onSnapshot(sessionRef, (snap) => {
          const data = snap.data();
          if (!data || data.status === 'ended') {
            setViewerStatus('ended');
            void closeConnection(false);
          }
        }),
      );

      unsubRefs.current.push(
        onSnapshot(collection(sessionRef, 'broadcasterCandidates'), (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type !== 'added' || !pcRef.current) return;
            void pcRef.current.addIceCandidate(new RTCIceCandidate(change.doc.data())).catch(() => {});
          });
        }),
      );

      if (!cancelled) setViewerStatus('connecting');
    };

    connect().catch(() => {
      setViewerStatus('ended');
      void closeConnection(false);
    });

    return () => {
      cancelled = true;
      void closeConnection(false);
    };
  }, [closeConnection, firestore, open, session]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) void closeConnection(false);
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>Remote support session</DialogTitle>
          <DialogDescription>
            {session?.schoolId ? `${session.schoolId} • ${session.requesterLabel || session.loginState || 'User'}` : 'Live screen share'}
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-hidden rounded-lg border bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="aspect-video h-auto w-full bg-black object-contain"
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {viewerStatus === 'connected'
              ? 'Connected. You are viewing the shared browser screen.'
              : viewerStatus === 'ended'
                ? 'This support session ended.'
                : 'Connecting to the shared screen...'}
          </p>
          <Button
            type="button"
            variant="destructive"
            className="gap-2"
            onClick={() => {
              void closeConnection(true);
              onOpenChange(false);
            }}
          >
            <PhoneOff className="h-4 w-4" aria-hidden />
            End session
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DeveloperRemoteSupportViewer({ schoolIds }: { schoolIds: string[] }) {
  const { firestore } = useFirebase();
  const [selected, setSelected] = useState<RemoteSupportSession | null>(null);
  const [sessionsBySchool, setSessionsBySchool] = useState<Record<string, RemoteSupportSession[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const ids = [...new Set(schoolIds.map((id) => id.trim().toLowerCase()).filter(Boolean))];
    setSessionsBySchool({});
    setError(null);
    if (ids.length === 0) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let pending = ids.length;
    const unsubs = ids.map((schoolId) => {
      const supportQuery = query(
        collection(firestore, 'schools', schoolId, 'supportSessions'),
        where('status', 'in', ['waiting', 'sharing']),
      );
      return onSnapshot(
        supportQuery,
        (snapshot) => {
          setSessionsBySchool((prev) => ({
            ...prev,
            [schoolId]: snapshot.docs.map((d) => ({
              ...(d.data() as Omit<RemoteSupportSession, 'id'>),
              id: d.id,
              schoolId,
            })),
          }));
          pending = Math.max(0, pending - 1);
          if (pending === 0) setIsLoading(false);
        },
        (err) => {
          setError(err);
          setIsLoading(false);
        },
      );
    });

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [firestore, schoolIds]);

  const sessions = useMemo(
    () =>
      Object.values(sessionsBySchool)
        .flat()
        .filter((item) => item.schoolId && item.offer && item.kind === 'screen-share')
        .sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0)),
    [sessionsBySchool],
  );

  return (
    <>
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Checking for live support shares...
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            Could not load live support sessions.
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
            No one is sharing their screen right now.
          </div>
        ) : (
          sessions.map((session) => (
            <button
              type="button"
              key={`${session.schoolId}-${session.id}`}
              onClick={() => setSelected(session)}
              className={cn(
                'flex w-full items-center justify-between gap-3 rounded-lg border bg-background p-3 text-left transition-colors hover:bg-accent/50',
              )}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-mono text-sm font-bold">{session.schoolId}</p>
                  <Badge variant={session.status === 'sharing' ? 'default' : 'secondary'}>
                    {session.status === 'sharing' ? 'Connected' : 'Waiting'}
                  </Badge>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {session.requesterLabel || session.loginState || 'User'} • {session.pathname || 'Unknown page'}
                </p>
              </div>
              <MonitorPlay className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            </button>
          ))
        )}
      </div>
      <SupportViewerDialog
        session={selected}
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </>
  );
}
