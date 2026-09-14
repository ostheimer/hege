#!/usr/bin/env node
/**
 * Removes E2E-test leftovers from the database.
 *
 * - Sitzungen with title prefix "E2E " plus their teilnehmer, protokoll-
 *   versionen, beschluesse and dokumente.
 * - Fallwild-Vorgänge with gemeinde prefix "E2E " or strasse prefix "E2E-"
 *   plus their media-assets.
 *
 * Run via:
 *
 *   pnpm --filter @hege/web cleanup:e2e
 *   pnpm --filter @hege/web cleanup:e2e -- --dry-run
 *
 * Production-looking DATABASE_URLs (neon.tech / pooler hostnames without a
 * dev/preview/staging marker) require an explicit
 *   CLEANUP_E2E_CONFIRM_PROD=yes
 * environment variable, otherwise the script aborts.
 *
 * The script is invoked through `tsx` so that the TypeScript schema and
 * Drizzle client modules can be imported directly.
 */

import { and, eq, inArray, or } from "drizzle-orm";

// Use dynamic imports for the TypeScript modules. tsx (the runner) registers
// its loader for `.ts` files via dynamic `import()` reliably across Node
// versions, but synchronous static `import` from a `.mjs` entrypoint can race
// the loader registration on Node ≥ 23.
const { loadCliEnv } = await import("../src/server/env/load-cli-env.ts");
const { filterE2eFallwildIds, filterE2eSitzungIds, looksLikeProductionDatabaseUrl } = await import(
  "../src/server/db/cleanup-e2e-helpers.ts"
);
const { createDbFromPool, createPool } = await import("../src/server/db/client.ts");
const {
  dokumente,
  fallwildVorgaenge,
  mediaAssets,
  protokollBeschluesse,
  protokollVersionen,
  sitzungTeilnehmer,
  sitzungen
} = await import("../src/server/db/schema.ts");

loadCliEnv();

const args = parseArgs(process.argv.slice(2));
const dryRun = Boolean(args["dry-run"]);

await main({ dryRun });

async function main({ dryRun }) {
  const databaseUrl = process.env.DATABASE_URL ?? "postgresql://hege:hege@127.0.0.1:15432/hege";

  if (looksLikeProductionDatabaseUrl(databaseUrl)) {
    if (process.env.CLEANUP_E2E_CONFIRM_PROD !== "yes") {
      log({
        action: "abort",
        reason: "production_database_without_confirmation",
        message:
          "DATABASE_URL sieht nach Production aus. Bitte CLEANUP_E2E_CONFIRM_PROD=yes setzen, um den Cleanup explizit freizugeben.",
        host: maskedHost(databaseUrl)
      });
      process.exit(1);
    }

    log({
      action: "warning",
      message: "Production-DB explizit bestätigt via CLEANUP_E2E_CONFIRM_PROD=yes.",
      host: maskedHost(databaseUrl)
    });
  }

  log({
    action: "start",
    mode: dryRun ? "dry-run" : "delete",
    host: maskedHost(databaseUrl)
  });

  const pool = createPool(databaseUrl);
  const db = createDbFromPool(pool);

  try {
    await runCleanup(db, { dryRun });
  } finally {
    await pool.end();
  }

  log({ action: "done", mode: dryRun ? "dry-run" : "delete" });
}

