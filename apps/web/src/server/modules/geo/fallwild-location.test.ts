import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

describe("fallwild location resolver", () => {
  it("combines Google address data with a GIP road kilometer resolver", async () => {
    const { resolveFallwildLocation } = await loadModule({
      googleMapsServerApiKey: "google-key",
      googleMapsLanguage: "de",
      googleMapsRegion: "AT",
      gipRoadKilometerEndpoint: "https://gip.example.test/resolve"
    });
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          status: "OK",
          results: [
            {
              formatted_address: "L9, 2230 Gänserndorf",
              place_id: "google-place-1",
              address_components: [
                { long_name: "L9", types: ["route"] },
                { long_name: "Gänserndorf", types: ["locality"] }
              ]
            }
          ]
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          roadName: "L9",
          roadKilometer: "12,4",
          segmentId: "gip-segment-1"
        })
      );

    await expect(
      resolveFallwildLocation({
        accuracyMeters: 18,
        lat: 48.339,
        lng: 16.7201,
        fetchImpl: fetchImpl as unknown as typeof fetch
      })
    ).resolves.toMatchObject({
      location: {
        accuracyMeters: 18,
        label: "L9",
        addressLabel: "L9, 2230 Gänserndorf",
        placeId: "google-place-1"
      },
      gemeinde: "Gänserndorf",
      strasse: "L9",
      roadReference: {
        roadName: "L9",
        roadKilometer: "12,4",
        source: "gip",
        placeId: "gip-segment-1"
      },
      warnings: []
    });
    const gipUrl = fetchImpl.mock.calls[1]?.[0] as URL;
    expect(gipUrl.searchParams.get("lat")).toBe("48.339");
    expect(gipUrl.searchParams.get("lng")).toBe("16.7201");
    expect(gipUrl.searchParams.get("roadName")).toBe("L9");
    expect(gipUrl.searchParams.get("accuracyMeters")).toBe("18");
  });

  it("keeps GPS usable when Google and GIP are not configured", async () => {
    const { resolveFallwildLocation } = await loadModule({
      googleMapsLanguage: "de",
      googleMapsRegion: "AT"
    });

    await expect(
      resolveFallwildLocation({
        lat: 48.339,
        lng: 16.7201,
        fetchImpl: vi.fn() as unknown as typeof fetch
      })
    ).resolves.toMatchObject({
      location: {
        lat: 48.339,
        lng: 16.7201,
        source: "device-gps"
      },
      warnings: [
        "Google Reverse Geocoding ist nicht konfiguriert.",
        "Für diese Koordinate wurde kein GIP-Straßenkilometer gefunden; bitte manuell ergänzen."
      ]
    });
  });

  it("uses local Gänserndorf fixtures in mock provider mode without external requests", async () => {
    const { resolveFallwildLocation } = await loadModule({
      geoProviderMode: "mock",
      googleMapsLanguage: "de",
      googleMapsRegion: "AT"
    });
    const fetchImpl = vi.fn();

    await expect(
      resolveFallwildLocation({
        lat: 48.339,
        lng: 16.7201,
        fetchImpl: fetchImpl as unknown as typeof fetch
      })
    ).resolves.toMatchObject({
      location: {
        addressLabel: "Landesstraße 9, 2230 Gänserndorf, Österreich",
        placeId: "mock-google-gaenserndorf-l9"
      },
      gemeinde: "Gänserndorf",
      strasse: "L9",
      roadReference: {
        roadName: "L9",
        roadKilometer: "12,4",
        source: "gip",
        placeId: "mock-gip-gaenserndorf-l9-km-12-4"
      },
      warnings: [
        "Mock-Geocoder aktiv; Adresse stammt aus lokalen Testdaten.",
        "Mock-GIP aktiv; Straßenkilometer stammt aus lokalen Testdaten."
      ]
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("uses the bundled Gänserndorf GIP OGD index in live mode", async () => {
    const { resolveFallwildLocation } = await loadModule({
      googleMapsLanguage: "de",
      googleMapsRegion: "AT"
    });

    await expect(
      resolveFallwildLocation({
        lat: 48.33582305908203,
        lng: 16.715426445007324,
        fetchImpl: vi.fn() as unknown as typeof fetch
      })
    ).resolves.toMatchObject({
      roadReference: {
        roadName: "L9",
        roadKilometer: "23,555",
        source: "gip",
        placeId: "6105729086"
      },
      warnings: ["Google Reverse Geocoding ist nicht konfiguriert."]
    });
  });

  it("keeps the manual fallback for the production smoke coordinate on Schillergasse", async () => {
    const { resolveFallwildLocation } = await loadModule({
      googleMapsLanguage: "de",
      googleMapsRegion: "AT"
    });

    await expect(
      resolveFallwildLocation({
        lat: 48.336003,
        lng: 16.732323,
        accuracyMeters: 4,
        fetchImpl: vi.fn() as unknown as typeof fetch
      })
    ).resolves.toMatchObject({
      location: {
        lat: 48.336003,
        lng: 16.732323,
        accuracyMeters: 4
      },
      roadReference: undefined,
      warnings: [
        "Google Reverse Geocoding ist nicht konfiguriert.",
        "Für diese Koordinate wurde kein GIP-Straßenkilometer gefunden; bitte manuell ergänzen."
      ]
    });
  });

  it("surfaces ambiguous Google reverse geocoding results as a warning", async () => {
    const { resolveFallwildLocation } = await loadModule({
      googleMapsServerApiKey: "google-key",
      googleMapsLanguage: "de",
      googleMapsRegion: "AT"
    });
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        status: "OK",
        results: [
          {
            formatted_address: "Erster Treffer",
            place_id: "first-place",
            address_components: [{ long_name: "Gänserndorf", types: ["locality"] }]
          },
          {
            formatted_address: "Zweiter Treffer",
            place_id: "second-place",
            address_components: [{ long_name: "Gänserndorf", types: ["locality"] }]
          }
        ]
      })
    );

    await expect(
      resolveFallwildLocation({
        lat: 48.339,
        lng: 16.7201,
        fetchImpl: fetchImpl as unknown as typeof fetch
      })
    ).resolves.toMatchObject({
      location: {
        addressLabel: "Erster Treffer",
        placeId: "first-place"
      },
      warnings: expect.arrayContaining([
        "Google Reverse Geocoding hat mehrere Treffer geliefert; erster Treffer wurde übernommen.",
        "Für diese Koordinate wurde kein GIP-Straßenkilometer gefunden; bitte manuell ergänzen."
      ])
    });
  });

  it("parses GeoJSON-like GIP feature responses and picks the closest candidate", async () => {
    const { resolveFallwildLocation } = await loadModule({
      googleMapsServerApiKey: "google-key",
      googleMapsLanguage: "de",
      googleMapsRegion: "AT",
      gipRoadKilometerEndpoint: "https://gip.example.test/resolve"
    });
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          status: "OK",
          results: [
            {
              formatted_address: "B8, 2230 Gänserndorf",
              place_id: "google-place-b8",
              address_components: [
                { long_name: "B8", types: ["route"] },
                { long_name: "Gänserndorf", types: ["locality"] }
              ]
            }
          ]
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {
                FEATURENAME: "L9 km 12,4",
                FROMKM: 12.4,
                OBJECTID: 100,
                DISTANCE: 45
              }
            },
            {
              type: "Feature",
              properties: {
                FEATURENAME: "B8 km 33,247",
                FROMKM: 33.247,
                OBJECTID: 123,
                DISTANCE: 6
              }
            }
          ]
        })
      );

    await expect(
      resolveFallwildLocation({
        lat: 48.339,
        lng: 16.7201,
        fetchImpl: fetchImpl as unknown as typeof fetch
      })
    ).resolves.toMatchObject({
      roadReference: {
        roadName: "B8",
        roadKilometer: "33,247",
        source: "gip",
        placeId: "123"
      },
      warnings: []
    });
  });

  it("parses ArcGIS-like GIP attributes and accepts equivalent Austrian road names", async () => {
    const { resolveFallwildLocation } = await loadModule({
      googleMapsServerApiKey: "google-key",
      googleMapsLanguage: "de",
      googleMapsRegion: "AT",
      gipRoadKilometerEndpoint: "https://gip.example.test/resolve"
    });
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          status: "OK",
          results: [
            {
              formatted_address: "Landesstraße 9, 2230 Gänserndorf",
              place_id: "google-place-l9",
              address_components: [
                { long_name: "Landesstraße 9", types: ["route"] },
                { long_name: "Gänserndorf", types: ["locality"] }
              ]
            }
          ]
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          features: [
            {
              attributes: {
                STRASSE: "L 9",
                KM_VON: 12.417,
                GIP_ID: "gip-l9-12417",
                DISTANZ: 4
              }
            }
          ]
        })
      );

    await expect(
      resolveFallwildLocation({
        lat: 48.339,
        lng: 16.7201,
        fetchImpl: fetchImpl as unknown as typeof fetch
      })
    ).resolves.toMatchObject({
      strasse: "Landesstraße 9",
      roadReference: {
        roadName: "L 9",
        roadKilometer: "12,417",
        source: "gip",
        placeId: "gip-l9-12417"
      },
      warnings: []
    });
  });

  it("uses a local GIP OGD road kilometer index when configured", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "hege-gip-index-"));
    const indexPath = join(tempDir, "gip-road-kilometer-index.json");

    try {
      await writeFile(
        indexPath,
        JSON.stringify({
          entries: [
            {
              lat: 48.3414,
              lng: 16.7556,
              roadName: "B8 - Angerner Straße",
              roadKilometer: "33,0",
              placeId: "gip-b8-330"
            }
          ]
        })
      );
      const { resolveFallwildLocation } = await loadModule({
        googleMapsServerApiKey: "google-key",
        googleMapsLanguage: "de",
        googleMapsRegion: "AT",
        gipRoadKilometerIndexPath: indexPath,
        gipRoadKilometerMaxDistanceMeters: 200
      });
      const fetchImpl = vi.fn().mockResolvedValueOnce(
        jsonResponse({
          status: "OK",
          results: [
            {
              formatted_address: "B8, 2230 Gänserndorf",
              place_id: "google-place-b8",
              address_components: [
                { long_name: "B8", types: ["route"] },
                { long_name: "Gänserndorf", types: ["locality"] }
              ]
            }
          ]
        })
      );

      await expect(
        resolveFallwildLocation({
          lat: 48.3414,
          lng: 16.7556,
          fetchImpl: fetchImpl as unknown as typeof fetch
        })
      ).resolves.toMatchObject({
        roadReference: {
          roadName: "B8 - Angerner Straße",
          roadKilometer: "33,0",
          source: "gip",
          placeId: "gip-b8-330"
        },
        warnings: []
      });
    } finally {
      await rm(tempDir, { force: true, recursive: true });
    }
  });

  it("warns when GPS accuracy is too low for reliable fallwild capture", async () => {
    const { resolveFallwildLocation } = await loadModule({
      googleMapsLanguage: "de",
      googleMapsRegion: "AT"
    });

    await expect(
      resolveFallwildLocation({
        accuracyMeters: 145,
        lat: 48.339,
        lng: 16.7201,
        fetchImpl: vi.fn() as unknown as typeof fetch
      })
    ).resolves.toMatchObject({
      location: {
        accuracyMeters: 145
      },
      warnings: expect.arrayContaining([
        "GPS-Genauigkeit ist größer als 100 m; Standort bitte vor dem Speichern prüfen."
      ])
    });
  });

  it("returns provider errors as recoverable warnings", async () => {
    const { resolveFallwildLocation } = await loadModule({});

    await expect(
      resolveFallwildLocation({
        lat: 48.339,
        lng: 16.7201,
        fetchImpl: vi.fn() as unknown as typeof fetch,
        providers: {
          reverseGeocoder: {
            async reverseGeocode() {
              throw new Error("Adresse temporär nicht verfügbar.");
            }
          },
          roadKilometerResolver: {
            async resolveRoadKilometer() {
              throw new Error("GIP temporär nicht verfügbar.");
            }
          }
        }
      })
    ).resolves.toMatchObject({
      location: {
        lat: 48.339,
        lng: 16.7201,
        source: "device-gps"
      },
      warnings: ["Adresse temporär nicht verfügbar.", "GIP temporär nicht verfügbar."]
    });
  });
});

async function loadModule(env: Record<string, unknown>) {
  vi.resetModules();
  vi.doMock("../../env", () => ({
    getServerEnv: () => ({
      useDemoStore: false,
      geoProviderMode: "live",
      gipRoadKilometerMaxDistanceMeters: 150,
      ...env
    })
  }));

  return import("./fallwild-location");
}

function jsonResponse(payload: unknown) {
  return {
    ok: true,
    json: async () => payload
  };
}
