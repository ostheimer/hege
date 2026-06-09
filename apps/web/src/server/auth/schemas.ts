import type {
  ChangePinPayload,
  CompleteRevierSetupPayload,
  LoginPayload,
  PublicRegistrationPayload,
  RefreshSessionPayload
} from "@hege/domain";

import { validationError } from "../http/validation";

export function parseLoginPayload(body: unknown): LoginPayload {
  const data = ensureRecord(body, "Der Request-Body muss ein Objekt sein.");
  const identifier = parseRequiredString(data.identifier ?? data.email, "identifier").toLowerCase();
  const pin = parsePin(data.pin ?? data.password);

  return {
    identifier,
    pin,
    membershipId: parseOptionalString(data.membershipId, "membershipId")
  };
}

export function parseChangePinPayload(body: unknown): ChangePinPayload {
  const data = ensureRecord(body, "Der Request-Body muss ein Objekt sein.");
  const currentPin = parsePin(data.currentPin);
  const newPin = parsePin(data.newPin);

  if (currentPin === newPin) {
    throw validationError("Die neue PIN muss sich von der aktuellen unterscheiden.");
  }

  return { currentPin, newPin };
}

export function parseRefreshPayload(body: unknown): RefreshSessionPayload {
  if (body == null) {
    return {};
  }

  const data = ensureRecord(body, "Der Request-Body muss ein Objekt sein.");

  return {
    refreshToken: parseOptionalString(data.refreshToken, "refreshToken"),
    membershipId: parseOptionalString(data.membershipId, "membershipId")
  };
}

export function parsePublicRegistrationPayload(body: unknown): PublicRegistrationPayload {
  const data = ensureRecord(body, "Der Request-Body muss ein Objekt sein.");

  return {
    firstName: parseRequiredString(data.firstName, "firstName"),
    lastName: parseRequiredString(data.lastName, "lastName"),
    email: parseRequiredString(data.email, "email").toLowerCase(),
    username: parseRequiredString(data.username, "username").toLowerCase(),
    phone: parseRequiredString(data.phone, "phone"),
    pin: parsePin(data.pin),
    jagdzeichen: parseRequiredString(data.jagdzeichen, "jagdzeichen"),
    revierName: parseRequiredString(data.revierName, "revierName"),
    bundesland: parseRequiredString(data.bundesland, "bundesland"),
    bezirk: parseRequiredString(data.bezirk, "bezirk"),
    planKey: parsePublicPlanKey(data.planKey)
  };
}

export function parseCompleteRevierSetupPayload(body: unknown): CompleteRevierSetupPayload {
  const data = ensureRecord(body, "Der Request-Body muss ein Objekt sein.");

  return {
    revierName: parseRequiredString(data.revierName, "revierName"),
    bundesland: parseRequiredString(data.bundesland, "bundesland"),
    bezirk: parseRequiredString(data.bezirk, "bezirk"),
    flaecheHektar: parseNonNegativeInteger(data.flaecheHektar, "flaecheHektar")
  };
}

function ensureRecord(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw validationError(message);
  }

  return value as Record<string, unknown>;
}

function parseRequiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw validationError(`${field} muss ein nicht-leerer String sein.`);
  }

  return value.trim();
}

function parseOptionalString(value: unknown, field: string): string | undefined {
  if (value == null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    throw validationError(`${field} muss ein String sein.`);
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parsePin(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}$/.test(value.trim())) {
    throw validationError("pin muss eine vierstellige PIN sein.");
  }

  return value.trim();
}

function parsePublicPlanKey(value: unknown) {
  if (value !== "starter" && value !== "revier") {
    throw validationError("planKey muss starter oder revier sein.");
  }

  return value;
}

function parseNonNegativeInteger(value: unknown, field: string) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim().length > 0
        ? Number(value.trim())
        : Number.NaN;

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw validationError(`${field} muss eine nicht-negative ganze Zahl sein.`);
  }

  return parsed;
}
