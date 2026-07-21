import type {
  AuthContextResponse,
  AuthSessionResponse,
  ChangePinPayload,
  LoginPayload,
  Membership,
  MembershipSummary,
  RefreshSessionPayload,
  Revier,
  Role,
  User
} from "@hege/domain";
import { demoData, rolesForFeature } from "@hege/domain";
import { eq, or, sql } from "drizzle-orm";

import { getDb, type HegeDb } from "../db/client";
import { isMissingColumnError } from "../db/compat";
import { memberships, reviere, type RevierRecord, users } from "../db/schema";
import { getServerEnv } from "../env";
import { RouteError } from "../http/errors";
import { normalizeDeAtVisibleText } from "../text/de-at";
import { hashPassword, verifyPassword } from "./passwords";
import {
  issueSessionTokens,
  type ImpersonatorTokenContext,
  type SessionTokenContext,
  verifyRefreshToken
} from "./tokens";

interface AuthenticatedMembership extends Membership {
  revier: Revier;
}

interface DemoUserRecord extends User {
  passwordHash: string;
}

const PLATFORM_IMPERSONATOR_ROLES = rolesForFeature("platform-users-impersonate");

export async function login(payload: LoginPayload): Promise<AuthSessionResponse> {
  if (getServerEnv().useDemoStore) {
    return loginAgainstDemoStore(payload);
  }

  const normalizedIdentifier = normalizeIdentifier(payload.identifier);

  if (isKnownSeedIdentifier(normalizedIdentifier)) {
    // During the live-test phase, seeded accounts should follow code changes
    // without a one-off database migration for every role or revier update.
    await syncKnownSeedAuthData();
  }

  let user = await loadDbUserByIdentifier(normalizedIdentifier);
  let isValidPin = user ? verifyPassword(payload.pin, user.passwordHash) : false;

  if ((!user || !isValidPin) && isKnownSeedIdentifier(normalizedIdentifier)) {
    await syncKnownSeedAuthData();
    user = await loadDbUserByIdentifier(normalizedIdentifier);
    isValidPin = user ? verifyPassword(payload.pin, user.passwordHash) : false;
  }

  if (!user || !isValidPin || user.disabledAt) {
    throw new RouteError("E-Mail, Benutzername oder PIN ist ungültig.", 401, "unauthenticated");
  }

  const membershipsForUser = await loadMembershipsForUser(user.id);
  const activeMembership = resolveActiveMembership(membershipsForUser, payload.membershipId);

  return buildAuthenticatedSession({
    user,
    activeMembership,
    allMemberships: membershipsForUser
  });
}

/**
 * Setzt die Login-PIN des angemeldeten Users neu. Verlangt die aktuelle
 * PIN als Besitznachweis (gleiche Fehlermeldung-Semantik wie login: bei
 * falscher PIN 401). Der Demo-Store ist read-only — dort lehnen wir ab,
 * statt eine Aenderung vorzutaeuschen, die der naechste Prozess-Start
 * verwirft.
 */
export async function changePin(userId: string, payload: ChangePinPayload): Promise<void> {
  if (getServerEnv().useDemoStore) {
    throw new RouteError("Die PIN-Änderung ist im Demo-Modus nicht verfügbar.", 400, "validation-error");
  }

  const user = await loadDbUserById(userId);

  if (!user || !verifyPassword(payload.currentPin, user.passwordHash)) {
    throw new RouteError("Die aktuelle PIN ist ungültig.", 401, "unauthenticated");
  }

  await getDb()
    .update(users)
    .set({ passwordHash: hashPassword(payload.newPin) })
    .where(eq(users.id, user.id));
}

