import type {
  AuthContextResponse,
  AnsitzSession,
  Aufgabe,
  DashboardResponse,
  FallwildVorgang,
  NotificationItem,
  Sitzung
} from "@hege/domain";
import { asc, desc, eq } from "drizzle-orm";

import { getCurrentAuthContext } from "../../auth/context";
import { createDemoStore } from "../../demo-store";
import { getDb } from "../../db/client";
import {
  ansitzSessions,
  aufgaben,
  fallwildVorgaenge,
  notifications,
  reviereinrichtungWartungen,
  reviereinrichtungen,
  sitzungen,
  type AnsitzSessionRecord,
  type FallwildVorgangRecord,
  type NotificationRecord,
  type SitzungRecord
} from "../../db/schema";
import { getServerEnv } from "../../env";
import { normalizeDeAtVisibleText } from "../../text/de-at";

const TIME_ZONE = "Europe/Vienna";
const MAX_RECENT_ITEMS = 5;

export interface DashboardQueryOptions {
  context?: AuthContextResponse;
  now?: Date;
  activityHistory?: boolean;
}

export async function getDashboardSnapshot(
  options: DashboardQueryOptions = {}
): Promise<DashboardResponse> {
  const context = options.context ?? (await getCurrentAuthContext());
  const now = options.now ?? new Date();

  if (getServerEnv().useDemoStore) {
    return buildDashboardFromDemoStore(context, now, options.activityHistory);
  }

  const db = getDb();
  const revierId = context.activeRevierId;
  const notificationQuery = db.select().from(notifications)
    .where(eq(notifications.revierId, revierId)).orderBy(desc(notifications.createdAt)).$dynamic();

  const [
    activeAnsitzRows,
    fallwildRows,
    notificationRows,
    sitzungenRows,
    wartungsRows,
    aufgabenRows
  ] = await Promise.all([
    db
      .select()
      .from(ansitzSessions)
      .where(eq(ansitzSessions.revierId, revierId))
      .orderBy(desc(ansitzSessions.startedAt)),
    db
      .select()
      .from(fallwildVorgaenge)
      .where(eq(fallwildVorgaenge.revierId, revierId))
      .orderBy(desc(fallwildVorgaenge.recordedAt)),
    options.activityHistory ? notificationQuery : notificationQuery.limit(MAX_RECENT_ITEMS),
    db
      .select()
      .from(sitzungen)
      .where(eq(sitzungen.revierId, revierId))
      .orderBy(asc(sitzungen.scheduledAt)),
    db
      .select({
        status: reviereinrichtungWartungen.status
      })
      .from(reviereinrichtungWartungen)
      .innerJoin(reviereinrichtungen, eq(reviereinrichtungWartungen.einrichtungId, reviereinrichtungen.id))
      .where(eq(reviereinrichtungen.revierId, revierId)),
    readDashboardTasks(db, revierId)
  ]);

  const activeAnsitze = activeAnsitzRows
    .filter((row) => options.activityHistory || row.status === "active")
    .map(mapAnsitzRowToDomain);
  const recentFallwild = fallwildRows.map(mapFallwildRowToDomain).slice(0, options.activityHistory ? undefined : MAX_RECENT_ITEMS);
  const notificationsList = notificationRows.map(mapNotificationRowToDomain);
  const overview = buildOverview({
    now,
    revier: context.revier,
    activeAnsitze,
    fallwild: fallwildRows.map(mapFallwildRowToDomain),
    notifications: notificationsList,
    sitzungen: sitzungenRows.map(mapSitzungRowToDomain),
    openMaintenanceCount: wartungsRows.filter((row) => row.status === "offen").length,
    tasks: aufgabenRows.map(mapAufgabeRowToDomain)
  });
  if (options.activityHistory) overview.letzteBenachrichtigungen = notificationsList;

  return {
    ...context,
    overview,
    activeAnsitze,
    recentFallwild
  };
}

async function readDashboardTasks(db: ReturnType<typeof getDb>, revierId: string) {
  try {
    return await db.select().from(aufgaben).where(eq(aufgaben.revierId, revierId));
  } catch (error) {
    if (isLegacySchemaTaskError(error)) {
      return [];
    }

    throw error;
  }
}

