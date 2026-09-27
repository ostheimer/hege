import type { FallwildVorgang, PhotoAsset } from "@hege/domain";
import { randomUUID } from "crypto";

import { isMissingTableError } from "../../db/compat";
import { getServerEnv } from "../../env";
import {
  createStorageUploadUrl,
  deleteStorageObject,
  getStorageReadUrl,
  headStorageObject,
  putStorageObject
} from "../../storage/s3";
import {
  issueDirectPhotoUploadGrant,
  verifyDirectPhotoUploadGrant
} from "../../storage/direct-photo-upload";
import {
  deriveFallwildPhotoTitle,
  FALLWILD_MAX_PHOTO_COUNT,
  FALLWILD_MAX_PHOTO_SIZE_BYTES,
  isAllowedFallwildPhotoContentType,
  sanitizeFallwildPhotoFileName
} from "./media";
import {
  createDbFallwildRepository,
  type FallwildPhotoRecord,
  type FallwildRepository
} from "./repository";
import type { CreateFallwildInput } from "./schemas";

export class FallwildServiceError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

interface CreateFallwildCommand extends CreateFallwildInput {
  reportedByMembershipId: string;
  revierId: string;
}

interface DeleteFallwildCommand {
  fallwildId: string;
  revierId: string;
}

export interface UploadFallwildPhotoCommand {
  body: Buffer;
  contentType: string;
  fallwildId: string;
  fileName: string;
  reportedByMembershipId: string;
  revierId: string;
  title?: string;
}

export interface PrepareFallwildPhotoUploadCommand {
  contentType: "image/jpeg" | "image/png";
  fallwildId: string;
  fileName: string;
  reportedByMembershipId: string;
  revierId: string;
  sizeBytes: number;
  title?: string;
}

export interface CompleteFallwildPhotoUploadCommand {
  fallwildId: string;
  reportedByMembershipId: string;
  revierId: string;
  uploadToken: string;
}

interface FallwildServiceOptions {
  generateId?: () => string;
  generatePhotoId?: () => string;
  getNow?: () => string;
  repository?: FallwildRepository;
  deleteObject?: typeof deleteStorageObject;
  createUploadUrl?: typeof createStorageUploadUrl;
  getReadUrl?: typeof getStorageReadUrl;
  headObject?: typeof headStorageObject;
  issueUploadGrant?: typeof issueDirectPhotoUploadGrant;
  verifyUploadGrant?: typeof verifyDirectPhotoUploadGrant;
  uploadObject?: typeof putStorageObject;
  useDemoStore?: boolean;
}

