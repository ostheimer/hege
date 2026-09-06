import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockDb, mockIsStorageConfigured } = vi.hoisted(() => ({
  mockDb: {
    select: vi.fn()
  },
  mockIsStorageConfigured: vi.fn(() => true)
}));

vi.mock("../../auth/context", () => ({
  getRequestContext: vi.fn(async () => ({
    revierId: "revier-attersee"
  }))
}));

vi.mock("../../db/client", () => ({
  getDb: () => mockDb
}));

vi.mock("../../env", () => ({
  getServerEnv: () => ({
    useDemoStore: false
  })
}));

vi.mock("../../storage/s3", () => ({
  getStorageReadUrl: vi.fn(async (objectKey: string) => `https://storage.example/${objectKey}`),
  isStorageConfigured: mockIsStorageConfigured
}));

import { fallwildVorgaenge, mediaAssets } from "../../db/schema";
import { getFallwildById, listFallwild } from "./queries";

describe("fallwild query legacy schema compatibility", () => {
  beforeEach(() => {
    mockDb.select.mockImplementation(() => createSelectBuilder());
    mockIsStorageConfigured.mockReturnValue(true);
  });

  it("returns fallwild entries without photos when media_assets is missing", async () => {
    const entries = await listFallwild();

    expect(entries).toHaveLength(1);
    expect(entries[0]?.id).toBe("fallwild-1");
    expect(entries[0]?.photos).toEqual([]);
  });

  it("returns a fallwild detail without photos when media_assets is missing", async () => {
    const entry = await getFallwildById("fallwild-1");

    expect(entry?.id).toBe("fallwild-1");
    expect(entry?.photos).toEqual([]);
  });

  it("returns fallwild entries without photos when storage is not configured", async () => {
    mockIsStorageConfigured.mockReturnValue(false);

    const entries = await listFallwild();

    expect(entries).toHaveLength(1);
    expect(entries[0]?.id).toBe("fallwild-1");
    expect(entries[0]?.photos).toEqual([]);
  });
});

function createSelectBuilder() {
  const row = {
    altersklasse: "Adult",
    bergungsStatus: "geborgen",
    gemeinde: "Steinbach am Attersee",
    geschlecht: "weiblich",
    id: "fallwild-1",
    locationLabel: "L127",
    locationLat: 47.9201,
    locationLng: 13.5194,
    note: "Gesichert.",
    recordedAt: "2026-04-03T06:55:00.000Z",
    reportedByMembershipId: "member-jaeger",
    revierId: "revier-attersee",
    strasse: "L127",
    wildart: "Reh"
  };

  return {
    from(table: unknown) {
      if (table === fallwildVorgaenge) {
        return {
          where() {
            return {
              async limit() {
                return [row];
              },
              async orderBy() {
                return [row];
              }
            };
          }
        };
      }

      if (table === mediaAssets) {
        return {
          where() {
            return {
              async orderBy() {
                throw Object.assign(new Error('relation "media_assets" does not exist'), {
                  code: "42P01"
                });
              }
            };
          }
        };
      }

      throw new Error("Unexpected table access in fallwild compatibility test.");
    }
  };
}
