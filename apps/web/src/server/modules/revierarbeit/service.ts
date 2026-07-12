import { canRoleAccess, rolesForFeature, type Aufgabe, type Reviermeldung, type Role } from "@hege/domain";
import { randomUUID } from "crypto";

import type { RequestContext } from "../../auth/context";
import { getServerEnv } from "../../env";
import {
  createDbRevierarbeitRepository,
  type AufgabeRepositoryPatch,
  type RevierarbeitRepository,
  type ReviermeldungRepositoryPatch
} from "./repository";
import type {
  CreateAufgabeInput,
  CreateReviermeldungInput,
  UpdateAufgabeInput,
  UpdateReviermeldungInput
} from "./schemas";

export const REVIERARBEIT_ALLOWED_ROLES = rolesForFeature("revierarbeit-read");

export class RevierarbeitServiceError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

interface RevierarbeitServiceOptions {
  generateId?: (prefix: "reviermeldung" | "aufgabe") => string;
  getNow?: () => string;
  repository?: RevierarbeitRepository;
  useDemoStore?: boolean;
}

export function createRevierarbeitService({
  repository = createDbRevierarbeitRepository(),
  generateId = (prefix) => `${prefix}-${randomUUID()}`,
  getNow = () => new Date().toISOString(),
  useDemoStore = getServerEnv().useDemoStore
}: RevierarbeitServiceOptions = {}) {
  return {
    async createAufgabe(context: RequestContext, input: CreateAufgabeInput): Promise<Aufgabe> {
      assertMutationsEnabled(useDemoStore);

      if (input.sourceType === "reviermeldung") {
        const source = await repository.findReviermeldung(context.revierId, input.sourceId ?? "");

        if (!source) {
          throw new RevierarbeitServiceError("Reviermeldung wurde nicht gefunden.", 404);
        }
      }

      const now = getNow();

      return repository.insertAufgabe({
        id: generateId("aufgabe"),
        revierId: context.revierId,
        createdByMembershipId: context.membershipId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        title: input.title,
        description: input.description,
        status: input.status ?? "offen",
        priority: input.priority ?? "normal",
        dueAt: input.dueAt,
        completedAt: input.status === "erledigt" ? now : undefined,
        assigneeMembershipIds: input.assigneeMembershipIds ?? [],
        createdAt: now,
        updatedAt: now
      });
    },

    async createReviermeldung(context: RequestContext, input: CreateReviermeldungInput): Promise<Reviermeldung> {
      assertMutationsEnabled(useDemoStore);

      const now = getNow();

      return repository.insertReviermeldung({
        id: generateId("reviermeldung"),
        revierId: context.revierId,
        createdByMembershipId: context.membershipId,
        category: input.category,
        status: input.status ?? "neu",
        occurredAt: input.occurredAt ?? now,
        title: input.title,
        description: input.description,
        location: input.location,
        relatedType: input.relatedType,
        relatedId: input.relatedId,
        photos: [],
        createdAt: now,
        updatedAt: now
      });
    },

    async getAufgabe(context: RequestContext, aufgabeId: string): Promise<Aufgabe> {
      const entry = await repository.findAufgabe(context.revierId, aufgabeId);

      if (!entry || !canReadAufgabe(context, entry)) {
        throw new RevierarbeitServiceError("Aufgabe wurde nicht gefunden.", 404);
      }

      return entry;
    },

    async getReviermeldung(context: RequestContext, reviermeldungId: string): Promise<Reviermeldung> {
      const entry = await repository.findReviermeldung(context.revierId, reviermeldungId);

      if (!entry) {
        throw new RevierarbeitServiceError("Reviermeldung wurde nicht gefunden.", 404);
      }

      return entry;
    },

    async listAufgaben(context: RequestContext): Promise<Aufgabe[]> {
      const entries = await repository.listAufgaben(context.revierId);

      return entries.filter((entry) => canReadAufgabe(context, entry));
    },

    async listReviermeldungen(context: RequestContext): Promise<Reviermeldung[]> {
      return repository.listReviermeldungen(context.revierId);
    },

    async updateAufgabe(context: RequestContext, aufgabeId: string, input: UpdateAufgabeInput): Promise<Aufgabe> {
      assertMutationsEnabled(useDemoStore);

      const existing = await repository.findAufgabe(context.revierId, aufgabeId);

      if (!existing || !canReadAufgabe(context, existing)) {
        throw new RevierarbeitServiceError("Aufgabe wurde nicht gefunden.", 404);
      }

      if (!canModifyAufgabe(context, existing)) {
        throw new RevierarbeitServiceError("Diese Aufgabe darf mit der aktuellen Rolle nicht geändert werden.", 403);
      }

      const now = getNow();
      const patch: AufgabeRepositoryPatch = {
        ...input,
        completedAt: resolveCompletedAt(existing, input.status, now),
        updatedAt: now
      };
      const updated = await repository.updateAufgabe(context.revierId, aufgabeId, patch);

      if (!updated) {
        throw new RevierarbeitServiceError("Aufgabe wurde nicht gefunden.", 404);
      }

      return updated;
    },

    async updateReviermeldung(
      context: RequestContext,
      reviermeldungId: string,
      input: UpdateReviermeldungInput
    ): Promise<Reviermeldung> {
      assertMutationsEnabled(useDemoStore);

      const existing = await repository.findReviermeldung(context.revierId, reviermeldungId);

      if (!existing) {
        throw new RevierarbeitServiceError("Reviermeldung wurde nicht gefunden.", 404);
      }

      if (!canModifyReviermeldung(context, existing)) {
        throw new RevierarbeitServiceError("Diese Reviermeldung darf mit der aktuellen Rolle nicht geändert werden.", 403);
      }

      const patch: ReviermeldungRepositoryPatch = {
        ...input,
        updatedAt: getNow()
      };
      const updated = await repository.updateReviermeldung(context.revierId, reviermeldungId, patch);

      if (!updated) {
        throw new RevierarbeitServiceError("Reviermeldung wurde nicht gefunden.", 404);
      }

      return updated;
    }
  };
}

