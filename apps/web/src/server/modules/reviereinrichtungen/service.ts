import type { PhotoAsset, ReviereinrichtungListItem } from "@hege/domain";
import { randomUUID } from "node:crypto";

import { isMissingColumnError, isMissingTableError } from "../../db/compat";
import { getServerEnv } from "../../env";
import { deleteStorageObject, putStorageObject } from "../../storage/s3";
import {
  deriveReviereinrichtungPhotoTitle,
  isAllowedReviereinrichtungPhotoContentType,
  REVIEREINRICHTUNG_MAX_PHOTO_COUNT,
  sanitizeReviereinrichtungPhotoFileName
} from "./media";
import {
  createDbReviereinrichtungenRepository,
  type ReviereinrichtungPhotoRecord,
  type ReviereinrichtungenRepository
} from "./repository";
import type { CreateReviereinrichtungInput } from "./schemas";

export class ReviereinrichtungServiceError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

interface CreateReviereinrichtungCommand extends CreateReviereinrichtungInput {
  createdByMembershipId: string;
  revierId: string;
}

export interface UploadReviereinrichtungPhotoCommand {
  body: Buffer;
  contentType: string;
  einrichtungId: string;
  fileName: string;
  uploadedByMembershipId: string;
  revierId: string;
  title?: string;
}

export interface ReviereinrichtungenService {
  list(revierId: string): Promise<ReviereinrichtungListItem[]>;
  create(command: CreateReviereinrichtungCommand): Promise<ReviereinrichtungListItem>;
  uploadPhoto(command: UploadReviereinrichtungPhotoCommand): Promise<PhotoAsset>;
}

interface ReviereinrichtungenServiceOptions {
  repository?: ReviereinrichtungenRepository;
  generateId?: () => string;
  generatePhotoId?: () => string;
  getNow?: () => string;
  uploadObject?: typeof putStorageObject;
  deleteObject?: typeof deleteStorageObject;
  useDemoStore?: boolean;
}

export function createReviereinrichtungenService({
  repository = createDbReviereinrichtungenRepository(),
  generateId = () => `einrichtung-${randomUUID()}`,
  generatePhotoId = () => `photo-${randomUUID()}`,
  getNow = () => new Date().toISOString(),
  uploadObject = putStorageObject,
  deleteObject = deleteStorageObject,
  useDemoStore = getServerEnv().useDemoStore
}: ReviereinrichtungenServiceOptions = {}): ReviereinrichtungenService {
  return {
    async list(revierId) {
      return repository.listByRevier(revierId);
    },

    async create(command) {
      assertMutationsEnabled(useDemoStore);
      const createdAt = getNow();

      try {
        return await repository.insert({
          id: generateId(),
          revierId: command.revierId,
          createdByMembershipId: command.createdByMembershipId,
          createdAt,
          type: command.type,
          name: command.name,
          status: command.status ?? "gut",
          location: command.location,
          beschreibung: command.beschreibung,
          orientationDegrees: command.orientationDegrees,
          details: command.details,
          photos: [],
          kontrollen: [],
          wartung: []
        });
      } catch (error) {
        if (isMissingColumnError(error, "reviereinrichtungen", "orientation_degrees")) {
          throw new ReviereinrichtungServiceError(
            "Reviereinrichtungen müssen in dieser Umgebung zuerst migriert werden.",
            503
          );
        }

        throw error;
      }
    },

    async uploadPhoto(command) {
      assertMutationsEnabled(useDemoStore);

      if (command.body.byteLength <= 0) {
        throw new ReviereinrichtungServiceError("Die Fotodatei darf nicht leer sein.", 422);
      }

      if (!isAllowedReviereinrichtungPhotoContentType(command.contentType)) {
        throw new ReviereinrichtungServiceError("Nur JPEG- und PNG-Dateien sind erlaubt.", 422);
      }

      const scope = await repository.findUploadScope(command.einrichtungId, command.revierId);

      if (!scope) {
        throw new ReviereinrichtungServiceError("Reviereinrichtung wurde nicht gefunden.", 404);
      }

      const photoCount = await withMediaSchemaCompatibility(() =>
        repository.countPhotos(command.einrichtungId)
      );

      if (photoCount >= REVIEREINRICHTUNG_MAX_PHOTO_COUNT) {
        throw new ReviereinrichtungServiceError("Maximal drei Fotos pro Reviereinrichtung sind erlaubt.", 422);
      }

      const photoId = generatePhotoId();
      const fileName = sanitizeReviereinrichtungPhotoFileName(command.fileName);
      const objectKey = `${scope.tenantKey}/reviereinrichtungen/${command.einrichtungId}/${photoId}-${fileName}`;
      const title = normalizePhotoTitle(command.title, command.fileName);
      const createdAt = getNow();
      const storedObject = await withStorageAvailability(() =>
        uploadObject({
          key: objectKey,
          body: command.body,
          contentType: command.contentType
        })
      );

      let row: ReviereinrichtungPhotoRecord;

      try {
        row = await withMediaSchemaCompatibility(() =>
          repository.insertPhoto({
            id: photoId,
            revierId: scope.revierId,
            entityId: command.einrichtungId,
            uploadedByMembershipId: command.uploadedByMembershipId,
            title,
            objectKey: storedObject.objectKey,
            fileName: command.fileName,
            contentType: command.contentType,
            createdAt
          })
        );
      } catch (error) {
        await deleteObject(storedObject.objectKey).catch(() => undefined);
        throw error;
      }

      return {
        id: row.id,
        title: row.title,
        url: storedObject.publicUrl,
        createdAt: row.createdAt
      };
    }
  };
}

const defaultService = createReviereinrichtungenService();

export function createReviereinrichtung(command: CreateReviereinrichtungCommand) {
  return defaultService.create(command);
}

export function uploadReviereinrichtungPhoto(command: UploadReviereinrichtungPhotoCommand) {
  return defaultService.uploadPhoto(command);
}

function assertMutationsEnabled(useDemoStore: boolean) {
  if (useDemoStore) {
    throw new ReviereinrichtungServiceError(
      "Reviereinrichtungs-Mutationen benötigen eine aktive Datenbank.",
      503
    );
  }
}

function normalizePhotoTitle(title: string | undefined, fileName: string) {
  const trimmed = title?.trim();
  return trimmed ? trimmed : deriveReviereinrichtungPhotoTitle(fileName);
}

async function withMediaSchemaCompatibility<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    if (isMissingTableError(error, "media_assets")) {
      throw new ReviereinrichtungServiceError(
        "Fotos für Reviereinrichtungen sind in dieser Umgebung noch nicht aktiviert.",
        503
      );
    }

    throw error;
  }
}

async function withStorageAvailability<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    if (readErrorStatus(error) === 503) {
      throw new ReviereinrichtungServiceError(
        readErrorMessage(error) ?? "Foto-Storage ist nicht verfügbar.",
        503
      );
    }

    throw new ReviereinrichtungServiceError(
      "Foto konnte nicht im Storage gespeichert werden.",
      503
    );
  }
}

function readErrorStatus(error: unknown) {
  if (!error || typeof error !== "object" || !("status" in error)) return undefined;
  return typeof error.status === "number" ? error.status : undefined;
}

function readErrorMessage(error: unknown) {
  if (!error || typeof error !== "object" || !("message" in error)) return undefined;
  return typeof error.message === "string" && error.message.length > 0 ? error.message : undefined;
}