export async function refreshSession(payload: RefreshSessionPayload): Promise<AuthSessionResponse> {
  const token = payload.refreshToken;

  if (!token) {
    throw new RouteError("Refresh-Token fehlt.", 401, "unauthenticated");
  }

  const tokenContext = verifyRefreshToken(token);

  if (getServerEnv().useDemoStore) {
    const user = loadDemoUser(tokenContext.userId);
    const membershipsForUser = loadDemoMembershipsForUser(user.id);
    const activeMembership = resolveActiveMembership(
      membershipsForUser,
      tokenContext.impersonator ? tokenContext.membershipId : payload.membershipId ?? tokenContext.membershipId
    );
    const impersonatorUser = tokenContext.impersonator
      ? validateDemoImpersonator(tokenContext.impersonator)
      : undefined;

    return buildAuthenticatedSession({
      user,
      activeMembership,
      allMemberships: membershipsForUser,
      impersonator: tokenContext.impersonator,
      impersonatorUser
    });
  }

  const user = await loadDbUserById(tokenContext.userId);

  if (!user || user.disabledAt) {
    throw new RouteError("Benutzer wurde nicht gefunden.", 401, "unauthenticated");
  }

  const membershipsForUser = await loadMembershipsForUser(user.id);
  const activeMembership = resolveActiveMembership(
    membershipsForUser,
    tokenContext.impersonator ? tokenContext.membershipId : payload.membershipId ?? tokenContext.membershipId
  );
  const impersonatorUser = tokenContext.impersonator
    ? await validateDbImpersonator(tokenContext.impersonator)
    : undefined;

  return buildAuthenticatedSession({
    user,
    activeMembership,
    allMemberships: membershipsForUser,
    impersonator: tokenContext.impersonator,
    impersonatorUser
  });
}

export async function resolveAuthContext(context: SessionTokenContext): Promise<AuthContextResponse> {
  if (getServerEnv().useDemoStore) {
    const user = loadDemoUser(context.userId);
    const membershipsForUser = loadDemoMembershipsForUser(user.id);
    const activeMembership = resolveActiveMembership(membershipsForUser, context.membershipId);
    const impersonatorUser = context.impersonator
      ? validateDemoImpersonator(context.impersonator)
      : undefined;

    return toAuthContextResponse(
      user,
      activeMembership,
      membershipsForUser,
      context.impersonator,
      impersonatorUser
    );
  }

  const user = await loadDbUserById(context.userId);

  if (!user || user.disabledAt) {
    throw new RouteError("Benutzer wurde nicht gefunden.", 401, "unauthenticated");
  }

  const membershipsForUser = await loadMembershipsForUser(user.id);
  const activeMembership = resolveActiveMembership(membershipsForUser, context.membershipId);
  const impersonatorUser = context.impersonator
    ? await validateDbImpersonator(context.impersonator)
    : undefined;

  return toAuthContextResponse(
    user,
    activeMembership,
    membershipsForUser,
    context.impersonator,
    impersonatorUser
  );
}

export async function validateSessionContext(
  context: SessionTokenContext
): Promise<SessionTokenContext> {
  if (getServerEnv().useDemoStore) {
    const user = loadDemoUser(context.userId);
    const membership = resolveActiveMembership(loadDemoMembershipsForUser(user.id), context.membershipId);
    assertTokenMatchesMembership(context, membership);
    if (context.impersonator) validateDemoImpersonator(context.impersonator);
    return context;
  }

  const user = await loadDbUserById(context.userId);
  if (!user || user.disabledAt) {
    throw new RouteError("Anmeldung erforderlich.", 401, "unauthenticated");
  }

  const membership = await loadDbMembershipById(context.membershipId);
  if (!membership || membership.userId !== user.id) {
    throw new RouteError("Anmeldung erforderlich.", 401, "unauthenticated");
  }
  assertTokenMatchesMembership(context, membership);
  if (context.impersonator) await validateDbImpersonator(context.impersonator);
  return context;
}

