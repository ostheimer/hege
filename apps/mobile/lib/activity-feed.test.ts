import type { DashboardResponse } from "@hege/domain";
import { describe, expect, it } from "vitest";

import { buildActivityFeed, formatRelativeTime } from "./activity-feed.helpers";

/**
 * Wir stubben nur die fuer den Feed gelesenen Felder. So muessen wir bei
 * Schema-Erweiterungen am Domain-Typ nicht jedes Test-Fixture mit-pflegen.
 */
function snapshot(overrides: {
  activeAnsitze?: ReadonlyArray<{ id: string; startedAt: string; standortName?: string; locationLabel?: string }>;
  recentFallwild?: ReadonlyArray<{ id: string; recordedAt: string; wildart?: string; gemeinde?: string }>;
  letzteBenachrichtigungen?: ReadonlyArray<{
    id: string;
    createdAt: string;
    title: string;
    body: string;
  }>;
}): DashboardResponse {
  const activeAnsitze = (overrides.activeAnsitze ?? []).map((entry) => ({
    id: entry.id,
    startedAt: entry.startedAt,
    standortName: entry.standortName ?? "Hochstand",
    location: { lat: 0, lng: 0, label: entry.locationLabel }
  }));
  const recentFallwild = (overrides.recentFallwild ?? []).map((entry) => ({
    id: entry.id,
    recordedAt: entry.recordedAt,
    wildart: entry.wildart ?? "Reh",
    gemeinde: entry.gemeinde ?? "Gänserndorf",
    location: { lat: 0, lng: 0 }
  }));
  const letzteBenachrichtigungen = overrides.letzteBenachrichtigungen ?? [];

  return {
    overview: {
      letzteBenachrichtigungen
    },
    activeAnsitze,
    recentFallwild
  } as unknown as DashboardResponse;
}

describe("buildActivityFeed", () => {
  it("sortiert gemischte PostgreSQL- und ISO-Zeitstempel nach Zeitpunkt", () => {
    const items = buildActivityFeed(snapshot({ recentFallwild: [
      { id: "older", recordedAt: "2026-09-05T08:00:00Z" },
      { id: "newer", recordedAt: "2026-09-05 10:30:00+02" }
    ] }));
    expect(items.map((item) => item.id)).toEqual(["fallwild-newer", "fallwild-older"]);
  });
  it("liefert leeren Feed, wenn keine Quelle Eintraege hat", () => {
    expect(buildActivityFeed(snapshot({}))).toEqual([]);
  });

  it("sortiert chronologisch absteigend (neueste zuerst) ueber alle Quellen", () => {
    const items = buildActivityFeed(
      snapshot({
        activeAnsitze: [
          { id: "a1", startedAt: "2026-05-10T09:00:00Z" },
          { id: "a2", startedAt: "2026-05-11T08:00:00Z" }
        ],
        recentFallwild: [
          { id: "f1", recordedAt: "2026-05-11T07:00:00Z" },
          { id: "f2", recordedAt: "2026-05-11T10:00:00Z" }
        ],
        letzteBenachrichtigungen: [
          {
            id: "n1",
            createdAt: "2026-05-11T11:00:00Z",
            title: "Neue Sitzung",
            body: "Termin bestätigt."
          }
        ]
      }), Infinity
    );

    expect(items.map((entry) => entry.id)).toEqual([
      "notification-n1",
      "fallwild-f2",
      "ansitz-a2",
      "fallwild-f1",
      "ansitz-a1"
    ]);
  });

  it("zeigt auf der Startseite genau die drei neuesten Einträge", () => {
    const items = buildActivityFeed(
      snapshot({
        recentFallwild: Array.from({ length: 10 }, (_, index) => ({
          id: `f${index}`,
          recordedAt: `2026-05-1${index}T00:00:00Z`
        }))
      })
    );

    expect(items).toHaveLength(3);
    expect(items.map((item) => item.id)).toEqual(["fallwild-f9", "fallwild-f8", "fallwild-f7"]);
  });

  it("behält in der Gesamtansicht auch ältere Aktivitäten", () => {
    const data = snapshot({ recentFallwild: Array.from({ length: 12 }, (_, index) => ({
      id: `history-${index}`, recordedAt: new Date(2026, 4, index + 1).toISOString()
    })) });
    expect(buildActivityFeed(data, Infinity)).toHaveLength(12);
  });

  it("baut Fallwild-Titel mit Wildart und Gemeinde im Subtitle", () => {
    const items = buildActivityFeed(
      snapshot({
        recentFallwild: [
          {
            id: "f1",
            recordedAt: "2026-05-11T07:00:00Z",
            wildart: "Schwarzwild",
            gemeinde: "Strasshof"
          }
        ]
      })
    );

    expect(items[0].title).toBe("Fallwild erfasst: Schwarzwild");
    expect(items[0].subtitle).toBe("Strasshof");
  });
});

describe("formatRelativeTime", () => {
  const now = new Date("2026-05-11T12:00:00Z");

  it("nimmt 'gerade eben' fuer < 1 Min.", () => {
    expect(formatRelativeTime("2026-05-11T11:59:30Z", now)).toBe("gerade eben");
  });

  it("liefert 'vor X Min.' im ersten Stunden-Fenster", () => {
    expect(formatRelativeTime("2026-05-11T11:30:00Z", now)).toBe("vor 30 Min.");
  });

  it("liefert 'vor 1 Std.' und 'vor X Std.' fuer unter 24h", () => {
    expect(formatRelativeTime("2026-05-11T11:00:00Z", now)).toBe("vor 1 Std.");
    expect(formatRelativeTime("2026-05-11T07:00:00Z", now)).toBe("vor 5 Std.");
  });

  it("liefert 'Gestern' bei genau 1 Tag", () => {
    expect(formatRelativeTime("2026-05-10T12:00:00Z", now)).toBe("Gestern");
  });

  it("liefert 'vor X Tagen' im 7-Tage-Fenster", () => {
    expect(formatRelativeTime("2026-05-08T12:00:00Z", now)).toBe("vor 3 Tagen");
  });

  it("liefert ein Datum bei mehr als 7 Tagen", () => {
    const result = formatRelativeTime("2026-04-15T12:00:00Z", now);
    // Format ist locale-abhaengig, aber muss den 15. April enthalten.
    expect(result).toMatch(/15/);
    expect(result).toMatch(/Apr/i);
  });
});
