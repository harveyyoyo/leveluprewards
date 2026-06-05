'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { Circular1dBarcode } from '@/components/print/Circular1dBarcode';
import { PrintBarcode } from '@/components/print/PrintBarcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  decodeCircular1d,
  decodeCircular1dFromRingSamples,
  encodeCircular1d,
  formatCircular1dScanValue,
  modulesToRingSamples,
} from '@/lib/barcode/circular1d';
import { decodeCircular1dFromCanvas } from '@/lib/barcode/circular1dCanvasDecode';
import { rasterizeCircular1dSvg } from '@/lib/barcode/circular1dGeometry';

const DEFAULT_PAYLOAD = '871294305';

export default function DeveloperCircularBarcodePage() {
  const [payload, setPayload] = useState(DEFAULT_PAYLOAD);
  const [decodeResult, setDecodeResult] = useState<string | null>(null);
  const [decodeNote, setDecodeNote] = useState<string>('');
  const svgWrapRef = useRef<HTMLDivElement>(null);

  const encoded = encodeCircular1d(payload);

  const runModuleDecode = useCallback(() => {
    if (!encoded) {
      setDecodeResult(null);
      setDecodeNote('Invalid payload (use printable ASCII, max 32 chars).');
      return;
    }
    const direct = decodeCircular1d(encoded.modules);
    const samples = modulesToRingSamples(encoded.modules, 1024);
    const fromRing = decodeCircular1dFromRingSamples(samples);
    setDecodeResult(fromRing);
    setDecodeNote(
      direct === fromRing
        ? `Module decode OK · scan prefix: ${formatCircular1dScanValue(direct!)}`
        : `Mismatch: direct=${direct}, ring=${fromRing}`,
    );
  }, [encoded]);

  const runCanvasDecode = useCallback(async () => {
    const wrap = svgWrapRef.current;
    const svg = wrap?.querySelector('svg.circular-1d-barcode-svg, svg');
    if (!svg || !(svg instanceof SVGSVGElement) || !encoded) {
      setDecodeNote('Nothing to decode — fix payload first.');
      return;
    }

    try {
      const size = 400;
      const canvas = await rasterizeCircular1dSvg(svg, size);
      const decoded = decodeCircular1dFromCanvas(canvas, size, size, { sampleCount: 720 });
      setDecodeResult(decoded);
      setDecodeNote(
        decoded
          ? `Canvas ring decode OK · ${formatCircular1dScanValue(decoded)}`
          : 'Canvas decode failed — ring radius or contrast may be off.',
      );
    } catch (e) {
      setDecodeResult(null);
      setDecodeNote(e instanceof Error ? e.message : 'Canvas decode error');
    }
  }, [encoded]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/developer" className="text-sm text-slate-400 hover:text-white">
            ← Developer
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Circular 1D Barcode (LU-C1D v1)</h1>
        </div>

        <p className="text-slate-400 text-sm leading-relaxed">
          Custom ring encoding for LevelUp — not Code 128. Use the decode buttons to verify round-trip;
          wire kiosk lookup to values prefixed with <code className="text-amber-200">LU-C1D:</code> when you
          integrate camera decode.
        </p>

        <Card className="border-slate-800 bg-slate-900/80">
          <CardHeader>
            <CardTitle className="text-lg">Payload</CardTitle>
            <CardDescription className="text-slate-400">
              Same kind of ID string as student cards (ASCII, max 32 characters).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="payload">Value</Label>
              <Input
                id="payload"
                value={payload}
                onChange={(e) => setPayload(e.target.value)}
                className="font-mono bg-slate-950 border-slate-700"
              />
            </div>
            {encoded ? (
              <p className="text-xs text-slate-500 font-mono">
                {encoded.modules.length} ring modules · {encoded.bits.length} data bits
              </p>
            ) : (
              <p className="text-sm text-amber-400">Invalid payload for LU-C1D encoding.</p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-slate-800 bg-slate-900/80">
            <CardHeader>
              <CardTitle className="text-lg">Circular 1D (custom)</CardTitle>
              <CardDescription className="text-slate-400">Radial bars — LU-C1D v1</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4" ref={svgWrapRef}>
              {encoded ? (
                <Circular1dBarcode value={payload} size={220} />
              ) : (
                <p className="text-sm text-slate-500">Enter a valid payload</p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={runModuleDecode} disabled={!encoded}>
                  Simulate ring decode
                </Button>
                <Button type="button" onClick={runCanvasDecode} disabled={!encoded}>
                  Decode from SVG (canvas)
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/80">
            <CardHeader>
              <CardTitle className="text-lg">Code 128 (current IDs)</CardTitle>
              <CardDescription className="text-slate-400">Standard linear — laser + camera</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-2 bg-white rounded-lg py-6">
              <PrintBarcode value={payload || ' '} variant="id-card" />
            </CardContent>
          </Card>
        </div>

        {(decodeResult !== null || decodeNote) && (
          <Card className="border-emerald-900/50 bg-emerald-950/30">
            <CardHeader>
              <CardTitle className="text-lg text-emerald-100">Decode result</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 font-mono text-sm">
              <p>
                Payload:{' '}
                <span className="text-emerald-300">{decodeResult ?? '(none)'}</span>
              </p>
              {decodeNote ? <p className="text-slate-400 text-xs">{decodeNote}</p> : null}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
