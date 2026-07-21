import {
  ASSIGNABLE_MEMBER_ROLES,
  rolesForFeature,
  type AuthSessionResponse,
  type MembershipSummary,
  type PlatformAuditAction,
  type PlatformAuditEntry,
  type PlatformUserListResponse,
  type PlatformUserSummary,
  type UpdatePlatformMembershipPayload,
  type UpdatePlatformUserPayload
} from "@hege/domain";
import { demoData } from "@hege/domain";
import { desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import type { RequestContext } from "../../auth/context";
import {
  assertRole,
  createImpersonatedSession,
  endImpersonatedSession
} from "../../auth/service";
import { getDb } from "../../db/client";
import {
  memberships,
  platformAuditLog,
  reviere,
  users,
  type MembershipRecord,
  type UserRecord
} from "../../db/schema";
import { getServerEnv } from "../../env";
import { RouteError } from "../../http/errors";
import { toIsoTimestamp } from "../../http/timestamps";

const PLATFORM_ADMIN_ROLES = rolesForFeature("platform-users-manage");
const AUDIT_LIMIT = 30;

export async function listPlatformUsers(context: RequestContext): Promise<PlatformUserListResponse> {
  assertPlatformAdminContext(context);

  if (getServerEnv().useDemoStore) {
    return {
      users: mapDemoUsers(),
      audit: []
    };
  }

  const db = getDb();
  const [userRows, membershipRows, revierRows, auditRows] = await Promise.all([
    db.select().from(users),
    db.select().from(memberships),
    db.select().from(reviere),
    db.select().from(platformAuditLog).orderBy(desc(platformAuditLog.createdAt)).limit(AUDIT_LIMIT)
  ]);
  const usersById = new Map(userRows.map((entry) => [entry.id, entry]));
  const reviereById = new Map(revierRows.map((entry) => [entry.id, entry]));

  return {
    users: userRows
      .map((entry) =>
        toPlatformUserSummary(
          entry,
          membershipRows.filter((membership) => membership.userId === entry.id),
          reviereById
        )
      )
      .sort((left, right) => left.user.name.localeCompare(right.user.name, "de-AT")),
    audit: auditRows.map((entry) => toPlatformAuditEntry(entry, usersById))
  };
}

export async function updatePlatformUser(
  context: RequestContext,
  userId: string,
  payload: UpdatePlatformUserPayload
): Promise<PlatformUserSummary> {
  assertPlatformAdminContext(context);
  assertWritableStore();

  const db = getDb();
  const [existing] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!existing) {
    throw new RouteError("Benutzer wurde nicht gefunden.", 404, "not-found");
  }

  if (payload.disabled === true && userId === context.userId) {
    throw new RouteError("Das eigene Plattform-Admin-Konto kann nicht deaktiviert werden.", 409, "conflict");
  }

  const update = buildUserUpdate(payload);
  if (Object.keys(update).length === 0) {
    throw new RouteError("Es wurden keine Änderungen übergeben.", 400, "validation-error");
  }

  let updated: UserRecord | undefined;
  try {
    updated = await db.transaction(async (tx) => {
      const [row] = await tx.update(users).set(update).where(eq(users.id, userId)).returning();
      if (!row) {
        throw new RouteError("Benutzer konnte nicht aktualisiert werden.", 500, "internal-error");
      }

      const action: PlatformAuditAction =
        payload.disabled === true && !existing.disabledAt
          ? "user-disabled"
          : payload.disabled === false && existing.disabledAt
            ? "user-enabled"
            : "user-updated";
      await tx.insert(platformAuditLog).values(
        toAuditValues({ action, actorUserId: context.userId, targetUserId: userId })
      );
      return row;
    });
  } catch (error) {
    throwUniqueUserError(error);
  }
  if (!updated) {
    throw new RouteError("Benutzer konnte nicht aktualisiert werden.", 500, "internal-error");
  }

  const membershipRows = await db.select().from(memberships).where(eq(memberships.userId, userId));
  const revierRows = await db.select().from(reviere);
  return toPlatformUserSummary(
    updated,
    membershipRows,
    new Map(revierRows.map((entry) => [entry.id, entry]))
  );
}

