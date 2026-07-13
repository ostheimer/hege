import { describe, expect, it } from "vitest";

import { demoData } from "@hege/domain";

import { mapDbReviereinrichtungToListItem, mapDemoReviereinrichtungToListItem } from "./mappers";

describe("reviereinrichtungen mappers", () => {
  it("maps demo entries to list items with summary fields", () => {
    const item = mapDemoReviereinrichtungToListItem(demoData.reviereinrichtungen[1]!);

    expect(item).toMatchObject({
      id: "einrichtung-2",
      offeneWartungen: 1,
      letzteKontrolleAt: "2026-04-01T07:15:00+02:00"
    });
  });

  it("maps db rows and related records to list items", () => {
    const item = mapDbReviereinrichtungToListItem(
      {
        id: "einrichtung-99",
        revierId: "revier-attersee",
        type: "hochstand",
        name: "Teststand",
        status: "wartung-faellig",
        locationLat: 47.91,
        locationLng: 13.52,
        locationLabel: "Testhang",
        beschreibung: "Testbeschreibung",
        orientationDegrees: 270,
        details: { capacityPersons: 2 },
        createdByMembershipId: "member-admin",
        createdAt: "2026-04-01T10:00:00.000Z",
        updatedAt: "2026-04-01T10:00:00.000Z"
      },
      [
        {
          id: "kontrolle-1",
          einrichtungId: "einrichtung-99",
          createdAt: "2026-04-03T10:00:00.000Z",
          createdByMembershipId: "member-admin",
          zustand: "wartung-faellig",
          note: "Nachjustieren"
        }
      ],
      [
        {
          id: "wartung-1",
          einrichtungId: "einrichtung-99",
          dueAt: "2026-04-05T10:00:00.000Z",
          status: "offen",
          title: "Bretter tauschen",
          note: "Nach Sturm"
        }
      ]
    );

    expect(item).toMatchObject({
      id: "einrichtung-99",
      orientationDegrees: 270,
      details: { capacityPersons: 2 },
      letzteKontrolleAt: "2026-04-03T10:00:00.000Z",
      offeneWartungen: 1
    });
  });
});
