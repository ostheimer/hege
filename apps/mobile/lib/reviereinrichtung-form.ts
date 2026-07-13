import type { EinrichtungTyp, EinrichtungZustand, ReviereinrichtungDetails } from "@hege/domain";

import type { CreateReviereinrichtungRequest } from "./api";
import { buildGeoPoint, trimToUndefined } from "./form-utils";
import { isAnsitzeinrichtung, isFuetterungseinrichtung, supportsOrientation } from "./reviereinrichtung";

export interface ReviereinrichtungFormState {
  type: EinrichtungTyp;
  name: string;
  status: EinrichtungZustand;
  lat: string;
  lng: string;
  locationLabel: string;
  accuracyMeters: string;
  locationSource: "manual" | "device-gps";
  orientationDegrees: string;
  beschreibung: string;
  capacityPersons: string;
  constructionYear: string;
  accessNote: string;
  ownerConsentAt: string;
  targetSpecies: string;
  feedType: string;
  feedQuantityKg: string;
  feedInterval: string;
  operationStart: string;
  operationEnd: string;
}

export const DEFAULT_REVIEREINRICHTUNG_FORM: ReviereinrichtungFormState = {
  type: "hochstand",
  name: "",
  status: "gut",
  lat: "",
  lng: "",
  locationLabel: "",
  accuracyMeters: "",
  locationSource: "manual",
  orientationDegrees: "",
  beschreibung: "",
  capacityPersons: "",
  constructionYear: "",
  accessNote: "",
  ownerConsentAt: "",
  targetSpecies: "",
  feedType: "",
  feedQuantityKg: "",
  feedInterval: "",
  operationStart: "",
  operationEnd: ""
};

export function buildReviereinrichtungPayload(
  form: ReviereinrichtungFormState
): CreateReviereinrichtungRequest {
  const name = form.name.trim();

  if (!name) {
    throw new Error("Name ist erforderlich.");
  }

  const location = buildGeoPoint(form.lat, form.lng, form.locationLabel, name);
  const accuracyMeters = parseOptionalNumber(form.accuracyMeters, "GPS-Genauigkeit", 0);
  const orientationDegrees = supportsOrientation(form.type)
    ? parseOptionalNumber(form.orientationDegrees, "Ausrichtung", 0, 359.999)
    : undefined;
  const details = buildDetails(form);

  return {
    type: form.type,
    name,
    status: form.status,
    location: {
      ...location,
      source: form.locationSource,
      accuracyMeters
    },
    beschreibung: trimToUndefined(form.beschreibung),
    orientationDegrees,
    details
  };
}

function buildDetails(form: ReviereinrichtungFormState): ReviereinrichtungDetails | undefined {
  const details: ReviereinrichtungDetails = {
    ownerConsentAt: parseOptionalDate(form.ownerConsentAt, "Zustimmung")
  };

  if (isAnsitzeinrichtung(form.type)) {
    details.capacityPersons = parseOptionalInteger(form.capacityPersons, "Personenzahl", 1);
    details.constructionYear = parseOptionalInteger(form.constructionYear, "Baujahr", 1800);
    details.accessNote = trimToUndefined(form.accessNote);
  }

  if (isFuetterungseinrichtung(form.type)) {
    details.targetSpecies = trimToUndefined(form.targetSpecies);
    details.feedType = trimToUndefined(form.feedType);
    details.feedQuantityKg = parseOptionalNumber(form.feedQuantityKg, "Futtermenge", 0);
    details.feedInterval = trimToUndefined(form.feedInterval);
    details.operationStart = parseOptionalDate(form.operationStart, "Betriebsbeginn");
    details.operationEnd = parseOptionalDate(form.operationEnd, "Betriebsende");
  }

  return Object.values(details).some((value) => value !== undefined) ? details : undefined;
}

function parseOptionalInteger(value: string, label: string, minimum: number) {
  const parsed = parseOptionalNumber(value, label, minimum);

  if (parsed !== undefined && !Number.isInteger(parsed)) {
    throw new Error(`${label} muss eine ganze Zahl sein.`);
  }

  return parsed;
}

function parseOptionalNumber(value: string, label: string, minimum: number, maximum?: number) {
  const normalized = value.replace(",", ".").trim();

  if (!normalized) {
    return undefined;
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed < minimum || (maximum !== undefined && parsed > maximum)) {
    const range = maximum === undefined ? `mindestens ${minimum}` : `zwischen ${minimum} und ${maximum}`;
    throw new Error(`${label} muss ${range} liegen.`);
  }

  return parsed;
}

function parseOptionalDate(value: string, label: string) {
  const normalized = value.trim();

  if (!normalized) {
    return undefined;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized) || Number.isNaN(Date.parse(normalized))) {
    throw new Error(`${label} muss im Format JJJJ-MM-TT angegeben werden.`);
  }

  return normalized;
}
