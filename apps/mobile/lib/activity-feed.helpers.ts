import type {
  AnsitzSession,
  DashboardResponse,
  FallwildVorgang,
  NotificationItem
} from "@hege/domain";
import { parseApiTimestamp } from "./api-timestamp";

/**
 * Vereinheitlichtes Item fuer den "Was gibt's Neues"-Feed auf dem Heute-Tab.
 * Drei Quellen flow rein: aktive Ansitze (Start-Event), neueste Fallwild-
 * Vorgaenge (Erfassungs-Event) und letzte Benachrichtigungen.
 *
 * Wir normalisieren auf `timestamp` (ISO-String), `title` (Headline),
 * `subtitle` (Detail-Zeile) und `kind` (Icon/Farbsteuerung). Konkrete
 * Renderer in `<ActivityFeed>` wissen damit, was sie tun muessen, ohne
 * die Original-Entitaeten zu kennen.
 */
export type ActivityItemKind = "ansitz" | "fallwild" | "notification";

export interface ActivityItem {
  id: string;
  kind: ActivityItemKind;
  timestamp: string;
  title: string;
  subtitle: string;
}

export const HOME_ACTIVITY_LIMIT = 3;

/**
 * Fuehrt Ansitze, Fallwild und Notifications in einen chronologischen
 * Feed zusammen, neueste oben. Die Startseite zeigt drei Einträge;
 * die Gesamtansicht übergibt Infinity und behält die vollständige Historie.
 */
export function buildActivityFeed(snapshot: Pick<DashboardResponse, "activeAnsitze" | "recentFallwild"> & { overview: Pick<DashboardResponse["overview"], "letzteBenachrichtigungen"> }, limit = HOME_ACTIVITY_LIMIT): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const entry of snapshot.activeAnsitze) {
    items.push(mapAnsitz(entry));
  }

  for (const entry of snapshot.recentFallwild) {
    items.push(mapFallwild(entry));
  }

  for (const entry of snapshot.overview.letzteBenachrichtigungen) {
    items.push(mapNotification(entry));
  }

  return items
    .sort((left, right) => (parseApiTimestamp(right.timestamp)?.getTime() ?? 0) - (parseApiTimestamp(left.timestamp)?.getTime() ?? 0))
    .slice(0, limit);
}

function mapAnsitz(entry: AnsitzSession): ActivityItem {
  const place = entry.location.label
    ? `${entry.standortName} · ${entry.location.label}`
    : entry.standortName;

  return {
    id: `ansitz-${entry.id}`,
    kind: "ansitz",
    timestamp: entry.startedAt,
    title: "Ansitz gestartet",
    subtitle: place
  };
}

function mapFallwild(entry: FallwildVorgang): ActivityItem {
  const wildart = entry.wildart;
  const place = entry.gemeinde ?? entry.location.label ?? "Standort unbekannt";

  return {
    id: `fallwild-${entry.id}`,
    kind: "fallwild",
    timestamp: entry.recordedAt,
    title: `Fallwild erfasst: ${wildart}`,
    subtitle: place
  };
}

function mapNotification(entry: NotificationItem): ActivityItem {
  return {
    id: `notification-${entry.id}`,
    kind: "notification",
    timestamp: entry.createdAt,
    title: entry.title,
    subtitle: entry.body
  };
}

/**
 * Deutsche Relativ-Zeit-Formatierung. Wir bauen das selbst, weil
 * `Intl.RelativeTimeFormat` nicht auf jeder Hermes-Version verfuegbar
 * ist und wir die Bandbreite kontrollieren wollen (Stunden vs. Tage vs.
 * Datum). Tests pinnen die Schwellen, damit Refactorings keine
 * Regressionen verstecken.
 */
export function formatRelativeTime(
  isoTimestamp: string,
  now: Date = new Date()
): string {
  const then = parseApiTimestamp(isoTimestamp);
  if (!then) return "";
  const deltaMs = now.getTime() - then.getTime();

  if (Number.isNaN(deltaMs)) {
    return "";
  }

  const minutes = Math.floor(deltaMs / 60_000);
  if (minutes < 1) return "gerade eben";
  if (minutes < 60) return `vor ${minutes} Min.`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "vor 1 Std." : `vor ${hours} Std.`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Gestern";
  if (days < 7) return `vor ${days} Tagen`;

  try {
    return new Intl.DateTimeFormat("de-AT", {
      day: "numeric",
      month: "short"
    }).format(then);
  } catch {
    return isoTimestamp.slice(0, 10);
  }
}

/**
 * Formatiert das heutige Datum als deutsches Eyebrow-Label, z.B.
 * "Donnerstag, 8. Mai 2026".
 */
export function formatTodayLabel(now: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("de-AT", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(now);
  } catch {
    return "Heute";
  }
}
