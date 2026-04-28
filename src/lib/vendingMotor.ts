'use client';

/**
 * Web Serial driver for a vending-machine rig built on Arduino Mega + RAMPS 1.4
 * running Marlin-style firmware. Exposes a small singleton API + a React hook
 * for connection state, plus a helper that turns a {@link VendingMotorConfig}
 * into G-code and writes it over the currently-open serial port.
 *
 * Notes:
 * - Web Serial is Chromium-only (Chrome, Edge, Opera). Safari/Firefox will get
 *   a graceful `isSupported() === false` and the UI should explain that.
 * - Calling `requestAndConnect()` MUST happen inside a user gesture (click);
 *   subsequent page loads can silently reconnect via `navigator.serial.getPorts()`.
 * - We keep a single module-level port — that matches how the physical machine
 *   actually works (one USB cable, one browser tab driving it at a time).
 */

import { useSyncExternalStore } from 'react';
import type { VendingMotorConfig } from './types';

// ---------------------------------------------------------------------------
// Web Serial type shims (lib.dom doesn't ship these yet in all TS versions)
// ---------------------------------------------------------------------------

type SerialPortLike = {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readonly readable: ReadableStream<Uint8Array> | null;
  readonly writable: WritableStream<Uint8Array> | null;
  getInfo(): { usbVendorId?: number; usbProductId?: number };
  addEventListener(type: 'disconnect', listener: () => void): void;
  removeEventListener(type: 'disconnect', listener: () => void): void;
};

type SerialLike = {
  requestPort(options?: { filters?: Array<{ usbVendorId?: number; usbProductId?: number }> }): Promise<SerialPortLike>;
  getPorts(): Promise<SerialPortLike[]>;
  addEventListener(type: 'disconnect', listener: (ev: Event & { target: SerialPortLike }) => void): void;
  removeEventListener(type: 'disconnect', listener: (ev: Event & { target: SerialPortLike }) => void): void;
};

function getSerial(): SerialLike | null {
  if (typeof navigator === 'undefined') return null;
  const n = navigator as unknown as { serial?: SerialLike };
  return n.serial ?? null;
}

// ---------------------------------------------------------------------------
// Persisted baud rate (board side must match, default 250000 for Marlin).
// ---------------------------------------------------------------------------

const BAUD_KEY = 'vending_motor_baud_rate';
const DEFAULT_BAUD = 250000;
export const SUPPORTED_BAUDS = [9600, 19200, 38400, 57600, 115200, 230400, 250000] as const;
export type SupportedBaud = (typeof SUPPORTED_BAUDS)[number];

export function getBaudRate(): SupportedBaud {
  if (typeof window === 'undefined') return DEFAULT_BAUD;
  try {
    const raw = window.localStorage.getItem(BAUD_KEY);
    const n = raw ? parseInt(raw, 10) : NaN;
    if (SUPPORTED_BAUDS.includes(n as SupportedBaud)) return n as SupportedBaud;
  } catch {
    /* ignore */
  }
  return DEFAULT_BAUD;
}

export function setBaudRate(baud: SupportedBaud): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(BAUD_KEY, String(baud));
  } catch {
    /* ignore */
  }
  // If currently connected, the new rate only applies after a reconnect.
}

// ---------------------------------------------------------------------------
// Kiosk-local rig profile (driver / motor labels + test move + idle shutdown)
// ---------------------------------------------------------------------------

export type VendingMotorDriverModule = 'a4988' | 'drv8825' | 'tmc2208' | 'tmc5160' | 'other';
export type VendingStepperMotorFrame = 'nema17' | 'nema23' | 'other';

const DRIVER_KEY = 'vending_motor_driver_module';
const FRAME_KEY = 'vending_motor_stepper_frame';
const DISABLE_AFTER_KEY = 'vending_motor_disable_after_move';
const TEST_AXIS_KEY = 'vending_motor_test_axis';
const TEST_DIST_KEY = 'vending_motor_test_distance';
const TEST_FEED_KEY = 'vending_motor_test_feed';