export async function createImpersonatedSession(
  actorContext: SessionTokenContext,
  targetMembershipId: string,
  impersonation: { sessionId: string; startedAt: string }
): Promise<AuthSessionResponse> {
  if (actorContext.impersonator) {
    throw new RouteError("Eine laufende Impersonation kann nicht verschachtelt werden.", 409, "conflict");
  }

  assertRole(actorContext.role, PLATFORM_IMPERSONATOR_ROLES);

  if (getServerEnv().useDemoStore) {
    const actor = loadDemoUser(actorContext.userId);
    const actorMembership = resolveActiveMembership(
      loadDemoMembershipsForUser(actor.id),
      actorContext.membershipId
    );
    assertRole(actorMembership.role, PLATFORM_IMPERSONATOR_ROLES);

    const targetMembership = loadDemoMembershipById(targetMembershipId);
    const targetUser = loadDemoUser(targetMembership.userId);
    assertValidImpersonationTarget(actor.id, targetUser.id, targetMembership.role);

    const impersonator = toImpersonatorTokenContext(actorMembership, impersonation);
    return buildAuthenticatedSession({
      user: targetUser,
      activeMembership: targetMembership,
      allMemberships: loadDemoMembershipsForUser(targetUser.id),
      impersonator,
      impersonatorUser: actor
    });
  }

  const actor = await loadDbUserById(actorContext.userId);
  if (!actor || actor.disabledAt) {
    throw new RouteError("Plattform-Admin wurde nicht gefunden.", 401, "unauthenticated");
  }

  const actorMembership = resolveActiveMembership(
    await loadMembershipsForUser(actor.id),
    actorContext.membershipId
  );
  assertRole(actorMembership.role, PLATFORM_IMPERSONATOR_ROLES);

  const targetMembership = await loadDbMembershipById(targetMembershipId);
  if (!targetMembership) {
    throw new RouteError("Mitgliedschaft wurde nicht gefunden.", 404, "not-found");
  }

  const targetUser = await loadDbUserById(targetMembership.userId);
  if (!targetUser || targetUser.disabledAt) {
    throw new RouteError("Der Zielbenutzer ist deaktiviert oder wurde nicht gefunden.", 409, "conflict");
  }
  assertValidImpersonationTarget(actor.id, targetUser.id, targetMembership.role);

  const impersonator = toImpersonatorTokenContext(actorMembership, impersonation);
  return buildAuthenticatedSession({
    user: targetUser,
    activeMembership: targetMembership,
    allMemberships: await loadMembershipsForUser(targetUser.id),
    impersonator,
    impersonatorUser: actor
  });
}

export async function endImpersonatedSession(context: SessionTokenContext): Promise<AuthSessionResponse> {
  if (!context.impersonator) {
    throw new RouteError("Es ist keine Impersonation aktiv.", 409, "conflict");
  }

  if (getServerEnv().useDemoStore) {
    const actor = validateDemoImpersonator(context.impersonator);
    const membershipsForUser = loadDemoMembershipsForUser(actor.id);
    const activeMembership = resolveActiveMembership(membershipsForUser, context.impersonator.membershipId);
    return buildAuthenticatedSession({ user: actor, activeMembership, allMemberships: membershipsForUser });
  }

  const actor = await validateDbImpersonator(context.impersonator);
  const membershipsForUser = await loadMembershipsForUser(actor.id);
  const activeMembership = resolveActiveMembership(membershipsForUser, context.impersonator.membershipId);
  return buildAuthenticatedSession({ user: actor, activeMembership, allMemberships: membershipsForUser });
}

export function assertRole(role: Role, allowedRoles: readonly Role[]) {
  if (!allowedRoles.includes(role)) {
    throw new RouteError("Diese Aktion ist für die aktuelle Rolle nicht erlaubt.", 403, "forbidden");
  }
}

export function getDefaultSeedPassword() {
  return getServerEnv().demoPassword;
}

export function createSeedPasswordHash() {
  return hashPassword(getDefaultSeedPassword());
}

async function loginAgainstDemoStore(payload: LoginPayload): Promise<AuthSessionResponse> {
  const normalizedIdentifier = normalizeIdentifier(payload.identifier);
  const user = loadDemoUserByIdentifier(normalizedIdentifier);

  if (!user || !verifyPassword(payload.pin, user.passwordHash)) {
    throw new RouteError("E-Mail, Benutzername oder PIN ist ungültig.", 401, "unauthenticated");
  }

  const membershipsForUser = loadDemoMembershipsForUser(user.id);
  const activeMembership = resolveActiveMembership(membershipsForUser, payload.membershipId);

  return buildAuthenticatedSession({
    user,
    activeMembership,
    allMemberships: membershipsForUser
  });
}

async function loadMembershipsForUser(userId: string): Promise<AuthenticatedMembership[]> {
  const db = getDb();
  const rows = await db.select().from(memberships).where(eq(memberships.userId, userId));

  return Promise.all(
    rows.map(async (entry) => {
      const revier = await loadDbRevierById(entry.revierId);

      if (!revier) {
        throw new RouteError("Revier wurde nicht gefunden.", 401, "unauthenticated");
      }

      return {
        ...entry,
        revier: mapRevierRecordToDomain(revier)
      };
    })
  );
}

function loadDemoMembershipsForUser(userId: string): AuthenticatedMembership[] {
  return demoData.memberships
    .filter((entry) => entry.userId === userId)
    .map((entry) => {
      const revier = demoData.reviere.find((candidate) => candidate.id === entry.revierId);

      if (!revier) {
        throw new RouteError("Revier wurde nicht gefunden.", 401, "unauthenticated");
      }

      return {
        ...entry,
        revier
      };
    });
}

