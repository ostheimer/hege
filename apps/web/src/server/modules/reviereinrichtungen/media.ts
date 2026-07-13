import { rolesForFeature } from "@hege/domain";

import { sanitizeStorageFileName } from "../../storage/s3";

export const REVIEREINRICHTUNG_READ_ROLES = rolesForFeature("reviereinrichtungen-read");
export const REVIEREINRICHTUNG_CREATE_ROLES = rolesForFeature("reviereinrichtungen-create");
export const REVIEREINRICHTUNG_MANAGE_ROLES = rolesForFeature("reviereinrichtungen-manage");

export const REVIEREINRICHTUNG_PHOTO_CONTENT_TYPES = ["image/jpeg", "image/png"] as const;
export const REVIEREINRICHTUNG_MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024;
export const REVIEREINRICHTUNG_MAX_PHOTO_COUNT = 3;

export function sanitizeReviereinrichtungPhotoFileName(fileName: string) {
  return sanitizeStorageFileName(fileName);
}

export function deriveReviereinrichtungPhotoTitle(fileName: string) {
  const withoutExtension = fileName.replace(/\.[^.]+$/, "").trim();
  return withoutExtension.length > 0 ? withoutExtension : "Foto";
}

export function isAllowedReviereinrichtungPhotoContentType(contentType: string) {
  return REVIEREINRICHTUNG_PHOTO_CONTENT_TYPES.includes(
    contentType as (typeof REVIEREINRICHTUNG_PHOTO_CONTENT_TYPES)[number]
  );
}
