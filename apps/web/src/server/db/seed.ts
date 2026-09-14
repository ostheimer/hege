import { loadCliEnv } from "../env/load-cli-env";
import { createDbFromPool, createPool } from "./client";
import { SEED_COMPLETION_MESSAGE, seedDatabase } from "./seed-data";
import { assertLocalDatabaseTarget } from "./local-target";
import { getServerEnv } from "../env";

loadCliEnv();

async function main() {
  assertLocalDatabaseTarget(getServerEnv().databaseUrl);
  if (!process.argv.includes("--confirm-demo-seed")) throw new Error("Demo-Seed verändert Beispielkonten und PINs. Nur bewusst mit --confirm-demo-seed ausführen; nicht für das echte Revier verwenden.");
  const pool = createPool();
  const db = createDbFromPool(pool);

  try {
    await seedDatabase(db);
    console.log(SEED_COMPLETION_MESSAGE);
  } finally {
    await pool.end();
  }
}

void main();
