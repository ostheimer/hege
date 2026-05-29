import { validationError } from "../../http/validation";

export interface SitzungParticipantInput {
  membershipId: string;
  anwesend: boolean;
}

export interface BeschlussInput {
  title: string;
  decision: string;
  owner?: string;
  dueAt?: string;
}

export interface CreateSitzungInput {
  title: string;
  scheduledAt: string;
  locationLabel: string;
  participants: SitzungParticipantInput[];
}

export interface UpdateSitzungInput extends CreateSitzungInput {}

export interface CreateSitzungVersionInput {
  summary: string;
  agenda: string[];
  beschluesse: BeschlussInput[];
}

export function parseCreateSitzungInput(body: unknown): CreateSitzungInput {
  const data = ensureRecord(body, "Die Eingaben konnten nicht gelesen werden.");

  return {
    title: parseRequiredString(data.title, "Titel"),
    scheduledAt: parseRequiredDateString(data.scheduledAt, "Termin"),
    locationLabel: parseRequiredString(data.locationLabel, "Ort"),
    participants: parseParticipants(data.participants)
  };
}

export function parseUpdateSitzungInput(body: unknown): UpdateSitzungInput {
  return parseCreateSitzungInput(body);
}

export function parseCreateSitzungVersionInput(body: unknown): CreateSitzungVersionInput {
  const data = ensureRecord(body, "Die Eingaben konnten nicht gelesen werden.");

  const summary = parseOptionalString(data.summary, "Zusammenfassung") ?? "";
  const agenda = parseStringArray(data.agenda, "Agenda-Punkt");
  const beschluesse = parseBeschluesse(data.beschluesse);

  // Eine leere Version hat keinen Inhalt zum Festhalten. Statt einen leeren
  // Stand zu speichern (und Schriftfuehrer:innen im Unklaren zu lassen),
  // verlangen wir mindestens einen befuellten Bereich.
  if (summary.length === 0 && agenda.length === 0 && beschluesse.length === 0) {
    throw validationError(
      "Eine Protokollversion braucht zumindest eine Zusammenfassung, einen Agenda-Punkt oder einen Beschluss."
    );
  }

  return {
    summary,
    agenda,
    beschluesse
  };
}

function parseParticipants(value: unknown): SitzungParticipantInput[] {
  if (!Array.isArray(value)) {
    throw validationError("Die Teilnehmerliste hat ein ungültiges Format.");
  }

  return value.map((entry, index) => {
    const data = ensureRecord(entry, `Teilnehmer ${index + 1} hat ein ungültiges Format.`);

    if (typeof data.anwesend !== "boolean") {
      throw validationError(`Die Anwesenheit von Teilnehmer ${index + 1} ist ungültig.`);
    }

    return {
      membershipId: parseRequiredString(data.membershipId, `Teilnehmer ${index + 1}`),
      anwesend: data.anwesend
    };
  });
}

function parseBeschluesse(value: unknown): BeschlussInput[] {
  if (!Array.isArray(value)) {
    throw validationError("Die Beschlussliste hat ein ungültiges Format.");
  }

  return value.map((entry, index) => {
    const data = ensureRecord(entry, `Beschluss ${index + 1} hat ein ungültiges Format.`);
    const position = `Beschluss ${index + 1}`;

    return {
      title: parseRequiredString(data.title, `Beschlusstitel (${position})`),
      decision: parseRequiredString(data.decision, `Beschlusstext (${position})`),
      owner: parseOptionalString(data.owner, `Verantwortlich (${position})`),
      dueAt: parseOptionalDateString(data.dueAt, `Fälligkeit (${position})`)
    };
  });
}

function parseStringArray(value: unknown, label: string) {
  if (!Array.isArray(value)) {
    throw validationError(`Die Liste „${label}" hat ein ungültiges Format.`);
  }

  return value.map((entry, index) => parseRequiredString(entry, `${label} ${index + 1}`));
}

function ensureRecord(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw validationError(message);
  }

  return value as Record<string, unknown>;
}

function parseRequiredString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw validationError(`„${label}" hat ein ungültiges Format.`);
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw validationError(`„${label}" darf nicht leer sein.`);
  }

  return trimmed;
}

function parseOptionalString(value: unknown, label: string): string | undefined {
  if (value == null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    throw validationError(`„${label}" hat ein ungültiges Format.`);
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseRequiredDateString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw validationError(`„${label}" hat ein ungültiges Format.`);
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.valueOf())) {
    throw validationError(`„${label}" ist kein gültiges Datum.`);
  }

  return parsed.toISOString();
}

function parseOptionalDateString(value: unknown, label: string): string | undefined {
  if (value == null || value === "") {
    return undefined;
  }

  return parseRequiredDateString(value, label);
}
