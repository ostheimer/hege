import type {
  ContactDirectoryResponse,
  ContactEntry,
  ContactList,
  RegisteredContact,
  Role
} from "@hege/domain";
import { canRoleAccess, demoData, rolesForFeature } from "@hege/domain";
import { randomUUID } from "crypto";

import type { RequestContext } from "../../auth/context";
import { getServerEnv } from "../../env";
import {
  createDbContactsRepository,
  type ContactEntryInsert,
  type ContactEntryPatch,
  type ContactsRepository
} from "./repository";
import type {
  CreateContactEntryInput,
  CreateContactListInput,
  UpdateContactEntryInput,
  UpdateContactListInput
} from "./schemas";

export const CONTACT_READ_ALLOWED_ROLES = rolesForFeature("contacts-read");

export const CONTACT_MANAGE_ALLOWED_ROLES = rolesForFeature("contacts-manage");

export class ContactsServiceError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

interface ContactsServiceOptions {
  generateId?: (prefix: "contact-list" | "contact-entry") => string;
  getNow?: () => string;
  repository?: ContactsRepository;
  useDemoStore?: boolean;
}

export function createContactsService({
  repository = createDbContactsRepository(),
  generateId = (prefix) => `${prefix}-${randomUUID()}`,
  getNow = () => new Date().toISOString(),
  useDemoStore = getServerEnv().useDemoStore
}: ContactsServiceOptions = {}) {
  return {
    async listDirectory(context: RequestContext): Promise<ContactDirectoryResponse> {
      if (useDemoStore) {
        return listDemoDirectory(context);
      }

      const directory = await repository.listDirectory(context.revierId);

      return {
        ...directory,
        canManage: canManageContacts(context.role)
      };
    },

    async createList(context: RequestContext, input: CreateContactListInput): Promise<ContactList> {
      assertCanManage(context.role);
      assertMutationsEnabled(useDemoStore);

      const now = getNow();
      const existing = await repository.listDirectory(context.revierId);
      const id = generateId("contact-list");

      await repository.insertList({
        id,
        revierId: context.revierId,
        title: normalizeRequired(input.title, "title"),
        position: nextPosition(existing.lists.map((entry) => entry.position)),
        createdAt: now,
        updatedAt: now
      });

      const created = await repository.getList(context.revierId, id);
      if (!created) {
        throw new ContactsServiceError("Kontaktliste konnte nicht geladen werden.", 500);
      }

      return created;
    },

    async updateList(
      context: RequestContext,
      listId: string,
      input: UpdateContactListInput
    ): Promise<ContactList> {
      assertCanManage(context.role);
      assertMutationsEnabled(useDemoStore);

      const existing = await repository.findList(context.revierId, listId);
      if (!existing) {
        throw new ContactsServiceError("Kontaktliste wurde nicht gefunden.", 404);
      }

      const title = input.title === undefined ? existing.title : normalizeRequired(input.title, "title");
      const ok = await repository.updateList(context.revierId, listId, {
        title,
        updatedAt: getNow()
      });

      if (!ok) {
        throw new ContactsServiceError("Kontaktliste wurde nicht gefunden.", 404);
      }

      const updated = await repository.getList(context.revierId, listId);
      if (!updated) {
        throw new ContactsServiceError("Kontaktliste wurde nicht gefunden.", 404);
      }

      return updated;
    },

    async deleteList(context: RequestContext, listId: string): Promise<{ id: string }> {
      assertCanManage(context.role);
      assertMutationsEnabled(useDemoStore);

      const ok = await repository.deleteList(context.revierId, listId);
      if (!ok) {
        throw new ContactsServiceError("Kontaktliste wurde nicht gefunden.", 404);
      }

      return { id: listId };
    },

    async createEntry(
      context: RequestContext,
      listId: string,
      input: CreateContactEntryInput
    ): Promise<ContactEntry> {
      assertCanManage(context.role);
      assertMutationsEnabled(useDemoStore);

      const list = await repository.getList(context.revierId, listId);
      if (!list) {
        throw new ContactsServiceError("Kontaktliste wurde nicht gefunden.", 404);
      }

      const now = getNow();
      const id = generateId("contact-entry");
      const entry = await resolveEntryInput(context, listId, input);

      await repository.insertEntry({
        ...entry,
        id,
        listId,
        revierId: context.revierId,
        position: nextPosition(list.entries.map((candidate) => candidate.position)),
        createdAt: now,
        updatedAt: now
      });

      const created = await repository.getEntry(context.revierId, listId, id);
      if (!created) {
        throw new ContactsServiceError("Kontakt konnte nicht geladen werden.", 500);
      }

      return created;
    },

    async updateEntry(
      context: RequestContext,
      listId: string,
      entryId: string,
      input: UpdateContactEntryInput
    ): Promise<ContactEntry> {
      assertCanManage(context.role);
      assertMutationsEnabled(useDemoStore);

      const existing = await repository.findEntry(context.revierId, listId, entryId);
      if (!existing) {
        throw new ContactsServiceError("Kontakt wurde nicht gefunden.", 404);
      }

      const patch = await resolveEntryPatch(context, listId, input, existing);
      const ok = await repository.updateEntry(context.revierId, listId, entryId, {
        ...patch,
        updatedAt: getNow()
      });

      if (!ok) {
        throw new ContactsServiceError("Kontakt wurde nicht gefunden.", 404);
      }

      const updated = await repository.getEntry(context.revierId, listId, entryId);
      if (!updated) {
        throw new ContactsServiceError("Kontakt wurde nicht gefunden.", 404);
      }

      return updated;
    },

    async deleteEntry(context: RequestContext, listId: string, entryId: string): Promise<{ id: string }> {
      assertCanManage(context.role);
      assertMutationsEnabled(useDemoStore);

      const ok = await repository.deleteEntry(context.revierId, listId, entryId);
      if (!ok) {
        throw new ContactsServiceError("Kontakt wurde nicht gefunden.", 404);
      }

      return { id: entryId };
    }
  };

  async function resolveEntryInput(
    context: RequestContext,
    listId: string,
    input: CreateContactEntryInput
  ): Promise<Omit<ContactEntryInsert, "id" | "listId" | "revierId" | "position" | "createdAt" | "updatedAt">> {
    const membershipId = normalizeOptional(input.membershipId);

    if (membershipId) {
      await assertMembershipAvailable(context.revierId, membershipId);
      await assertMembershipNotAlreadyInList(context.revierId, listId, membershipId);

      return {
        membershipId,
        revier: normalizeOptional(input.revier),
        funktion: normalizeOptional(input.funktion),
        note: normalizeOptional(input.note)
      };
    }

    return {
      name: normalizeRequired(input.name, "name"),
      phone: normalizeRequired(input.phone, "phone"),
      revier: normalizeOptional(input.revier),
      funktion: normalizeOptional(input.funktion),
      note: normalizeOptional(input.note)
    };
  }

  async function resolveEntryPatch(
    context: RequestContext,
    listId: string,
    input: UpdateContactEntryInput,
    existing: {
      id: string;
      membershipId: string | null;
      name: string | null;
      phone: string | null;
      revier: string | null;
      funktion: string | null;
      note: string | null;
    }
  ): Promise<Omit<ContactEntryPatch, "updatedAt">> {
    const nextMembershipId =
      input.membershipId === undefined
        ? existing.membershipId
        : normalizeNullable(input.membershipId);
    const nextRevier = input.revier === undefined ? existing.revier : normalizeNullable(input.revier);
    const nextFunktion = input.funktion === undefined ? existing.funktion : normalizeNullable(input.funktion);
    const nextNote = input.note === undefined ? existing.note : normalizeNullable(input.note);

    if (nextMembershipId) {
      await assertMembershipAvailable(context.revierId, nextMembershipId);
      await assertMembershipNotAlreadyInList(context.revierId, listId, nextMembershipId, existing.id);

      return {
        membershipId: nextMembershipId,
        name: null,
        phone: null,
        revier: nextRevier,
        funktion: nextFunktion,
        note: nextNote
      };
    }

    const nextName = input.name === undefined ? existing.name : normalizeNullable(input.name);
    const nextPhone = input.phone === undefined ? existing.phone : normalizeNullable(input.phone);

    return {
      membershipId: null,
      name: normalizeRequired(nextName, "name"),
      phone: normalizeRequired(nextPhone, "phone"),
      revier: nextRevier,
      funktion: nextFunktion,
      note: nextNote
    };
  }

  async function assertMembershipAvailable(revierId: string, membershipId: string) {
    const membership = await repository.findMembership(revierId, membershipId);

    if (!membership) {
      throw new ContactsServiceError("Mitglied wurde im aktiven Revier nicht gefunden.", 404);
    }
  }

  async function assertMembershipNotAlreadyInList(
    revierId: string,
    listId: string,
    membershipId: string,
    exceptEntryId?: string
  ) {
    const duplicate = await repository.findEntryByMembership(revierId, listId, membershipId);

    if (duplicate && duplicate.id !== exceptEntryId) {
      throw new ContactsServiceError("Dieses Mitglied ist in der Kontaktliste bereits enthalten.", 409);
    }
  }
}

