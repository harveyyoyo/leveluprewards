'use client';

import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthFetch } from '@/lib/authFetch';
import { useToast } from '@/hooks/use-toast';
import { useOfficeWrite } from '@/lib/office/useOfficeWrite';
import { cn } from '@/lib/utils';

const ALLOWED = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

type OfficeStudentPhotoUploadProps = {
  schoolId: string;
  studentId: string;
  photoUrl?: string | null;
  studentName: string;
  enabled?: boolean;
  onPhotoUrl?: (url: string) => void;
};

export function OfficeStudentPhotoUpload({
  schoolId,
  studentId,
  photoUrl,
  studentName,
  enabled = true,
  onPhotoUrl,
}: OfficeStudentPhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const authFetch = useAuthFetch();
  const { toast } = useToast();
  const write = useOfficeWrite(schoolId);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const displayUrl = preview || photoUrl || '';

  const handleFile = async (file: File) => {
    if (!enabled) return;
    if (!ALLOWED.includes(file.type)) {
      toast({ variant: 'destructive', title: 'Use PNG, JPG, or WebP.' });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast({ variant: 'destructive', title: 'Photo must be under 5MB.' });
      return;
    }

    setBusy(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.includes(',') ? result.split(',')[1]! : result);
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });

      const res = await authFetch('/api/office/upload-student-photo', {
        method: 'POST',
        body: JSON.stringify({
          schoolId,
          studentId,
          imageBase64: base64,
          contentType: file.type,
        }),
      });
      const data = (await res.json()) as { photoUrl?: string; error?: string };
      if (!res.ok || !data.photoUrl) throw new Error(data.error || 'Upload failed');

      setPreview(data.photoUrl);
      onPhotoUrl?.(data.photoUrl);
      if (write.ctx) {
        await write.updateOfficeStudent(write.ctx, studentId, { photoUrl: data.photoUrl }, 'Updated student photo');
      }
      toast({ title: 'Photo uploaded' });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  if (!enabled) return null;

  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          'flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-muted/40',
          !displayUrl && 'text-muted-foreground',
        )}
      >
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={displayUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <Camera className="h-6 w-6" aria-hidden />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">Student photo</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-1 h-8 rounded-lg text-xs"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
          {displayUrl ? 'Change photo' : 'Upload photo'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED.join(',')}
          className="hidden"
          aria-label={`Upload photo for ${studentName}`}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