export function createFallwildService({
  repository = createDbFallwildRepository(),
  generateId = () => `fallwild-${randomUUID()}`,
  generatePhotoId = () => `photo-${randomUUID()}`,
  getNow = () => new Date().toISOString(),
  deleteObject = deleteStorageObject,
  createUploadUrl = createStorageUploadUrl,
  getReadUrl = getStorageReadUrl,
  headObject = headStorageObject,
  issueUploadGrant = issueDirectPhotoUploadGrant,
  verifyUploadGrant = verifyDirectPhotoUploadGrant,
  uploadObject = putStorageObject,
  useDemoStore = getServerEnv().useDemoStore
}: FallwildServiceOptions = {}) {
  return {
    async create(command: CreateFallwildCommand): Promise<FallwildVorgang> {
      assertMutationsEnabled(useDemoStore);

      const recordedAt = command.recordedAt ?? getNow();

      return repository.insert({
        id: generateId(),
        revierId: command.revierId,
        reportedByMembershipId: command.reportedByMembershipId,
        recordedAt,
        location: command.location,
        wildart: command.wildart,
        geschlecht: command.geschlecht,
        altersklasse: command.altersklasse,
        bergungsStatus: command.bergungsStatus,
        gemeinde: command.gemeinde,
        strasse: command.strasse,
        roadReference: command.roadReference,
        note: command.note,
        photos: []
      });
    },

    async uploadPhoto(command: UploadFallwildPhotoCommand): Promise<PhotoAsset> {
      assertMutationsEnabled(useDemoStore);

      if (command.body.byteLength <= 0) {
        throw new FallwildServiceError("Die Fotodatei darf nicht leer sein.", 422);
      }

      if (command.body.byteLength > FALLWILD_MAX_PHOTO_SIZE_BYTES) {
        throw new FallwildServiceError("Fotodateien dürfen maximal 10 MB groß sein.", 422);
      }

      if (!isAllowedFallwildPhotoContentType(command.contentType)) {
        throw new FallwildServiceError("Nur JPEG- und PNG-Dateien sind erlaubt.", 422);
      }

      const scope = await repository.findUploadScope(command.fallwildId, command.revierId);

      if (!scope) {
        throw new FallwildServiceError("Fallwild-Vorgang wurde nicht gefunden.", 404);
      }

      const photoCount = await withLegacyMediaSchemaCompatibility(() => repository.countPhotos(command.fallwildId));

      if (photoCount >= FALLWILD_MAX_PHOTO_COUNT) {
        throw new FallwildServiceError("Maximal drei Fotos pro Fallwild-Vorgang sind erlaubt.", 422);
      }

      const photoId = generatePhotoId();
      const fileName = sanitizeFallwildPhotoFileName(command.fileName);
      const objectKey = `${scope.tenantKey}/fallwild/${command.fallwildId}/${photoId}-${fileName}`;
      const title = normalizePhotoTitle(command.title, command.fileName);
      const createdAt = getNow();

      const storedObject = await withStorageAvailability(() =>
        uploadObject({
          key: objectKey,
          body: command.body,
          contentType: command.contentType
        })
      );

      let row: FallwildPhotoRecord;

      try {
        row = await withLegacyMediaSchemaCompatibility(() =>
          repository.insertPhoto({
            id: photoId,
            revierId: scope.revierId,
            entityId: command.fallwildId,
            uploadedByMembershipId: command.reportedByMembershipId,
            title,
            objectKey: storedObject.objectKey,
            fileName: command.fileName,
            contentType: command.contentType,
            createdAt
          })
        );
      } catch (error) {
        await rollbackStoredPhoto(storedObject.objectKey, deleteObject);
        throw error;
      }

      return mapPhotoRecordToDomain(row, storedObject.publicUrl);
    },

    async preparePhotoUpload(command: PrepareFallwildPhotoUploadCommand) {
      assertMutationsEnabled(useDemoStore);
      assertDirectUploadMetadata(command.sizeBytes, command.contentType);

      const scope = await repository.findUploadScope(command.fallwildId, command.revierId);

      if (!scope) {
        throw new FallwildServiceError("Fallwild-Vorgang wurde nicht gefunden.", 404);
      }

      await assertPhotoSlotAvailable(repository, command.fallwildId);

      const photoId = generatePhotoId();
      const fileName = sanitizeFallwildPhotoFileName(command.fileName);
      const objectKey = `${scope.tenantKey}/fallwild/${command.fallwildId}/${photoId}-${fileName}`;
      const title = normalizePhotoTitle(command.title, command.fileName);
      const grant = issueUploadGrant({
        entityType: "fallwild",
        entityId: command.fallwildId,
        photoId,
        objectKey,
        fileName: command.fileName,
        contentType: command.contentType,
        sizeBytes: command.sizeBytes,
        title,
        revierId: command.revierId,
        membershipId: command.reportedByMembershipId
      });

      return {
        uploadUrl: await withStorageAvailability(() =>
          createUploadUrl({ key: objectKey, contentType: command.contentType })
        ),
        uploadToken: grant.token,
        expiresAt: grant.expiresAt,
        headers: {
          "Content-Type": command.contentType
        }
      };
    },

    async completePhotoUpload(command: CompleteFallwildPhotoUploadCommand): Promise<PhotoAsset> {
      assertMutationsEnabled(useDemoStore);
      const grant = verifyUploadGrant(command.uploadToken, {
        entityType: "fallwild",
        entityId: command.fallwildId,
        revierId: command.revierId,
        membershipId: command.reportedByMembershipId
      });
      const existing = await withLegacyMediaSchemaCompatibility(() =>
        repository.findPhotoById(grant.photoId, command.fallwildId, command.revierId)
      );

      if (existing) {
        return mapPhotoRecordToDomain(existing, await getReadUrl(existing.objectKey));
      }

      const scope = await repository.findUploadScope(command.fallwildId, command.revierId);

      if (!scope) {
        throw new FallwildServiceError("Fallwild-Vorgang wurde nicht gefunden.", 404);
      }

      try {
        await assertPhotoSlotAvailable(repository, command.fallwildId);
        const stored = await withStorageAvailability(() => headObject(grant.objectKey));
        assertStoredPhotoMatchesGrant(stored, grant.sizeBytes, grant.contentType);
        const readUrl = await withStorageAvailability(() => getReadUrl(grant.objectKey));

        const row = await withLegacyMediaSchemaCompatibility(() =>
          repository.insertPhoto({
            id: grant.photoId,
            revierId: scope.revierId,
            entityId: command.fallwildId,
            uploadedByMembershipId: command.reportedByMembershipId,
            title: grant.title,
            objectKey: grant.objectKey,
            fileName: grant.fileName,
            contentType: grant.contentType,
            createdAt: getNow()
          })
        );

        return mapPhotoRecordToDomain(row, readUrl);
      } catch (error) {
        await deleteObject(grant.objectKey).catch(() => undefined);
        throw error;
      }
    },

    async delete(command: DeleteFallwildCommand): Promise<{ deleted: true; id: string }> {
      assertMutationsEnabled(useDemoStore);

      const scope = await repository.findDeleteScope(command.fallwildId, command.revierId);

      if (!scope) {
        throw new FallwildServiceError("Fallwild-Vorgang wurde nicht gefunden.", 404);
      }

      for (const objectKey of scope.objectKeys) {
        await deleteStoredPhoto(objectKey, deleteObject);
      }

      const deleted = await repository.deleteById(
        command.fallwildId,
        command.revierId,
        scope.mediaSchemaAvailable
      );

      if (!deleted) {
        throw new FallwildServiceError("Fallwild-Vorgang wurde nicht gefunden.", 404);
      }

      return {
        deleted: true,
        id: command.fallwildId
      };
    }
  };
}

