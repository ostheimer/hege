import type { ContactEntry, ContactList, RegisteredContact } from "@hege/domain";
import { and, asc, eq } from "drizzle-orm";

import { getDb } from "../../db/client";
import {
  contactEntries,
  contactLists,
  memberships,
  users,
  type ContactEntryRecord,
  type ContactListRecord
} from "../../db/schema";

export interface ContactListInsert {
  id: string;
  revierId: string;
  title: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContactEntryInsert {
  id: string;
  listId: string;
  revierId: string;
  membershipId?: string;
  name?: string;
  phone?: string;
  revier?: string;
  funktion?: string;
  note?: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContactEntryPatch {
  membershipId?: string | null;
  name?: string | null;
  phone?: string | null;
  revier?: string | null;
  funktion?: string | null;
  note?: string | null;
  updatedAt: string;
}

export interface ContactsRepository {
  listDirectory(revierId: string): Promise<{
    registeredMembers: RegisteredContact[];
    lists: ContactList[];
  }>;
  findList(revierId: string, listId: string): Promise<ContactListRecord | undefined>;
  getList(revierId: string, listId: string): Promise<ContactList | undefined>;
  findEntry(
    revierId: string,
    listId: string,
    entryId: string
  ): Promise<ContactEntryRecord | undefined>;
  getEntry(revierId: string, listId: string, entryId: string): Promise<ContactEntry | undefined>;
  findEntryByMembership(
    revierId: string,
    listId: string,
    membershipId: string
  ): Promise<ContactEntryRecord | undefined>;
  findMembership(revierId: string, membershipId: string): Promise<RegisteredContact | undefined>;
  insertList(input: ContactListInsert): Promise<void>;
  updateList(revierId: string, listId: string, patch: { title: string; updatedAt: string }): Promise<boolean>;
  deleteList(revierId: string, listId: string): Promise<boolean>;
  insertEntry(input: ContactEntryInsert): Promise<void>;
  updateEntry(revierId: string, listId: string, entryId: string, patch: ContactEntryPatch): Promise<boolean>;
  deleteEntry(revierId: string, listId: string, entryId: string): Promise<boolean>;
}

export function createDbContactsRepository(): ContactsRepository {
  // Verbindung erst beim Zugriff öffnen; Preview-Builds benötigen keine Datenbank.


  async function listDirectory(revierId: string) {
    const [registeredMembers, listRows, entryRows] = await Promise.all([
      listRegisteredMembers(revierId),
      getDb()
        .select()
        .from(contactLists)
        .where(eq(contactLists.revierId, revierId))
        .orderBy(asc(contactLists.position), asc(contactLists.title)),
      readEntryRows(revierId)
    ]);

    return {
      registeredMembers,
      lists: assembleLists(listRows, entryRows)
    };
  }

  return {
    listDirectory,

    async findList(revierId, listId) {
      const [row] = await getDb()
        .select()
        .from(contactLists)
        .where(and(eq(contactLists.revierId, revierId), eq(contactLists.id, listId)))
        .limit(1);

      return row;
    },

    async getList(revierId, listId) {
      const directory = await listDirectory(revierId);
      return directory.lists.find((entry) => entry.id === listId);
    },

    async findEntry(revierId, listId, entryId) {
      const [row] = await getDb()
        .select()
        .from(contactEntries)
        .where(
          and(
            eq(contactEntries.revierId, revierId),
            eq(contactEntries.listId, listId),
            eq(contactEntries.id, entryId)
          )
        )
        .limit(1);

      return row;
    },

    async getEntry(revierId, listId, entryId) {
      const directory = await listDirectory(revierId);
      const list = directory.lists.find((entry) => entry.id === listId);
      return list?.entries.find((entry) => entry.id === entryId);
    },

    async findEntryByMembership(revierId, listId, membershipId) {
      const [row] = await getDb()
        .select()
        .from(contactEntries)
        .where(
          and(
            eq(contactEntries.revierId, revierId),
            eq(contactEntries.listId, listId),
            eq(contactEntries.membershipId, membershipId)
          )
        )
        .limit(1);

      return row;
    },

    async findMembership(revierId, membershipId) {
      const rows = await listRegisteredMembers(revierId);
      return rows.find((entry) => entry.membershipId === membershipId);
    },

    async insertList(input) {
      await getDb().insert(contactLists).values(input);
    },

    async updateList(revierId, listId, patch) {
      const rows = await getDb()
        .update(contactLists)
        .set(patch)
        .where(and(eq(contactLists.revierId, revierId), eq(contactLists.id, listId)))
        .returning({ id: contactLists.id });

      return rows.length > 0;
    },

    async deleteList(revierId, listId) {
      const rows = await getDb()
        .delete(contactLists)
        .where(and(eq(contactLists.revierId, revierId), eq(contactLists.id, listId)))
        .returning({ id: contactLists.id });

      return rows.length > 0;
    },

    async insertEntry(input) {
      await getDb().insert(contactEntries).values({
        ...input,
        membershipId: input.membershipId ?? null,
        name: input.name ?? null,
        phone: input.phone ?? null,
        revier: input.revier ?? null,
        funktion: input.funktion ?? null,
        note: input.note ?? null
      });
    },

    async updateEntry(revierId, listId, entryId, patch) {
      const rows = await getDb()
        .update(contactEntries)
        .set(patch)
        .where(
          and(
            eq(contactEntries.revierId, revierId),
            eq(contactEntries.listId, listId),
            eq(contactEntries.id, entryId)
          )
        )
        .returning({ id: contactEntries.id });

      return rows.length > 0;
    },

    async deleteEntry(revierId, listId, entryId) {
      const rows = await getDb()
        .delete(contactEntries)
        .where(
          and(
            eq(contactEntries.revierId, revierId),
            eq(contactEntries.listId, listId),
            eq(contactEntries.id, entryId)
          )
        )
        .returning({ id: contactEntries.id });

      return rows.length > 0;
    }
  };

  async function listRegisteredMembers(revierId: string): Promise<RegisteredContact[]> {
    const rows = await getDb()
      .select({
        membershipId: memberships.id,
        userId: users.id,
        name: users.name,
        phone: users.phone,
        role: memberships.role,
        jagdzeichen: memberships.jagdzeichen
      })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(eq(memberships.revierId, revierId))
      .orderBy(asc(users.name));

    return rows;
  }

  async function readEntryRows(revierId: string): Promise<ContactEntryRow[]> {
    return getDb()
      .select({
        id: contactEntries.id,
        listId: contactEntries.listId,
        revierId: contactEntries.revierId,
        membershipId: contactEntries.membershipId,
        name: contactEntries.name,
        phone: contactEntries.phone,
        revier: contactEntries.revier,
        funktion: contactEntries.funktion,
        note: contactEntries.note,
        position: contactEntries.position,
        createdAt: contactEntries.createdAt,
        updatedAt: contactEntries.updatedAt,
        memberUserId: memberships.userId,
        memberRole: memberships.role,
        memberJagdzeichen: memberships.jagdzeichen,
        memberName: users.name,
        memberPhone: users.phone
      })
      .from(contactEntries)
      .leftJoin(memberships, eq(memberships.id, contactEntries.membershipId))
      .leftJoin(users, eq(users.id, memberships.userId))
      .where(eq(contactEntries.revierId, revierId))
      .orderBy(asc(contactEntries.listId), asc(contactEntries.position), asc(contactEntries.name));
  }
}

interface ContactEntryRow {
  id: string;
  listId: string;
  revierId: string;
  membershipId: string | null;
  name: string | null;
  phone: string | null;
  revier: string | null;
  funktion: string | null;
  note: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  memberUserId: string | null;
  memberRole: RegisteredContact["role"] | null;
  memberJagdzeichen: string | null;
  memberName: string | null;
  memberPhone: string | null;
}

function assembleLists(listRows: ContactListRecord[], entryRows: ContactEntryRow[]): ContactList[] {
  const entriesByList = new Map<string, ContactEntry[]>();

  for (const row of entryRows) {
    const entry = mapEntryRow(row);
    entriesByList.set(row.listId, [...(entriesByList.get(row.listId) ?? []), entry]);
  }

  return listRows.map((row) => ({
    id: row.id,
    revierId: row.revierId,
    title: row.title,
    position: row.position,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    entries: entriesByList.get(row.id) ?? []
  }));
}

function mapEntryRow(row: ContactEntryRow): ContactEntry {
  const linkedMember =
    row.membershipId && row.memberUserId && row.memberRole && row.memberJagdzeichen
      ? {
          membershipId: row.membershipId,
          userId: row.memberUserId,
          name: row.memberName ?? "Unbekannt",
          phone: row.memberPhone ?? "",
          role: row.memberRole,
          jagdzeichen: row.memberJagdzeichen
        }
      : undefined;

  return {
    id: row.id,
    listId: row.listId,
    revierId: row.revierId,
    membershipId: row.membershipId ?? undefined,
    name: linkedMember?.name ?? row.name ?? "Unbekannt",
    phone: linkedMember?.phone ?? row.phone ?? "",
    revier: row.revier ?? undefined,
    funktion: row.funktion ?? undefined,
    note: row.note ?? undefined,
    position: row.position,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    linkedMember
  };
}