export const VENDING_MOTOR_DRIVER_LABELS: Record<VendingMotorDriverModule, string> = {
  a4988: 'A4988',
  drv8825: 'DRV8825',
  tmc2208: 'TMC2208',
  tmc5160: 'TMC5160',
  other: 'Other / unknown',
};

export const VENDING_STEPPER_FRAME_LABELS: Record<VendingStepperMotorFrame, string> = {
  nema17: 'NEMA 17',
  nema23: 'NEMA 23',
  other: 'Other',
};

const DRIVER_MODULES: VendingMotorDriverModule[] = ['a4988', 'drv8825', 'tmc2208', 'tmc5160', 'other'];
const FRAMES: VendingStepperMotorFrame[] = ['nema17', 'nema23', 'other'];

export function getMotorDriverModule(): VendingMotorDriverModule {
  if (typeof window === 'undefined') return 'a4988';
  try {
    const raw = window.localStorage.getItem(DRIVER_KEY);
    if (raw && DRIVER_MODULES.includes(raw as VendingMotorDriverModule)) return raw as VendingMotorDriverModule;
  } catch {
    /* ignore */
  }
  return 'a4988';
}

export function setMotorDriverModule(module: VendingMotorDriverModule): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DRIVER_KEY, module);
  } catch {
    /* ignore */
  }
}

export function getStepperMotorFrame(): VendingStepperMotorFrame {
  if (typeof window === 'undefined') return 'nema17';
  try {
    const raw = window.localStorage.getItem(FRAME_KEY);
    if (raw && FRAMES.includes(raw as VendingStepperMotorFrame)) return raw as VendingStepperMotorFrame;
  } catch {
    /* ignore */
  }
  return 'nema17';
}

export function setStepperMotorFrame(frame: VendingStepperMotorFrame): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FRAME_KEY, frame);
  } catch {
    /* ignore */
  }
}

/** When true (default), append Marlin `M84` after each generated dispense so drivers release current when idle. */
export function getDisableSteppersAfterMove(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem(DISABLE_AFTER_KEY);
    if (raw === '0') return false;
    if (raw === '1') return true;
  } catch {
    /* ignore */
  }
  return true;
}