function resolveActiveMembership(
  membershipsForUser: AuthenticatedMembership[],
  membershipId?: string
): AuthenticatedMembership {
  if (membershipsForUser.length === 0) {
    throw new RouteError("Für diesen Benutzer existiert keine aktive Mitgliedschaft.", 403, "forbidden");
  }

  if (membershipId) {
    const match = membershipsForUser.find((entry) => entry.id === membershipId);

    if (!match) {
      throw new RouteError("Die angeforderte Mitgliedschaft gehört nicht zum Benutzer.", 403, "forbidden");
    }

    return match;
  }

  const [firstMembership] = membershipsForUser;

  if (!firstMembership) {
    throw new RouteError("Für diesen Benutzer existiert keine aktive Mitgliedschaft.", 403, "forbidden");
  }

  return firstMembership;
}

function buildAuthenticatedSession({
  user,
  activeMembership,
  allMemberships,
  impersonator,
  impersonatorUser
}: {
  user: User | DbUserRecord;
  activeMembership: AuthenticatedMembership;
  allMemberships: AuthenticatedMembership[];
  impersonator?: ImpersonatorTokenContext;
  impersonatorUser?: User | DbUserRecord;
}): AuthSessionResponse {
  const tokens = issueSessionTokens({
    userId: user.id,
    membershipId: activeMembership.id,
    revierId: activeMembership.revierId,
    role: activeMembership.role,
    impersonator
  });

  return {
    ...toAuthContextResponse(
      user,
      activeMembership,
      allMemberships,
      impersonator,
      impersonatorUser
    ),
    tokens
  };
}

function toAuthContextResponse(
  user: User | DbUserRecord,
  activeMembership: AuthenticatedMembership,
  allMemberships: AuthenticatedMembership[],
  impersonator?: ImpersonatorTokenContext,
  impersonatorUser?: User | DbUserRecord
): AuthContextResponse {
  return {
    user: toSafeUser(user),
    membership: stripAuthenticatedMembership(activeMembership),
    revier: activeMembership.revier,
    activeRevierId: activeMembership.revierId,
    setupRequired: !activeMembership.revier.setupCompletedAt,
    availableMemberships: allMemberships.map(toMembershipSummary),
    impersonation:
      impersonator && impersonatorUser
        ? {
            sessionId: impersonator.sessionId,
            actor: toSafeUser(impersonatorUser),
            startedAt: impersonator.startedAt
          }
        : undefined
  };
}

function toSafeUser(user: User): User {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    username: user.username
  };
}

function stripAuthenticatedMembership(value: AuthenticatedMembership): Membership {
  return {
    id: value.id,
    userId: value.userId,
    revierId: value.revierId,
    role: value.role,
    jagdzeichen: value.jagdzeichen,
    pushEnabled: value.pushEnabled
  };
}

function toMembershipSummary(value: AuthenticatedMembership): MembershipSummary {
  return {
    id: value.id,
    revierId: value.revierId,
    role: value.role,
    jagdzeichen: value.jagdzeichen,
    revierName: value.revier.name
  };
}

function loadDemoUserByIdentifier(identifier: string): DemoUserRecord | undefined {
  return demoUsers.find(
    (entry) => entry.email === identifier || normalizeIdentifier(entry.username ?? "") === identifier
  );
}

function loadDemoUser(userId: string): DemoUserRecord {
  const user = demoUsers.find((entry) => entry.id === userId);

  if (!user) {
    throw new RouteError("Benutzer wurde nicht gefunden.", 401, "unauthenticated");
  }

  return user;
}

function loadDemoMembershipById(membershipId: string): AuthenticatedMembership {
  const membership = demoData.memberships.find((entry) => entry.id === membershipId);

  if (!membership) {
    throw new RouteError("Mitgliedschaft wurde nicht gefunden.", 404, "not-found");
  }

  const revier = demoData.reviere.find((entry) => entry.id === membership.revierId);
  if (!revier) {
    throw new RouteError("Revier wurde nicht gefunden.", 404, "not-found");
  }

  return { ...membership, revier };
}

