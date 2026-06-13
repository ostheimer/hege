export const MAX_FALLWILD_PHOTOS = 3;
export const FALLWILD_PHOTO_QUALITY = 0.7;

export interface LocalPendingPhoto {
  id: string;
  uri: string;
  fileName: string;
  mimeType: "image/jpeg" | "image/png";
  title?: string;
}

export interface PickedFallwildPhotoAsset {
  uri: string;
  assetId?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
}

export function getRemainingFallwildPhotoSlots(existingCount: number) {
  const safeCount = Number.isFinite(existingCount) ? Math.max(0, Math.trunc(existingCount)) : 0;
  return Math.max(0, MAX_FALLWILD_PHOTOS - safeCount);
}

export function limitFallwildPhotoAttachments(attachments: LocalPendingPhoto[]) {
  return attachments.filter(isLocalPendingPhoto).slice(0, MAX_FALLWILD_PHOTOS).map(cloneLocalPendingPhoto);
}

export function mergePickedFallwildPhotos(
  currentAttachments: LocalPendingPhoto[],
  pickedAssets: PickedFallwildPhotoAsset[]
) {
  const current = limitFallwildPhotoAttachments(currentAttachments);
  const slots = getRemainingFallwildPhotoSlots(current.length);

  if (slots === 0 || pickedAssets.length === 0) {
    return current;
  }

  const usedIds = new Set(current.map((photo) => photo.id));
  const nextPhotos: LocalPendingPhoto[] = [];

  for (const asset of pickedAssets) {
    if (nextPhotos.length >= slots) {
      break;
    }

    const photo = normalizePickedFallwildPhoto(asset, current.length + nextPhotos.length);

    if (!photo) {
      continue;
    }

    nextPhotos.push(withUniquePhotoId(photo, usedIds));
  }

  return [...current, ...nextPhotos];
}

export function normalizePickedFallwildPhoto(
  asset: PickedFallwildPhotoAsset,
  index: number
): LocalPendingPhoto | null {
  const uri = asset.uri.trim();

  if (!uri) {
    return null;
  }

  const mimeType = normalizeFallwildPhotoMimeType(asset);
  const fileName = normalizeFallwildPhotoFileName(asset, index, mimeType);

  return {
    id: createFallwildPhotoId(asset, index),
    uri,
    fileName,
    mimeType,
    title: normalizeFallwildPhotoTitle(asset, index)
  };
}

export function normalizeFallwildPhotoMimeType(asset: PickedFallwildPhotoAsset): LocalPendingPhoto["mimeType"] {
  const explicitMimeType = asset.mimeType?.trim().toLowerCase();

  if (explicitMimeType === "image/png") {
    return "image/png";
  }

  if (explicitMimeType === "image/jpeg" || explicitMimeType === "image/jpg") {
    return "image/jpeg";
  }

  const extension = getSourceFileExtension(asset);

  if (extension === "png") {
    return "image/png";
  }

  return "image/jpeg";
}

export function isLocalPendingPhoto(value: unknown): value is LocalPendingPhoto {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const photo = value as Partial<LocalPendingPhoto>;

  return (
    typeof photo.id === "string" &&
    typeof photo.uri === "string" &&
    typeof photo.fileName === "string" &&
    (photo.mimeType === "image/jpeg" || photo.mimeType === "image/png") &&
    (photo.title == null || typeof photo.title === "string")
  );
}

function normalizeFallwildPhotoFileName(
  asset: PickedFallwildPhotoAsset,
  index: number,
  mimeType: LocalPendingPhoto["mimeType"]
) {
  const sourceName = getSourceFileName(asset);
  const fallbackStem = `fallwild-${index + 1}-${hashStableValue(asset.assetId?.trim() || asset.uri)}`;
  const stem = sanitizeFileStem(sourceName ? stripFileExtension(sourceName) : fallbackStem);
  const extension = mimeType === "image/png" ? "png" : "jpg";

  return `${stem}.${extension}`;
}

/**
 * Technische Asset-Namen, die als Titel nur Rauschen waeren: iOS-UUIDs
 * (Kamera/Picker), Kamera-Zaehler (IMG_1234, DSC0001) und reine
 * Hex-Bezeichner. Menschlich vergebene Namen bleiben erhalten.
 */
const GENERIC_PHOTO_NAME_PATTERN =
  /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|img[-_ ]?\d+|dsc[-_ ]?\d*|image[-_ ]?\d*|photo[-_ ]?\d*|[0-9a-f]{16,})$/i;

function normalizeFallwildPhotoTitle(asset: PickedFallwildPhotoAsset, index: number) {
  const sourceName = getSourceFileName(asset);
  const title = sourceName ? stripFileExtension(sourceName).trim() : "";

  if (!title || GENERIC_PHOTO_NAME_PATTERN.test(title)) {
    return `Fallwild-Foto ${index + 1}`;
  }

  return title;
}

function createFallwildPhotoId(asset: PickedFallwildPhotoAsset, index: number) {
  const sourceId = asset.assetId?.trim() || asset.uri.trim();
  return `fallwild-photo-${index + 1}-${hashStableValue(sourceId)}`;
}

function withUniquePhotoId(photo: LocalPendingPhoto, usedIds: Set<string>): LocalPendingPhoto {
  if (!usedIds.has(photo.id)) {
    usedIds.add(photo.id);
    return photo;
  }

  let suffix = 2;
  let nextId = `${photo.id}-${suffix}`;

  while (usedIds.has(nextId)) {
    suffix += 1;
    nextId = `${photo.id}-${suffix}`;
  }

  usedIds.add(nextId);
  return {
    ...photo,
    id: nextId
  };
}

function cloneLocalPendingPhoto(photo: LocalPendingPhoto): LocalPendingPhoto {
  return {
    ...photo
  };
}

function getSourceFileExtension(asset: PickedFallwildPhotoAsset) {
  const sourceName = getSourceFileName(asset);
  const dotIndex = sourceName.lastIndexOf(".");

  if (dotIndex <= 0 || dotIndex === sourceName.length - 1) {
    return "";
  }

  return sourceName.slice(dotIndex + 1).toLowerCase();
}

function getSourceFileName(asset: PickedFallwildPhotoAsset) {
  return getFileNameFromValue(asset.fileName) ?? getFileNameFromValue(asset.uri) ?? "";
}

function getFileNameFromValue(value?: string | null) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  const withoutQuery = trimmed.split(/[?#]/, 1)[0] ?? trimmed;
  const segments = withoutQuery.split(/[\\/]/);
  const fileName = segments[segments.length - 1]?.trim();

  return fileName || undefined;
}

function stripFileExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");

  if (dotIndex <= 0) {
    return fileName;
  }

  return fileName.slice(0, dotIndex);
}

function sanitizeFileStem(value: string) {
  const normalized = value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  const sanitized = normalized
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/[.]+$/g, "");

  return sanitized || "fallwild-foto";
}

function hashStableValue(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash.toString(36);
}
