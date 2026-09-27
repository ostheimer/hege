import type { Aufgabe, GeoPoint, Reviermeldung } from "@hege/domain";
import { and, desc, eq, inArray } from "drizzle-orm";

import { getDb } from "../../db/client";
import {
  aufgabeAssignees,
  aufgaben,
  reviermeldungen,
  type AufgabeAssigneeRecord,
  type AufgabeRecord,
  type ReviermeldungRecord
} from "../../db/schema";
import { normalizeDeAtVisibleText } from "../../text/de-at";

export interface RevierarbeitRepository {
  findAufgabe(revierId: string, aufgabeId: string): Promise<Aufgabe | undefined>;
  findReviermeldung(revierId: string, reviermeldungId: string): Promise<Reviermeldung | undefined>;
  insertAufgabe(entry: Aufgabe): Promise<Aufgabe>;
  insertReviermeldung(entry: Reviermeldung): Promise<Reviermeldung>;
  listAufgaben(revierId: string): Promise<Aufgabe[]>;
  listReviermeldungen(revierId: string): Promise<Reviermeldung[]>;
  updateAufgabe(revierId: string, aufgabeId: string, patch: AufgabeRepositoryPatch): Promise<Aufgabe | undefined>;
  updateReviermeldung(
    revierId: string,
    reviermeldungId: string,
    patch: ReviermeldungRepositoryPatch
  ): Promise<Reviermeldung | undefined>;
}

export interface ReviermeldungRepositoryPatch {
  status?: Reviermeldung["status"];
  title?: string;
  description?: string | null;
  location?: GeoPoint | null;
  relatedType?: Reviermeldung["relatedType"] | null;
  relatedId?: string | null;
  updatedAt: string;
}

export interface AufgabeRepositoryPatch {
  title?: string;
  description?: string | null;
  status?: Aufgabe["status"];
  priority?: Aufgabe["priority"];
  dueAt?: string | null;
  completedAt?: string | null;
  completionNote?: string | null;
  assigneeMembershipIds?: string[];
  updatedAt: string;
}

export function createDbRevierarbeitRepository(): RevierarbeitRepository {
  // Verbindung erst beim Zugriff öffnen; Preview-Builds benötigen keine Datenbank.


  return {
    async findAufgabe(revierId, aufgabeId) {
      const [row] = await getDb()
        .select()
        .from(aufgaben)
        .where(and(eq(aufgaben.revierId, revierId), eq(aufgaben.id, aufgabeId)))
        .limit(1);

      if (!row) {
        return undefined;
      }

      const assignees = await listAssignees([row.id]);
      return mapAufgabeRowToDomain(row, assignees);
    },

    async findReviermeldung(revierId, reviermeldungId) {
      const [row] = await getDb()
        .select()
        .from(reviermeldungen)
        .where(and(eq(reviermeldungen.revierId, revierId), eq(reviermeldungen.id, reviermeldungId)))
        .limit(1);

      return row ? mapReviermeldungRowToDomain(row) : undefined;
    },

    async insertAufgabe(entry) {
      const [row] = await getDb()
        .insert(aufgaben)
        .values({
          id: entry.id,
          revierId: entry.revierId,
          createdByMembershipId: entry.createdByMembershipId,
          sourceType: entry.sourceType ?? null,
          sourceId: entry.sourceId ?? null,
          title: entry.title,
          description: entry.description ?? null,
          status: entry.status,
          priority: entry.priority,
          dueAt: entry.dueAt ?? null,
          completedAt: entry.completedAt ?? null,
          completionNote: entry.completionNote ?? null,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt
        })
        .returning();

      if (!row) {
        throw new Error("Aufgabe konnte nicht gespeichert werden.");
      }

      await replaceAssignees(row.id, entry.assigneeMembershipIds, entry.createdAt);
      return mapAufgabeRowToDomain(row, await listAssignees([row.id]));
    },

    async insertReviermeldung(entry) {
      const [row] = await getDb()
        .insert(reviermeldungen)
        .values({
          id: entry.id,
          revierId: entry.revierId,
          createdByMembershipId: entry.createdByMembershipId,
          category: entry.category,
          status: entry.status,
          occurredAt: entry.occurredAt,
          title: entry.title,
          description: entry.description ?? null,
          locationLat: entry.location?.lat ?? null,
          locationLng: entry.location?.lng ?? null,
          locationLabel: entry.location?.label ?? null,
          relatedType: entry.relatedType ?? null,
          relatedId: entry.relatedId ?? null,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt
        })
        .returning();

      if (!row) {
        throw new Error("Reviermeldung konnte nicht gespeichert werden.");
      }

      return mapReviermeldungRowToDomain(row);
    },

    async listAufgaben(revierId) {
      const rows = await getDb()
        .select()
        .from(aufgaben)
        .where(eq(aufgaben.revierId, revierId))
        .orderBy(desc(aufgaben.createdAt));
      const assignees = await listAssignees(rows.map((row) => row.id));

      return rows.map((row) => mapAufgabeRowToDomain(row, assignees));
    },

    async listReviermeldungen(revierId) {
      const rows = await getDb()
        .select()
        .from(reviermeldungen)
        .where(eq(reviermeldungen.revierId, revierId))
        .orderBy(desc(reviermeldungen.occurredAt));

      return rows.map(mapReviermeldungRowToDomain);
    },

    async updateAufgabe(revierId, aufgabeId, patch) {
      const updateValues = toAufgabeUpdateValues(patch);
      let row: AufgabeRecord | undefined;

      if (Object.keys(updateValues).length > 0) {
        [row] = await getDb()
          .update(aufgaben)
          .set(updateValues)
          .where(and(eq(aufgaben.revierId, revierId), eq(aufgaben.id, aufgabeId)))
          .returning();
      } else {
        [row] = await getDb()
          .select()
          .from(aufgaben)
          .where(and(eq(aufgaben.revierId, revierId), eq(aufgaben.id, aufgabeId)))
          .limit(1);
      }

      if (!row) {
        return undefined;
      }

      if (patch.assigneeMembershipIds) {
        await replaceAssignees(row.id, patch.assigneeMembershipIds, patch.updatedAt);
      }

      return mapAufgabeRowToDomain(row, await listAssignees([row.id]));
    },

    async updateReviermeldung(revierId, reviermeldungId, patch) {
      const [row] = await getDb()
        .update(reviermeldungen)
        .set(toReviermeldungUpdateValues(patch))
        .where(and(eq(reviermeldungen.revierId, revierId), eq(reviermeldungen.id, reviermeldungId)))
        .returning();

      return row ? mapReviermeldungRowToDomain(row) : undefined;
    }
  };

  async function listAssignees(aufgabeIds: string[]) {
    if (aufgabeIds.length === 0) {
      return [];
    }

    return getDb()
      .select()
      .from(aufgabeAssignees)
      .where(inArray(aufgabeAssignees.aufgabeId, aufgabeIds));
  }

  async function replaceAssignees(aufgabeId: string, membershipIds: string[], createdAt: string) {
    await getDb().delete(aufgabeAssignees).where(eq(aufgabeAssignees.aufgabeId, aufgabeId));

    if (membershipIds.length === 0) {
      return;
    }

    await getDb().insert(aufgabeAssignees).values(
      membershipIds.map((membershipId) => ({
        id: `${aufgabeId}-${membershipId}`,
        aufgabeId,
        membershipId,
        createdAt
      }))
    );
  }
}