function validateDemoImpersonator(context: ImpersonatorTokenContext): DemoUserRecord {
  const actor = loadDemoUser(context.userId);
  const membership = resolveActiveMembership(loadDemoMembershipsForUser(actor.id), context.membershipId);
  assertRole(membership.role, PLATFORM_IMPERSONATOR_ROLES);
  return actor;
}

async function validateDbImpersonator(context: ImpersonatorTokenContext): Promise<DbUserRecord> {
  const actor = await loadDbUserById(context.userId);

  if (!actor || actor.disabledAt) {
    throw new RouteError("Plattform-Admin wurde nicht gefunden.", 401, "unauthenticated");
  }

  const membership = resolveActiveMembership(await loadMembershipsForUser(actor.id), context.membershipId);
  assertRole(membership.role, PLATFORM_IMPERSONATOR_ROLES);
  return actor;
}

function assertValidImpersonationTarget(actorUserId: string, targetUserId: string, targetRole: Role) {
  if (actorUserId === targetUserId) {
    throw new RouteError("Das eigene Konto kann nicht impersoniert werden.", 409, "conflict");
  }

  if (targetRole === "platform-admin") {
    throw new RouteError("Plattform-Admins können nicht impersoniert werden.", 409, "conflict");
  }
}

function assertTokenMatchesMembership(
  context: SessionTokenContext,
  membership: AuthenticatedMembership
) {
  if (membership.revierId !== context.revierId || membership.role !== context.role) {
    throw new RouteError("Die Berechtigungen der Sitzung haben sich geändert.", 401, "unauthenticated");
  }
}

function toImpersonatorTokenContext(
  membership: AuthenticatedMembership,
  impersonation: { sessionId: string; startedAt: string }
): ImpersonatorTokenContext {
  return {
    userId: membership.userId,
    membershipId: membership.id,
    revierId: membership.revierId,
    role: membership.role,
    sessionId: impersonation.sessionId,
    startedAt: impersonation.startedAt
  };
}

function normalizeIdentifier(value: string) {
  return value.trim().toLowerCase();
}

function isKnownSeedIdentifier(identifier: string) {
  return demoUsers.some(
    (entry) => normalizeIdentifier(entry.email) === identifier || normalizeIdentifier(entry.username ?? "") === identifier
  );
}

async function loadDbUserByIdentifier(identifier: string): Promise<DbUserRecord | undefined> {
  const db = getDb();

  try {
    const [user] = await db
      .select()
      .from(users)
      .where(or(eq(users.email, identifier), eq(users.username, identifier)))
      .limit(1);

    return user;
  } catch (error) {
    if (
      !isMissingColumnError(error, "users", "username") &&
      !isMissingColumnError(error, "users", "disabled_at")
    ) {
      throw error;
    }

    return loadLegacyDbUserByIdentifier(identifier);
  }
}

async function loadDbUserById(userId: string): Promise<DbUserRecord | undefined> {
  const db = getDb();

  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    return user;
  } catch (error) {
    if (
      !isMissingColumnError(error, "users", "username") &&
      !isMissingColumnError(error, "users", "disabled_at")
    ) {
      throw error;
    }

    return loadLegacyDbUserById(userId);
  }
}

async function loadLegacyDbUserByIdentifier(identifier: string): Promise<DbUserRecord | undefined> {
  const db = getDb();
  const result = await db.execute(sql<LegacyDbUserRow>`
    select
      id,
      name,
      phone,
      email,
      lower(split_part(email, '@', 1)) as username,
      password_hash as "passwordHash"
    from users
    where lower(email) = ${identifier}
      or lower(split_part(email, '@', 1)) = ${identifier}
    limit 1
  `);
  const row = result.rows[0] as LegacyDbUserRow | undefined;

  return row ? mapLegacyDbUserRow(row) : undefined;
}

async function loadLegacyDbUserById(userId: string): Promise<DbUserRecord | undefined> {
  const db = getDb();
  const result = await db.execute(sql<LegacyDbUserRow>`
    select
      id,
      name,
      phone,
      email,
      lower(split_part(email, '@', 1)) as username,
      password_hash as "passwordHash"
    from users
    where id = ${userId}
    limit 1
  `);
  const row = result.rows[0] as LegacyDbUserRow | undefined;

  return row ? mapLegacyDbUserRow(row) : undefined;
}

function mapLegacyDbUserRow(row: LegacyDbUserRow): DbUserRecord {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    username: normalizeIdentifier(row.username),
    passwordHash: row.passwordHash,
    disabledAt: null
  };
}