const defaultService = createFallwildService();

export async function createFallwildVorgang(command: CreateFallwildCommand) {
  return defaultService.create(command);
}

export async function uploadFallwildPhoto(command: UploadFallwildPhotoCommand) {
  return defaultService.uploadPhoto(command);
}

export async function prepareFallwildPhotoUpload(command: PrepareFallwildPhotoUploadCommand) {
  return defaultService.preparePhotoUpload(command);
}

export async function completeFallwildPhotoUpload(command: CompleteFallwildPhotoUploadCommand) {
  return defaultService.completePhotoUpload(command);
}

export async function deleteFallwildVorgang(command: DeleteFallwildCommand) {
  return defaultService.delete(command);
}

function assertMutationsEnabled(useDemoStore: boolean) {
  if (useDemoStore) {
    throw new FallwildServiceError("Fallwild-Mutationen benötigen eine aktive Datenbank.", 503);
  }
}

function normalizePhotoTitle(title: string | undefined, fileName: string) {
  if (typeof title === "string") {
    const trimmed = title.trim();

    if (trimmed.length > 0) {
      return trimmed;
    }
  }

  return deriveFallwildPhotoTitle(fileName);
}

function assertDirectUploadMetadata(sizeBytes: number, contentType: string) {
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0) {
    throw new FallwildServiceError("Die Fotodatei darf nicht leer sein.", 422);
  }

  if (sizeBytes > FALLWILD_MAX_PHOTO_SIZE_BYTES) {
    throw new FallwildServiceError("Fotodateien dürfen maximal 10 MB groß sein.", 422);
  }

  if (!isAllowedFallwildPhotoContentType(contentType)) {
    throw new FallwildServiceError("Nur JPEG- und PNG-Dateien sind erlaubt.", 422);
  }
}

