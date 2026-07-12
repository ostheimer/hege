import type {
  AcceptInvitationPayload,
  AuthSessionResponse,
  CreateMemberInvitationPayload,
  CreateMemberInvitationResponse,
  MemberInvitation,
  MemberInvitationStatus,
  Membership,
  MembershipSummary,
  Revier,
  Role,
  User
} from "@hege/domain";
import { rolesForFeature } from "@hege/domain";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { hashPassword } from "../../auth/passwords";
import { assertRole } from "../../auth/service";
import type { RequestContext } from "../../auth/context";
import { buildCsv } from "../../csv/escape";
import { getDb } from "../../db/client";
import { memberInvitations, memberships, reviere, users } from "../../db/schema";
import { issueSessionTokens } from "../../auth/tokens";
import { RouteError } from "../../http/errors";
import { sendMail, isMailEnabled } from "../mail/service";
import {
  generateInvitationCode,
  generateInvitationToken,
  hashInvitationSecret,
  normalizeInvitationCode
} from "./codes";

const INVITE_TTL_HOURS = 168; // 7 Tage

const ALLOWED_ROLES: Role[] = ["jaeger", "schriftfuehrer", "ausgeher", "revier-admin"];

const INVITER_ROLES = rolesForFeature("members-manage");

interface CreateInvitationCommand {
  context: RequestContext;
  payload: CreateMemberInvitationPayload;
}

export async function createMemberInvitation(
  command: CreateInvitationCommand
): Promise<CreateMemberInvitationResponse> {
  assertRole(command.context.role, INVITER_ROLES);

  if (!ALLOWED_ROLES.includes(command.payload.role)) {
    throw new RouteError("Ungueltige Rolle fuer Einladung.", 400, "validation-error");
  }

  const firstName = command.payload.firstName.trim();
  const lastName = command.payload.lastName.trim();
  const jagdzeichen = command.payload.jagdzeichen.trim();
  const email = command.payload.email?.trim().toLowerCase() || null;
  const phone = command.payload.phone?.trim() || null;

  if (!firstName || !lastName || !jagdzeichen) {
    throw new RouteError("Vorname, Nachname und Jagdzeichen sind erforderlich.", 400, "validation-error");
  }

  const code = generateInvitationCode();
  const token = generateInvitationToken();
  const codeHash = hashInvitationSecret(normalizeInvitationCode(code));
  const tokenHash = hashInvitationSecret(token);

  const id = `invite-${randomUUID()}`;
  const now = new Date();
  const expires = new Date(now.getTime() + INVITE_TTL_HOURS * 60 * 60 * 1000);

  const db = getDb();

  const [inserted] = await db
    .insert(memberInvitations)
    .values({
      id,
      revierId: command.context.revierId,
      invitedByMembershipId: command.context.membershipId,
      firstName,
      lastName,
      email,
      phone,
      role: command.payload.role,
      jagdzeichen,
      codeHash,
      tokenHash,
      status: "pending",
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString()
    })
    .returning();

  if (!inserted) {
    throw new RouteError("Einladung konnte nicht angelegt werden.", 500, "internal-error");
  }

  let mailSent = false;

  if (command.payload.sendEmail && email && isMailEnabled()) {
    const result = await sendMail({
      to: email,
      subject: `Einladung zur Jagdgesellschaft`,
      text: buildInvitationMailBody({ firstName, code, token })
    });

    if (result.delivered) {
      mailSent = true;
      await db
        .update(memberInvitations)
        .set({ mailSentAt: new Date().toISOString() })
        .where(eq(memberInvitations.id, id));
    }
  }

  return {
    invitation: toMemberInvitation(inserted),
    code,
    token,
    mailSent
  };
}

