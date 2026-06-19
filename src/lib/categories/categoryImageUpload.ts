import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import type { FirebaseStorage } from 'firebase/storage';
import { validatePrizeImageFile } from '@/lib/prizes/prizeImageUpload';

export async function uploadCategoryImage(
  storage: FirebaseStorage,
  schoolId: string,
  categoryId: string,
  file: File,
): Promise<string> {
  const err = validatePrizeImageFile(file);
  if (err) throw new Error(err);
  const ext =
    file.type === 'image/png'
      ? 'png'
      : file.type === 'image/gif'
        ? 'gif'
        : file.type === 'image/webp'
          ? 'webp'
          : 'jpg';
  const path = `schools/${schoolId}/categories/${categoryId}/icon.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}
