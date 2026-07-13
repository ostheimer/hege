import { describe, expect, it } from "vitest";

import { parseCreateReviereinrichtungInput } from "./schemas";

describe("parseCreateReviereinrichtungInput", () => {
  it("validiert eine Kanzel mit Ausrichtung und Details", () => {
    expect(
      parseCreateReviereinrichtungInput({
        type: "kanzel",
        name: "  Nordkanzel  ",
        status: "gut",
        location: {
          lat: 48.33597,
          lng: 16.732315,
          label: "Nordhang",
          accuracyMeters: 4,
          source: "device-gps"
        },
        orientationDegrees: 315,
        details: {
          capacityPersons: 2,
          constructionYear: 2024,
          ownerConsentAt: "2026-07-13"
        }
      })
    ).toMatchObject({
      type: "kanzel",
      name: "Nordkanzel",
      orientationDegrees: 315,
      details: {
        capacityPersons: 2,
        constructionYear: 2024,
        ownerConsentAt: "2026-07-13T00:00:00.000Z"
      }
    });
  });

  it("weist unbekannte Typen und ungültige Ausrichtungen zurück", () => {
    expect(() =>
      parseCreateReviereinrichtungInput({
        type: "baum",
        name: "Test",
        location: { lat: 48, lng: 16 }
      })
    ).toThrow("type ist ungültig");

    expect(() =>
      parseCreateReviereinrichtungInput({
        type: "hochstand",
        name: "Test",
        location: { lat: 48, lng: 16 },
        orientationDegrees: 360
      })
    ).toThrow("orientationDegrees");
  });
});
