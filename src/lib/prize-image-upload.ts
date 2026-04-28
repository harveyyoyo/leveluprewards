import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import type { FirebaseStorage } from 'firebase/storage';

export const MAX_PRIZE_IMAGE_BYTES = 2 * 1024 * 1024;

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export function validatePrizeImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Please use a JPEG, PNG, GIF, or WebP image.';
  }
  if (file.size > MAX_PRIZE_IMAGE_BYTES) {
    return 'Image must be 2 MB or smaller.';
  }
  return null;
}

export async function uploadPrizeImage(
  storage: FirebaseStorage,
  schoolId: string,
  prizeId: string,
  file: File,
): Promise<string> {
  const err = validatePrizeImageFile(file);
  if (err) throw new Error(err);
  const ext =
    file.type === 'image/png' ? 'png' :
    file.type === 'image/gif' ? 'gif' :
    file.type === 'image/webp' ? 'webp' :
    'jpg';
  const path = `schools/${schoolId}/prizes/${prizeId}/cover.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}
