import { randomUUID } from "node:crypto";
import { desc, eq, sql } from "drizzle-orm";
import { validateRevierMap, type RevierMapData } from "@hege/domain";
import { getDb } from "../db/client";
import { revierMaps, revierMapVersions } from "../db/schema";
import { RouteError } from "../http/errors";

export async function readRevierMap(revierId: string) {
  const [row] = await getDb()
    .select()
    .from(revierMaps)
    .where(eq(revierMaps.revierId, revierId))
    .limit(1);
  return { map: row?.data ?? null, revision: row?.updatedAt ?? null };
}
export async function listMapVersions(revierId: string) {
  return getDb()
    .select()
    .from(revierMapVersions)
    .where(eq(revierMapVersions.revierId, revierId))
    .orderBy(desc(revierMapVersions.savedAt))
    .limit(20);
}
export async function editRevierMap(
  revierId: string,
  membershipId: string,
  input: { map: unknown; revision: unknown; confirmReplace: unknown },
) {
  try {
    validateRevierMap(input.map);
  } catch (error) {
    throw new RouteError(
      error instanceof Error ? error.message : "Ungültige Karte.",
      400,
      "validation-error",
    );
  }
  if (input.revision !== null && typeof input.revision !== "string")
    throw new RouteError(
      "Kartenstand fehlt. Karte erneut laden.",
      400,
      "validation-error",
    );
  const map = input.map as RevierMapData;
  return getDb().transaction(async (tx) => {
    // Sperre auch bei noch fehlender Karte: zwei erstmalige Entwürfe dürfen nicht konkurrieren.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${revierId}))`);
    const [current] = await tx
      .select()
      .from(revierMaps)
      .where(eq(revierMaps.revierId, revierId))
      .limit(1)
      .for("update");
    if ((current?.updatedAt ?? null) !== input.revision)
      throw new RouteError(
        "Die Grenze wurde inzwischen geändert. Dein Entwurf bleibt erhalten. Aktuelle Karte neu laden und Änderungen vergleichen.",
        409,
        "conflict",
      );
    if (current && input.confirmReplace !== true)
      throw new RouteError(
        "Änderung der bestehenden Grenze ausdrücklich bestätigen.",
        409,
        "conflict",
      );
    const geometries = map.areas.map((area) => ({
      kind: area.kind,
      geometry: { type: "MultiPolygon", coordinates: area.polygons },
    }));
    const validation = await tx.execute(
      sql`SELECT bool_and(ST_IsValid(ST_SetSRID(ST_GeomFromGeoJSON((item->'geometry')::text),4326))) AS valid FROM jsonb_array_elements(${JSON.stringify(geometries)}::jsonb) item`,
    );
    if (!validation.rows[0]?.valid)
      throw new RouteError(
        "Ungültige Geometrie: Überschneidungen und Lage der inneren Ringe prüfen.",
        400,
        "validation-error",
      );
    const revision = new Date(
      Math.max(Date.now(), current ? Date.parse(current.updatedAt) + 1 : 0),
    ).toISOString();
    const data: RevierMapData = {
      source: map.source,
      areas: map.areas,
      ...(current?.data.places ? { places: current.data.places } : {}),
    };
    if (current)
      await tx
        .insert(revierMapVersions)
        .values({
          id: randomUUID(),
          revierId,
          data: current.data,
          savedAt: current.updatedAt,
          changedByMembershipId: membershipId,
        });
    const [saved] = current
      ? await tx
          .update(revierMaps)
          .set({ data, updatedAt: revision })
          .where(eq(revierMaps.revierId, revierId))
          .returning()
      : await tx
          .insert(revierMaps)
          .values({ revierId, data, updatedAt: revision })
          .onConflictDoNothing()
          .returning();
    if (!saved)
      throw new RouteError(
        "Inzwischen wurde eine Grenze angelegt. Dein Entwurf bleibt erhalten.",
        409,
        "conflict",
      );
    return { map: saved.data, revision: saved.updatedAt };
  });
}
