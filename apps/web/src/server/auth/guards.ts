import type { AuthContextResponse, Role } from "@hege/domain";
import { redirect } from "next/navigation";

import { getOptionalAuthContext } from "./context";

interface PageGuardOptions {
  allowSetupIncomplete?: boolean;
  next?: string;
}

export async function requirePageAuth(options: PageGuardOptions = {}): Promise<AuthContextResponse> {
  const context = await getOptionalAuthContext();

  if (!context) {
    redirect(toLoginRedirect(options.next));
  }

  if (!options.allowSetupIncomplete && context.setupRequired) {
    redirect("/app/setup");
  }

  return context;
}

export async function requirePageRoles(
  allowedRoles: readonly Role[],
  options: PageGuardOptions = {}
): Promise<AuthContextResponse> {
  const context = await requirePageAuth(options);

  if (!allowedRoles.includes(context.membership.role)) {
    redirect(toForbiddenRedirect(options.next));
  }

  return context;
}

function toForbiddenRedirect(attemptedPath?: string) {
  const params = new URLSearchParams({ error: "keine-berechtigung" });

  if (attemptedPath) {
    params.set("path", attemptedPath);
  }

  return `/app?${params.toString()}`;
}

export async function requireSetupPageAuth(next = "/app/setup") {
  const context = await requirePageAuth({
    next,
    allowSetupIncomplete: true
  });

  if (!context.setupRequired) {
    redirect("/app");
  }

  return context;
}

export async function redirectAuthenticatedUser(target = "/app") {
  const context = await getOptionalAuthContext();

  if (context) {
    redirect(context.setupRequired ? "/app/setup" : target);
  }
}

function toLoginRedirect(next = "/app") {
  const searchParams = new URLSearchParams({
    next
  });

  return `/login?${searchParams.toString()}`;
}