const defaultService = createContactsService();

export async function listContactDirectory(context: RequestContext) {
  return defaultService.listDirectory(context);
}

export async function createContactList(context: RequestContext, input: CreateContactListInput) {
  return defaultService.createList(context, input);
}

export async function updateContactList(
  context: RequestContext,
  listId: string,
  input: UpdateContactListInput
) {
  return defaultService.updateList(context, listId, input);
}

export async function deleteContactList(context: RequestContext, listId: string) {
  return defaultService.deleteList(context, listId);
}

export async function createContactEntry(
  context: RequestContext,
  listId: string,
  input: CreateContactEntryInput
) {
  return defaultService.createEntry(context, listId, input);
}

export async function updateContactEntry(
  context: RequestContext,
  listId: string,
  entryId: string,
  input: UpdateContactEntryInput
) {
  return defaultService.updateEntry(context, listId, entryId, input);
}

export async function deleteContactEntry(context: RequestContext, listId: string, entryId: string) {
  return defaultService.deleteEntry(context, listId, entryId);
}

export function canManageContacts(role: Role) {
  return canRoleAccess(role, "contacts-manage");
}

function assertCanManage(role: Role) {
  if (!canManageContacts(role)) {
    throw new ContactsServiceError("Kontakte dürfen mit der aktuellen Rolle nicht geändert werden.", 403);
  }
}