const defaultService = createRevierarbeitService();

export async function createAufgabe(context: RequestContext, input: CreateAufgabeInput) {
  return defaultService.createAufgabe(context, input);
}

export async function createReviermeldung(context: RequestContext, input: CreateReviermeldungInput) {
  return defaultService.createReviermeldung(context, input);
}

export async function getAufgabe(context: RequestContext, aufgabeId: string) {
  return defaultService.getAufgabe(context, aufgabeId);
}

export async function getReviermeldung(context: RequestContext, reviermeldungId: string) {
  return defaultService.getReviermeldung(context, reviermeldungId);
}

export async function listAufgaben(context: RequestContext) {
  return defaultService.listAufgaben(context);
}

export async function listReviermeldungen(context: RequestContext) {
  return defaultService.listReviermeldungen(context);
}

export async function updateAufgabe(context: RequestContext, aufgabeId: string, input: UpdateAufgabeInput) {
  return defaultService.updateAufgabe(context, aufgabeId, input);
}

export async function updateReviermeldung(
  context: RequestContext,
  reviermeldungId: string,
  input: UpdateReviermeldungInput
) {
  return defaultService.updateReviermeldung(context, reviermeldungId, input);
}

function assertMutationsEnabled(useDemoStore: boolean) {
  if (useDemoStore) {
    throw new RevierarbeitServiceError("Revierarbeit-Mutationen benötigen eine aktive Datenbank.", 503);
  }
}

function canReadAufgabe(context: RequestContext, entry: Aufgabe) {
  return (
    canManageRevierarbeit(context.role) ||
    entry.createdByMembershipId === context.membershipId ||
    entry.assigneeMembershipIds.includes(context.membershipId)
  );
}

function canModifyAufgabe(context: RequestContext, entry: Aufgabe) {
  return (
    canManageRevierarbeit(context.role) ||
    entry.createdByMembershipId === context.membershipId ||
    entry.assigneeMembershipIds.includes(context.membershipId)
  );
}

function canModifyReviermeldung(context: RequestContext, entry: Reviermeldung) {
  return canManageRevierarbeit(context.role) || entry.createdByMembershipId === context.membershipId;
}

function canManageRevierarbeit(role: Role) {
  return canRoleAccess(role, "revierarbeit-manage");
}

function resolveCompletedAt(existing: Aufgabe, nextStatus: Aufgabe["status"] | undefined, now: string) {
  if (nextStatus === "erledigt") {
    return existing.completedAt ?? now;
  }

  if (nextStatus && existing.status === "erledigt") {
    return null;
  }

  return undefined;
}
