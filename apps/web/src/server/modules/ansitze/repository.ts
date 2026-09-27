import type { AnsitzSession } from "@hege/domain";
import { and, desc, eq } from "drizzle-orm";

import { getDb } from "../../db/client";
import { ansitzSessions } from "../../db/schema";
import { mapAnsitzRowToDomain } from "./queries";

export interface AnsitzeRepository {
  findById(revierId: string, ansitzId: string): Promise<AnsitzSession | undefined>;
  insert(entry: AnsitzSession): Promise<AnsitzSession>;
  listActiveByRevier(revierId: string): Promise<AnsitzSession[]>;
  markCompleted(revierId: string, ansitzId: string, endedAt: string): Promise<AnsitzSession | undefined>;
}

export function createDbAnsitzeRepository(): AnsitzeRepository {
  // Verbindung erst beim Zugriff öffnen; Preview-Builds benötigen keine Datenbank.


  return {
    async findById(revierId, ansitzId) {
      const [row] = await getDb()
        .select()
        .from(ansitzSessions)
        .where(and(eq(ansitzSessions.revierId, revierId), eq(ansitzSessions.id, ansitzId)))
        .limit(1);

      return row ? mapAnsitzRowToDomain(row) : undefined;
    },

    async insert(entry) {
      const [row] = await getDb()
        .insert(ansitzSessions)
        .values({
          id: entry.id,
          revierId: entry.revierId,
          membershipId: entry.membershipId,
          standortId: entry.standortId ?? null,
          standortName: entry.standortName,
          locationLat: entry.location.lat,
          locationLng: entry.location.lng,
          locationLabel: entry.location.label ?? null,
          startedAt: entry.startedAt,
          plannedEndAt: entry.plannedEndAt ?? null,
          endedAt: entry.endedAt ?? null,
          note: entry.note ?? null,
          status: entry.status,
          conflict: entry.conflict
        })
        .returning();

      if (!row) {
        throw new Error("Ansitz konnte nicht gespeichert werden.");
      }

      return mapAnsitzRowToDomain(row);
    },

    async listActiveByRevier(revierId) {
      const rows = await getDb()
        .select()
        .from(ansitzSessions)
        .where(and(eq(ansitzSessions.revierId, revierId), eq(ansitzSessions.status, "active")))
        .orderBy(desc(ansitzSessions.startedAt));

      return rows.map(mapAnsitzRowToDomain);
    },

    async markCompleted(revierId, ansitzId, endedAt) {
      const [row] = await getDb()
        .update(ansitzSessions)
        .set({
          endedAt,
          status: "completed"
        })
        .where(and(eq(ansitzSessions.revierId, revierId), eq(ansitzSessions.id, ansitzId)))
        .returning();

      return row ? mapAnsitzRowToDomain(row) : undefined;
    }
  };
}
