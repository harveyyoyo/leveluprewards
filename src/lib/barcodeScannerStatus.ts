'use client';

export type BarcodeScannerPhase =
  | 'off'
  | 'starting'
  | 'camera-ready'
  | 'scanning'
  | 'paused'
  | 'lookup'
  | 'error';

export type BarcodeScannerStatus = {
  phase: BarcodeScannerPhase;
  /** Short user-facing line under the camera preview. */
  hint: string;
  /** Extra detail for staff troubleshooting. */
  detail: string;
  cameraReady: boolean;
  decodeActive: boolean;
  videoWidth: number;
  videoHeight: number;
  framesDecoded: number;
  framesPerSec: number;
  lastEngine: string | null;
  detectorKind: 'native' | 'wasm' | 'none';
};

export const INITIAL_BARCODE_SCANNER_STATUS: BarcodeScannerStatus = {
  phase: 'off',
  hint: 'Camera off',
  detail: '',
  cameraReady: false,
  decodeActive: false,
  videoWidth: 0,
  videoHeight: 0,
  framesDecoded: 0,
  framesPerSec: 0,
  lastEngine: null,
  detectorKind: 'none',
};

export function barcodeScannerHintForPhase(phase: BarcodeScannerPhase, decodeActive: boolean): string {
  if (!decodeActive && phase !== 'error') return 'Camera warm — open Scan tab to read barcodes';
  switch (phase) {
    case 'starting':
      return 'Starting camera…';
    case 'camera-ready':
      return 'Camera ready — hold card in dashed frame';
    case 'scanning':
      return 'Scanning — hold card steady in dashed frame';
    case 'paused':
      return 'Processing scan…';
    case 'lookup':
      return 'Looking up student…';
    case 'error':
      return 'Camera error — check permissions and retry';
    case 'off':
    default:
      return 'Camera off';
  }
}
