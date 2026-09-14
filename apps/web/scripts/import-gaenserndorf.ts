/** Einmaliger, wiederholbarer lokaler Import. Kein Seed und kein Reset. */
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { Pool } from "pg";
import { loadCliEnv } from "../src/server/env/load-cli-env";
import { getServerEnv } from "../src/server/env";
import { mapBounds, type RevierMapData } from "@hege/domain";
import { assertLocalDatabaseTarget } from "../src/server/db/local-target";

loadCliEnv();
async function main() {
  const path = process.argv[2];
  if (!path) throw new Error("Aufruf: tsx scripts/import-gaenserndorf.ts DATEI.kmz [--apply]");
  const url = new URL(getServerEnv().databaseUrl);
  assertLocalDatabaseTarget(url.toString());
  const parsed = JSON.parse(execFileSync("python3", [fileURLToPath(new URL("./read-revier-kmz.py", import.meta.url)), path], { encoding: "utf8" })) as { map: RevierMapData; pointCount: number };
  const map = parsed.map;
  const bounds = mapBounds(map.areas)!;
  const hash = createHash("sha256").update(readFileSync(path)).digest("hex");
  const pool = new Pool({ connectionString: url.toString(), max: 1 });
  const db = await pool.connect();
  try {
    const geoms = map.areas.map(area => ({ name: area.name, kind: area.kind, geometry: { type: "MultiPolygon", coordinates: area.polygons } }));
    const checks = await db.query(`SELECT item->>'name' AS name, ST_IsValidReason(ST_GeomFromGeoJSON(item->'geometry')) AS validity
      FROM jsonb_array_elements($1::jsonb) item`, [JSON.stringify(geoms)]);
    console.log(JSON.stringify({ sha256: hash, areas: map.areas.length, pointCount: parsed.pointCount, bounds, validation: checks.rows }, null, 2));
    if (!process.argv.includes("--apply")) return;
    // Keine Geometriekorrektur am Original. Flächenwert ist nur eine gerundete Karten-Schätzung.
    const areaResult = await db.query(`WITH shapes AS (
      SELECT item->>'kind' AS kind, ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(item->'geometry'),4326)) AS geom
      FROM jsonb_array_elements($1::jsonb) item
    ) SELECT round((ST_Area(ST_Difference(
      (SELECT ST_Union(geom) FROM shapes WHERE kind='boundary'),
      COALESCE((SELECT ST_Union(geom) FROM shapes WHERE kind='exclusion'),ST_GeomFromText('POLYGON EMPTY',4326))
    )::geography)/10000)::numeric) AS hectares`, [JSON.stringify(geoms)]);
    await db.query("BEGIN");
    const user = await db.query("SELECT id FROM users WHERE username='ostheimer' AND name='Andreas Ostheimer' FOR UPDATE");
    if (user.rowCount !== 1) throw new Error("Andreas-Konto nicht eindeutig gefunden.");
    const existing = await db.query("SELECT data FROM revier_maps WHERE revier_id='revier-gaenserndorf' FOR UPDATE");
    if (existing.rowCount && JSON.stringify(existing.rows[0].data.areas) !== JSON.stringify(map.areas)) {
      // jsonb sortiert Schlüssel; inhaltlich direkt in PostgreSQL vergleichen.
      const same = await db.query("SELECT data->'areas'=$1::jsonb AS same FROM revier_maps WHERE revier_id='revier-gaenserndorf'", [JSON.stringify(map.areas)]);
      if (!same.rows[0].same) throw new Error("Bestehende Revierkarte weicht ab; kein automatisches Überschreiben.");
    }
    await db.query(`INSERT INTO reviere (id,tenant_key,name,bundesland,bezirk,flaeche_hektar,zentrum_lat,zentrum_lng,zentrum_label,setup_completed_at)
      VALUES ('revier-gaenserndorf','jagd-gaenserndorf','Jagdgesellschaft Gänserndorf','Niederösterreich','Gänserndorf',$1,$2,$3,'Kartenmittelpunkt · My Maps',now())
      ON CONFLICT (id) DO NOTHING`, [Number(areaResult.rows[0].hectares), bounds.latitude, bounds.longitude]);
    await db.query(`INSERT INTO revier_maps (revier_id,data,updated_at) VALUES ('revier-gaenserndorf',$1,now()) ON CONFLICT (revier_id) DO NOTHING`, [JSON.stringify(map)]);
    await db.query(`INSERT INTO memberships (id,user_id,revier_id,role,jagdzeichen,push_enabled,function_label)
      VALUES ('member-ostheimer-gaenserndorf',$1,'revier-gaenserndorf','platform-admin','',false,'Jäger') ON CONFLICT (id) DO NOTHING`, [user.rows[0].id]);
    await db.query("UPDATE memberships SET function_label='Jäger' WHERE id='member-ostheimer-gaenserndorf' AND user_id=$1 AND revier_id='revier-gaenserndorf' AND function_label=''", [user.rows[0].id]);
    // Altes Demo-Revier bleibt mit sämtlichen Datensätzen erhalten und wird klar gekennzeichnet.
    await db.query("UPDATE reviere SET name='Testrevier · Beispieldaten' WHERE id='revier-attersee' AND name='Jagdgesellschaft Gänserndorf'");
    await db.query("COMMIT");
    console.log("Lokales echtes Revier importiert; Demo-Daten erhalten und getrennt. Keine Einrichtungen erfunden.");
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    db.release();
    await pool.end();
  }
}
void main().catch(error => { console.error(error instanceof Error ? error.message : "Import fehlgeschlagen"); process.exitCode = 1; });
