'use client';

import { useEffect, useState } from 'react';
import { Cable, CheckCircle2, Cog, Loader2, Plug, PlugZap, RotateCw, TriangleAlert, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import type { VendingMotorConfig } from '@/lib/types';
import {
  disconnect as motorDisconnect,
  getBaudRate,
  getDisableSteppersAfterMove,
  getMotorDriverModule,
  getStepperMotorFrame,
  getTestMoveConfig,
  isSupported as motorIsSupported,
  requestAndConnect,
  runSavedTestMove,
  sendRawGcode,
  setBaudRate,
  setDisableSteppersAfterMove,
  setMotorDriverModule,
  setStepperMotorFrame,
  setTestMoveConfig,
  SUPPORTED_BAUDS,
  tryAutoReconnect,
  useMotorStatus,
  VENDING_MOTOR_DRIVER_LABELS,
  VENDING_STEPPER_FRAME_LABELS,
  type SupportedBaud,
  type VendingMotorDriverModule,
  type VendingStepperMotorFrame,
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
  const [driverModule, setDriverModuleState] = useState<VendingMotorDriverModule>('a4988');
  const [stepperFrame, setStepperFrameState] = useState<VendingStepperMotorFrame>('nema17');
  const [disableAfterMove, setDisableAfterMoveState] = useState(true);
  const [testAxis, setTestAxis] = useState<VendingMotorConfig['axis']>('E');
  const [testDistance, setTestDistance] = useState(String(360));
  const [testFeed, setTestFeed] = useState(String(500));
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [prefsReady, setPrefsReady] = useState(false);

  useEffect(() => {
    // Silently restore a previously-authorized port on mount. This does not
    // show the permission prompt — it only succeeds when the user already
    // granted access to this origin earlier.
    void tryAutoReconnect();
  }, []);

  useEffect(() => {
    setDriverModuleState(getMotorDriverModule());
    setStepperFrameState(getStepperMotorFrame());
    setDisableAfterMoveState(getDisableSteppersAfterMove());
    const t = getTestMoveConfig();
    setTestAxis(t.axis);
    setTestDistance(String(t.distance));
    setTestFeed(String(t.feedRate));
    setPrefsReady(true);
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

  const persistTestMoveFromFields = () => {
    const dist = parseFloat(testDistance);
    const feed = parseFloat(testFeed);
    setTestMoveConfig({
      axis: testAxis,
      distance: Number.isFinite(dist) ? dist : 360,
      feedRate: Number.isFinite(feed) && feed > 0 ? feed : 500,
    });
  };

  const handleDriverChange = (value: string) => {
    const v = value as VendingMotorDriverModule;
    setDriverModuleState(v);
    setMotorDriverModule(v);
  };

  const handleFrameChange = (value: string) => {
    const v = value as VendingStepperMotorFrame;
    setStepperFrameState(v);
    setStepperMotorFrame(v);
  };

  const handleDisableIdleChange = (checked: boolean) => {
    setDisableAfterMoveState(checked);
    setDisableSteppersAfterMove(checked);
  };

  const applyTestPreset = (axis: VendingMotorConfig['axis'], distance: number, feed: number) => {
    setTestAxis(axis);
    setTestDistance(String(distance));
    setTestFeed(String(feed));
    setTestMoveConfig({ axis, distance, feedRate: feed });
  };

  const handleTestMove = async () => {
    if (isSendingTest) return;
    if (status.kind !== 'connected') {
      toast({ variant: 'destructive', title: 'Not connected', description: 'Connect to a serial device first.' });
      return;
    }
    setIsSendingTest(true);
    try {
      const dist = parseFloat(testDistance);
      const feed = parseFloat(testFeed);
      const distance = Number.isFinite(dist) ? dist : 360;
      const feedRate = Number.isFinite(feed) && feed > 0 ? feed : 500;
      setTestMoveConfig({ axis: testAxis, distance, feedRate });
      await runSavedTestMove();
      toast({
        title: 'Test move sent',
        description: `Axis ${testAxis}, distance ${distance}, F${feedRate}.`,
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Test move failed',
        description: (err as Error)?.message ?? 'Unknown serial error.',
      });
    } finally {
      setIsSendingTest(false);
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

        <div className="space-y-3 pt-2 border-t">
          <div>
            <p className="text-xs font-medium text-foreground">Stepper motor & driver</p>
            <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
              Stored in this browser only. Tune steps/mm and current in Marlin — these labels are for your notes and presets
              below.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="motor-frame" className="text-xs">
                Motor frame
              </Label>
              <Select value={stepperFrame} onValueChange={handleFrameChange} disabled={!prefsReady}>
                <SelectTrigger id="motor-frame" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(VENDING_STEPPER_FRAME_LABELS) as VendingStepperMotorFrame[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {VENDING_STEPPER_FRAME_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="motor-driver" className="text-xs">
                Driver on RAMPS
              </Label>
              <Select value={driverModule} onValueChange={handleDriverChange} disabled={!prefsReady}>
                <SelectTrigger id="motor-driver" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(VENDING_MOTOR_DRIVER_LABELS) as VendingMotorDriverModule[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {VENDING_MOTOR_DRIVER_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5 pr-2">
              <Label htmlFor="motor-disable-idle" className="text-xs cursor-pointer">
                Turn off motors when idle
              </Label>
              <p className="text-[11px] text-muted-foreground leading-snug">
                After each prize or test move, send Marlin <span className="font-mono">M84</span> so steppers release (less heat
                and buzz). Manual G-code below is unchanged.
              </p>
            </div>
            <Switch
              id="motor-disable-idle"
              checked={disableAfterMove}
              onCheckedChange={handleDisableIdleChange}
              disabled={!prefsReady}
              className="shrink-0 self-start sm:self-center"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Test one move (calibration)</Label>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Uses the same path as a redemption. Set distance to match one full spiral in your firmware units (often{' '}
              <span className="font-mono">E360</span>).
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1 w-[4.5rem]">
                <Label className="text-[10px] text-muted-foreground">Axis</Label>
                <Select
                  value={testAxis}
                  onValueChange={(v) => setTestAxis(v as VendingMotorConfig['axis'])}
                  disabled={status.kind !== 'connected'}
                >
                  <SelectTrigger className="h-9 font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['X', 'Y', 'Z', 'E'] as const).map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 flex-1 min-w-[5rem]">
                <Label className="text-[10px] text-muted-foreground">Distance</Label>
                <Input
                  className="h-9 font-mono text-xs"
                  inputMode="decimal"
                  value={testDistance}
                  onChange={(e) => setTestDistance(e.target.value)}
                  onBlur={persistTestMoveFromFields}
                  disabled={status.kind !== 'connected'}
                />
              </div>
              <div className="space-y-1 flex-1 min-w-[5rem]">
                <Label className="text-[10px] text-muted-foreground">Feed F</Label>
                <Input
                  className="h-9 font-mono text-xs"
                  inputMode="numeric"
                  value={testFeed}
                  onChange={(e) => setTestFeed(e.target.value)}
                  onBlur={persistTestMoveFromFields}
                  disabled={status.kind !== 'connected'}
                />
              </div>
              <Button
                type="button"
                size="sm"
                className="h-9"
                onClick={handleTestMove}
                disabled={isSendingTest || status.kind !== 'connected'}
              >
                {isSendingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
                <span className="ml-2">Run test</span>
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => applyTestPreset('E', 360, 500)} disabled={status.kind !== 'connected'}>
                Preset: E 360
              </Button>
              <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => applyTestPreset('E', 90, 500)} disabled={status.kind !== 'connected'}>
                E 90
              </Button>
              <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => applyTestPreset('E', 10, 500)} disabled={status.kind !== 'connected'}>
                E 10 jog
              </Button>
            </div>
          </div>
        </div>

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
