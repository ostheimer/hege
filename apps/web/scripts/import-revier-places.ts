/** Private Ortsliste lokal ergänzen, ohne Einrichtungen oder Betriebszustände zu erfinden. */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { Pool } from "pg";
import { loadCliEnv } from "../src/server/env/load-cli-env";
import { getServerEnv } from "../src/server/env";
import { assertLocalDatabaseTarget } from "../src/server/db/local-target";
import type { RevierMapData } from "@hege/domain";

loadCliEnv();
async function main() {
  const path = process.argv[2];
  if (!path) throw new Error("Aufruf: tsx scripts/import-revier-places.ts PRIVATE_DATEI.json [--apply]");
  const url = getServerEnv().databaseUrl;
  assertLocalDatabaseTarget(url);
  const raw = readFileSync(path, "utf8");
  if (raw.length > 1_000_000) throw new Error("Quelldatei zu groß.");
  const input = JSON.parse(raw) as { places: Array<{ name: string; lat: number; lng: number }> };
  if (!Array.isArray(input.places) || !input.places.length || input.places.length > 2000) throw new Error("Ungültige Ortsliste.");
  for (const p of input.places) {
    if (typeof p.name !== "string" || !p.name.trim() || p.name.length > 300 || !Number.isFinite(p.lat) || !Number.isFinite(p.lng) || Math.abs(p.lat) > 90 || Math.abs(p.lng) > 180) throw new Error("Ungültiger Ortsdatensatz.");
  }
  const pool = new Pool({ connectionString: url, max: 1 });
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    const result = await db.query("SELECT data FROM revier_maps WHERE revier_id='revier-gaenserndorf' FOR UPDATE");
    if (result.rowCount !== 1) throw new Error("Zuerst die bestätigte Reviergrenze importieren.");
    const map = result.rows[0].data as RevierMapData;
    const geoms = map.areas.map(a => ({ kind: a.kind, geometry: { type: "MultiPolygon", coordinates: a.polygons } }));
    const checked = await db.query(`WITH shapes AS (
      SELECT item->>'kind' kind, ST_SetSRID(ST_GeomFromGeoJSON(item->'geometry'),4326) geom FROM jsonb_array_elements($1::jsonb) item
    ), points AS (
      SELECT item, ord, ST_SetSRID(ST_MakePoint((item->>'lng')::float,(item->>'lat')::float),4326) geom
      FROM jsonb_array_elements($2::jsonb) WITH ORDINALITY AS p(item,ord)
    ) SELECT item, CASE
      WHEN EXISTS(SELECT 1 FROM shapes s WHERE kind='exclusion' AND ST_Covers(s.geom,p.geom)) THEN 'exclusion'
      WHEN EXISTS(SELECT 1 FROM shapes s WHERE kind='boundary' AND ST_Covers(s.geom,p.geom)) THEN 'inside'
      ELSE 'outside' END AS check FROM points p ORDER BY ord`, [JSON.stringify(geoms), JSON.stringify(input.places)]);
    const places: NonNullable<RevierMapData["places"]> = checked.rows.map(({ item, check }) => ({
      id: `maps-${createHash("sha256").update(JSON.stringify([item.name,item.lat,item.lng])).digest("hex").slice(0,20)}`,
      name: item.name, latitude: item.lat, longitude: item.lng, locationCheck: check
    }));
    if (new Set(places.map(p => p.id)).size !== places.length) throw new Error("Doppelte Orte in Quelle.");
    const counts = { inside: 0, outside: 0, exclusion: 0 };
    for (const place of places) counts[place.locationCheck]++;
    console.log(JSON.stringify({ count: places.length, counts, review: places.filter(p => p.locationCheck !== "inside").map(p => p.name) }, null, 2));
    if (process.argv.includes("--apply")) {
      const same = await db.query("SELECT data->'places'=$1::jsonb AS same FROM revier_maps WHERE revier_id='revier-gaenserndorf'", [JSON.stringify(places)]);
      if (map.places?.length && !same.rows[0].same) throw new Error("Bestehende Ortsliste weicht ab; kein automatisches Überschreiben.");
      await db.query("UPDATE revier_maps SET data=jsonb_set(data,'{places}',$1::jsonb),updated_at=now() WHERE revier_id='revier-gaenserndorf'", [JSON.stringify(places)]);
      await db.query("COMMIT");
      console.log("Kartenorte lokal ergänzt. Keine Einrichtungen, Zustände oder Aktivitäten erfunden.");
    } else await db.query("ROLLBACK");
  } catch(error) { await db.query("ROLLBACK"); throw error; }
  finally { db.release(); await pool.end(); }
}
void main().catch(error => { console.error(error instanceof Error ? error.message : "Import fehlgeschlagen"); process.exitCode = 1; });