function isLegacySchemaTaskError(error: unknown) {
  return collectErrorMessages(error).some((message) => {
    const normalizedMessage = message.toLowerCase();

    return (
      normalizedMessage.includes('relation "aufgaben" does not exist') ||
      normalizedMessage.includes("permission denied for table aufgaben") ||
      (normalizedMessage.includes("failed query") && normalizedMessage.includes('from "aufgaben"'))
    );
  });
}

function collectErrorMessages(error: unknown) {
  const messages: string[] = [];
  let current: unknown = error;

  while (current) {
    if (current instanceof Error) {
      messages.push(current.message);
      current = readErrorCause(current);
      continue;
    }

    if (typeof current === "string") {
      messages.push(current);
    }

    break;
  }

  return messages;
}

function readErrorCause(error: Error) {
  return "cause" in error ? (error as Error & { cause?: unknown }).cause : undefined;
}

function buildDashboardFromDemoStore(
  context: AuthContextResponse,
  now: Date,
  activityHistory = false
): DashboardResponse {
  const store = createDemoStore();
  const revierId = context.activeRevierId;
  const activeAnsitze = store.ansitze
    .filter((entry) => entry.revierId === revierId && (activityHistory || entry.status === "active"))
    .sort((left, right) => right.startedAt.localeCompare(left.startedAt));
  const fallwild = store.fallwild
    .filter((entry) => entry.revierId === revierId)
    .sort((left, right) => right.recordedAt.localeCompare(left.recordedAt));
  const notificationsList = store.notifications
    .filter((entry) => entry.revierId === revierId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, activityHistory ? undefined : MAX_RECENT_ITEMS);

  return {
    ...context,
    overview: { ...buildOverview({
      now,
      revier: context.revier,
      activeAnsitze,
      fallwild,
      notifications: notificationsList,
      sitzungen: store.sitzungen.filter((entry) => entry.revierId === revierId),
      openMaintenanceCount: store.reviereinrichtungen
        .filter((entry) => entry.revierId === revierId)
        .flatMap((entry) => entry.wartung)
        .filter((entry) => entry.status === "offen").length,
      tasks: store.aufgaben.filter((entry) => entry.revierId === revierId)
    }), ...(activityHistory ? { letzteBenachrichtigungen: notificationsList } : {}) },
    activeAnsitze,
    recentFallwild: fallwild.slice(0, activityHistory ? undefined : MAX_RECENT_ITEMS)
  };
}

function buildOverview({
  now,
  revier,
  activeAnsitze,
  fallwild,
  notifications,
  sitzungen,
  openMaintenanceCount,
  tasks
}: {
  now: Date;
  revier: AuthContextResponse["revier"];
  activeAnsitze: AnsitzSession[];
  fallwild: FallwildVorgang[];
  notifications: NotificationItem[];
  sitzungen: Sitzung[];
  openMaintenanceCount: number;
  tasks: Aufgabe[];
}) {
  return {
    revier,
    aktiveAnsitze: activeAnsitze.length,
    ansitzeMitKonflikt: activeAnsitze.filter((entry) => entry.conflict).length,
    offeneWartungen: openMaintenanceCount,
    heutigeFallwildBergungen: fallwild.filter((entry) => toLocalDateKey(entry.recordedAt) === toLocalDateKey(now)).length,
    unveroeffentlichteProtokolle: sitzungen.filter((entry) => entry.status === "entwurf").length,
    offeneAufgaben: tasks.filter((entry) => !["erledigt", "abgelehnt", "archiviert"].includes(entry.status)).length,
    letzteBenachrichtigungen: notifications.slice(0, MAX_RECENT_ITEMS),
    naechsteSitzung: selectNextSitzung(sitzungen, now)
  };
}

