/**
 * LevelUp Circular 1D barcode (LU-C1D v1)
 *
 * Bitstream around a closed ring: asymmetric sync → length → UTF-8 payload → CRC-8.
 * Each bit is expanded to two radial modules (bar/bar or space/space) for sampling tolerance.
 */

export const CIRCULAR1D_PREFIX = 'LU-C1D:';

/** Max payload bytes (ASCII). Keeps ring module count reasonable for ID cards. */
export const CIRCULAR1D_MAX_PAYLOAD_BYTES = 32;

const SYNC_START_BITS = [1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0] as const;
const SYNC_END_BITS = [0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1] as const;

const MODULES_PER_BIT = 2;

const PAYLOAD_CHARSET = /^[\x20-\x7E]+$/;

export type Circular1dEncodeResult = {
  /** 1 = dark bar module, 0 = quiet space along the ring */
  modules: number[];
  payload: string;
  bits: number[];
};

function crc8(data: Uint8Array): number {
  let crc = 0;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x80 ? ((crc << 1) ^ 0x07) & 0xff : (crc << 1) & 0xff;
    }
  }
  return crc;
}

const LENGTH_FIELD_BITS = 6;

function bytesToBits(bytes: Uint8Array): number[] {
  const bits: number[] = [];
  for (const byte of bytes) {
    for (let b = 7; b >= 0; b--) bits.push((byte >> b) & 1);
  }
  return bits;
}

function lengthToBits(len: number): number[] {
  const bits: number[] = [];
  for (let b = LENGTH_FIELD_BITS - 1; b >= 0; b--) bits.push((len >> b) & 1);
  return bits;
}

function bitsToLength(bits: readonly number[]): number | null {
  if (bits.length !== LENGTH_FIELD_BITS) return null;
  let len = 0;
  for (const bit of bits) len = (len << 1) | (bit & 1);
  if (len === 0 || len > CIRCULAR1D_MAX_PAYLOAD_BYTES) return null;
  return len;
}

function bitsToBytes(bits: number[]): Uint8Array | null {
  if (bits.length % 8 !== 0) return null;
  const out = new Uint8Array(bits.length / 8);
  for (let i = 0; i < out.length; i++) {
    let byte = 0;
    for (let b = 0; b < 8; b++) byte = (byte << 1) | (bits[i * 8 + b] & 1);
    out[i] = byte;
  }
  return out;
}

function expandBitsToModules(bits: readonly number[]): number[] {
  const modules: number[] = [];
  for (const bit of bits) {
    if (bit) modules.push(1, 1);
    else modules.push(0, 0);
  }
  return modules;
}

function collapseModulesToBits(modules: readonly number[]): number[] | null {
  if (modules.length % MODULES_PER_BIT !== 0) return null;
  const bits: number[] = [];
  for (let i = 0; i < modules.length; i += MODULES_PER_BIT) {
    const a = modules[i] ? 1 : 0;
    const b = modules[i + 1] ? 1 : 0;
    if (a !== b) return null;
    bits.push(a);
  }
  return bits;
}

function matchBitsAt(haystack: readonly number[], needle: readonly number[], start: number): boolean {
  if (start + needle.length > haystack.length) return false;
  for (let i = 0; i < needle.length; i++) {
    if (haystack[start + i] !== needle[i]) return false;
  }
  return true;
}

function rotateModules<T>(arr: readonly T[], offset: number): T[] {
  const n = arr.length;
  if (n === 0) return [];
  const o = ((offset % n) + n) % n;
  return [...arr.slice(o), ...arr.slice(0, o)];
}

function decodeBitsFrame(bits: readonly number[]): string | null {
  const startLen = SYNC_START_BITS.length;
  const endLen = SYNC_END_BITS.length;
  const minLen = startLen + LENGTH_FIELD_BITS + 8 + endLen;
  if (bits.length < minLen) return null;

  let startIdx = -1;
  for (let i = 0; i <= bits.length - minLen; i++) {
    if (matchBitsAt(bits, SYNC_START_BITS, i)) {
      startIdx = i;
      break;
    }
  }
  if (startIdx < 0) return null;

  const afterStart = startIdx + startLen;
  if (afterStart + LENGTH_FIELD_BITS > bits.length) return null;

  const payloadLen = bitsToLength(bits.slice(afterStart, afterStart + LENGTH_FIELD_BITS));
  if (payloadLen === null) return null;

  const payloadBitsLen = payloadLen * 8;
  const crcStart = afterStart + LENGTH_FIELD_BITS + payloadBitsLen;
  const endStart = crcStart + 8;
  const frameEnd = endStart + endLen;
  if (frameEnd > bits.length) return null;

  if (!matchBitsAt(bits, SYNC_END_BITS, endStart)) return null;

  const payloadBits = bits.slice(afterStart + LENGTH_FIELD_BITS, crcStart);
  const payloadBytes = bitsToBytes(payloadBits);
  if (!payloadBytes || payloadBytes.length !== payloadLen) return null;

  const crcBits = bits.slice(crcStart, endStart);
  const crcBytes = bitsToBytes(crcBits);
  if (!crcBytes) return null;

  const frame = new Uint8Array(1 + payloadLen);
  frame[0] = payloadLen;
  frame.set(payloadBytes, 1);
  if (crc8(frame) !== crcBytes[0]) return null;

  const payload = new TextDecoder().decode(payloadBytes);
  if (!PAYLOAD_CHARSET.test(payload)) return null;
  return payload;
}