async function assertPhotoSlotAvailable(repository: FallwildRepository, fallwildId: string) {
  const photoCount = await withLegacyMediaSchemaCompatibility(() => repository.countPhotos(fallwildId));

  if (photoCount >= FALLWILD_MAX_PHOTO_COUNT) {
    throw new FallwildServiceError("Maximal drei Fotos pro Fallwild-Vorgang sind erlaubt.", 422);
  }
}

function assertStoredPhotoMatchesGrant(
  stored: { contentLength?: number; contentType?: string },
  expectedSize: number,
  expectedContentType: string
) {
  if (stored.contentLength !== expectedSize || stored.contentType !== expectedContentType) {
    throw new FallwildServiceError("Die hochgeladene Fotodatei stimmt nicht mit der Freigabe überein.", 422);
  }
}

function mapPhotoRecordToDomain(record: FallwildPhotoRecord, url: string): PhotoAsset {
  return {
    id: record.id,
    title: record.title,
    url,
    createdAt: record.createdAt
  };
}

async function withLegacyMediaSchemaCompatibility<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    if (isMissingTableError(error, "media_assets")) {
      throw new FallwildServiceError("Fallwild-Fotos sind in dieser Umgebung noch nicht aktiviert.", 503);
    }

    throw error;
  }
}

async function withStorageAvailability<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    if (isServiceUnavailableError(error)) {
      throw new FallwildServiceError(
        readErrorMessage(error) ?? "Fallwild-Foto-Storage ist nicht verfügbar.",
        503
      );
    }

    logStorageFailure("upload", error);
    throw new FallwildServiceError("Foto konnte nicht im Storage gespeichert werden.", 503);
  }
}

async function rollbackStoredPhoto(
  objectKey: string,
  deleteObject: typeof deleteStorageObject
) {
  try {
    await deleteObject(objectKey);
  } catch {
    // The original DB/schema error is more important than best-effort cleanup.
  }
}

async function deleteStoredPhoto(
  objectKey: string,
  deleteObject: typeof deleteStorageObject
) {
  try {
    await deleteObject(objectKey);
  } catch (error) {
    if (!isServiceUnavailableError(error)) {
      logStorageFailure("delete", error);
    }

    throw new FallwildServiceError(
      readErrorMessage(error) ?? "Fallwild-Foto konnte nicht aus dem Storage gelöscht werden.",
      503
    );
  }
}

function isServiceUnavailableError(error: unknown) {
  return readErrorStatus(error) === 503;
}

function readErrorStatus(error: unknown) {
  if (!error || typeof error !== "object" || !("status" in error)) {
    return undefined;
  }

  return typeof error.status === "number" ? error.status : undefined;
}

function readErrorMessage(error: unknown) {
  if (!error || typeof error !== "object" || !("message" in error)) {
    return undefined;
  }

  return typeof error.message === "string" && error.message.length > 0 ? error.message : undefined;
}

function logStorageFailure(operation: "upload" | "delete", error: unknown) {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  console.error(`Fallwild photo storage ${operation} failed`, summarizeErrorForLog(error));
}

function summarizeErrorForLog(error: unknown) {
  const record = readErrorRecord(error);
  const metadata = readErrorRecord(record?.$metadata);

  return {
    name: readString(record?.name),
    message: readString(record?.message),
    code: readString(record?.code) ?? readString(record?.Code),
    httpStatusCode: readNumber(metadata?.httpStatusCode),
    requestId: readString(metadata?.requestId),
    extendedRequestId: readString(metadata?.extendedRequestId)
  };
}

function readErrorRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
}

function readString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readNumber(value: unknown) {
  return typeof value === "number" ? value : undefined;
}
