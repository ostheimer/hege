import {
  FALLWILD_PHOTO_QUALITY,
  getRemainingFallwildPhotoSlots,
  limitFallwildPhotoAttachments,
  mergePickedPhotos,
  type LocalPendingPhoto,
  type PickedFallwildPhotoAsset
} from "./fallwild-photos";

export const REVIEREINRICHTUNG_PHOTO_QUALITY = FALLWILD_PHOTO_QUALITY;
export type { LocalPendingPhoto } from "./fallwild-photos";

export function getRemainingReviereinrichtungPhotoSlots(existingCount: number) {
  return getRemainingFallwildPhotoSlots(existingCount);
}

export function limitReviereinrichtungPhotoAttachments(attachments: LocalPendingPhoto[]) {
  return limitFallwildPhotoAttachments(attachments);
}

export function mergePickedReviereinrichtungPhotos(
  currentAttachments: LocalPendingPhoto[],
  pickedAssets: PickedFallwildPhotoAsset[]
) {
  return mergePickedPhotos(currentAttachments, pickedAssets, {
    idPrefix: "einrichtung-photo",
    filePrefix: "reviereinrichtung",
    titlePrefix: "Einrichtungsfoto"
  });
}