function assertMutationsEnabled(useDemoStore: boolean) {
  if (useDemoStore) {
    throw new ContactsServiceError("Kontakt-Mutationen benötigen eine aktive Datenbank.", 503);
  }
}

function normalizeRequired(value: string | null | undefined, field: string): string {
  const trimmed = typeof value === "string" ? value.trim() : "";

  if (!trimmed) {
    throw new ContactsServiceError(`${field} muss ein nicht-leerer String sein.`, 400);
  }

  return trimmed;
}

function normalizeOptional(value: string | null | undefined): string | undefined {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || undefined;
}

function normalizeNullable(value: string | null | undefined): string | null {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || null;
}

function nextPosition(values: number[]) {
  const max = values.reduce((highest, value) => Math.max(highest, value), 0);
  return max + 10;
}

function listDemoDirectory(context: RequestContext): ContactDirectoryResponse {
  const registeredMembers = demoData.memberships
    .filter((membership) => membership.revierId === context.revierId)
    .map((membership) => {
      const user = demoData.users.find((candidate) => candidate.id === membership.userId);

      return {
        membershipId: membership.id,
        userId: membership.userId,
        name: user?.name ?? membership.userId,
        phone: user?.phone ?? "",
        role: membership.role,
        jagdzeichen: membership.jagdzeichen
      } satisfies RegisteredContact;
    })
    .sort((left, right) => left.name.localeCompare(right.name, "de-AT"));

  return {
    registeredMembers,
    lists: demoData.contactLists
      .filter((list) => list.revierId === context.revierId)
      .map((list) => ({
        ...list,
        entries: list.entries.map((entry) => {
          const linkedMember = entry.membershipId
            ? registeredMembers.find((member) => member.membershipId === entry.membershipId)
            : undefined;

          return {
            ...entry,
            name: linkedMember?.name ?? entry.name,
            phone: linkedMember?.phone ?? entry.phone,
            linkedMember
          };
        })
      }))
      .sort((left, right) => left.position - right.position || left.title.localeCompare(right.title, "de-AT")),
    canManage: canManageContacts(context.role)
  };
}
