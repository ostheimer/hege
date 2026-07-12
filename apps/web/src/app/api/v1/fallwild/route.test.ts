import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCreateFallwildVorgang, mockGetRequestContext } = vi.hoisted(() => ({
  mockCreateFallwildVorgang: vi.fn(),
  mockGetRequestContext: vi.fn()
}));

vi.mock("../../../../server/auth/context", () => ({
  getRequestContext: mockGetRequestContext
}));

vi.mock("../../../../server/modules/fallwild/service", () => ({
  createFallwildVorgang: mockCreateFallwildVorgang
}));

import { POST } from "./route";

describe("POST /api/v1/fallwild", () => {
  beforeEach(() => {
    mockCreateFallwildVorgang.mockReset();
    mockGetRequestContext.mockReset();
    mockGetRequestContext.mockResolvedValue({
      membershipId: "member-jaeger",
      revierId: "revier-attersee",
      role: "jaeger"
    });
  });

  it("returns 201 for valid payloads", async () => {
    mockCreateFallwildVorgang.mockResolvedValue({
      id: "fallwild-new"
    });

    const response = await POST(
      new Request("http://localhost/api/v1/fallwild", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          location: {
            lat: 47.92,
            lng: 13.51,
            source: "device-gps",
            addressLabel: "L9, 2230 Gänserndorf",
            accuracyMeters: 8
          },
          wildart: "Fuchs",
          geschlecht: "weiblich",
          altersklasse: "Adult",
          bergungsStatus: "geborgen",
          gemeinde: "Gänserndorf",
          strasse: "L9",
          roadReference: {
            roadName: "L9",
            roadKilometer: "12,4",
            source: "gip"
          }
        })
      })
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      id: "fallwild-new"
    });
    expect(mockCreateFallwildVorgang).toHaveBeenCalledWith({
      reportedByMembershipId: "member-jaeger",
      revierId: "revier-attersee",
      location: {
        lat: 47.92,
        lng: 13.51,
        source: "device-gps",
        addressLabel: "L9, 2230 Gänserndorf",
        accuracyMeters: 8
      },
      wildart: "Fuchs",
      geschlecht: "weiblich",
      altersklasse: "Adult",
      bergungsStatus: "geborgen",
      gemeinde: "Gänserndorf",
      strasse: "L9",
      roadReference: {
        roadName: "L9",
        roadKilometer: "12,4",
        source: "gip"
      }
    });
  });

  it("returns 400 for invalid payloads", async () => {
    const response = await POST(
      new Request("http://localhost/api/v1/fallwild", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          location: {
            lat: 47.92,
            lng: 13.51
          },
          wildart: "Unbekannt"
        })
      })
    );

    expect(response.status).toBe(400);
    expect(mockCreateFallwildVorgang).not.toHaveBeenCalled();
  });

  it("allows platform admins to create fallwild consistently", async () => {
    mockGetRequestContext.mockResolvedValueOnce({
      membershipId: "member-admin",
      revierId: "revier-attersee",
      role: "platform-admin"
    });
    mockCreateFallwildVorgang.mockResolvedValueOnce({ id: "fallwild-platform" });

    const response = await POST(
      new Request("http://localhost/api/v1/fallwild", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          location: {
            lat: 47.92,
            lng: 13.51
          },
          wildart: "Fuchs",
          geschlecht: "weiblich",
          altersklasse: "Adult",
          bergungsStatus: "geborgen",
          gemeinde: "Steinbach am Attersee"
        })
      })
    );

    expect(response.status).toBe(201);
    expect(mockCreateFallwildVorgang).toHaveBeenCalledWith(
      expect.objectContaining({
        reportedByMembershipId: "member-admin",
        revierId: "revier-attersee"
      })
    );
  });
});
