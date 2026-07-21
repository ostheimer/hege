import type {
  StartImpersonationPayload,
  UpdatePlatformMembershipPayload,
  UpdatePlatformUserPayload
} from "@hege/domain";

import { RouteError } from "../../http/errors";

export function parseStartImpersonationPayload(input: unknown): StartImpersonationPayload {
  const value = ensureRecord(input);
  return { membershipId: requiredString(value.membershipId, "membershipId") };
}

export function parseUpdatePlatformUserPayload(input: unknown): UpdatePlatformUserPayload {
  const value = ensureRecord(input);
  return {
    name: optionalString(value.name, "name"),
    email: optionalString(value.email, "email"),
    phone: optionalString(value.phone, "phone"),
    username: optionalString(value.username, "username"),
    disabled: optionalBoolean(value.disabled, "disabled")
  };
}

export function parseUpdatePlatformMembershipPayload(
  input: unknown
): UpdatePlatformMembershipPayload {
  const value = ensureRecord(input);
  return {
    role: optionalString(value.role, "role") as UpdatePlatformMembershipPayload["role"],
    jagdzeichen: optionalString(value.jagdzeichen, "jagdzeichen")
  };
}

function ensureRecord(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new RouteError("Der Request-Body muss ein Objekt sein.", 400, "validation-error");
  }
  return input as Record<string, unknown>;
}

function requiredString(value: unknown, field: string) {
  const parsed = optionalString(value, field);
  if (!parsed) {
    throw new RouteError(`${field} ist erforderlich.`, 400, "validation-error");
  }
  return parsed;
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new RouteError(`${field} muss ein String sein.`, 400, "validation-error");
  }
  return value.trim();
}

function optionalBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") {
    throw new RouteError(`${field} muss ein Boolean sein.`, 400, "validation-error");
  }
  return value;
}
