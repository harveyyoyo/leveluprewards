'use client';

import { ChangeEvent, useCallback, useMemo, useState } from 'react';
import {
  updateDoc,
  setDoc,
  type DocumentReference,
  type Firestore,
} from 'firebase/firestore';
import { schoolPublicDocRef } from '@/lib/schoolPublic';
import { httpsCallable, type Functions } from 'firebase/functions';
import type { SoundEffect } from '@/hooks/useArcadeSound';
import type { useToast } from '@/hooks/use-toast';

type ToastFn = ReturnType<typeof useToast>['toast'];
type PlaySoundFn = (sound: SoundEffect) => void;

interface LogoHistoryEntry {
  url?: string;
}

interface SchoolDocShape {
  logoUrl?: string | null;
  logoHistory?: LogoHistoryEntry[] | null;
}

export interface UseSchoolLogoUploadDeps {
  schoolId: string | null;
  schoolDocRef: DocumentReference | null;
  firestore: Firestore | null;
  schoolData: SchoolDocShape | null | undefined;
  functions: Functions | null;
  toast: ToastFn;
  playSound: PlaySoundFn;
}

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * Owns the three pieces of state that drive the "School logo" section of
 * the admin Branding tab (preview url, cropper source, uploading flag) and
 * the async pipeline that moves a raw file through the cropper and into
 * the `uploadSchoolLogo` callable. Pulled out of the admin page so the tab
 * consumer only has to wire the returned handlers to its UI.
 */
export function useSchoolLogoUpload({
  schoolId,
  schoolDocRef,
  firestore,
  schoolData,
  functions,
  toast,
  playSound,
}: UseSchoolLogoUploadDeps) {
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [cropLogoSrc, setCropLogoSrc] = useState<string | null>(null);

  // Show the most-recently-set URL first, then historical uploads, with
  // dupes removed. Used by the "previous logos" dropdown. Pulling the two
  // fields off `schoolData` into locals lets us depend on their primitive /
  // array identity instead of the whole doc, which keeps the memo stable
  // across unrelated `schoolData` writes.
  const schoolLogoUrl = schoolData?.logoUrl ?? null;
  const schoolLogoHistory = schoolData?.logoHistory ?? null;
  const previousSchoolLogos = useMemo(() => {
    const current = (logoPreviewUrl ?? schoolLogoUrl ?? undefined)?.trim();
    const fromHistory = Array.isArray(schoolLogoHistory)
      ? schoolLogoHistory.map((e) => e?.url?.trim()).filter((u): u is string => !!u)
      : [];
    const seen = new Set<string>();
    const out: string[] = [];
    if (current) {
      seen.add(current);
      out.push(current);
    }
    for (const url of fromHistory) {
      if (!seen.has(url)) {
        seen.add(url);
        out.push(url);
      }
    }
    return out;
  }, [schoolLogoUrl, schoolLogoHistory, logoPreviewUrl]);

  const handleLogoUpload = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!schoolId) {
        playSound('error');
        toast({
          variant: 'destructive',
          title: 'Cannot upload logo',
          description: 'No school selected. Refresh the page and log in again.',
        });
        e.target.value = '';
        return;
      }
      if (!functions) {
        playSound('error');
        toast({
          variant: 'destructive',
          title: 'Cannot upload logo',
          description: 'Server connection is not available. Refresh the page and try again.',
        });
        e.target.value = '';
        return;
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        playSound('error');
        toast({
          variant: 'destructive',
          title: 'Unsupported file type',
          description: 'Please use PNG, JPG, or WebP. Your file appears to be a different format.',
        });
        e.target.value = '';
        return;
      }
      if (file.size > MAX_SIZE_BYTES) {
        playSound('error');
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: 'Logo must be under 10MB. Try compressing or resizing the image.',
        });
        e.target.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setCropLogoSrc(reader.result as string);
      };
      reader.readAsDataURL(file);
      // Reset the input so selecting the same file again re-fires onChange.
      e.target.value = '';
    },
    [schoolId, functions, playSound, toast],
  );

  const handleCropComplete = useCallback(
    async (croppedBlob: Blob) => {
      setCropLogoSrc(null);
      if (!schoolId || !functions) return;

      try {
        setIsLogoUploading(true);
        toast({ title: 'Uploading logo…', description: 'Please wait.' });

        const imageBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.includes(',') ? result.split(',')[1] : result;
            resolve(base64 || '');
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(croppedBlob);
        });

        const uploadLogo = httpsCallable<
          { schoolId: string; imageBase64: string; contentType: string },
          { logoUrl: string }
        >(functions, 'uploadSchoolLogo');
        const res = await uploadLogo({
          schoolId,
          imageBase64,
          contentType: croppedBlob.type || 'image/jpeg',
        });

        const data = res.data;
        if (!data?.logoUrl) {
          throw new Error('No logo URL returned');
        }

        setLogoPreviewUrl(data.logoUrl);
        playSound('success');
        toast({
          title: 'Logo updated!',
          description: 'Your school logo will now appear next to the school name.',
        });
      } catch (error: unknown) {
        console.error('Logo upload failed', error);
        playSound('error');
        const err = error as { code?: string; message?: string; details?: unknown };
        const code = err?.code ?? '';
        const message = String(err?.message ?? '');
        let description = message;
        if (!description && err?.details) {
          try {
            description = typeof err.details === 'string' ? err.details : JSON.stringify(err.details);
          } catch {
            // ignore serialization failures
          }
        }
        if (code === 'functions/unauthenticated') {
          description = 'You must be logged in as an admin. Please sign in again.';
        } else if (code === 'functions/permission-denied') {
          description = 'You need admin access to update the school logo.';
        } else if (code === 'functions/invalid-argument') {
          description = message || 'Invalid image. Use PNG, JPG, or WebP under 10MB.';
        } else if (!message || message === 'undefined') {
          description = 'Could not save the logo. Try again or use a smaller image.';
        }
        toast({
          variant: 'destructive',
          title: 'Logo upload failed',
          description,
        });
      } finally {
        setIsLogoUploading(false);
      }
    },
    [schoolId, functions, playSound, toast],
  );

  const handleRemoveLogo = useCallback(async () => {
    if (!schoolId || !schoolDocRef || !firestore) return;
    try {
      setIsLogoUploading(true);
      await updateDoc(schoolDocRef, { logoUrl: null });
      await setDoc(
        schoolPublicDocRef(firestore, schoolId),
        { logoUrl: null, active: true, updatedAt: Date.now() },
        { merge: true },
      );
      setLogoPreviewUrl(null);
      playSound('success');
      toast({ title: 'Logo removed', description: 'The school logo has been deleted.' });
    } catch (error: unknown) {
      console.error('Failed to remove logo', error);
      playSound('error');
      toast({ variant: 'destructive', title: 'Error', description: 'Could not remove the logo.' });
    } finally {
      setIsLogoUploading(false);
    }
  }, [schoolId, schoolDocRef, firestore, playSound, toast]);

  return {
    logoPreviewUrl,
    setLogoPreviewUrl,
    previousSchoolLogos,
    isLogoUploading,
    cropLogoSrc,
    setCropLogoSrc,
    handleLogoUpload,
    handleCropComplete,
    handleRemoveLogo,
  } as const;
}
