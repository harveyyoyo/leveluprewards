'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { MonitorUp, PhoneOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFirebase } from '@/firebase';
import { useAppContext } from '@/components/AppProvider';
import { useToast } from '@/hooks/use-toast';

const rtcConfig: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export function RemoteSupportSharePanel({ pathname }: { pathname: string }) {
  const { firestore, auth } = useFirebase();
  const { schoolId, loginState, userName } = useAppContext();
  const { toast } = useToast();
  const [sessionPath, setSessionPath] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'starting' | 'waiting' | 'sharing'>('idle');
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const unsubRefs = useRef<Array<() => void>>([]);

  const stopSharing = useCallback(async () => {
    unsubRefs.current.forEach((unsub) => unsub());
    unsubRefs.current = [];
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;

    if (sessionPath) {
      try {
        await updateDoc(doc(firestore, sessionPath), {
          status: 'ended',
          endedAt: Date.now(),
        });
      } catch {
        // Best effort: the browser may be unloading or offline.
      }
    }

    setSessionPath(null);
    setSessionId(null);
    setStatus('idle');
  }, [firestore, sessionPath]);

  useEffect(() => () => {
    void stopSharing();
  }, [stopSharing]);

  const startSharing = useCallback(async () => {
    if (!schoolId || !auth.currentUser || status !== 'idle') return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
      toast({
        variant: 'destructive',
        title: 'Screen sharing unavailable',
        description: 'This browser does not support screen sharing.',
      });
      return;
    }

    setStatus('starting');
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      streamRef.current = stream;

      const sessionRef = await addDoc(collection(firestore, 'schools', schoolId, 'supportSessions'), {
        schoolId,
        requesterUid: auth.currentUser.uid,
        requesterLabel: userName || loginState,
        loginState,
        pathname,
        status: 'waiting',
        startedAt: Date.now(),
        updatedAt: Date.now(),
        kind: 'screen-share',
      });

      const pc = new RTCPeerConnection(rtcConfig);
      pcRef.current = pc;
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
        track.addEventListener('ended', () => {
          void stopSharing();
        });
      });

      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        const candidateRef = doc(collection(sessionRef, 'broadcasterCandidates'));
        void setDoc(candidateRef, event.candidate.toJSON()).catch(() => {});
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await updateDoc(sessionRef, {
        offer: { type: offer.type, sdp: offer.sdp },
        status: 'waiting',
        updatedAt: Date.now(),
      });

      unsubRefs.current.push(
        onSnapshot(sessionRef, async (snap) => {
          const data = snap.data();
          if (!data || !pcRef.current) return;
          if (data.status === 'ended') {
            void stopSharing();
            return;
          }
          if (data.answer && !pcRef.current.currentRemoteDescription) {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
            setStatus('sharing');
          }
        }),
      );

      unsubRefs.current.push(
        onSnapshot(collection(sessionRef, 'viewerCandidates'), (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type !== 'added' || !pcRef.current) return;
            void pcRef.current.addIceCandidate(new RTCIceCandidate(change.doc.data())).catch(() => {});
          });
        }),
      );

      setSessionPath(sessionRef.path);
      setSessionId(sessionRef.id);
      setStatus('waiting');
      toast({
        title: 'Screen share started',
        description: 'Keep this tab open while support is watching.',
      });
    } catch (e) {
      await stopSharing();
      toast({
        variant: 'destructive',
        title: 'Could not start screen share',
        description: e instanceof Error ? e.message : 'Please try again.',
      });
    }
  }, [auth.currentUser, firestore, loginState, pathname, schoolId, status, stopSharing, toast, userName]);

  const sharing = status === 'waiting' || status === 'sharing';

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-muted/30 p-3">
      <div>
        <p className="text-sm font-bold text-foreground">Remote support screen share</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Share this browser screen with developer support. The browser will ask what to share.
        </p>
      </div>
      {sharing ? (
        <div className="rounded-lg bg-background/80 p-2 text-xs text-muted-foreground">
          Status: <span className="font-semibold text-foreground">{status === 'sharing' ? 'support connected' : 'waiting for support'}</span>
          {sessionId ? <span className="block font-mono">Session: {sessionId}</span> : null}
        </div>
      ) : null}
      <Button
        type="button"
        className="w-full gap-2 rounded-full"
        variant={sharing ? 'destructive' : 'default'}
        onClick={() => sharing ? void stopSharing() : void startSharing()}
        disabled={!schoolId || status === 'starting'}
      >
        {status === 'starting' ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : sharing ? (
          <PhoneOff className="h-4 w-4" aria-hidden />
        ) : (
          <MonitorUp className="h-4 w-4" aria-hidden />
        )}
        {status === 'starting' ? 'Starting...' : sharing ? 'Stop sharing' : 'Share screen with support'}
      </Button>
    </div>
  );
}