async function loadDbMembershipById(membershipId: string): Promise<AuthenticatedMembership | undefined> {
  const [membership] = await getDb()
    .select()
    .from(memberships)
    .where(eq(memberships.id, membershipId))
    .limit(1);

  if (!membership) {
    return undefined;
  }

  const revier = await loadDbRevierById(membership.revierId);
  if (!revier) {
    throw new RouteError("Revier wurde nicht gefunden.", 404, "not-found");
  }

  return { ...membership, revier: mapRevierRecordToDomain(revier) };
}

async function syncKnownSeedAuthData() {
  const db = getDb();
  const hasSetupCompletedAtColumn = await hasReviereSetupCompletedAtColumn(db);
  await syncSeedReviere(db, hasSetupCompletedAtColumn);
  const hasUsernameColumn = await hasUsersUsernameColumn(db);
  await syncSeedUsers(db, hasUsernameColumn);
  await syncSeedMemberships(db);
}

async function hasUsersUsernameColumn(db: HegeDb) {
  const result = await db.execute(sql<{ hasUsername: boolean }>`
    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'users'
        and column_name = 'username'
    ) as "hasUsername"
  `);
  const row = result.rows[0] as { hasUsername?: boolean } | undefined;

  return row?.hasUsername === true;
}

async function hasReviereSetupCompletedAtColumn(db: HegeDb) {
  const result = await db.execute(sql<{ hasSetupCompletedAt: boolean }>`
    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'reviere'
        and column_name = 'setup_completed_at'
    ) as "hasSetupCompletedAt"
  `);
  const row = result.rows[0] as { hasSetupCompletedAt?: boolean } | undefined;

  return row?.hasSetupCompletedAt === true;
}

async function syncSeedReviere(db: HegeDb, hasSetupCompletedAtColumn: boolean) {
  for (const revier of demoData.reviere) {
    if (hasSetupCompletedAtColumn) {
      await db.execute(sql`
        insert into reviere (
          id,
          tenant_key,
          name,
          bundesland,
          bezirk,
          flaeche_hektar,
          zentrum_lat,
          zentrum_lng,
          zentrum_label,
          setup_completed_at
        )
        values (
          ${revier.id},
          ${revier.tenantKey},
          ${revier.name},
          ${revier.bundesland},
          ${revier.bezirk},
          ${revier.flaecheHektar},
          ${revier.zentrum.lat},
          ${revier.zentrum.lng},
          ${revier.zentrum.label ?? null},
          ${revier.setupCompletedAt ?? null}
        )
        on conflict (id) do update
        set
          tenant_key = excluded.tenant_key,
          name = excluded.name,
          bundesland = excluded.bundesland,
          bezirk = excluded.bezirk,
          flaeche_hektar = excluded.flaeche_hektar,
          zentrum_lat = excluded.zentrum_lat,
          zentrum_lng = excluded.zentrum_lng,
          zentrum_label = excluded.zentrum_label,
          setup_completed_at = excluded.setup_completed_at
      `);

      continue;
    }

    await db.execute(sql`
      insert into reviere (
        id,
        tenant_key,
        name,
        bundesland,
        bezirk,
        flaeche_hektar,
        zentrum_lat,
        zentrum_lng,
        zentrum_label
      )
      values (
        ${revier.id},
        ${revier.tenantKey},
        ${revier.name},
        ${revier.bundesland},
        ${revier.bezirk},
        ${revier.flaecheHektar},
        ${revier.zentrum.lat},
        ${revier.zentrum.lng},
        ${revier.zentrum.label ?? null}
      )
      on conflict (id) do update
      set
        tenant_key = excluded.tenant_key,
        name = excluded.name,
        bundesland = excluded.bundesland,
        bezirk = excluded.bezirk,
        flaeche_hektar = excluded.flaeche_hektar,
        zentrum_lat = excluded.zentrum_lat,
        zentrum_lng = excluded.zentrum_lng,
        zentrum_label = excluded.zentrum_label
    `);
  }
}

async function loadDbRevierById(revierId: string): Promise<RevierRecord | undefined> {
  const db = getDb();

  try {
    const [revier] = await db.select().from(reviere).where(eq(reviere.id, revierId)).limit(1);

    return revier;
  } catch (error) {
    if (!isMissingColumnError(error, "reviere", "setup_completed_at")) {
      throw error;
    }

    return loadLegacyDbRevierById(revierId);
  }
}

