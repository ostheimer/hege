import type { AuthTokens, Role } from "@hege/domain";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import { getServerEnv } from "../env";
import { RouteError } from "../http/errors";

const ACCESS_TTL_SECONDS = 60 * 60 * 12;
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30;

export const ACCESS_TOKEN_COOKIE = "hege_access_token";
export const REFRESH_TOKEN_COOKIE = "hege_refresh_token";

export interface SessionTokenContext {
  userId: string;
  membershipId: string;
  revierId: string;
  role: Role;
  impersonator?: ImpersonatorTokenContext;
}

export interface ImpersonatorTokenContext {
  userId: string;
  membershipId: string;
  revierId: string;
  role: Role;
  sessionId: string;
  startedAt: string;
}

interface TokenPayload extends SessionTokenContext {
  kind: "access" | "refresh";
  exp: number;
  iat: number;
  sessionId: string;
}

export function issueSessionTokens(context: SessionTokenContext): AuthTokens {
  const issuedAt = nowInSeconds();
  const sessionId = randomUUID();
  const accessExpiresAt = issuedAt + ACCESS_TTL_SECONDS;
  const refreshExpiresAt = issuedAt + REFRESH_TTL_SECONDS;

  return {
    accessToken: signToken({
      ...context,
      kind: "access",
      exp: accessExpiresAt,
      iat: issuedAt,
      sessionId
    }),
    refreshToken: signToken({
      ...context,
      kind: "refresh",
      exp: refreshExpiresAt,
      iat: issuedAt,
      sessionId
    }),
    expiresAt: new Date(accessExpiresAt * 1000).toISOString(),
    refreshExpiresAt: new Date(refreshExpiresAt * 1000).toISOString()
  };
}

export function verifyAccessToken(token: string) {
  return verifyToken(token, "access");
}

export function verifyRefreshToken(token: string) {
  return verifyToken(token, "refresh");
}

export function createCookieHeaders(tokens: AuthTokens): string[] {
  return [
    serializeCookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, Math.max(1, ttlFromIsoString(tokens.expiresAt))),
    serializeCookie(
      REFRESH_TOKEN_COOKIE,
      tokens.refreshToken,
      Math.max(1, ttlFromIsoString(tokens.refreshExpiresAt))
    )
  ];
}

export function createExpiredCookieHeaders(): string[] {
  return [
    serializeCookie(ACCESS_TOKEN_COOKIE, "", 0),
    serializeCookie(REFRESH_TOKEN_COOKIE, "", 0)
  ];
}

function verifyToken(token: string, expectedKind: TokenPayload["kind"]): SessionTokenContext {
  const [encodedPayload, encodedSignature] = token.split(".");

  if (!encodedPayload || !encodedSignature) {
    throw new RouteError("Anmeldung erforderlich.", 401, "unauthenticated");
  }

  const expectedSignature = sign(encodedPayload);
  const expectedBuffer = Buffer.from(expectedSignature);
  const receivedBuffer = Buffer.from(encodedSignature);

  if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) {
    throw new RouteError("Anmeldung erforderlich.", 401, "unauthenticated");
  }

  const payload = parsePayload(encodedPayload);

  if (payload.kind !== expectedKind) {
    throw new RouteError("Anmeldung erforderlich.", 401, "unauthenticated");
  }

  if (payload.exp <= nowInSeconds()) {
    throw new RouteError("Sitzung abgelaufen.", 401, "unauthenticated");
  }

  return {
    userId: payload.userId,
    membershipId: payload.membershipId,
    revierId: payload.revierId,
    role: payload.role,
    impersonator: payload.impersonator
  };
}

function signToken(payload: TokenPayload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

function parsePayload(encodedPayload: string): TokenPayload {
  try {
    const decoded = Buffer.from(encodedPayload, "base64url").toString("utf8");
    const payload = JSON.parse(decoded) as Partial<TokenPayload>;

    if (
      !payload ||
      typeof payload !== "object" ||
      (payload.kind !== "access" && payload.kind !== "refresh") ||
      typeof payload.userId !== "string" ||
      typeof payload.membershipId !== "string" ||
      typeof payload.revierId !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.exp !== "number" ||
      typeof payload.iat !== "number" ||
      typeof payload.sessionId !== "string" ||
      !isValidImpersonator(payload.impersonator)
    ) {
      throw new Error("invalid");
    }

    return payload as TokenPayload;
  } catch {
    throw new RouteError("Anmeldung erforderlich.", 401, "unauthenticated");
  }
}

function isValidImpersonator(value: unknown): value is ImpersonatorTokenContext | undefined {
  if (value == null) {
    return true;
  }

  if (typeof value !== "object") {
    return false;
  }

  const context = value as Partial<ImpersonatorTokenContext>;
  return (
    typeof context.userId === "string" &&
    typeof context.membershipId === "string" &&
    typeof context.revierId === "string" &&
    typeof context.role === "string" &&
    typeof context.sessionId === "string" &&
    typeof context.startedAt === "string"
  );
}

function sign(value: string) {
  return createHmac("sha256", getServerEnv().authTokenSecret).update(value).digest("base64url");
}

function serializeCookie(name: string, value: string, maxAgeSeconds: number) {
  const attributes = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`
  ];

  if (process.env.NODE_ENV === "production") {
    attributes.push("Secure");
  }

  return attributes.join("; ");
}

function ttlFromIsoString(value: string) {
  return Math.round((new Date(value).valueOf() - Date.now()) / 1000);
}

function nowInSeconds() {
  return Math.floor(Date.now() / 1000);
}
