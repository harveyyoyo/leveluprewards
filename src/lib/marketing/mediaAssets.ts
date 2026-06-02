import {
  emptyMediaLabel,
  normalizeMediaLabelsFile,
  type MediaAssetItem,
  type MediaAssetLabelsFile,
  type MediaUsageSlot,
} from "./mediaAssetTypes";

export function getLabelForPath(
  labels: MediaAssetLabelsFile,
  path: string,
) {
  return { ...emptyMediaLabel(), ...labels.items[path] };
}

export function findAssetsByUsage(
  items: MediaAssetItem[],
  labels: MediaAssetLabelsFile,
  usage: MediaUsageSlot,
  options?: { reviewedOnly?: boolean },
): MediaAssetItem[] {
  return items.filter((item) => {
    const label = labels.items[item.path];
    if (!label || label.usage !== usage) return false;
    if (options?.reviewedOnly && !label.reviewed) return false;
    return true;
  });
}

export function pickBestAssetForUsage(
  items: MediaAssetItem[],
  labels: MediaAssetLabelsFile,
  usage: MediaUsageSlot,
): MediaAssetItem | undefined {
  const reviewed = findAssetsByUsage(items, labels, usage, {
    reviewedOnly: true,
  });
  if (reviewed.length) return reviewed[0];
  return findAssetsByUsage(items, labels, usage)[0];
}

export function publicUrlForAsset(item: MediaAssetItem): string {
  return item.publicUrl;
}

export { emptyMediaLabel, normalizeMediaLabelsFile };
export type { MediaAssetItem, MediaAssetLabelsFile, MediaUsageSlot };