function mapAufgabeRowToDomain(record: typeof aufgaben.$inferSelect): Aufgabe {
  return {
    id: record.id,
    revierId: record.revierId,
    createdByMembershipId: record.createdByMembershipId,
    sourceType: record.sourceType ?? undefined,
    sourceId: record.sourceId ?? undefined,
    title: normalizeDeAtVisibleText(record.title),
    description: normalizeDeAtVisibleText(record.description) ?? undefined,
    status: record.status,
    priority: record.priority,
    dueAt: record.dueAt ?? undefined,
    completedAt: record.completedAt ?? undefined,
    completionNote: normalizeDeAtVisibleText(record.completionNote) ?? undefined,
    assigneeMembershipIds: [],
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function selectNextSitzung(sitzungenList: Sitzung[], now: Date): Sitzung | undefined {
  const nowValue = now.valueOf();
  const futureSessions = sitzungenList.filter((entry) => new Date(entry.scheduledAt).valueOf() >= nowValue);
  const candidates = futureSessions.length > 0 ? futureSessions : sitzungenList;
  const next = candidates.slice().sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt))[0];

  if (!next) {
    return undefined;
  }

  return {
    ...next,
    participants: next.participants ?? [],
    versions: next.versions ?? []
  };
}

function mapAnsitzRowToDomain(record: AnsitzSessionRecord) {
  return {
    id: record.id,
    revierId: record.revierId,
    membershipId: record.membershipId,
    standortId: record.standortId ?? undefined,
    standortName: normalizeDeAtVisibleText(record.standortName),
    location: {
      lat: record.locationLat,
      lng: record.locationLng,
      label: normalizeDeAtVisibleText(record.locationLabel) ?? undefined
    },
    startedAt: record.startedAt,
    plannedEndAt: record.plannedEndAt ?? undefined,
    endedAt: record.endedAt ?? undefined,
    note: normalizeDeAtVisibleText(record.note) ?? undefined,
    status: record.status,
    conflict: record.conflict
  } satisfies AnsitzSession;
}

function mapFallwildRowToDomain(record: FallwildVorgangRecord) {
  return {
    id: record.id,
    revierId: record.revierId,
    reportedByMembershipId: record.reportedByMembershipId,
    recordedAt: record.recordedAt,
    location: {
      lat: record.locationLat,
      lng: record.locationLng,
      label: normalizeDeAtVisibleText(record.locationLabel) ?? undefined,
      accuracyMeters: record.locationAccuracyMeters ?? undefined,
      source:
        record.locationSource === "manual" ||
        record.locationSource === "device-gps" ||
        record.locationSource === "reverse-geocode"
          ? record.locationSource
          : undefined,
      addressLabel: normalizeDeAtVisibleText(record.addressLabel) ?? undefined,
      placeId: record.googlePlaceId ?? undefined
    },
    wildart: record.wildart,
    geschlecht: record.geschlecht,
    altersklasse: record.altersklasse,
    bergungsStatus: record.bergungsStatus,
    gemeinde: normalizeDeAtVisibleText(record.gemeinde),
    strasse: normalizeDeAtVisibleText(record.strasse) ?? undefined,
    roadReference:
      record.roadName || record.roadKilometer || record.roadKilometerSource || record.roadPlaceId
        ? {
            roadName: normalizeDeAtVisibleText(record.roadName) ?? undefined,
            roadKilometer: record.roadKilometer ?? undefined,
            source:
              record.roadKilometerSource === "manual" ||
              record.roadKilometerSource === "gip" ||
              record.roadKilometerSource === "unavailable"
                ? record.roadKilometerSource
                : undefined,
            placeId: record.roadPlaceId ?? undefined
          }
        : undefined,
    note: normalizeDeAtVisibleText(record.note) ?? undefined,
    photos: []
  } satisfies FallwildVorgang;
}

function mapNotificationRowToDomain(record: NotificationRecord): NotificationItem {
  return {
    id: record.id,
    revierId: record.revierId,
    channel: record.channel,
    title: normalizeDeAtVisibleText(record.title),
    body: normalizeDeAtVisibleText(record.body),
    createdAt: record.createdAt
  };
}

function mapSitzungRowToDomain(record: SitzungRecord): Sitzung {
  return {
    id: record.id,
    revierId: record.revierId,
    title: normalizeDeAtVisibleText(record.title),
    scheduledAt: record.scheduledAt,
    locationLabel: normalizeDeAtVisibleText(record.locationLabel),
    status: record.status,
    participants: [],
    versions: []
  } satisfies Sitzung;
}

function toLocalDateKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";

  return `${year}-${month}-${day}`;
}