async function loadLegacyDbRevierById(revierId: string): Promise<RevierRecord | undefined> {
  const db = getDb();
  const result = await db.execute(sql<LegacyRevierRow>`
    select
      id,
      tenant_key as "tenantKey",
      name,
      bundesland,
      bezirk,
      flaeche_hektar as "flaecheHektar",
      zentrum_lat as "zentrumLat",
      zentrum_lng as "zentrumLng",
      zentrum_label as "zentrumLabel",
      null::timestamptz as "setupCompletedAt"
    from reviere
    where id = ${revierId}
    limit 1
  `);
  const row = result.rows[0] as LegacyRevierRow | undefined;

  return row ? mapLegacyRevierRow(row) : undefined;
}

function mapLegacyRevierRow(row: LegacyRevierRow): RevierRecord {
  return {
    id: row.id,
    tenantKey: row.tenantKey,
    name: row.name,
    bundesland: row.bundesland,
    bezirk: row.bezirk,
    flaecheHektar: row.flaecheHektar,
    zentrumLat: row.zentrumLat,
    zentrumLng: row.zentrumLng,
    zentrumLabel: row.zentrumLabel,
    setupCompletedAt: row.setupCompletedAt
  };
}

async function syncSeedUsers(db: HegeDb, hasUsernameColumn: boolean) {
  for (const user of demoUsers) {
    if (hasUsernameColumn) {
      await db.execute(sql`
        insert into users (
          id,
          name,
          phone,
          email,
          username,
          password_hash
        )
        values (
          ${user.id},
          ${user.name},
          ${user.phone},
          ${user.email},
          ${user.username ?? normalizeIdentifier(user.email.split("@")[0] ?? user.id)},
          ${user.passwordHash}
        )
        on conflict (id) do update
        set
          name = excluded.name,
          phone = excluded.phone,
          email = excluded.email,
          username = excluded.username,
          password_hash = excluded.password_hash
      `);

      continue;
    }

    await db.execute(sql`
      insert into users (
        id,
        name,
        phone,
        email,
        password_hash
      )
      values (
        ${user.id},
        ${user.name},
        ${user.phone},
        ${user.email},
        ${user.passwordHash}
      )
      on conflict (id) do update
      set
        name = excluded.name,
        phone = excluded.phone,
        email = excluded.email,
        password_hash = excluded.password_hash
    `);
  }
}

async function syncSeedMemberships(db: HegeDb) {
  for (const membership of demoData.memberships) {
    await db.execute(sql`
      insert into memberships (
        id,
        user_id,
        revier_id,
        role,
        jagdzeichen,
        push_enabled
      )
      values (
        ${membership.id},
        ${membership.userId},
        ${membership.revierId},
        ${membership.role},
        ${membership.jagdzeichen},
        ${membership.pushEnabled}
      )
      on conflict (id) do update
      set
        user_id = excluded.user_id,
        revier_id = excluded.revier_id,
        role = excluded.role,
        jagdzeichen = excluded.jagdzeichen,
        push_enabled = excluded.push_enabled
    `);
  }
}

function mapRevierRecordToDomain(record: RevierRecord): Revier {
  return {
    id: record.id,
    tenantKey: record.tenantKey,
    name: normalizeDeAtVisibleText(record.name),
    bundesland: normalizeDeAtVisibleText(record.bundesland),
    bezirk: normalizeDeAtVisibleText(record.bezirk),
    flaecheHektar: record.flaecheHektar,
    setupCompletedAt: record.setupCompletedAt ?? undefined,
    zentrum: {
      lat: record.zentrumLat,
      lng: record.zentrumLng,
      label: normalizeDeAtVisibleText(record.zentrumLabel) ?? undefined
    }
  };
}

const demoUsers: DemoUserRecord[] = demoData.users.map((entry) => ({
  ...entry,
  passwordHash: hashPassword(getDefaultSeedPassword())
}));

type DbUserRecord = typeof users.$inferSelect;

interface LegacyDbUserRow {
  id: string;
  name: string;
  phone: string;
  email: string;
  username: string;
  passwordHash: string;
}

interface LegacyRevierRow {
  id: string;
  tenantKey: string;
  name: string;
  bundesland: string;
  bezirk: string;
  flaecheHektar: number;
  zentrumLat: number;
  zentrumLng: number;
  zentrumLabel: string | null;
  setupCompletedAt: string | null;
}