export function setDisableSteppersAfterMove(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DISABLE_AFTER_KEY, enabled ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export type VendingTestMoveConfig = {
  axis: VendingMotorConfig['axis'];
  distance: number;
  feedRate: number;
};

const DEFAULT_TEST_MOVE: VendingTestMoveConfig = { axis: 'E', distance: 360, feedRate: 500 };

export function getTestMoveConfig(): VendingTestMoveConfig {
  if (typeof window === 'undefined') return { ...DEFAULT_TEST_MOVE };
  try {
    const axisRaw = window.localStorage.getItem(TEST_AXIS_KEY);
    const axis =
      axisRaw === 'X' || axisRaw === 'Y' || axisRaw === 'Z' || axisRaw === 'E' ? axisRaw : DEFAULT_TEST_MOVE.axis;
    const distRaw = window.localStorage.getItem(TEST_DIST_KEY);
    const distance = distRaw != null ? parseFloat(distRaw) : DEFAULT_TEST_MOVE.distance;
    const feedRaw = window.localStorage.getItem(TEST_FEED_KEY);
    const feedRate = feedRaw != null ? parseFloat(feedRaw) : DEFAULT_TEST_MOVE.feedRate;
    return {
      axis,
      distance: Number.isFinite(distance) ? distance : DEFAULT_TEST_MOVE.distance,
      feedRate: Number.isFinite(feedRate) && feedRate > 0 ? feedRate : DEFAULT_TEST_MOVE.feedRate,
    };
  } catch {
    return { ...DEFAULT_TEST_MOVE };
  }
}

export function setTestMoveConfig(patch: Partial<VendingTestMoveConfig>): void {
  if (typeof window === 'undefined') return;
  const cur = getTestMoveConfig();
  const next = { ...cur, ...patch };
  try {
    window.localStorage.setItem(TEST_AXIS_KEY, next.axis);
    window.localStorage.setItem(TEST_DIST_KEY, String(next.distance));
    window.localStorage.setItem(TEST_FEED_KEY, String(next.feedRate));
  } catch {
    /* ignore */
  }
}

/** One calibration move using saved axis / distance / feed (same G-code path as redemption). */
export async function runSavedTestMove(): Promise<void> {
  const { axis, distance, feedRate } = getTestMoveConfig();
  await testMotor({
    enabled: true,
    axis,
    distance,
    feedRate,
    returnToStart: false,
  });
}

// ---------------------------------------------------------------------------
// Connection state (module-level singleton, subscribable for React).
// ---------------------------------------------------------------------------

export type MotorStatus =
  | { kind: 'unsupported' }
  | { kind: 'disconnected' }
  | { kind: 'connecting' }
  | { kind: 'connected'; vendorId?: number; productId?: number; baudRate: SupportedBaud }
  | { kind: 'error'; message: string };

let currentPort: SerialPortLike | null = null;
let currentWriter: WritableStreamDefaultWriter<Uint8Array> | null = null;
let currentReaderCancel: (() => void) | null = null;
let status: MotorStatus = getSerial() ? { kind: 'disconnected' } : { kind: 'unsupported' };

const listeners = new Set<() => void>();
function emit(): void {
  for (const l of listeners) l();
}
function setStatus(next: MotorStatus): void {
  status = next;
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getStatus(): MotorStatus {
  return status;
}

export function isConnected(): boolean {
  return status.kind === 'connected' && currentWriter !== null;
}

export function isSupported(): boolean {
  return getSerial() !== null;
}

/** React hook: re-renders when the motor status changes. Safe on the server. */
export function useMotorStatus(): MotorStatus {
  return useSyncExternalStore(
    subscribe,
    () => status,
    () => (getSerial() ? { kind: 'disconnected' } : { kind: 'unsupported' }),
  );
}

// ---------------------------------------------------------------------------
// Port lifecycle
// ---------------------------------------------------------------------------

async function openPort(port: SerialPortLike, baudRate: SupportedBaud): Promise<void> {
  await port.open({ baudRate });
  currentPort = port;

  // Spin up a background reader that drains the device output. RAMPS / Marlin
  // emits `ok` / `echo:` lines — we don't parse them, we just keep the stream
  // flowing so the board's TX buffer never fills up and blocks future writes.
  const readable = port.readable;
  if (readable) {
    const reader = readable.getReader();
    currentReaderCancel = () => {
      reader.cancel().catch(() => {});
    };
    void (async () => {
      try {
        while (true) {
          const { done } = await reader.read();
          if (done) break;
        }
      } catch {
        /* port closed / disconnected — handled by `disconnect` event */
      } finally {
        try {
          reader.releaseLock();
        } catch {
          /* ignore */
        }
      }
    })();
  }

  const writable = port.writable;
  currentWriter = writable ? writable.getWriter() : null;

  const info = port.getInfo();
  setStatus({
    kind: 'connected',
    vendorId: info.usbVendorId,
    productId: info.usbProductId,
    baudRate,
  });

  const onDisconnect = () => {
    port.removeEventListener('disconnect', onDisconnect);
    void disconnect();
  };
  port.addEventListener('disconnect', onDisconnect);
}

/** Prompt the user to pick a USB serial device, then open it. Must run inside a user gesture. */
export async function requestAndConnect(): Promise<void> {
  const serial = getSerial();
  if (!serial) {
    setStatus({ kind: 'unsupported' });
    throw new Error('Web Serial is not available in this browser. Use Chrome, Edge, or Opera.');
  }
  try {
    setStatus({ kind: 'connecting' });
    const port = await serial.requestPort();
    const baud = getBaudRate();
    await openPort(port, baud);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to connect to serial device.';
    setStatus({ kind: 'error', message });
    throw err;
  }
}

/** Silently reconnect to the most recently-authorized port, if any. Safe to call on every page load. */
export async function tryAutoReconnect(): Promise<boolean> {
  const serial = getSerial();
  if (!serial) {
    setStatus({ kind: 'unsupported' });
    return false;
  }
  if (isConnected()) return true;
  try {
    const ports = await serial.getPorts();
    if (ports.length === 0) {
      setStatus({ kind: 'disconnected' });
      return false;
    }
    const baud = getBaudRate();
    await openPort(ports[0], baud);
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Auto-reconnect failed.';
    setStatus({ kind: 'error', message });
    return false;
  }
}

export async function disconnect(): Promise<void> {
  const port = currentPort;
  const writer = currentWriter;
  const cancelReader = currentReaderCancel;
  currentPort = null;
  currentWriter = null;
  currentReaderCancel = null;
  try {
    cancelReader?.();
  } catch {
    /* ignore */
  }
  try {
    if (writer) {
      try {
        writer.releaseLock();
      } catch {
        /* already released */
      }
    }
  } catch {
    /* ignore */
  }
  try {
    if (port) await port.close();
  } catch {
    /* already closed */
  }
  setStatus({ kind: 'disconnected' });
}

// ---------------------------------------------------------------------------
// G-code generation + dispatch
// ---------------------------------------------------------------------------

/**
 * Build the G-code lines for a given motor config. Public so callers can
 * preview what will be sent in the UI.
 */
export function buildGcode(config: VendingMotorConfig): string[] {
  if (config.customGcode && config.customGcode.trim()) {
    const lines = config.customGcode
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith(';'));
    lines.push('M400');
    if (getDisableSteppersAfterMove()) {
      lines.push('M84');
    }
    return lines;
  }

  const axis = config.axis;
  const distance = Number.isFinite(config.distance) ? config.distance : 0;
  const feed = config.feedRate && config.feedRate > 0 ? config.feedRate : 500;

  const lines: string[] = [];
  // Relative positioning — we don't care about absolute machine coordinates
  // for a vending rig, we just want "move N units forward from wherever".
  lines.push('G91');
  // E axis on Marlin also needs relative extruder mode (M83).
  if (axis === 'E') lines.push('M83');
  lines.push(`G1 ${axis}${distance.toFixed(3)} F${feed}`);
  if (config.returnToStart) {
    lines.push(`G1 ${axis}${(-distance).toFixed(3)} F${feed}`);
  }
  // Wait for all queued moves to finish before we return — lets the UI show
  // a meaningful "done" state and stops the next redeem from queueing behind.
  lines.push('M400');
  // Release holding torque when the kiosk is done (Marlin). Skipped for manual raw G-code panel.
  if (getDisableSteppersAfterMove()) {
    lines.push('M84');
  }
  return lines;
}

async function writeLines(lines: string[]): Promise<void> {
  const writer = currentWriter;
  if (!writer) throw new Error('Motor is not connected.');
  const encoder = new TextEncoder();
  for (const line of lines) {
    await writer.write(encoder.encode(`${line}\n`));
  }
}

/** Run the motor for a given prize. No-op (returns false) if motor isn't connected or config is disabled. */
export async function runMotor(config: VendingMotorConfig | undefined | null): Promise<boolean> {
  if (!config || !config.enabled) return false;
  if (!isConnected()) return false;
  const lines = buildGcode(config);
  if (lines.length === 0) return false;
  await writeLines(lines);
  return true;
}

/** Run the motor once for a test / preview gesture. Throws if not connected. */
export async function testMotor(config: VendingMotorConfig): Promise<void> {
  if (!isConnected()) throw new Error('Motor is not connected.');
  const lines = buildGcode({ ...config, enabled: true });
  await writeLines(lines);
}

/** Send an arbitrary one-shot G-code line (used by the settings panel for "Home" / custom commands). */
export async function sendRawGcode(gcode: string): Promise<void> {
  if (!isConnected()) throw new Error('Motor is not connected.');
  const lines = gcode
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith(';'));
  await writeLines(lines);
}
