import type { AuthContextResponse } from "@hege/domain";
import { cookies, headers } from "next/headers";

import { RouteError } from "../http/errors";
import { resolveAuthContext, validateSessionContext } from "./service";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  verifyAccessToken,
  verifyRefreshToken,
  type SessionTokenContext
} from "./tokens";

export interface RequestContext extends SessionTokenContext {}

export async function getRequestContext(): Promise<RequestContext> {
  const context = await getSignedRequestContext();

  return validateSessionContext(context);
}

export async function getSignedRequestContext(): Promise<RequestContext> {
  const token = await readAccessToken();

  if (!token) {
    throw new RouteError("Anmeldung erforderlich.", 401, "unauthenticated");
  }

  return verifyAccessToken(token);
}

export async function getOptionalRequestContext(): Promise<RequestContext | null> {
  try {
    const token = await readAccessToken();

    return token ? verifyAccessToken(token) : null;
  } catch {
    return null;
  }
}

export async function getCurrentAuthContext(): Promise<AuthContextResponse> {
  const context = await getRequestContext();
  return resolveAuthContext(context);
}

export async function getOptionalAuthContext(): Promise<AuthContextResponse | null> {
  const context = await getOptionalRequestContext();
  return context ? resolveAuthContext(context) : null;
}

export async function getRefreshTokenFromRequest(): Promise<string | undefined> {
  const requestHeaders = await headers();
  const authorization = requestHeaders.get("authorization");

  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  const requestCookies = await cookies();
  return requestCookies.get(REFRESH_TOKEN_COOKIE)?.value;
}

export async function verifyRefreshContextFromRequest() {
  const token = await getRefreshTokenFromRequest();

  if (!token) {
    throw new RouteError("Refresh-Token fehlt.", 401, "unauthenticated");
  }

  return verifyRefreshToken(token);
}

async function readAccessToken() {
  const requestHeaders = await headers();
  const authorization = requestHeaders.get("authorization");

  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  const requestCookies = await cookies();
  return requestCookies.get(ACCESS_TOKEN_COOKIE)?.value;
}
