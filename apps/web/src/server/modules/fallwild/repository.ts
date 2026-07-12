import type { FallwildVorgang } from "@hege/domain";
import { and, eq, sql } from "drizzle-orm";

import { getDb } from "../../db/client";
import { isMissingTableError } from "../../db/compat";
import { fallwildVorgaenge, mediaAssets, reviere } from "../../db/schema";
import { mapFallwildRowToDomain } from "./queries";

export interface FallwildRepository {
  insert(entry: FallwildVorgang): Promise<FallwildVorgang>;
  countPhotos(fallwildId: string): Promise<number>;
  findUploadScope(fallwildId: string, revierId: string): Promise<FallwildUploadScope | undefined>;
  findDeleteScope(fallwildId: string, revierId: string): Promise<FallwildDeleteScope | undefined>;
  insertPhoto(entry: FallwildPhotoInsert): Promise<FallwildPhotoRecord>;
  deleteById(fallwildId: string, revierId: string, deleteMediaAssets: boolean): Promise<boolean>;
}

export interface FallwildUploadScope {
  fallwildId: string;
  revierId: string;
  tenantKey: string;
}

export interface FallwildDeleteScope {
  fallwildId: string;
  objectKeys: string[];
  mediaSchemaAvailable: boolean;
}

export interface FallwildPhotoInsert {
  id: string;
  revierId: string;
  entityId: string;
  uploadedByMembershipId: string;
  title: string;
  objectKey: string;
  fileName: string;
  contentType: string;
  createdAt: string;
}

export type FallwildPhotoRecord = typeof mediaAssets.$inferSelect;

export function createDbFallwildRepository(): FallwildRepository {
  const db = getDb();

  return {
    async insert(entry) {
      const [row] = await db
        .insert(fallwildVorgaenge)
        .values({
          id: entry.id,
          revierId: entry.revierId,
          reportedByMembershipId: entry.reportedByMembershipId,
          recordedAt: entry.recordedAt,
          locationLat: entry.location.lat,
          locationLng: entry.location.lng,
          locationLabel: entry.location.label ?? null,
          locationAccuracyMeters: entry.location.accuracyMeters ?? null,
          locationSource: entry.location.source ?? null,
          addressLabel: entry.location.addressLabel ?? null,
          googlePlaceId: entry.location.placeId ?? null,
          wildart: entry.wildart,
          geschlecht: entry.geschlecht,
          altersklasse: entry.altersklasse,
          bergungsStatus: entry.bergungsStatus,
          gemeinde: entry.gemeinde,
          strasse: entry.strasse ?? null,
          roadName: entry.roadReference?.roadName ?? null,
          roadKilometer: entry.roadReference?.roadKilometer ?? null,
          roadKilometerSource: entry.roadReference?.source ?? null,
          roadPlaceId: entry.roadReference?.placeId ?? null,
          note: entry.note ?? null
        })
        .returning();

      if (!row) {
        throw new Error("Fallwild konnte nicht gespeichert werden.");
      }

      return mapFallwildRowToDomain(row);
    },

    async countPhotos(fallwildId) {
      const [row] = await db
        .select({
          value: sql<number>`count(*)::int`
        })
        .from(mediaAssets)
        .where(and(eq(mediaAssets.entityType, "fallwild"), eq(mediaAssets.entityId, fallwildId)));

      return Number(row?.value ?? 0);
    },

    async findUploadScope(fallwildId, revierId) {
      const [row] = await db
        .select({
          fallwildId: fallwildVorgaenge.id,
          revierId: fallwildVorgaenge.revierId,
          tenantKey: reviere.tenantKey
        })
        .from(fallwildVorgaenge)
        .innerJoin(reviere, eq(reviere.id, fallwildVorgaenge.revierId))
        .where(and(eq(fallwildVorgaenge.id, fallwildId), eq(fallwildVorgaenge.revierId, revierId)))
        .limit(1);

      return row
        ? {
            fallwildId: row.fallwildId,
            revierId: row.revierId,
            tenantKey: row.tenantKey
          }
        : undefined;
    },

    async findDeleteScope(fallwildId, revierId) {
      const [row] = await db
        .select({ fallwildId: fallwildVorgaenge.id })
        .from(fallwildVorgaenge)
        .where(and(eq(fallwildVorgaenge.id, fallwildId), eq(fallwildVorgaenge.revierId, revierId)))
        .limit(1);

      if (!row) {
        return undefined;
      }

      try {
        const photos = await db
          .select({ objectKey: mediaAssets.objectKey })
          .from(mediaAssets)
          .where(
            and(
              eq(mediaAssets.revierId, revierId),
              eq(mediaAssets.entityType, "fallwild"),
              eq(mediaAssets.entityId, fallwildId)
            )
          );

        return {
          fallwildId: row.fallwildId,
          objectKeys: photos.map((photo) => photo.objectKey),
          mediaSchemaAvailable: true
        };
      } catch (error) {
        if (!isMissingTableError(error, "media_assets")) {
          throw error;
        }

        return {
          fallwildId: row.fallwildId,
          objectKeys: [],
          mediaSchemaAvailable: false
        };
      }
    },

    async insertPhoto(entry) {
      const [row] = await db
        .insert(mediaAssets)
        .values({
          id: entry.id,
          revierId: entry.revierId,
          entityType: "fallwild",
          entityId: entry.entityId,
          uploadedByMembershipId: entry.uploadedByMembershipId,
          title: entry.title,
          objectKey: entry.objectKey,
          fileName: entry.fileName,
          contentType: entry.contentType,
          createdAt: entry.createdAt
        })
        .returning();

      if (!row) {
        throw new Error("Foto konnte nicht gespeichert werden.");
      }

      return row;
    },

    async deleteById(fallwildId, revierId, deleteMediaAssets) {
      return db.transaction(async (tx) => {
        if (deleteMediaAssets) {
          await tx
            .delete(mediaAssets)
            .where(
              and(
                eq(mediaAssets.revierId, revierId),
                eq(mediaAssets.entityType, "fallwild"),
                eq(mediaAssets.entityId, fallwildId)
              )
            );
        }

        const deleted = await tx
          .delete(fallwildVorgaenge)
          .where(and(eq(fallwildVorgaenge.id, fallwildId), eq(fallwildVorgaenge.revierId, revierId)))
          .returning({ id: fallwildVorgaenge.id });

        return deleted.length > 0;
      });
    }
  };
}
