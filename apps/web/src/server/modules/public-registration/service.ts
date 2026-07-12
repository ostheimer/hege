import type {
  AuthSessionResponse,
  CompleteRevierSetupPayload,
  Membership,
  MembershipSummary,
  PublicRegistrationPayload,
  Revier,
  Role,
  User
} from "@hege/domain";
import { rolesForFeature } from "@hege/domain";
import { eq, like, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { hashPassword } from "../../auth/passwords";
import { assertRole } from "../../auth/service";
import type { RequestContext } from "../../auth/context";
import { getDb } from "../../db/client";
import { memberships, reviere, users } from "../../db/schema";
import { RouteError } from "../../http/errors";
import { issueSessionTokens } from "../../auth/tokens";
import { isSelfServePlanKey } from "../../../lib/public-site";

const AUSTRIA_CENTER_PLACEHOLDER = {
  lat: 48.234913,
  lng: 16.413725,
  label: "Austria Center Wien"
};

export async function registerPublicAccount(payload: PublicRegistrationPayload): Promise<AuthSessionResponse> {
  if (!isSelfServePlanKey(payload.planKey)) {
    throw new RouteError("planKey muss starter oder revier sein.", 400, "validation-error");
  }

  const db = getDb();
  const userId = `user-${randomUUID()}`;
  const revierId = `revier-${randomUUID()}`;
  const membershipId = `member-${randomUUID()}`;
  const now = new Date().toISOString();
  const normalizedEmail = payload.email.trim().toLowerCase();
  const normalizedUsername = payload.username.trim().toLowerCase();
  const userName = `${payload.firstName.trim()} ${payload.lastName.trim()}`.trim();
  const tenantKey = await resolveUniqueTenantKey(db, payload.revierName);

  try {
    await db.transaction(async (tx) => {
      await tx.insert(users).values({
        id: userId,
        name: userName,
        phone: payload.phone.trim(),
        email: normalizedEmail,
        username: normalizedUsername,
        passwordHash: hashPassword(payload.pin)
      });

      await tx.insert(reviere).values({
        id: revierId,
        tenantKey,
        name: payload.revierName.trim(),
        bundesland: payload.bundesland.trim(),
        bezirk: payload.bezirk.trim(),
        flaecheHektar: 0,
        zentrumLat: AUSTRIA_CENTER_PLACEHOLDER.lat,
        zentrumLng: AUSTRIA_CENTER_PLACEHOLDER.lng,
        zentrumLabel: AUSTRIA_CENTER_PLACEHOLDER.label
      });

      await tx.insert(memberships).values({
        id: membershipId,
        userId,
        revierId,
        role: "revier-admin",
        jagdzeichen: payload.jagdzeichen.trim(),
        pushEnabled: false
      });
    });
  } catch (error) {
    if (isUniqueViolationError(error)) {
      throw new RouteError("E-Mail, Benutzername oder Reviername ist bereits vergeben.", 422, "validation-error");
    }

    throw error;
  }

  const user: User = {
    id: userId,
    name: userName,
    phone: payload.phone.trim(),
    email: normalizedEmail,
    username: normalizedUsername
  };

  const membership: Membership = {
    id: membershipId,
    userId,
    revierId,
    role: "revier-admin",
    jagdzeichen: payload.jagdzeichen.trim(),
    pushEnabled: false
  };

  const revier: Revier = {
    id: revierId,
    tenantKey,
    name: payload.revierName.trim(),
    bundesland: payload.bundesland.trim(),
    bezirk: payload.bezirk.trim(),
    flaecheHektar: 0,
    zentrum: {
      lat: AUSTRIA_CENTER_PLACEHOLDER.lat,
      lng: AUSTRIA_CENTER_PLACEHOLDER.lng,
      label: AUSTRIA_CENTER_PLACEHOLDER.label
    },
    setupCompletedAt: undefined
  };

  const availableMemberships: MembershipSummary[] = [
    {
      id: membershipId,
      revierId,
      role: "revier-admin",
      jagdzeichen: payload.jagdzeichen.trim(),
      revierName: payload.revierName.trim()
    }
  ];

  return {
    user,
    membership,
    revier,
    activeRevierId: revierId,
    setupRequired: true,
    availableMemberships,
    tokens: issueSessionTokens({
      userId,
      membershipId,
      revierId,
      role: "revier-admin"
    })
  };
}

export async function completeActiveRevierSetup(
  context: RequestContext,
  payload: CompleteRevierSetupPayload
): Promise<void> {
  assertRole(context.role, rolesForFeature("members-manage"));

  const db = getDb();
  const [current] = await db.select().from(reviere).where(eq(reviere.id, context.revierId)).limit(1);

  if (!current) {
    throw new RouteError("Revier wurde nicht gefunden.", 404, "not-found");
  }

  if (current.setupCompletedAt) {
    throw new RouteError("Das Revier-Setup wurde bereits abgeschlossen.", 409, "conflict");
  }

  await db
    .update(reviere)
    .set({
      name: payload.revierName.trim(),
      bundesland: payload.bundesland.trim(),
      bezirk: payload.bezirk.trim(),
      flaecheHektar: payload.flaecheHektar,
      setupCompletedAt: new Date().toISOString()
    })
    .where(eq(reviere.id, context.revierId));
}

async function resolveUniqueTenantKey(db: ReturnType<typeof getDb>, revierName: string) {
  const baseKey = normalizeTenantKey(revierName);
  const candidates = await db
    .select({ tenantKey: reviere.tenantKey })
    .from(reviere)
    .where(or(eq(reviere.tenantKey, baseKey), like(reviere.tenantKey, `${baseKey}-%`)));
  const usedKeys = new Set(candidates.map((entry) => entry.tenantKey));

  if (!usedKeys.has(baseKey)) {
    return baseKey;
  }

  let suffix = 2;
  while (usedKeys.has(`${baseKey}-${suffix}`)) {
    suffix += 1;
  }

  return `${baseKey}-${suffix}`;
}

function normalizeTenantKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\u00e4/g, "ae")
    .replace(/\u00f6/g, "oe")
    .replace(/\u00fc/g, "ue")
    .replace(/\u00df/g, "ss")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 48) || "revier";
}

function isUniqueViolationError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "23505"
  );
}
