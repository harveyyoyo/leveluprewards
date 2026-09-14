import { httpsCallable, type Functions } from 'firebase/functions';
import {
  LIBRARY_BACKGROUND_MAX_BYTES,
  validateLibraryBackgroundFile,
} from './libraryBackground';

const MAX_EDGE_PX = 1920;
const JPEG_QUALITY = 0.82;

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that picture.'));
    };
    img.src = url;
  });
}

async function compressLibraryBackgroundFile(file: File): Promise<{ base64: string; contentType: string }> {
  const img = await loadImageFromFile(file);
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  if (!width || !height) throw new Error('Could not read that picture.');

  const scale = Math.min(1, MAX_EDGE_PX / Math.max(width, height));
  const targetW = Math.max(1, Math.round(width * scale));
  const targetH = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not prepare that picture.');
  ctx.drawImage(img, 0, 0, targetW, targetH);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((next) => resolve(next), 'image/jpeg', JPEG_QUALITY);
  });
  if (!blob) throw new Error('Could not prepare that picture.');
  if (blob.size > LIBRARY_BACKGROUND_MAX_BYTES) {
    throw new Error('That picture is still too big after shrinking. Please pick a smaller one.');
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  if (!base64) throw new Error('Could not prepare that picture.');
  return { base64, contentType: 'image/jpeg' };
}

export async function uploadLibraryBackgroundImage(
  functions: Functions,
  schoolId: string,
  file: File,
): Promise<string> {
  const validationError = validateLibraryBackgroundFile(file);
  if (validationError) throw new Error(validationError);

  const { base64, contentType } = await compressLibraryBackgroundFile(file);
  const upload = httpsCallable<
    { schoolId: string; imageBase64: string; contentType: string },
    { imageUrl?: string }
  >(functions, 'uploadLibraryBackground');
  const res = await upload({ schoolId, imageBase64: base64, contentType });
  const imageUrl = res.data?.imageUrl?.trim();
  if (!imageUrl) throw new Error('The picture was not saved.');
  return imageUrl;
}

export async function clearLibraryBackgroundImage(functions: Functions, schoolId: string): Promise<void> {
  const upload = httpsCallable<{ schoolId: string; remove: true }, { imageUrl?: string | null }>(
    functions,
    'uploadLibraryBackground',
  );
  await upload({ schoolId, remove: true });
}