async function runCleanup(db, { dryRun }) {
  // Sitzungen
  const sitzungRows = await db
    .select({ id: sitzungen.id, title: sitzungen.title })
    .from(sitzungen);
  const e2eSitzungIds = filterE2eSitzungIds(sitzungRows);
  const sitzungSamples = sitzungRows
    .filter((row) => e2eSitzungIds.includes(row.id))
    .slice(0, 5)
    .map((row) => ({ id: row.id, title: row.title }));

  log({
    table: "sitzungen",
    action: "select",
    matched: e2eSitzungIds.length,
    total: sitzungRows.length,
    samples: sitzungSamples
  });

  let versionIds = [];
  if (e2eSitzungIds.length > 0) {
    const versionRows = await db
      .select({ id: protokollVersionen.id })
      .from(protokollVersionen)
      .where(inArray(protokollVersionen.sitzungId, e2eSitzungIds));
    versionIds = versionRows.map((row) => row.id);
  }
  log({ table: "protokoll_versionen", action: "select", matched: versionIds.length });

  let documentIds = [];
  if (e2eSitzungIds.length > 0 || versionIds.length > 0) {
    const documentFilter =
      e2eSitzungIds.length > 0 && versionIds.length > 0
        ? or(inArray(dokumente.sitzungId, e2eSitzungIds), inArray(dokumente.versionId, versionIds))
        : e2eSitzungIds.length > 0
          ? inArray(dokumente.sitzungId, e2eSitzungIds)
          : inArray(dokumente.versionId, versionIds);
    const documentRows = await db.select({ id: dokumente.id }).from(dokumente).where(documentFilter);
    documentIds = documentRows.map((row) => row.id);
  }
  log({ table: "dokumente", action: "select", matched: documentIds.length });

  let beschlussIds = [];
  if (versionIds.length > 0) {
    const beschlussRows = await db
      .select({ id: protokollBeschluesse.id })
      .from(protokollBeschluesse)
      .where(inArray(protokollBeschluesse.versionId, versionIds));
    beschlussIds = beschlussRows.map((row) => row.id);
  }
  log({ table: "beschluesse", action: "select", matched: beschlussIds.length });

  let teilnehmerIds = [];
  if (e2eSitzungIds.length > 0) {
    const teilnehmerRows = await db
      .select({ id: sitzungTeilnehmer.id })
      .from(sitzungTeilnehmer)
      .where(inArray(sitzungTeilnehmer.sitzungId, e2eSitzungIds));
    teilnehmerIds = teilnehmerRows.map((row) => row.id);
  }
  log({ table: "sitzung_teilnehmer", action: "select", matched: teilnehmerIds.length });

  // Fallwild
  const fallwildRows = await db
    .select({ id: fallwildVorgaenge.id, gemeinde: fallwildVorgaenge.gemeinde, strasse: fallwildVorgaenge.strasse })
    .from(fallwildVorgaenge);
  const e2eFallwildIds = filterE2eFallwildIds(fallwildRows);
  const fallwildSamples = fallwildRows
    .filter((row) => e2eFallwildIds.includes(row.id))
    .slice(0, 5)
    .map((row) => ({ id: row.id, gemeinde: row.gemeinde, strasse: row.strasse }));

  log({
    table: "fallwild_vorgaenge",
    action: "select",
    matched: e2eFallwildIds.length,
    total: fallwildRows.length,
    samples: fallwildSamples
  });

  let fallwildMediaIds = [];
  if (e2eFallwildIds.length > 0) {
    const mediaRows = await db
      .select({ id: mediaAssets.id })
      .from(mediaAssets)
      .where(and(eq(mediaAssets.entityType, "fallwild"), inArray(mediaAssets.entityId, e2eFallwildIds)));
    fallwildMediaIds = mediaRows.map((row) => row.id);
  }
  log({ table: "media_assets", action: "select", matched: fallwildMediaIds.length });

  if (dryRun) {
    log({ action: "skip-delete", mode: "dry-run" });
    return;
  }

  // Delete in foreign-key-safe order. Each delete is guarded by an "id in []"
  // check so a second run is a no-op when nothing matches.
  await deleteByIds(db, "dokumente", dokumente, documentIds);
  await deleteByIds(db, "beschluesse", protokollBeschluesse, beschlussIds);
  await deleteByIds(db, "sitzung_teilnehmer", sitzungTeilnehmer, teilnehmerIds);

  if (versionIds.length > 0) {
    const result = await db
      .delete(protokollVersionen)
      .where(inArray(protokollVersionen.id, versionIds));
    log({ table: "protokoll_versionen", action: "delete", count: getRowCount(result, versionIds.length) });
  } else {
    log({ table: "protokoll_versionen", action: "delete", count: 0 });
  }

  if (e2eSitzungIds.length > 0) {
    const result = await db.delete(sitzungen).where(inArray(sitzungen.id, e2eSitzungIds));
    log({ table: "sitzungen", action: "delete", count: getRowCount(result, e2eSitzungIds.length) });
  } else {
    log({ table: "sitzungen", action: "delete", count: 0 });
  }

  await deleteByIds(db, "media_assets", mediaAssets, fallwildMediaIds);

  if (e2eFallwildIds.length > 0) {
    const result = await db.delete(fallwildVorgaenge).where(inArray(fallwildVorgaenge.id, e2eFallwildIds));
    log({ table: "fallwild_vorgaenge", action: "delete", count: getRowCount(result, e2eFallwildIds.length) });
  } else {
    log({ table: "fallwild_vorgaenge", action: "delete", count: 0 });
  }

  // Post-state counts for verification.
  const remainingSitzungen = await db.select({ id: sitzungen.id, title: sitzungen.title }).from(sitzungen);
  const remainingFallwild = await db
    .select({ id: fallwildVorgaenge.id, gemeinde: fallwildVorgaenge.gemeinde, strasse: fallwildVorgaenge.strasse })
    .from(fallwildVorgaenge);

  log({
    table: "sitzungen",
    action: "post-count",
    remaining: remainingSitzungen.length,
    e2eRemaining: filterE2eSitzungIds(remainingSitzungen).length
  });
  log({
    table: "fallwild_vorgaenge",
    action: "post-count",
    remaining: remainingFallwild.length,
    e2eRemaining: filterE2eFallwildIds(remainingFallwild).length
  });
}

async function deleteByIds(db, tableName, table, ids) {
  if (ids.length === 0) {
    log({ table: tableName, action: "delete", count: 0 });
    return;
  }

  const result = await db.delete(table).where(inArray(table.id, ids));
  log({ table: tableName, action: "delete", count: getRowCount(result, ids.length) });
}

function getRowCount(result, fallbackCount) {
  if (result && typeof result === "object" && "rowCount" in result && typeof result.rowCount === "number") {
    return result.rowCount;
  }

  return fallbackCount;
}

function parseArgs(rawArgs) {
  const parsed = {};

  for (const arg of rawArgs) {
    if (!arg.startsWith("--")) {
      continue;
    }

    const [key, value] = arg.slice(2).split("=", 2);
    parsed[key] = value ?? "true";
  }

  return parsed;
}

function maskedHost(databaseUrl) {
  try {
    const url = new URL(databaseUrl);
    return url.hostname || "unknown";
  } catch {
    return "unknown";
  }
}

function log(entry) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), ...entry }));
}
