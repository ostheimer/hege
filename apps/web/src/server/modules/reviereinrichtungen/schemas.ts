import type {
  EinrichtungTyp,
  EinrichtungZustand,
  GeoPoint,
  ReviereinrichtungDetails
} from "@hege/domain";

import { validationError } from "../../http/validation";

const TYPE_VALUES = [
  "hochstand",
  "kanzel",
  "ansitzleiter",
  "drueckjagdbock",
  "bodenstand",
  "fuetterung",
  "salzlecke",
  "kirrung",
  "kamera",
  "wildacker",
  "wasserstelle",
  "suhle",
  "jagdhuette",
  "wildzaun",
  "schranke",
  "jagdsteig",
  "wildrettungspunkt"
] as const satisfies readonly EinrichtungTyp[];

const STATUS_VALUES = ["gut", "wartung-faellig", "gesperrt"] as const satisfies readonly EinrichtungZustand[];

export interface CreateReviereinrichtungInput {
  type: EinrichtungTyp;
  name: string;
  status?: EinrichtungZustand;
  location: GeoPoint;
  beschreibung?: string;
  orientationDegrees?: number;
  details?: ReviereinrichtungDetails;
}

export function parseCreateReviereinrichtungInput(body: unknown): CreateReviereinrichtungInput {
  const data = ensureRecord(body, "Der Request-Body muss ein Objekt sein.");

  return {
    type: parseEnum(data.type, "type", TYPE_VALUES) as EinrichtungTyp,
    name: parseRequiredString(data.name, "name"),
    status:
      data.status == null || data.status === ""
        ? undefined
        : (parseEnum(data.status, "status", STATUS_VALUES) as EinrichtungZustand),
    location: parseLocation(data.location),
    beschreibung: parseOptionalString(data.beschreibung, "beschreibung"),
    orientationDegrees: parseOptionalOrientation(data.orientationDegrees),
    details: parseDetails(data.details)
  };
}

function parseLocation(value: unknown): GeoPoint {
  const data = ensureRecord(value, "location muss ein Objekt sein.");
  const lat = parseNumber(data.lat, "location.lat");
  const lng = parseNumber(data.lng, "location.lng");

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw validationError("location enthält ungültige Koordinaten.");
  }

  return {
    lat,
    lng,
    label: parseOptionalString(data.label, "location.label"),
    accuracyMeters: parseOptionalPositiveNumber(data.accuracyMeters, "location.accuracyMeters"),
    source:
      data.source === "manual" || data.source === "device-gps" || data.source === "reverse-geocode"
        ? data.source
        : undefined
  };
}

function parseDetails(value: unknown): ReviereinrichtungDetails | undefined {
  if (value == null || value === "") {
    return undefined;
  }

  const data = ensureRecord(value, "details muss ein Objekt sein.");
  const details: ReviereinrichtungDetails = {
    capacityPersons: parseOptionalPositiveInteger(data.capacityPersons, "details.capacityPersons"),
    constructionYear: parseOptionalYear(data.constructionYear),
    accessNote: parseOptionalString(data.accessNote, "details.accessNote"),
    ownerConsentAt: parseOptionalIsoString(data.ownerConsentAt, "details.ownerConsentAt"),
    targetSpecies: parseOptionalString(data.targetSpecies, "details.targetSpecies"),
    feedType: parseOptionalString(data.feedType, "details.feedType"),
    feedQuantityKg: parseOptionalPositiveNumber(data.feedQuantityKg, "details.feedQuantityKg"),
    feedInterval: parseOptionalString(data.feedInterval, "details.feedInterval"),
    operationStart: parseOptionalIsoString(data.operationStart, "details.operationStart"),
    operationEnd: parseOptionalIsoString(data.operationEnd, "details.operationEnd")
  };

  return Object.values(details).some((entry) => entry !== undefined) ? details : undefined;
}

function parseOptionalOrientation(value: unknown) {
  if (value == null || value === "") {
    return undefined;
  }

  const parsed = parseNumber(value, "orientationDegrees");

  if (parsed < 0 || parsed >= 360) {
    throw validationError("orientationDegrees muss zwischen 0 und kleiner als 360 liegen.");
  }

  return parsed;
}

function parseOptionalYear(value: unknown) {
  const year = parseOptionalPositiveInteger(value, "details.constructionYear");
  const maximum = new Date().getUTCFullYear() + 1;

  if (year !== undefined && (year < 1800 || year > maximum)) {
    throw validationError(`details.constructionYear muss zwischen 1800 und ${maximum} liegen.`);
  }

  return year;
}

function parseOptionalPositiveInteger(value: unknown, field: string) {
  const parsed = parseOptionalPositiveNumber(value, field);

  if (parsed !== undefined && !Number.isInteger(parsed)) {
    throw validationError(`${field} muss eine ganze Zahl sein.`);
  }

  return parsed;
}

function parseOptionalPositiveNumber(value: unknown, field: string) {
  if (value == null || value === "") {
    return undefined;
  }

  const parsed = parseNumber(value, field);

  if (parsed < 0) {
    throw validationError(`${field} muss positiv sein.`);
  }

  return parsed;
}

function parseOptionalIsoString(value: unknown, field: string) {
  const raw = parseOptionalString(value, field);

  if (!raw) {
    return undefined;
  }

  const date = new Date(raw);

  if (Number.isNaN(date.valueOf())) {
    throw validationError(`${field} muss ein gültiges Datum sein.`);
  }

  return date.toISOString();
}

function parseRequiredString(value: unknown, field: string) {
  const parsed = parseOptionalString(value, field);

  if (!parsed) {
    throw validationError(`${field} muss ein nicht-leerer String sein.`);
  }

  return parsed;
}

function parseOptionalString(value: unknown, field: string) {
  if (value == null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    throw validationError(`${field} muss ein String sein.`);
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseNumber(value: unknown, field: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw validationError(`${field} muss eine gültige Zahl sein.`);
  }

  return value;
}

function parseEnum(value: unknown, field: string, allowed: readonly string[]) {
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw validationError(`${field} ist ungültig.`);
  }

  return value;
}

function ensureRecord(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw validationError(message);
  }

  return value as Record<string, unknown>;
}
