'use client';

import Link from 'next/link';
import { BrandedQrCode } from '@/components/qr/BrandedQrCode';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRef, useState } from 'react';
import { downloadBrandedQrPng } from '@/lib/qr/downloadBrandedQrPng';

const DEFAULT_URL = 'https://portal.leveluprewards.app/yeshiva/student-home';

export default function DeveloperBrandedQrPage() {
  const [url, setUrl] = useState(DEFAULT_URL);
  const qrRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const handleDownload = async () => {
    const el = qrRef.current;
    if (!el) return;
    setBusy(true);
    try {
      await downloadBrandedQrPng(el, 'levelup-branded-qr.png');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-lg space-y-6">
        <Link href="/developer" className="text-sm text-slate-400 hover:text-white">
          ← Developer
        </Link>
        <Card className="border-slate-800 bg-slate-900 text-slate-100">
          <CardHeader>
            <CardTitle>Branded QR (app logo center)</CardTitle>
            <CardDescription className="text-slate-400">
              Level H error correction · logo from /logo.png unless appConfig overrides in admin UI
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="qr-url">URL encoded in QR</Label>
              <Input
                id="qr-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="font-mono text-sm bg-slate-950 border-slate-700"
              />
            </div>
            <div className="flex flex-col items-center gap-4 rounded-xl border border-slate-700 bg-white p-8">
              <BrandedQrCode
                ref={qrRef}
                value={url}
                size={220}
                caption="Scan to open link"
              />
              <Button type="button" variant="secondary" disabled={busy} onClick={() => void handleDownload()}>
                {busy ? 'Preparing…' : 'Download PNG'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
