import { describe, expect, it } from "vitest";

import {
  buildReviereinrichtungPayload,
  DEFAULT_REVIEREINRICHTUNG_FORM
} from "./reviereinrichtung-form";

describe("buildReviereinrichtungPayload", () => {
  it("baut eine Ansitzeinrichtung mit GPS, Ausrichtung und Details", () => {
    expect(
      buildReviereinrichtungPayload({
        ...DEFAULT_REVIEREINRICHTUNG_FORM,
        type: "kanzel",
        name: "Nordkanzel",
        lat: "48,33597",
        lng: "16.732315",
        accuracyMeters: "4,5",
        locationSource: "device-gps",
        orientationDegrees: "315",
        capacityPersons: "2",
        constructionYear: "2024",
        accessNote: "Zufahrt über Nordweg"
      })
    ).toMatchObject({
      type: "kanzel",
      name: "Nordkanzel",
      location: {
        lat: 48.33597,
        lng: 16.732315,
        accuracyMeters: 4.5,
        source: "device-gps"
      },
      orientationDegrees: 315,
      details: {
        capacityPersons: 2,
        constructionYear: 2024,
        accessNote: "Zufahrt über Nordweg"
      }
    });
  });

  it("entfernt unpassende Ansitzdetails bei einer Fütterung", () => {
    const payload = buildReviereinrichtungPayload({
      ...DEFAULT_REVIEREINRICHTUNG_FORM,
      type: "fuetterung",
      name: "Winterfütterung",
      lat: "48.3",
      lng: "16.7",
      orientationDegrees: "180",
      capacityPersons: "2",
      targetSpecies: "Rehwild",
      feedType: "Heu",
      feedQuantityKg: "25"
    });

    expect(payload.orientationDegrees).toBeUndefined();
    expect(payload.details).toEqual({
      targetSpecies: "Rehwild",
      feedType: "Heu",
      feedQuantityKg: 25
    });
  });

  it("weist ungültige Ausrichtungen zurück", () => {
    expect(() =>
      buildReviereinrichtungPayload({
        ...DEFAULT_REVIEREINRICHTUNG_FORM,
        name: "Teststand",
        lat: "48.3",
        lng: "16.7",
        orientationDegrees: "360"
      })
    ).toThrow("Ausrichtung");
  });
});
