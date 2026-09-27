import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockDb, mockIsStorageConfigured } = vi.hoisted(() => ({
  mockDb: {
    select: vi.fn()
  },
  mockIsStorageConfigured: vi.fn(() => false)
}));

vi.mock("../../db/client", () => ({
  getDb: () => mockDb
}));

vi.mock("../../storage/s3", () => ({
  getStorageReadUrl: vi.fn(),
  isStorageConfigured: mockIsStorageConfigured
}));

import {
  reviereinrichtungKontrollen,
  reviereinrichtungWartungen,
  reviereinrichtungen
} from "../../db/schema";
import { createDbReviereinrichtungenRepository } from "./repository";

describe("reviereinrichtungen repository legacy schema compatibility", () => {
  beforeEach(() => {
    mockDb.select.mockImplementation((fields?: unknown) => createSelectBuilder(fields));
    mockIsStorageConfigured.mockReturnValue(false);
  });

  it("liest bestehende Einrichtungen auch vor Migration 0010", async () => {
    const repository = createDbReviereinrichtungenRepository();

    await expect(repository.listByRevier("revier-attersee")).resolves.toEqual([
      expect.objectContaining({
        id: "einrichtung-legacy",
        name: "Alte Kanzel",
        orientationDegrees: undefined,
        details: undefined,
        createdAt: undefined,
        photos: []
      })
    ]);
    expect(mockDb.select).toHaveBeenCalledTimes(4);
  });
});

function createSelectBuilder(fields?: unknown) {
  return {
    from(table: unknown) {
      if (table === reviereinrichtungen) {
        return orderedQuery(
          fields
            ? [
                {
                  id: "einrichtung-legacy",
                  revierId: "revier-attersee",
                  type: "kanzel",
                  name: "Alte Kanzel",
                  status: "gut",
                  locationLat: 47.92,
                  locationLng: 13.52,
                  locationLabel: "Nordhang",
                  beschreibung: null
                }
              ]
            : undefined
        );
      }

      if (table === reviereinrichtungKontrollen || table === reviereinrichtungWartungen) {
        return orderedQuery([]);
      }

      throw new Error("Unerwarteter Tabellenzugriff im Kompatibilitätstest.");
    }
  };
}

function orderedQuery(rows: unknown[] | undefined) {
  return {
    where() {
      return {
        async orderBy() {
          if (!rows) {
            throw Object.assign(new Error('column "orientation_degrees" does not exist'), {
              code: "42703"
            });
          }

          return rows;
        }
      };
    }
  };
}
