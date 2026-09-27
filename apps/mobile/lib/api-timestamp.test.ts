import { describe, expect, it } from "vitest";
import { normalizeApiTimestamp, parseApiTimestamp } from "./api-timestamp";

describe("API-Zeitstempel unter Hermes", () => {
  it("normalisiert PostgreSQL mit Mikrosekunden und kurzem Zeitzonenoffset", () => {
    expect(normalizeApiTimestamp("2026-09-05 07:11:00.123456+00")).toBe("2026-09-05T07:11:00.123+00:00");
  });
  it("erhält den Zeitpunkt einschließlich Zeitzone", () => {
    expect(parseApiTimestamp("2026-09-05 09:11:00+02")?.toISOString()).toBe("2026-09-05T07:11:00.000Z");
    expect(parseApiTimestamp("2026-09-05T07:11:00.000Z")?.toISOString()).toBe("2026-09-05T07:11:00.000Z");
  });
  it("behandelt ungültige Eingaben ohne Absturz", () => {
    expect(parseApiTimestamp("kein Datum")).toBeNull();
  });
});
