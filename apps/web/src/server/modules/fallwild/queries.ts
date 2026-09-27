import type { FallwildVorgang, LocationSource, PhotoAsset, RoadKilometerSource } from "@hege/domain";
import { and, desc, eq, inArray } from "drizzle-orm";

import { getRequestContext } from "../../auth/context";
import { buildCsv } from "../../csv/escape";
import { getDb } from "../../db/client";
import { isMissingTableError } from "../../db/compat";
import { type FallwildVorgangRecord, fallwildVorgaenge, mediaAssets } from "../../db/schema";
import { createDemoStore } from "../../demo-store";
import { getServerEnv } from "../../env";
import { getStorageReadUrl, isStorageConfigured } from "../../storage/s3";
import { normalizeDeAtVisibleText } from "../../text/de-at";

export async function listFallwild(): Promise<FallwildVorgang[]> {
  if (getServerEnv().useDemoStore) {
    return listFallwildFromDemoStore();
  }

  const db = getDb();
  const { revierId } = await getRequestContext();
  const rows = await db
    .select()
    .from(fallwildVorgaenge)
    .where(eq(fallwildVorgaenge.revierId, revierId))
    .orderBy(desc(fallwildVorgaenge.recordedAt));

  return attachPhotosToFallwildEntries(rows);
}

export async function getFallwildById(fallwildId: string): Promise<FallwildVorgang | undefined> {
  if (getServerEnv().useDemoStore) {
    return getFallwildFromDemoStore(fallwildId);
  }

  const db = getDb();
  const { revierId } = await getRequestContext();
  const [row] = await db
    .select()
    .from(fallwildVorgaenge)
    .where(and(eq(fallwildVorgaenge.revierId, revierId), eq(fallwildVorgaenge.id, fallwildId)))
    .limit(1);

  if (!row) {
    return undefined;
  }

  const [entry] = await attachPhotosToFallwildEntries([row]);
  return entry;
}

export function mapFallwildRowToDomain(record: FallwildVorgangRecord): FallwildVorgang {
  return {
    id: record.id,
    revierId: record.revierId,
    reportedByMembershipId: record.reportedByMembershipId,
    recordedAt: record.recordedAt,
    location: {
      lat: record.locationLat,
      lng: record.locationLng,
      label: normalizeDeAtVisibleText(record.locationLabel) ?? undefined,
      accuracyMeters: record.locationAccuracyMeters ?? undefined,
      source: parseLocationSource(record.locationSource),
      addressLabel: normalizeDeAtVisibleText(record.addressLabel) ?? undefined,
      placeId: record.googlePlaceId ?? undefined
    },
    wildart: record.wildart,
    geschlecht: record.geschlecht,
    altersklasse: record.altersklasse,
    bergungsStatus: record.bergungsStatus,
    gemeinde: normalizeDeAtVisibleText(record.gemeinde),
    strasse: normalizeDeAtVisibleText(record.strasse) ?? undefined,
    roadReference: buildRoadReference(record),
    note: normalizeDeAtVisibleText(record.note) ?? undefined,
    photos: []
  };
}

export async function mapMediaAssetRowToPhotoAsset(record: MediaAssetRecord): Promise<PhotoAsset> {
  return {
    id: record.id,
    title: normalizeDeAtVisibleText(record.title),
    url: await getStorageReadUrl(record.objectKey),
    createdAt: record.createdAt
  };
}

export async function exportFallwildCsv(): Promise<string> {
  const entries = await listFallwild();

  return buildCsv(
    [
      "id",
      "recorded_at",
      "wildart",
      "geschlecht",
      "altersklasse",
      "bergungs_status",
      "gemeinde",
      "strasse",
      "road_name",
      "road_kilometer",
      "road_kilometer_source",
      "address_label",
      "location_label",
      "lat",
      "lng",
      "note"
    ],
    entries.map((entry) => [
      entry.id,
      entry.recordedAt,
      entry.wildart,
      entry.geschlecht,
      entry.altersklasse,
      entry.bergungsStatus,
      entry.gemeinde,
      entry.strasse ?? "",
      entry.roadReference?.roadName ?? "",
      entry.roadReference?.roadKilometer ?? "",
      entry.roadReference?.source ?? "",
      entry.location.addressLabel ?? "",
      entry.location.label ?? "",
      entry.location.lat,
      entry.location.lng,
      entry.note ?? ""
    ])
  );
}

function buildRoadReference(record: FallwildVorgangRecord): FallwildVorgang["roadReference"] {
  if (!record.roadName && !record.roadKilometer && !record.roadKilometerSource && !record.roadPlaceId) {
    return undefined;
  }

  return {
    roadName: normalizeDeAtVisibleText(record.roadName) ?? undefined,
    roadKilometer: record.roadKilometer ?? undefined,
    source: parseRoadKilometerSource(record.roadKilometerSource),
    placeId: record.roadPlaceId ?? undefined
  };
}

function parseLocationSource(value: string | null): LocationSource | undefined {
  return value === "manual" || value === "device-gps" || value === "reverse-geocode" ? value : undefined;
}

function parseRoadKilometerSource(value: string | null): RoadKilometerSource | undefined {
  return value === "manual" || value === "gip" || value === "unavailable" ? value : undefined;
}

function listFallwildFromDemoStore(): FallwildVorgang[] {
  const store = createDemoStore();
  const revierId = process.env.DEV_REVIER_ID ?? "revier-attersee";

  return store.fallwild
    .filter((entry) => entry.revierId === revierId)
    .sort((left, right) => right.recordedAt.localeCompare(left.recordedAt));
}

function getFallwildFromDemoStore(fallwildId: string): FallwildVorgang | undefined {
  const store = createDemoStore();
  const revierId = process.env.DEV_REVIER_ID ?? "revier-attersee";

  return store.fallwild.find((entry) => entry.revierId === revierId && entry.id === fallwildId);
}

async function attachPhotosToFallwildEntries(rows: FallwildVorgangRecord[]): Promise<FallwildVorgang[]> {
  if (rows.length === 0) {
    return [];
  }

  if (!isStorageConfigured()) {
    return rows.map((row) => mapFallwildRowToDomain(row));
  }

  const db = getDb();
  const entryIds = rows.map((row) => row.id);
  let photoRows: MediaAssetRecord[] = [];

  try {
    photoRows = await db
      .select()
      .from(mediaAssets)
      .where(and(eq(mediaAssets.entityType, "fallwild"), inArray(mediaAssets.entityId, entryIds)))
      .orderBy(desc(mediaAssets.createdAt));
  } catch (error) {
    if (!isMissingTableError(error, "media_assets")) {
      throw error;
    }
  }

  const photosByEntryId = new Map<string, PhotoAsset[]>();

  for (const photoRow of photoRows) {
    const photos = photosByEntryId.get(photoRow.entityId) ?? [];
    photos.push(await mapMediaAssetRowToPhotoAsset(photoRow));
    photosByEntryId.set(photoRow.entityId, photos);
  }

  return rows.map((row) => {
    const base = mapFallwildRowToDomain(row);

    return {
      ...base,
      photos: photosByEntryId.get(row.id) ?? []
    };
  });
}

type MediaAssetRecord = typeof mediaAssets.$inferSelect;
