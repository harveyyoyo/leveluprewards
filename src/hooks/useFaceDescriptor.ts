'use client';

import { useCallback, useRef } from 'react';

const FACE_API_MODEL_BASE_URL =
  'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model/';

/**
 * Shared, lazy-loaded face-api bootstrap. The library is ~600 KB (plus model
 * weights fetched from a CDN) so we only want to pay that cost once per
 * session, the first time anyone (kiosk or admin) uses face recognition.
 *
 * Returns:
 *  - `ensureFaceApiReady`: resolves the face-api module with the minimal set
 *    of nets needed for a 128-d descriptor loaded.
 *  - `captureFaceDescriptor(video)`: runs single-face detection on a live
 *    `<video>` element and returns a 128-length descriptor, or null if no
 *    face was detected.
 *  - `averageDescriptor(samples)`: element-wise mean of N descriptors so we
 *    can smooth out per-frame noise from a 3-shot capture.
 */
export function useFaceDescriptor() {
  const faceApiReadyRef = useRef<Promise<any> | null>(null);

  const ensureFaceApiReady = useCallback(() => {
    if (faceApiReadyRef.current) return faceApiReadyRef.current;
    faceApiReadyRef.current = (async () => {
      const faceapi = await import('@vladmandic/face-api');
      await faceapi.nets.tinyFaceDetector.loadFromUri(FACE_API_MODEL_BASE_URL);
      await faceapi.nets.faceLandmark68TinyNet.loadFromUri(FACE_API_MODEL_BASE_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(FACE_API_MODEL_BASE_URL);
      return faceapi;
    })();
    return faceApiReadyRef.current;
  }, []);

  const captureFaceDescriptor = useCallback(
    async (video: HTMLVideoElement | null): Promise<number[] | null> => {
      if (!video || video.videoWidth <= 0) return null;
      const faceapi = await ensureFaceApiReady();
      const detection = await faceapi
        .detectSingleFace(
          video,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.35 }),
        )
        .withFaceLandmarks(true)
        .withFaceDescriptor();
      if (!detection?.descriptor) return null;
      return Array.from(detection.descriptor as Float32Array);
    },
    [ensureFaceApiReady],
  );

  const averageDescriptor = useCallback(
    (vectors: number[][]): number[] | null => {
      if (!vectors.length) return null;
      const dim = vectors[0]?.length ?? 0;
      if (dim !== 128) return null;
      const acc = new Array(dim).fill(0);
      for (const v of vectors) {
        if (!Array.isArray(v) || v.length !== dim) return null;
        for (let i = 0; i < dim; i++) acc[i] += v[i];
      }
      for (let i = 0; i < dim; i++) acc[i] /= vectors.length;
      return acc;
    },
    [],
  );

  return { ensureFaceApiReady, captureFaceDescriptor, averageDescriptor };
}
