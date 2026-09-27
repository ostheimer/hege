import { Client } from "pg";

import { getE2eDbEnv, e2eDatabaseUrl } from "./e2e-env";
import { getPnpmCommand, runCommand } from "./run-command";

export async function resetE2eDatabase() {
  const client = new Client({
    connectionString: e2eDatabaseUrl
  });

  await client.connect();

  try {
    await client.query(
      "truncate table dokumente, beschluesse, protokoll_versionen, sitzung_teilnehmer, sitzungen, reviereinrichtung_wartungen, reviereinrichtung_kontrollen, reviereinrichtungen, notifications, fallwild_vorgaenge, ansitz_sessions, memberships, reviere, users cascade"
    );
  } finally {
    await client.end();
  }

  runCommand(getPnpmCommand(), ["--filter", "@hege/web", "db:seed", "--confirm-demo-seed"], getE2eDbEnv());
}