export async function updatePlatformMembership(
  context: RequestContext,
  userId: string,
  membershipId: string,
  payload: UpdatePlatformMembershipPayload
): Promise<MembershipSummary> {
  assertPlatformAdminContext(context);
  assertWritableStore();

  const db = getDb();
  const [existing] = await db.select().from(memberships).where(eq(memberships.id, membershipId)).limit(1);
  if (!existing || existing.userId !== userId) {
    throw new RouteError("Mitgliedschaft wurde nicht gefunden.", 404, "not-found");
  }

  if (
    existing.id === context.membershipId &&
    payload.role !== undefined &&
    payload.role !== "platform-admin"
  ) {
    throw new RouteError("Die eigene aktive Plattform-Admin-Rolle kann nicht entfernt werden.", 409, "conflict");
  }

  const update: Partial<Pick<MembershipRecord, "role" | "jagdzeichen">> = {};
  if (payload.role !== undefined) {
    if (!(ASSIGNABLE_MEMBER_ROLES as readonly string[]).includes(payload.role)) {
      throw new RouteError("Die Rolle ist ungültig.", 400, "validation-error");
    }
    update.role = payload.role;
  }
  if (payload.jagdzeichen !== undefined) {
    const jagdzeichen = payload.jagdzeichen.trim();
    if (!jagdzeichen) {
      throw new RouteError("Das Jagdzeichen darf nicht leer sein.", 400, "validation-error");
    }
    update.jagdzeichen = jagdzeichen;
  }
  if (Object.keys(update).length === 0) {
    throw new RouteError("Es wurden keine Änderungen übergeben.", 400, "validation-error");
  }

  const updated = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(memberships)
      .set(update)
      .where(eq(memberships.id, membershipId))
      .returning();
    if (!row) {
      throw new RouteError("Mitgliedschaft konnte nicht aktualisiert werden.", 500, "internal-error");
    }
    await tx.insert(platformAuditLog).values(
      toAuditValues({
        action: "membership-updated",
        actorUserId: context.userId,
        targetUserId: userId,
        targetMembershipId: membershipId
      })
    );
    return row;
  });
  if (!updated) {
    throw new RouteError("Mitgliedschaft konnte nicht aktualisiert werden.", 500, "internal-error");
  }

  const [revier] = await db.select().from(reviere).where(eq(reviere.id, updated.revierId)).limit(1);
  if (!revier) {
    throw new RouteError("Revier wurde nicht gefunden.", 404, "not-found");
  }
  return toMembershipSummary(updated, revier.name);
}

export async function startPlatformImpersonation(
  context: RequestContext,
  membershipId: string
): Promise<AuthSessionResponse> {
  assertPlatformAdminContext(context);
  const sessionId = randomUUID();
  const startedAt = new Date().toISOString();
  const session = await createImpersonatedSession(context, membershipId, { sessionId, startedAt });

  if (!getServerEnv().useDemoStore) {
    await writeAudit({
      action: "impersonation-started",
      actorUserId: context.userId,
      targetUserId: session.user.id,
      targetMembershipId: membershipId,
      impersonationSessionId: sessionId
    });
  }
  return session;
}

export async function stopPlatformImpersonation(context: RequestContext): Promise<AuthSessionResponse> {
  if (!context.impersonator) {
    throw new RouteError("Es ist keine Impersonation aktiv.", 409, "conflict");
  }

  const session = await endImpersonatedSession(context);
  if (!getServerEnv().useDemoStore) {
    await writeAudit({
      action: "impersonation-ended",
      actorUserId: context.impersonator.userId,
      targetUserId: context.userId,
      targetMembershipId: context.membershipId,
      impersonationSessionId: context.impersonator.sessionId
    });
  }
  return session;
}

function assertPlatformAdminContext(context: RequestContext) {
  assertRole(context.role, PLATFORM_ADMIN_ROLES);
  if (context.impersonator) {
    throw new RouteError(
      "Plattform-Verwaltung ist während einer Impersonation gesperrt.",
      403,
      "forbidden"
    );
  }
}

function assertWritableStore() {
  if (getServerEnv().useDemoStore) {
    throw new RouteError("Benutzeränderungen sind im Demo-Modus nicht verfügbar.", 409, "conflict");
  }
}