export function mapReviermeldungRowToDomain(record: ReviermeldungRecord): Reviermeldung {
  return {
    id: record.id,
    revierId: record.revierId,
    createdByMembershipId: record.createdByMembershipId,
    category: record.category,
    status: record.status,
    occurredAt: record.occurredAt,
    title: normalizeDeAtVisibleText(record.title),
    description: normalizeDeAtVisibleText(record.description) ?? undefined,
    location:
      typeof record.locationLat === "number" && typeof record.locationLng === "number"
        ? {
            lat: record.locationLat,
            lng: record.locationLng,
            label: normalizeDeAtVisibleText(record.locationLabel) ?? undefined
          }
        : undefined,
    relatedType: record.relatedType ?? undefined,
    relatedId: record.relatedId ?? undefined,
    photos: [],
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

export function mapAufgabeRowToDomain(record: AufgabeRecord, assignees: AufgabeAssigneeRecord[] = []): Aufgabe {
  return {
    id: record.id,
    revierId: record.revierId,
    createdByMembershipId: record.createdByMembershipId,
    sourceType: record.sourceType ?? undefined,
    sourceId: record.sourceId ?? undefined,
    title: normalizeDeAtVisibleText(record.title),
    description: normalizeDeAtVisibleText(record.description) ?? undefined,
    status: record.status,
    priority: record.priority,
    dueAt: record.dueAt ?? undefined,
    completedAt: record.completedAt ?? undefined,
    completionNote: normalizeDeAtVisibleText(record.completionNote) ?? undefined,
    assigneeMembershipIds: assignees
      .filter((assignee) => assignee.aufgabeId === record.id)
      .map((assignee) => assignee.membershipId),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function toReviermeldungUpdateValues(patch: ReviermeldungRepositoryPatch): Partial<typeof reviermeldungen.$inferInsert> {
  return {
    ...(patch.status ? { status: patch.status } : {}),
    ...(patch.title ? { title: patch.title } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    ...(patch.location !== undefined
      ? {
          locationLat: patch.location?.lat ?? null,
          locationLng: patch.location?.lng ?? null,
          locationLabel: patch.location?.label ?? null
        }
      : {}),
    ...(patch.relatedType !== undefined ? { relatedType: patch.relatedType } : {}),
    ...(patch.relatedId !== undefined ? { relatedId: patch.relatedId } : {}),
    updatedAt: patch.updatedAt
  };
}

function toAufgabeUpdateValues(patch: AufgabeRepositoryPatch): Partial<typeof aufgaben.$inferInsert> {
  return {
    ...(patch.title ? { title: patch.title } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    ...(patch.status ? { status: patch.status } : {}),
    ...(patch.priority ? { priority: patch.priority } : {}),
    ...(patch.dueAt !== undefined ? { dueAt: patch.dueAt } : {}),
    ...(patch.completedAt !== undefined ? { completedAt: patch.completedAt } : {}),
    ...(patch.completionNote !== undefined ? { completionNote: patch.completionNote } : {}),
    updatedAt: patch.updatedAt
  };
}
