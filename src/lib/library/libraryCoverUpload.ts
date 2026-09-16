import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import type { FirebaseStorage } from 'firebase/storage';

export const MAX_COVER_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB raw limit before compression

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
]);

export function validateCoverImageFile(file: File): string | null {
  if (file.type && !ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
    return 'Please select a valid image file (JPG, PNG, WebP).';
  }
  if (file.size > MAX_COVER_IMAGE_BYTES) {
    return 'Photo file is too large. Please select an image under 10 MB.';
  }
  return null;
}

/**
 * Resizes and compresses any camera photo or upload client-side so it loads fast
 * and does not consume excessive storage or bandwidth.
 */
export function compressAndResizeCoverImage(
  file: File,
  maxWidth = 720,
  maxHeight = 1080,
  quality = 0.82
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Canvas context unavailable'));
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Image compression failed'));
          },
          'image/jpeg',
          quality
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads a book cover photo to Firebase Storage if available, with automatic
 * client-side compression and a lightweight data URL fallback.
 */
export async function uploadLibraryBookCover(
  storage: FirebaseStorage | null | undefined,
  schoolId: string | null | undefined,
  file: File,
  bookId?: string | null
): Promise<string> {
  const validationError = validateCoverImageFile(file);
  if (validationError) throw new Error(validationError);

  const compressedBlob = await compressAndResizeCoverImage(file);

  if (storage && schoolId) {
    try {
      const cleanId = bookId ? bookId.replace(/[^a-zA-Z0-9_-]/g, '') : 'cover';
      const filename = `${cleanId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.jpg`;
      const storagePath = `schools/${schoolId}/library_covers/${filename}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, compressedBlob, { contentType: 'image/jpeg' });
      return await getDownloadURL(storageRef);
    } catch (err) {
      console.warn('Firebase storage upload failed for book cover, falling back to data URL', err);
    }
  }

  // Fallback if storage is not configured or in offline demo
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to encode image data'));
    reader.readAsDataURL(compressedBlob);
  });
}