function buildUserUpdate(payload: UpdatePlatformUserPayload): Partial<UserRecord> {
  const update: Partial<UserRecord> = {};
  if (payload.name !== undefined) update.name = requireText(payload.name, "Name");
  if (payload.email !== undefined) update.email = normalizeEmail(payload.email);
  if (payload.phone !== undefined) update.phone = requireText(payload.phone, "Telefon");
  if (payload.username !== undefined) update.username = normalizeUsername(payload.username);
  if (payload.disabled !== undefined) update.disabledAt = payload.disabled ? new Date().toISOString() : null;
  return update;
}

function requireText(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new RouteError(`${label} darf nicht leer sein.`, 400, "validation-error");
  }
  return normalized;
}

function normalizeEmail(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new RouteError("Die E-Mail-Adresse ist ungültig.", 400, "validation-error");
  }
  return normalized;
}

function normalizeUsername(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,64}$/.test(normalized)) {
    throw new RouteError(
      "Der Benutzername muss 3 bis 64 Zeichen lang sein und darf nur Kleinbuchstaben, Zahlen, Punkt, Bindestrich und Unterstrich enthalten.",
      400,
      "validation-error"
    );
  }
  return normalized;
}

function toPlatformUserSummary(
  user: UserRecord,
  membershipRows: MembershipRecord[],
  reviereById: Map<string, { id: string; name: string }>
): PlatformUserSummary {
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      username: user.username
    },
    disabledAt: user.disabledAt ? toIsoTimestamp(user.disabledAt) : undefined,
    memberships: membershipRows
      .map((membership) =>
        toMembershipSummary(
          membership,
          reviereById.get(membership.revierId)?.name ?? "Unbekanntes Revier"
        )
      )
      .sort((left, right) => left.revierName.localeCompare(right.revierName, "de-AT"))
  };
}

function toMembershipSummary(membership: MembershipRecord, revierName: string): MembershipSummary {
  return {
    id: membership.id,
    revierId: membership.revierId,
    role: membership.role,
    jagdzeichen: membership.jagdzeichen,
    revierName
  };
}

function mapDemoUsers(): PlatformUserSummary[] {
  return demoData.users
    .map((user) => ({
      user,
      memberships: demoData.memberships
        .filter((membership) => membership.userId === user.id)
        .map((membership) => ({
          id: membership.id,
          revierId: membership.revierId,
          role: membership.role,
          jagdzeichen: membership.jagdzeichen,
          revierName:
            demoData.reviere.find((revier) => revier.id === membership.revierId)?.name ??
            "Unbekanntes Revier"
        }))
    }))
    .sort((left, right) => left.user.name.localeCompare(right.user.name, "de-AT"));
}

function toPlatformAuditEntry(
  entry: typeof platformAuditLog.$inferSelect,
  usersById: Map<string, UserRecord>
): PlatformAuditEntry {
  return {
    id: entry.id,
    action: entry.action,
    actorUserId: entry.actorUserId,
    actorName: usersById.get(entry.actorUserId)?.name ?? "Unbekannt",
    targetUserId: entry.targetUserId ?? undefined,
    targetName: entry.targetUserId ? usersById.get(entry.targetUserId)?.name ?? "Unbekannt" : undefined,
    targetMembershipId: entry.targetMembershipId ?? undefined,
    impersonationSessionId: entry.impersonationSessionId ?? undefined,
    createdAt: toIsoTimestamp(entry.createdAt)
  };
}

async function writeAudit(entry: {
  action: PlatformAuditAction;
  actorUserId: string;
  targetUserId?: string;
  targetMembershipId?: string;
  impersonationSessionId?: string;
}) {
  await getDb().insert(platformAuditLog).values(toAuditValues(entry));
}

function toAuditValues(entry: {
  action: PlatformAuditAction;
  actorUserId: string;
  targetUserId?: string;
  targetMembershipId?: string;
  impersonationSessionId?: string;
}) {
  return {
    id: `audit-${randomUUID()}`,
    action: entry.action,
    actorUserId: entry.actorUserId,
    targetUserId: entry.targetUserId ?? null,
    targetMembershipId: entry.targetMembershipId ?? null,
    impersonationSessionId: entry.impersonationSessionId ?? null,
    createdAt: new Date().toISOString()
  };
}

function throwUniqueUserError(error: unknown): never {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  ) {
    throw new RouteError("E-Mail-Adresse oder Benutzername ist bereits vergeben.", 409, "conflict");
  }
  throw error;
}