export function normalizeCircular1dPayload(raw: string): string | null {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed || trimmed.length > CIRCULAR1D_MAX_PAYLOAD_BYTES) return null;
  if (!PAYLOAD_CHARSET.test(trimmed)) return null;
  return trimmed;
}

/** Encode a plain ASCII payload into ring modules. */
export function encodeCircular1d(raw: string): Circular1dEncodeResult | null {
  const payload = normalizeCircular1dPayload(raw);
  if (!payload) return null;

  const payloadBytes = new TextEncoder().encode(payload);
  const lenByte = payloadBytes.length;
  if (lenByte > CIRCULAR1D_MAX_PAYLOAD_BYTES) return null;

  const frame = new Uint8Array(1 + lenByte);
  frame[0] = lenByte;
  frame.set(payloadBytes, 1);

  const lenBits = lengthToBits(lenByte);
  const dataBits = bytesToBits(payloadBytes);
  const crcBits = bytesToBits(new Uint8Array([crc8(frame)]));

  const bits = [...SYNC_START_BITS, ...lenBits, ...dataBits, ...crcBits, ...SYNC_END_BITS];
  const modules = expandBitsToModules(bits);

  return { modules, payload, bits };
}

/** Decode ring modules (tries every rotation). */
export function decodeCircular1d(modules: readonly number[]): string | null {
  const collapsed = collapseModulesToBits(modules);
  if (!collapsed) return null;

  const n = collapsed.length;
  for (let rot = 0; rot < n; rot++) {
    const rotated = rotateModules(collapsed, rot);
    const payload = decodeBitsFrame(rotated);
    if (payload) return payload;
  }
  return null;
}

/** Scanned value with optional prefix for routing in kiosk flows. */
export function formatCircular1dScanValue(payload: string): string {
  return `${CIRCULAR1D_PREFIX}${payload}`;
}

export function parseCircular1dScanValue(raw: string): string | null {
  const trimmed = String(raw ?? '').trim();
  if (trimmed.startsWith(CIRCULAR1D_PREFIX)) {
    return normalizeCircular1dPayload(trimmed.slice(CIRCULAR1D_PREFIX.length));
  }
  return decodeCircular1dFromScan(trimmed);
}

/** Accept LU-C1D prefix or a raw payload that round-trips encode/decode. */
export function decodeCircular1dFromScan(raw: string): string | null {
  const trimmed = String(raw ?? '').trim();
  if (trimmed.startsWith(CIRCULAR1D_PREFIX)) {
    return normalizeCircular1dPayload(trimmed.slice(CIRCULAR1D_PREFIX.length));
  }
  const enc = encodeCircular1d(trimmed);
  if (!enc) return null;
  return decodeCircular1d(enc.modules) === trimmed ? trimmed : null;
}

/** Ideal boolean samples around the ring (for tests / simulation). */
export function modulesToRingSamples(modules: readonly number[], sampleCount = 720): boolean[] {
  const n = modules.length;
  if (n === 0) return [];
  const out = new Array<boolean>(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    const moduleIdx = Math.floor((i / sampleCount) * n) % n;
    out[i] = modules[moduleIdx] === 1;
  }
  return out;
}

/** Resample angular booleans into a module stream at a fixed module count. */
export function ringSamplesToModules(
  samples: readonly boolean[],
  moduleCount: number,
): number[] | null {
  const n = samples.length;
  if (n < 48 || moduleCount < 16 || moduleCount % MODULES_PER_BIT !== 0) return null;

  const modules: number[] = [];
  for (let m = 0; m < moduleCount; m++) {
    const start = Math.floor((m / moduleCount) * n);
    const end = Math.floor(((m + 1) / moduleCount) * n);
    let votes = 0;
    const span = Math.max(1, end - start);
    for (let i = start; i < end; i++) if (samples[i]) votes++;
    modules.push(votes * 2 >= span ? 1 : 0);
  }
  return modules;
}

const RING_DECODE_MODULE_COUNT_MIN = 48;
const RING_DECODE_MODULE_COUNT_MAX = 512;

/**
 * Decode angular ring samples (camera / canvas).
 * Tries plausible module counts until sync + CRC succeed.
 */
export function decodeCircular1dFromRingSamples(samples: readonly boolean[]): string | null {
  if (samples.length < 48) return null;

  for (
    let moduleCount = RING_DECODE_MODULE_COUNT_MIN;
    moduleCount <= RING_DECODE_MODULE_COUNT_MAX;
    moduleCount += MODULES_PER_BIT
  ) {
    const modules = ringSamplesToModules(samples, moduleCount);
    if (!modules) continue;
    const payload = decodeCircular1d(modules);
    if (payload) return payload;
  }
  return null;
}
