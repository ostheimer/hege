import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { RouteError } from "../http/errors";

import { getServerEnv } from "../env";
import * as schema from "./schema";

declare global {
  var hegePool: Pool | undefined;
  var hegeDatabase: ReturnType<typeof createDb> | undefined;
}

export function createPool(databaseUrl?: string) {
  if (!databaseUrl && process.env.VERCEL_ENV && !process.env.DATABASE_URL?.trim()) {
    throw new RouteError(
      "Die Datenbank ist in dieser Umgebung nicht eingerichtet.",
      503,
      "service-unavailable"
    );
  }
  databaseUrl ??= getServerEnv().databaseUrl;
  return new Pool({
    connectionString: databaseUrl,
    max: 1
  });
}

export function createDbFromPool(pool: Pool) {
  return drizzle({
    client: pool,
    schema
  });
}

export type HegeDb = ReturnType<typeof createDbFromPool>;

export function createDb(databaseUrl?: string) {
  return createDbFromPool(createPool(databaseUrl));
}

export function getDb() {
  globalThis.hegePool ??= createPool();
  globalThis.hegeDatabase ??= createDbFromPool(globalThis.hegePool);

  return globalThis.hegeDatabase;
}
