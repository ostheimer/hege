import { describe, expect, it, vi } from "vitest";

vi.mock("../../auth/context", () => ({
  getRequestContext: vi.fn(async () => ({
    revierId: "revier-attersee"
  }))
}));

vi.mock("../../storage/s3", () => ({
  getStorageReadUrl: vi.fn(async (objectKey: string) => `https://storage.example/${objectKey}`)
}));

import { exportFallwildCsv, mapFallwildRowToDomain, mapMediaAssetRowToPhotoAsset } from "./queries";

describe("fallwild queries", () => {
  it("maps db rows to the shared domain shape", () => {
    expect(
      mapFallwildRowToDomain({
        id: "fallwild-1",
        revierId: "revier-attersee",
        reportedByMembershipId: "member-jaeger",
        recordedAt: "2026-04-03T06:55:00.000Z",
        locationLat: 47.9201,
        locationLng: 13.5194,
        locationLabel: "L127",
        locationAccuracyMeters: 7,
        locationSource: "device-gps",
        addressLabel: "L127, 4853 Steinbach am Attersee",
        googlePlaceId: "google-place-1",
        wildart: "Reh",
        geschlecht: "weiblich",
        altersklasse: "Adult",
        bergungsStatus: "geborgen",
        gemeinde: "Steinbach am Attersee",
        strasse: "L127",
        roadName: "L127",
        roadKilometer: "8,2",
        roadKilometerSource: "gip",
        roadPlaceId: "gip-segment-1",
        note: "Gesichert."
      })
    ).toMatchObject({
      id: "fallwild-1",
      location: {
        lat: 47.9201,
        lng: 13.5194,
        label: "L127",
        accuracyMeters: 7,
        source: "device-gps",
        addressLabel: "L127, 4853 Steinbach am Attersee",
        placeId: "google-place-1"
      },
      roadReference: {
        roadName: "L127",
        roadKilometer: "8,2",
        source: "gip",
        placeId: "gip-segment-1"
      },
      photos: []
    });
  });

  it("maps media asset rows to photo assets", async () => {
    await expect(
      mapMediaAssetRowToPhotoAsset({
        id: "photo-1",
        revierId: "revier-attersee",
        entityType: "fallwild",
        entityId: "fallwild-1",
        uploadedByMembershipId: "member-jaeger",
        title: "Unfallstelle",
        objectKey: "attersee/fallwild/fallwild-1/photo-1-bild.jpg",
        fileName: "bild.jpg",
        contentType: "image/jpeg",
        createdAt: "2026-04-03T06:56:00.000Z"
      })
    ).resolves.toEqual({
      id: "photo-1",
      title: "Unfallstelle",
      url: "https://storage.example/attersee/fallwild/fallwild-1/photo-1-bild.jpg",
      createdAt: "2026-04-03T06:56:00.000Z"
    });
  });

  it("exports commas and quotes as CSV-safe values", async () => {
    vi.doMock("../../env", () => ({
      getServerEnv: () => ({
        useDemoStore: true
      })
    }));

    const csv = await exportFallwildCsv();

    expect(csv).toContain("id,recorded_at,wildart");
    expect(csv).toContain("fallwild-1");
  });
});