export async function listMemberInvitations(context: RequestContext): Promise<MemberInvitation[]> {
  assertRole(context.role, INVITER_ROLES);
  const db = getDb();

  const rows = await db
    .select()
    .from(memberInvitations)
    .where(eq(memberInvitations.revierId, context.revierId));

  return rows.map(toMemberInvitation).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * CSV-Export aller Mitglieds-Einladungen im aktiven Revier. Konsistent
 * mit dem Pattern von `exportAnsitzeCsv` und `exportReviereinrichtungenCsv`:
 * Auth wird wie bei `listMemberInvitations` enforciert (nur Inviter-Rollen).
 *
 * Bewusst KEINE Codes im Export — der Code ist eine vertraulich-pendend-
 * verteilte Einmal-Information. Wer ihn nach Versand verlieren wollte,
 * darf die Einladung widerrufen und neu anlegen.
 */
export async function exportMemberInvitationsCsv(context: RequestContext): Promise<string> {
  const invitations = await listMemberInvitations(context);

  return buildCsv(
    [
      "id",
      "vorname",
      "nachname",
      "email",
      "telefon",
      "rolle",
      "jagdzeichen",
      "status",
      "erstellt_am",
      "gueltig_bis",
      "angenommen_am"
    ],
    invitations.map((entry) => [
      entry.id,
      entry.firstName,
      entry.lastName,
      entry.email ?? "",
      entry.phone ?? "",
      entry.role,
      entry.jagdzeichen,
      entry.status,
      entry.createdAt,
      entry.expiresAt,
      entry.acceptedAt ?? ""
    ])
  );
}

export async function revokeMemberInvitation(
  context: RequestContext,
  invitationId: string
): Promise<MemberInvitation> {
  assertRole(context.role, INVITER_ROLES);

  const db = getDb();
  const [existing] = await db
    .select()
    .from(memberInvitations)
    .where(
      and(eq(memberInvitations.id, invitationId), eq(memberInvitations.revierId, context.revierId))
    )
    .limit(1);

  if (!existing) {
    throw new RouteError("Einladung wurde nicht gefunden.", 404, "not-found");
  }

  if (existing.status !== "pending") {
    throw new RouteError(
      "Nur ausstehende Einladungen koennen widerrufen werden.",
      409,
      "conflict"
    );
  }

  const [updated] = await db
    .update(memberInvitations)
    .set({ status: "revoked", revokedAt: new Date().toISOString() })
    .where(eq(memberInvitations.id, invitationId))
    .returning();

  if (!updated) {
    throw new RouteError("Einladung konnte nicht widerrufen werden.", 500, "internal-error");
  }

  return toMemberInvitation(updated);
}

export async function acceptMemberInvitation(
  payload: AcceptInvitationPayload
): Promise<AuthSessionResponse> {
  if (!payload.code && !payload.token) {
    throw new RouteError("Code oder Token ist erforderlich.", 400, "validation-error");
  }

  if (payload.code && payload.token) {
    throw new RouteError(
      "Bitte entweder Code oder Magic-Link nutzen, nicht beides.",
      400,
      "validation-error"
    );
  }

  const pin = (payload.pin ?? "").trim();
  if (!/^[0-9]{4}$/.test(pin)) {
    throw new RouteError("PIN muss vierstellig und numerisch sein.", 400, "validation-error");
  }

  const db = getDb();
  const lookupHash = payload.code
    ? hashInvitationSecret(normalizeInvitationCode(payload.code))
    : hashInvitationSecret(payload.token!);

  const lookupColumn = payload.code ? memberInvitations.codeHash : memberInvitations.tokenHash;

  const [invitation] = await db
    .select()
    .from(memberInvitations)
    .where(eq(lookupColumn, lookupHash))
    .limit(1);

  if (!invitation) {
    throw new RouteError("Einladung nicht gefunden oder bereits eingeloest.", 404, "not-found");
  }

  if (invitation.status !== "pending") {
    throw new RouteError(
      `Diese Einladung kann nicht mehr verwendet werden (Status: ${invitation.status}).`,
      409,
      "conflict"
    );
  }

  if (new Date(invitation.expiresAt).getTime() <= Date.now()) {
    await db
      .update(memberInvitations)
      .set({ status: "expired" })
      .where(eq(memberInvitations.id, invitation.id));
    throw new RouteError("Diese Einladung ist abgelaufen.", 410, "conflict");
  }

  const userId = `user-${randomUUID()}`;
  const membershipId = `member-${randomUUID()}`;
  const now = new Date().toISOString();
  const userName = `${invitation.firstName} ${invitation.lastName}`.trim();
  const phone = (payload.phone?.trim() || invitation.phone || "").trim();
  const email = invitation.email ?? `${userId}@invite.local`;
  const baseUsername = (payload.username?.trim() || invitation.firstName.trim()).toLowerCase();
  const username = await resolveUniqueUsername(db, baseUsername);

  try {
    await db.transaction(async (tx) => {
      await tx.insert(users).values({
        id: userId,
        name: userName,
        phone: phone || "—",
        email,
        username,
        passwordHash: hashPassword(pin)
      });

      await tx.insert(memberships).values({
        id: membershipId,
        userId,
        revierId: invitation.revierId,
        role: invitation.role,
        jagdzeichen: invitation.jagdzeichen,
        pushEnabled: false
      });

      await tx
        .update(memberInvitations)
        .set({
          status: "accepted",
          acceptedAt: now,
          acceptedByUserId: userId
        })
        .where(eq(memberInvitations.id, invitation.id));
    });
  } catch (error) {
    if (isUniqueViolationError(error)) {
      throw new RouteError(
        "Die Einladungsdaten kollidieren mit einem bestehenden Benutzer.",
        422,
        "validation-error"
      );
    }
    throw error;
  }

  const [revierRow] = await db.select().from(reviere).where(eq(reviere.id, invitation.revierId)).limit(1);

  if (!revierRow) {
    throw new RouteError("Revier wurde nicht gefunden.", 404, "not-found");
  }

  const user: User = {
    id: userId,
    name: userName,
    phone: phone || "—",
    email,
    username
  };

  const membership: Membership = {
    id: membershipId,
    userId,
    revierId: invitation.revierId,
    role: invitation.role,
    jagdzeichen: invitation.jagdzeichen,
    pushEnabled: false
  };

  const revier: Revier = {
    id: revierRow.id,
    tenantKey: revierRow.tenantKey,
    name: revierRow.name,
    bundesland: revierRow.bundesland,
    bezirk: revierRow.bezirk,
    flaecheHektar: revierRow.flaecheHektar,
    zentrum: {
      lat: revierRow.zentrumLat,
      lng: revierRow.zentrumLng,
      label: revierRow.zentrumLabel ?? undefined
    },
    setupCompletedAt: revierRow.setupCompletedAt ?? undefined
  };

  const availableMemberships: MembershipSummary[] = [
    {
      id: membershipId,
      revierId: invitation.revierId,
      role: invitation.role,
      jagdzeichen: invitation.jagdzeichen,
      revierName: revierRow.name
    }
  ];

  return {
    user,
    membership,
    revier,
    activeRevierId: invitation.revierId,
    setupRequired: false,
    availableMemberships,
    tokens: issueSessionTokens({
      userId,
      membershipId,
      revierId: invitation.revierId,
      role: invitation.role
    })
  };
}

function toMemberInvitation(row: typeof memberInvitations.$inferSelect): MemberInvitation {
  return {
    id: row.id,
    revierId: row.revierId,
    invitedByMembershipId: row.invitedByMembershipId,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    role: row.role,
    jagdzeichen: row.jagdzeichen,
    status: row.status as MemberInvitationStatus,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    acceptedAt: row.acceptedAt ?? undefined,
    revokedAt: row.revokedAt ?? undefined,
    mailSentAt: row.mailSentAt ?? undefined
  };
}

function buildInvitationMailBody({
  firstName,
  code,
  token
}: {
  firstName: string;
  code: string;
  token: string;
}) {
  return [
    `Hallo ${firstName},`,
    "",
    "du wurdest zur Jagdgesellschaft eingeladen.",
    "",
    `Code: ${code}`,
    `Direkt-Link: https://hege.app/einladung/${token}`,
    "",
    "Der Code gilt 7 Tage und kann nur einmal verwendet werden.",
    "",
    "Waidmannsheil,",
    "die Revierleitung"
  ].join("\n");
}

async function resolveUniqueUsername(db: ReturnType<typeof getDb>, base: string): Promise<string> {
  const sanitized = base
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 32) || "mitglied";

  for (let suffix = 0; suffix < 100; suffix += 1) {
    const candidate = suffix === 0 ? sanitized : `${sanitized}${suffix}`;
    const [hit] = await db.select({ id: users.id }).from(users).where(eq(users.username, candidate)).limit(1);
    if (!hit) {
      return candidate;
    }
  }

  return `${sanitized}-${randomUUID().slice(0, 6)}`;
}

function isUniqueViolationError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "23505"
  );
}
