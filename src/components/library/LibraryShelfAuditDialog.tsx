'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import {
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  MapPin,
  Camera,
  CameraOff,
  Volume2,
  VolumeX,
  Download,
  Search,
  ArrowRight,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useFirestore, useFunctions } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useBarcodeReaderWedge } from '@/hooks/useBarcodeReaderWedge';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { BarcodeScannerCameraView } from '@/components/barcode/BarcodeScannerCameraView';
import { LibraryBarcodeReaderField } from './LibraryBarcodeReaderField';
import { callLibrary, findLibraryItemByUpc, forceReturnLibraryItem } from '@/lib/library/libraryOperations';
import { downloadLibraryCsv } from '@/lib/library/libraryWorkspace';
import type { LibraryItem } from '@/lib/types';

export interface AuditRecord {
  id: string;
  item: LibraryItem;
  scannedAt: number;
  type: 'match' | 'misfiled' | 'recovered' | 'unknown';
  originalShelf: string;
  message: string;
}

export function LibraryShelfAuditDialog({
  isOpen,
  setIsOpen,
  schoolId,
  items = [],
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  schoolId: string;
  items?: LibraryItem[];
}) {
  const firestore = useFirestore();
  const functions = useFunctions();
  const { toast } = useToast();
  const playSound = useArcadeSound();

  // All distinct shelves in the current catalog
  const existingShelves = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => {
      if (i.shelfLocation?.trim() && !i.archived) {
        set.add(i.shelfLocation.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const [targetShelf, setTargetShelf] = useState<string>('');
  const [shelfInput, setShelfInput] = useState<string>('');
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>([]);
  const [lastScanResult, setLastScanResult] = useState<AuditRecord | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const processingRef = useRef(false);

  // Books expected on this target shelf
  const expectedOnShelf = useMemo(() => {
    if (!targetShelf) return [];
    return items.filter(
      i => !i.archived && (i.shelfLocation || '').toLowerCase().trim() === targetShelf.toLowerCase().trim(),
    );
  }, [items, targetShelf]);

  // Scanned item IDs from this session
  const scannedItemIds = useMemo(() => {
    return new Set(auditRecords.filter(r => r.type !== 'unknown').map(r => r.item.id));
  }, [auditRecords]);

  // Unscanned items that were expected on this shelf
  const unscannedExpected = useMemo(() => {
    return expectedOnShelf.filter(i => !scannedItemIds.has(i.id));
  }, [expectedOnShelf, scannedItemIds]);

  const handleAuditScan = useCallback(
    async (code: string) => {
      const clean = code.trim();
      if (!clean || processingRef.current || !firestore || !schoolId || !targetShelf) return;
      processingRef.current = true;
      setBusy(true);

      try {
        const found = await findLibraryItemByUpc(firestore, schoolId, clean);
        const now = Date.now();

        if (!found) {
          const record: AuditRecord = {
            id: `unknown-${now}`,
            item: {
              id: `unknown-${now}`,
              name: `Barcode: ${clean}`,
              upc: clean,
              status: 'available',
              shelfLocation: 'Unknown',
              category: 'General',
            },
            scannedAt: now,
            type: 'unknown',
            originalShelf: 'Unknown',
            message: `Barcode ${clean} not found in catalog.`,
          };
          setLastScanResult(record);
          setAuditRecords(prev => [record, ...prev]);
          if (soundEnabled) playSound('error');
          return;
        }

        const item = found.item;
        const currentShelfNorm = (item.shelfLocation || '').toLowerCase().trim();
        const targetShelfNorm = targetShelf.toLowerCase().trim();

        // Check if recovered from lost or on loan
        if (item.condition === 'lost' || item.status === 'checked_out') {
          // Recover item to available and set shelf to target shelf
          await forceReturnLibraryItem(firestore, schoolId, item, { functions });
          await callLibrary(functions, 'libraryCatalogSave', {
            schoolId,
            item: {
              name: item.name,
              shelfLocation: targetShelf,
              category: item.category,
              condition: 'good',
            },
            itemId: item.id,
          });

          const record: AuditRecord = {
            id: `${item.id}-${now}`,
            item,
            scannedAt: now,
            type: 'recovered',
            originalShelf: item.shelfLocation || 'None',
            message: `Recovered "${item.name}"! Status restored to available on "${targetShelf}".`,
          };
          setLastScanResult(record);
          setAuditRecords(prev => [record, ...prev]);
          if (soundEnabled) playSound('success');
          return;
        }

        // Check if on correct shelf
        if (currentShelfNorm === targetShelfNorm) {
          const record: AuditRecord = {
            id: `${item.id}-${now}`,
            item,
            scannedAt: now,
            type: 'match',
            originalShelf: item.shelfLocation || 'Unassigned',
            message: `Verified "${item.name}" on correct shelf.`,
          };
          setLastScanResult(record);
          setAuditRecords(prev => [record, ...prev]);
          if (soundEnabled) playSound('success');
          return;
        }

        // Misfiled book
        const record: AuditRecord = {
          id: `${item.id}-${now}`,
          item,
          scannedAt: now,
          type: 'misfiled',
          originalShelf: item.shelfLocation || 'Unassigned',
          message: `Misfiled! "${item.name}" belongs on "${item.shelfLocation || 'Unassigned'}".`,
        };
        setLastScanResult(record);
        setAuditRecords(prev => [record, ...prev]);
        if (soundEnabled) playSound('error');
      } catch (err) {
        toast({
          variant: 'destructive',
          title: 'Scan check failed',
          description: (err as Error).message,
        });
      } finally {
        processingRef.current = false;
        setBusy(false);
      }
    },
    [firestore, schoolId, targetShelf, soundEnabled, playSound, functions, toast],
  );

  const reader = useBarcodeReaderWedge({
    active: isOpen && Boolean(targetShelf) && !busy,
    onScan: handleAuditScan,
  });

  const { videoRef, hasCameraPermission, zoom, setZoom } = useBarcodeScanner(
    cameraActive && isOpen && Boolean(targetShelf) && !busy,
    scanned => void handleAuditScan(scanned),
    () => {},
    { cameraEnabled: cameraActive, keepCameraWarm: true },
  );

  const relocateToCurrentShelf = async (item: LibraryItem) => {
    try {
      await callLibrary(functions, 'libraryCatalogSave', {
        schoolId,
        item: {
          name: item.name,
          shelfLocation: targetShelf,
          category: item.category,
        },
        itemId: item.id,
      });
      toast({
        title: 'Shelf updated',
        description: `"${item.name}" moved to "${targetShelf}".`,
      });
      // Update record in list
      setAuditRecords(prev =>
        prev.map(r => (r.item.id === item.id ? { ...r, type: 'match', originalShelf: targetShelf } : r)),
      );
      if (lastScanResult?.item.id === item.id) {
        setLastScanResult(prev => (prev ? { ...prev, type: 'match', originalShelf: targetShelf } : null));
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not update shelf', description: (e as Error).message });
    }
  };

  const markUnscannedAsLost = async () => {
    if (!unscannedExpected.length) return;
    try {
      for (const item of unscannedExpected) {
        await callLibrary(functions, 'libraryCirculation', {
          schoolId,
          action: 'condition',
          itemId: item.id,
          condition: 'lost',
        });
      }
      toast({
        title: 'Inventory updated',
        description: `Marked ${unscannedExpected.length} unscanned copies as lost.`,
      });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed to mark lost', description: (e as Error).message });
    }
  };

  const exportAuditReport = () => {
    const rows = [
      ['Timestamp', 'Title', 'Barcode', 'Audit Status', 'Cataloged Shelf', 'Audit Shelf', 'Note'],
      ...auditRecords.map(r => [
        new Date(r.scannedAt).toLocaleTimeString(),
        r.item.name,
        r.item.upc,
        r.type.toUpperCase(),
        r.originalShelf,
        targetShelf,
        r.message,
      ]),
    ];
    downloadLibraryCsv(`shelf-audit-${targetShelf.replace(/[^a-z0-9]/gi, '_')}.csv`, rows);
  };

  const matchCount = auditRecords.filter(r => r.type === 'match').length;
  const misfiledCount = auditRecords.filter(r => r.type === 'misfiled').length;
  const recoveredCount = auditRecords.filter(r => r.type === 'recovered').length;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-h-[94dvh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 pr-6">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <DialogTitle>Shelf Audit &amp; Physical Inventory</DialogTitle>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setSoundEnabled(v => !v)}
                title={soundEnabled ? 'Mute chimes' : 'Unmute chimes'}
              >
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCameraActive(v => !v)}
                className="gap-1.5 text-xs"
              >
                {cameraActive ? <CameraOff className="h-3.5 w-3.5" /> : <Camera className="h-3.5 w-3.5" />}
                {cameraActive ? 'Close Cam' : 'Camera'}
              </Button>
            </div>
          </div>
          <DialogDescription>
            Scan book barcodes sequentially along a shelf. Instantly flags misfiled books, verifies correct placements,
            and recovers lost copies.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Target Shelf Selector */}
          <div className="rounded-2xl border p-4 bg-muted/20 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                Target Shelf to Audit
              </span>
              {targetShelf && (
                <Badge variant="secondary" className="font-bold">
                  {expectedOnShelf.length} books registered on this shelf
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-48 flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Type or select shelf location (e.g. Fiction A-D)"
                  value={shelfInput}
                  onChange={e => setShelfInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && shelfInput.trim()) {
                      setTargetShelf(shelfInput.trim());
                    }
                  }}
                />
              </div>
              <Button
                onClick={() => {
                  if (shelfInput.trim()) {
                    setTargetShelf(shelfInput.trim());
                  }
                }}
                disabled={!shelfInput.trim() || targetShelf === shelfInput.trim()}
              >
                Set Shelf
              </Button>
            </div>

            {existingShelves.length > 0 && !targetShelf && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-xs text-muted-foreground mr-1 self-center">Existing:</span>
                {existingShelves.slice(0, 10).map(s => (
                  <Button
                    key={s}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs rounded-lg"
                    onClick={() => {
                      setShelfInput(s);
                      setTargetShelf(s);
                    }}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {targetShelf && (
            <>
              {cameraActive && (
                <div className="overflow-hidden rounded-2xl border bg-muted/30 p-2 shadow-inner">
                  <BarcodeScannerCameraView
                    videoRef={videoRef}
                    hasCameraPermission={hasCameraPermission}
                    zoom={zoom}
                    onZoomChange={setZoom}
                    viewportClassName="aspect-video max-h-40 rounded-xl overflow-hidden shadow-inner"
                    hintText="Point at barcode on book copy"
                  />
                </div>
              )}

              {/* Barcode scanner wedge input */}
              <LibraryBarcodeReaderField
                inputId="shelf-audit-scanner"
                inputRef={reader.inputRef}
                scanBuffer={reader.scanBuffer}
                onScanBufferChange={reader.setScanBuffer}
                onSubmit={reader.submitScan}
                active={!busy}
                hint={`Auditing shelf "${targetShelf}": Scan book barcodes in order.`}
              />

              {/* Live Last Scan Feedback Banner */}
              {lastScanResult && (
                <div
                  className={`rounded-2xl border p-4 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200 ${
                    lastScanResult.type === 'match'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
                      : lastScanResult.type === 'recovered'
                        ? 'border-blue-500/30 bg-blue-500/10 text-blue-900 dark:text-blue-200'
                        : lastScanResult.type === 'misfiled'
                          ? 'border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200'
                          : 'border-destructive/30 bg-destructive/10 text-destructive'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {lastScanResult.type === 'match' && <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />}
                    {lastScanResult.type === 'recovered' && <Sparkles className="h-6 w-6 text-blue-600 shrink-0" />}
                    {lastScanResult.type === 'misfiled' && (
                      <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{lastScanResult.item.name}</span>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {lastScanResult.item.upc}
                        </Badge>
                      </div>
                      <p className="text-xs opacity-90">{lastScanResult.message}</p>
                    </div>
                  </div>

                  {lastScanResult.type === 'misfiled' && (
                    <Button
                      size="sm"
                      variant="default"
                      className="gap-1 text-xs font-bold shrink-0"
                      onClick={() => relocateToCurrentShelf(lastScanResult.item)}
                    >
                      Move to this shelf <ArrowRight className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}

              {/* Shelf Audit Counters */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="rounded-xl border p-2 bg-background">
                  <span className="block text-[11px] text-muted-foreground">Verified Here</span>
                  <span className="text-lg font-bold text-emerald-600">{matchCount}</span>
                </div>
                <div className="rounded-xl border p-2 bg-background">
                  <span className="block text-[11px] text-muted-foreground">Misfiled Found</span>
                  <span className="text-lg font-bold text-amber-600">{misfiledCount}</span>
                </div>
                <div className="rounded-xl border p-2 bg-background">
                  <span className="block text-[11px] text-muted-foreground">Recovered</span>
                  <span className="text-lg font-bold text-blue-600">{recoveredCount}</span>
                </div>
                <div className="rounded-xl border p-2 bg-background">
                  <span className="block text-[11px] text-muted-foreground">Unscanned</span>
                  <span className="text-lg font-bold text-muted-foreground">{unscannedExpected.length}</span>
                </div>
              </div>

              {/* Scanned Log */}
              {auditRecords.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                    <span>Audit Scans ({auditRecords.length})</span>
                    <Button variant="ghost" size="sm" onClick={exportAuditReport} className="h-7 text-xs gap-1">
                      <Download className="h-3 w-3" /> Export Audit CSV
                    </Button>
                  </div>
                  <ul className="max-h-40 overflow-y-auto space-y-1 rounded-xl border p-2 bg-background text-xs">
                    {auditRecords.map((r, i) => (
                      <li key={i} className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-muted/30">
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {new Date(r.scannedAt).toLocaleTimeString()}
                          </span>
                          <span className="font-semibold truncate">{r.item.name}</span>
                        </div>
                        <Badge
                          variant={
                            r.type === 'match'
                              ? 'secondary'
                              : r.type === 'recovered'
                                ? 'default'
                                : r.type === 'misfiled'
                                  ? 'outline'
                                  : 'destructive'
                          }
                          className="text-[10px] shrink-0 font-bold"
                        >
                          {r.type.toUpperCase()}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Unscanned books drawer/detail */}
              {unscannedExpected.length > 0 && (
                <details className="rounded-xl border bg-muted/20 p-3 text-xs">
                  <summary className="cursor-pointer font-semibold text-muted-foreground flex items-center justify-between">
                    <span>Missing / Unscanned Books from &ldquo;{targetShelf}&rdquo; ({unscannedExpected.length})</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[11px] ml-2 text-destructive border-destructive/40"
                      onClick={e => {
                        e.preventDefault();
                        void markUnscannedAsLost();
                      }}
                    >
                      Mark all unscanned as Lost
                    </Button>
                  </summary>
                  <ul className="mt-2 space-y-1 max-h-36 overflow-y-auto divide-y divide-border/60">
                    {unscannedExpected.map(i => (
                      <li key={i.id} className="py-1 flex items-center justify-between">
                        <span className="truncate">{i.name}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">{i.upc}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close Audit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
