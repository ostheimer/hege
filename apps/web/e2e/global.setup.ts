import { Client } from "pg";
import { test as setup } from "@playwright/test";

import { e2eDatabaseName, getE2eDbEnv } from "./support/e2e-env";
import { getPnpmCommand, runCommand } from "./support/run-command";

const LOCAL_ADMIN_DATABASE_URL = "postgresql://hege:hege@127.0.0.1:15432/postgres";

setup("bootstrap local e2e database", async () => {
  if (!(await isPostgresReachable())) {
    // Nur starten, wenn nicht schon ein lokaler Postgres laeuft: in Git-Worktrees
    // gehoert der Container `hege-postgres` sonst einem anderen Compose-Projekt
    // und `docker compose up` bricht mit einem Namenskonflikt ab.
    runCommand("docker", ["compose", "up", "-d", "postgres"]);
  }
  await waitForPostgres();
  await createDatabaseIfMissing(e2eDatabaseName);

  const env = getE2eDbEnv();

  runCommand(getPnpmCommand(), ["--filter", "@hege/web", "db:migrate"], env);
  runCommand(getPnpmCommand(), ["--filter", "@hege/web", "db:seed"], env);
  runCommand(getPnpmCommand(), ["--filter", "@hege/web", "db:check"], env);
});

async function isPostgresReachable(): Promise<boolean> {
  const client = new Client({
    connectionString: LOCAL_ADMIN_DATABASE_URL
  });

  try {
    await client.connect();
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function waitForPostgres() {
  let lastError: unknown;

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const client = new Client({
      connectionString: LOCAL_ADMIN_DATABASE_URL
    });

    try {
      await client.connect();
      await client.end();
      return;
    } catch (error) {
      lastError = error;
      await client.end().catch(() => undefined);
      await sleep(1_000);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Postgres did not become ready for Playwright setup.");
}

async function createDatabaseIfMissing(databaseName: string) {
  const client = new Client({
    connectionString: LOCAL_ADMIN_DATABASE_URL
  });

  await client.connect();

  try {
    const existing = await client.query<{ exists: boolean }>(
      "select exists(select 1 from pg_database where datname = $1) as exists",
      [databaseName]
    );

    if (!existing.rows[0]?.exists) {
      await client.query(`create database ${quoteIdentifier(databaseName)}`);
    }
  } finally {
    await client.end();
  }
}

function quoteIdentifier(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
