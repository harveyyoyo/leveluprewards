'use client';

import { useEffect, useState } from 'react';
import { Cable, CheckCircle2, Cog, Loader2, Plug, PlugZap, TriangleAlert, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  disconnect as motorDisconnect,
  getBaudRate,
  isSupported as motorIsSupported,
  requestAndConnect,
  sendRawGcode,
  setBaudRate,
  SUPPORTED_BAUDS,
  tryAutoReconnect,
  useMotorStatus,
  type SupportedBaud,
} from '@/lib/vendingMotor';

/**
 * Self-contained UI for pairing the kiosk browser with the USB serial board
 * that drives the physical vending machine. Shows connection state, lets the
 * operator pick a baud rate, and exposes a small "manual jog" textbox for
 * debugging a new rig without touching any prize config.
 */
export function VendingMotorPanel({ className }: { className?: string }) {
  const status = useMotorStatus();
  const { toast } = useToast();
  const [isBusy, setIsBusy] = useState(false);
  const [baud, setBaud] = useState<SupportedBaud>(() => getBaudRate());
  const [manualGcode, setManualGcode] = useState('G91\nG1 E10 F500\nM400');
  const [isSendingManual, setIsSendingManual] = useState(false);

  useEffect(() => {
    // Silently restore a previously-authorized port on mount. This does not
    // show the permission prompt — it only succeeds when the user already
    // granted access to this origin earlier.
    void tryAutoReconnect();
  }, []);

  const handleConnect = async () => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      await requestAndConnect();
      toast({ title: 'Motor connected', description: 'USB serial port is open and ready.' });
    } catch (err) {
      // User dismissing the browser chooser shows up as NotFoundError — suppress.
      const name = (err as { name?: string })?.name;
      if (name !== 'NotFoundError') {
        toast({
          variant: 'destructive',
          title: 'Could not connect',
          description: (err as Error)?.message ?? 'Unknown serial error.',
        });
      }
    } finally {
      setIsBusy(false);
    }
  };

  const handleDisconnect = async () => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      await motorDisconnect();
      toast({ title: 'Motor disconnected' });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Disconnect failed',
        description: (err as Error)?.message ?? 'Unknown serial error.',
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleBaudChange = (next: string) => {
    const parsed = parseInt(next, 10);
    if (!SUPPORTED_BAUDS.includes(parsed as SupportedBaud)) return;
    const nextBaud = parsed as SupportedBaud;
    setBaud(nextBaud);
    setBaudRate(nextBaud);
    if (status.kind === 'connected' && nextBaud !== status.baudRate) {
      toast({
        title: 'Baud rate updated',
        description: 'Disconnect and reconnect for the new rate to take effect.',
      });
    }
  };

  const handleManualSend = async () => {
    if (isSendingManual) return;
    if (status.kind !== 'connected') {
      toast({ variant: 'destructive', title: 'Not connected', description: 'Connect to a serial device first.' });
      return;
    }
    if (!manualGcode.trim()) return;
    setIsSendingManual(true);
    try {
      await sendRawGcode(manualGcode);
      toast({ title: 'G-code sent', description: 'Commands written to the board.' });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Send failed',
        description: (err as Error)?.message ?? 'Unknown serial error.',
      });
    } finally {
      setIsSendingManual(false);
    }
  };

  const supported = motorIsSupported();

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Cog className="w-4 h-4 text-primary" />
            Vending machine
          </CardTitle>
          <CardDescription>
            Connect the Arduino Mega + RAMPS board over USB serial. The connection is per-browser — open this page on the kiosk
            that's physically wired to the machine.
          </CardDescription>
        </div>
        <StatusPill status={status} />
      </CardHeader>
      <CardContent className="space-y-4">
        {!supported && (
          <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-200">
            <TriangleAlert className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              This browser doesn't support Web Serial. Use a recent <span className="font-semibold">Chrome</span>,{' '}
              <span className="font-semibold">Edge</span>, or <span className="font-semibold">Opera</span> on desktop to drive
              the motor.
            </div>
          </div>
        )}

        <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
          <div className="space-y-1">
            <Label htmlFor="motor-baud" className="text-xs">Baud rate</Label>
            <Select value={String(baud)} onValueChange={handleBaudChange}>
              <SelectTrigger id="motor-baud" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_BAUDS.map((b) => (
                  <SelectItem key={b} value={String(b)}>
                    {b.toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {status.kind === 'connected' ? (
            <Button type="button" variant="outline" onClick={handleDisconnect} disabled={isBusy}>
              {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
              Disconnect
            </Button>
          ) : (
            <Button type="button" onClick={handleConnect} disabled={isBusy || !supported}>
              {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlugZap className="mr-2 h-4 w-4" />}
              Connect
            </Button>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground leading-snug">
          Marlin's default is <span className="font-mono">250000</span>. If your firmware uses a different rate, pick it before
          connecting. After changing, disconnect and reconnect for it to apply.
        </p>

        <div className="space-y-2 pt-2 border-t">
          <Label htmlFor="motor-manual" className="text-xs">Manual G-code</Label>
          <textarea
            id="motor-manual"
            value={manualGcode}
            onChange={(e) => setManualGcode(e.target.value)}
            className="w-full min-h-[72px] rounded-md border bg-background p-2 text-xs font-mono"
            placeholder={'G91\nG1 E10 F500\nM400'}
            spellCheck={false}
            disabled={status.kind !== 'connected'}
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">Useful for homing, jogging, or sanity-checking a new rig.</p>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={handleManualSend}
              disabled={isSendingManual || status.kind !== 'connected'}
            >
              {isSendingManual ? (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              ) : (
                <Cable className="mr-2 h-3 w-3" />
              )}
              Send
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusPill({ status }: { status: ReturnType<typeof useMotorStatus> }) {
  const base = 'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider';
  switch (status.kind) {
    case 'connected':
      return (
        <span className={`${base} bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300`}>
          <CheckCircle2 className="h-3 w-3" /> Connected
        </span>
      );
    case 'connecting':
      return (
        <span className={`${base} bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300`}>
          <Loader2 className="h-3 w-3 animate-spin" /> Connecting…
        </span>
      );
    case 'error':
      return (
        <span className={`${base} bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300`}>
          <TriangleAlert className="h-3 w-3" /> Error
        </span>
      );
    case 'unsupported':
      return (
        <span className={`${base} bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300`}>
          <TriangleAlert className="h-3 w-3" /> Unsupported
        </span>
      );
    case 'disconnected':
    default:
      return (
        <span className={`${base} bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300`}>
          <Plug className="h-3 w-3" /> Disconnected
        </span>
      );
  }
}
