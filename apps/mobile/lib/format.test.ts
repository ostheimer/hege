import { describe, expect, it } from "vitest";

import { firstName, formatApiErrorDescription, formatDateTime } from "./format";

describe("formatDateTime", () => {
  it("stürzt bei ungültigen API-Zeitstempeln nicht ab", () => {
    expect(formatDateTime("kein-zeitstempel")).toBe("Nicht verfügbar");
  });
});

describe("formatApiErrorDescription", () => {
  it("haengt einen Punkt an, wenn die Fehlermeldung keinen Satz-End hat", () => {
    const result = formatApiErrorDescription("Network request failed");
    expect(result).toContain("Network request failed.");
    expect(result).toContain("Tippe auf „Aktualisieren\"");
  });

  it("entfernt vorhandene End-Punctuation und ersetzt durch einheitlichen Punkt", () => {
    // Sonst haetten wir z.B. "Fehler!. Tippe auf ..." mit doppelter Punctuation.
    const result = formatApiErrorDescription("Server-Fehler!");
    expect(result.startsWith("Server-Fehler.\n")).toBe(true);
    expect(result).not.toContain("Server-Fehler!.");
  });

  it("normalisiert auch Auslassungspunkte (… und ...) zu einem Punkt", () => {
    expect(formatApiErrorDescription("Timeout… ").startsWith("Timeout.\n")).toBe(true);
    expect(formatApiErrorDescription("Timeout...").startsWith("Timeout.\n")).toBe(true);
  });

  it("zwei Absaetze: Error + Hint sind durch Leerzeile getrennt", () => {
    const result = formatApiErrorDescription("Boom");
    expect(result).toMatch(/^Boom\.\n\nTippe auf/);
  });
});

describe("firstName", () => {
  it("extrahiert den ersten Token aus einem vollen Namen", () => {
    expect(firstName("Andreas Ostheimer")).toBe("Andreas");
  });

  it("gibt den ganzen Namen zurueck, wenn nur ein Token da ist", () => {
    expect(firstName("Andreas")).toBe("Andreas");
  });

  it("trimmt fuehrende und nachgestellte Whitespace", () => {
    expect(firstName("  Andreas Ostheimer  ")).toBe("Andreas");
  });

  it("verarbeitet Doppelnamen mit Bindestrich als einen Token", () => {
    // 'Hans-Peter Maier' -> 'Hans-Peter' (Bindestrich ist kein Whitespace).
    expect(firstName("Hans-Peter Maier")).toBe("Hans-Peter");
  });

  it("verarbeitet mehrere Whitespace-Zeichen zwischen den Tokens", () => {
    expect(firstName("Andreas\tOstheimer")).toBe("Andreas");
    expect(firstName("Andreas  Ostheimer")).toBe("Andreas");
  });

  it("Fallback auf den Original-Input bei Whitespace-only", () => {
    // Trim ergaebe leeren String — wir geben den Originaltext zurueck,
    // damit der Aufrufer nicht silently '' anzeigt.
    expect(firstName("   ")).toBe("   ");
  });
});
