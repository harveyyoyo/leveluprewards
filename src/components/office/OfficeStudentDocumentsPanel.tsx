'use client';

import { useRef, useState } from 'react';
import { FileText, Loader2, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuthFetch } from '@/lib/authFetch';
import { useOfficeStudentDocuments } from '@/lib/office/useOfficeStudentDocuments';
import type { OfficeStudentDocument } from '@/lib/office/types';

const ALLOWED = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
const MAX_BYTES = 10 * 1024 * 1024;

type OfficeStudentDocumentsPanelProps = {
  schoolId: string;
  studentId: string;
  enabled: boolean;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function OfficeStudentDocumentsPanel({ schoolId, studentId, enabled }: OfficeStudentDocumentsPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const authFetch = useAuthFetch();
  const { toast } = useToast();
  const { documents, isLoading } = useOfficeStudentDocuments(schoolId, studentId, enabled);
  const [busy, setBusy] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!ALLOWED.includes(file.type)) {
      toast({ variant: 'destructive', title: 'Use a PDF, PNG, JPG, or WebP file.' });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast({ variant: 'destructive', title: 'File must be under 10MB.' });
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
      const res = await authFetch('/api/office/upload-student-document', {
        method: 'POST',
        body: JSON.stringify({
          schoolId,
          studentId,
          fileName: file.name,
          fileBase64: base64,
          contentType: file.type,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      toast({ title: 'Document uploaded' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Upload failed', description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  const handleView = async (doc: OfficeStudentDocument) => {
    setOpeningId(doc.id);
    try {
      const res = await authFetch(`/api/office/student-document/${doc.id}?schoolId=${encodeURIComponent(schoolId)}`);
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not open document');
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not open document', description: e instanceof Error ? e.message : undefined });
    } finally {
      setOpeningId(null);
    }
  };

  const handleDelete = async (doc: OfficeStudentDocument) => {
    if (!confirm(`Delete "${doc.name}"? This can't be undone.`)) return;
    try {
      const res = await authFetch(`/api/office/student-document/${doc.id}?schoolId=${encodeURIComponent(schoolId)}`, {
        method: 'DELETE',
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      toast({ title: 'Document deleted' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Delete failed', description: e instanceof Error ? e.message : undefined });
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">Documents</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 rounded-lg text-xs gap-1"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          Upload
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED.join(',')}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = '';
          }}
        />
      </div>
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : documents.length === 0 ? (
        <p className="text-xs text-muted-foreground">No documents uploaded yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-xs">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-1.5 text-left hover:underline"
                onClick={() => void handleView(doc)}
                disabled={openingId === doc.id}
              >
                <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{doc.name}</span>
                <span className="shrink-0 text-muted-foreground">({formatBytes(doc.sizeBytes)})</span>
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-destructive"
                aria-label={`Delete ${doc.name}`}
                onClick={() => void handleDelete(doc)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
