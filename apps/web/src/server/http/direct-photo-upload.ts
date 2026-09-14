import { validationError } from "./validation";

export interface DirectPhotoUploadRequest {
  fileName: string;
  contentType: "image/jpeg" | "image/png";
  sizeBytes: number;
  title?: string;
}

export function parseDirectPhotoUploadRequest(
  value: unknown,
  options: {
    allowedContentTypes: readonly string[];
    maxSizeBytes: number;
  }
): DirectPhotoUploadRequest {
  const body = ensureRecord(value);
  const fileName = requiredString(body.fileName, "fileName");
  const contentType = requiredString(body.contentType, "contentType");
  const sizeBytes = body.sizeBytes;

  if (!options.allowedContentTypes.includes(contentType)) {
    throw validationError("Nur JPEG- und PNG-Dateien sind erlaubt.");
  }

  if (!Number.isSafeInteger(sizeBytes) || typeof sizeBytes !== "number" || sizeBytes <= 0) {
    throw validationError("sizeBytes muss eine positive ganze Zahl sein.");
  }

  if (sizeBytes > options.maxSizeBytes) {
    throw validationError("Dateien dürfen maximal 10 MB groß sein.");
  }

  const title = optionalString(body.title, "title");

  return {
    fileName,
    contentType: contentType as DirectPhotoUploadRequest["contentType"],
    sizeBytes,
    title
  };
}

export function parseDirectPhotoUploadCompletion(value: unknown) {
  const body = ensureRecord(value);
  return {
    uploadToken: requiredString(body.uploadToken, "uploadToken")
  };
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw validationError("Der Request-Body muss gültiges JSON sein.");
  }
}

function ensureRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw validationError("Der Request-Body muss ein Objekt sein.");
  }

  return value as Record<string, unknown>;
}

function requiredString(value: unknown, field: string) {
  const parsed = optionalString(value, field);

  if (!parsed) {
    throw validationError(`${field} muss ein nicht-leerer String sein.`);
  }

  return parsed;
}

function optionalString(value: unknown, field: string) {
  if (value == null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    throw validationError(`${field} muss ein String sein.`);
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
