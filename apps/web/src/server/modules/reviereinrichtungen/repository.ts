import type { PhotoAsset, Reviereinrichtung, ReviereinrichtungListItem } from "@hege/domain";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "../../db/client";
import { isMissingColumnError } from "../../db/compat";
import {
  reviereinrichtungKontrollen,
  reviereinrichtungWartungen,
  reviereinrichtungen,
  mediaAssets,
  reviere
} from "../../db/schema";
import { getStorageReadUrl, isStorageConfigured } from "../../storage/s3";
import { normalizeDeAtVisibleText } from "../../text/de-at";
import {
  mapDbReviereinrichtungToListItem,
  type ReviereinrichtungRecordForMapping
} from "./mappers";

export interface ReviereinrichtungenRepository {
  listByRevier(revierId: string): Promise<ReviereinrichtungListItem[]>;
  insert(entry: Reviereinrichtung): Promise<ReviereinrichtungListItem>;
  countPhotos(einrichtungId: string): Promise<number>;
  findUploadScope(einrichtungId: string, revierId: string): Promise<ReviereinrichtungUploadScope | undefined>;
  insertPhoto(entry: ReviereinrichtungPhotoInsert): Promise<ReviereinrichtungPhotoRecord>;
}

export interface ReviereinrichtungUploadScope {
  einrichtungId: string;
  revierId: string;
  tenantKey: string;
}

export interface ReviereinrichtungPhotoInsert {
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

export type ReviereinrichtungPhotoRecord = typeof mediaAssets.$inferSelect;

export function createDbReviereinrichtungenRepository(): ReviereinrichtungenRepository {
  const db = getDb();

  return {
    async listByRevier(revierId) {
      const entries = await listReviereinrichtungRows(db, revierId);

      if (entries.length === 0) {
        return [];
      }

      const einrichtungIds = entries.map((entry) => entry.id);
      const [kontrollen, wartungen, photoRows] = await Promise.all([
        db
          .select()
          .from(reviereinrichtungKontrollen)
          .where(inArray(reviereinrichtungKontrollen.einrichtungId, einrichtungIds))
          .orderBy(desc(reviereinrichtungKontrollen.createdAt)),
        db
          .select()
          .from(reviereinrichtungWartungen)
          .where(inArray(reviereinrichtungWartungen.einrichtungId, einrichtungIds))
          .orderBy(reviereinrichtungWartungen.dueAt),
        isStorageConfigured()
          ? db
              .select()
              .from(mediaAssets)
              .where(
                and(
                  eq(mediaAssets.entityType, "reviereinrichtung"),
                  inArray(mediaAssets.entityId, einrichtungIds)
                )
              )
              .orderBy(desc(mediaAssets.createdAt))
          : Promise.resolve([])
      ]);

      return Promise.all(
        entries.map(async (entry) =>
          mapDbReviereinrichtungToListItem(
            entry,
            kontrollen.filter((record) => record.einrichtungId === entry.id),
            wartungen.filter((record) => record.einrichtungId === entry.id),
            await Promise.all(
              photoRows
                .filter((record) => record.entityId === entry.id)
                .map(mapPhotoRecordToDomain)
            )
          )
        )
      );
    },

    async insert(entry) {
      const [row] = await db
        .insert(reviereinrichtungen)
        .values({
          id: entry.id,
          revierId: entry.revierId,
          type: entry.type,
          name: entry.name,
          status: entry.status,
          locationLat: entry.location.lat,
          locationLng: entry.location.lng,
          locationLabel: entry.location.label ?? null,
          beschreibung: entry.beschreibung ?? null,
          orientationDegrees: entry.orientationDegrees ?? null,
          details: entry.details ?? null,
          createdByMembershipId: entry.createdByMembershipId ?? null,
          createdAt: entry.createdAt,
          updatedAt: entry.createdAt
        })
        .returning();

      if (!row) {
        throw new Error("Reviereinrichtung konnte nicht gespeichert werden.");
      }

      return mapDbReviereinrichtungToListItem(row, [], [], []);
    },

    async countPhotos(einrichtungId) {
      const [row] = await db
        .select({ value: sql<number>`count(*)::int` })
        .from(mediaAssets)
        .where(
          and(
            eq(mediaAssets.entityType, "reviereinrichtung"),
            eq(mediaAssets.entityId, einrichtungId)
          )
        );

      return Number(row?.value ?? 0);
    },

    async findUploadScope(einrichtungId, revierId) {
      const [row] = await db
        .select({
          einrichtungId: reviereinrichtungen.id,
          revierId: reviereinrichtungen.revierId,
          tenantKey: reviere.tenantKey
        })
        .from(reviereinrichtungen)
        .innerJoin(reviere, eq(reviere.id, reviereinrichtungen.revierId))
        .where(
          and(eq(reviereinrichtungen.id, einrichtungId), eq(reviereinrichtungen.revierId, revierId))
        )
        .limit(1);

      return row ?? undefined;
    },

    async insertPhoto(entry) {
      const [row] = await db
        .insert(mediaAssets)
        .values({
          id: entry.id,
          revierId: entry.revierId,
          entityType: "reviereinrichtung",
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
    }
  };
}

async function listReviereinrichtungRows(
  db: ReturnType<typeof getDb>,
  revierId: string
): Promise<ReviereinrichtungRecordForMapping[]> {
  try {
    return await db
      .select()
      .from(reviereinrichtungen)
      .where(eq(reviereinrichtungen.revierId, revierId))
      .orderBy(reviereinrichtungen.name);
  } catch (error) {
    if (!isMissingColumnError(error, "reviereinrichtungen", "orientation_degrees")) {
      throw error;
    }
  }

  return db
    .select({
      id: reviereinrichtungen.id,
      revierId: reviereinrichtungen.revierId,
      type: reviereinrichtungen.type,
      name: reviereinrichtungen.name,
      status: reviereinrichtungen.status,
      locationLat: reviereinrichtungen.locationLat,
      locationLng: reviereinrichtungen.locationLng,
      locationLabel: reviereinrichtungen.locationLabel,
      beschreibung: reviereinrichtungen.beschreibung
    })
    .from(reviereinrichtungen)
    .where(eq(reviereinrichtungen.revierId, revierId))
    .orderBy(reviereinrichtungen.name);
}

async function mapPhotoRecordToDomain(record: ReviereinrichtungPhotoRecord): Promise<PhotoAsset> {
  return {
    id: record.id,
    title: normalizeDeAtVisibleText(record.title),
    url: await getStorageReadUrl(record.objectKey),
    createdAt: record.createdAt
  };
}
