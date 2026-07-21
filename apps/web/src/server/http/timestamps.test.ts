import { describe, expect, it } from "vitest";

import { toIsoTimestamp } from "./timestamps";

describe("toIsoTimestamp", () => {
  it("normalisiert PostgreSQL-Zeitstempel für mobile Clients", () => {
    expect(toIsoTimestamp("2026-07-21 14:38:26.293+00")).toBe("2026-07-21T14:38:26.293Z");
  });

  it("lässt ungültige Zeitstempel nicht in API-Antworten gelangen", () => {
    expect(() => toIsoTimestamp("kein-zeitstempel")).toThrow("Ungültiger Zeitstempel");
  });
});
