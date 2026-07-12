import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetRequestContext, mockResolveFallwildLocation } = vi.hoisted(() => ({
  mockGetRequestContext: vi.fn(),
  mockResolveFallwildLocation: vi.fn()
}));

vi.mock("../../../../../server/auth/context", () => ({
  getRequestContext: mockGetRequestContext
}));

vi.mock("../../../../../server/modules/geo/fallwild-location", () => ({
  resolveFallwildLocation: mockResolveFallwildLocation
}));

import { POST } from "./route";

describe("POST /api/v1/geo/fallwild-location", () => {
  beforeEach(() => {
    mockGetRequestContext.mockReset();
    mockResolveFallwildLocation.mockReset();
    mockGetRequestContext.mockResolvedValue({
      membershipId: "member-jaeger",
      revierId: "revier-gaenserndorf",
      role: "jaeger"
    });
  });

  it("returns a fallwild location suggestion for valid coordinates", async () => {
    mockResolveFallwildLocation.mockResolvedValue({
      location: {
        lat: 48.339,
        lng: 16.7201,
        label: "L9",
        addressLabel: "L9, 2230 Gänserndorf"
      },
      gemeinde: "Gänserndorf",
      strasse: "L9",
      roadReference: {
        roadName: "L9",
        roadKilometer: "12,4",
        source: "gip"
      },
      warnings: []
    });

    const response = await POST(
      new Request("http://localhost/api/v1/geo/fallwild-location", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          lat: 48.339,
          lng: 16.7201,
          accuracyMeters: 18
        })
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      gemeinde: "Gänserndorf",
      strasse: "L9",
      roadReference: {
        roadKilometer: "12,4"
      }
    });
    expect(mockResolveFallwildLocation).toHaveBeenCalledWith({
      lat: 48.339,
      lng: 16.7201,
      accuracyMeters: 18
    });
  });

  it("returns 400 for invalid coordinates", async () => {
    const response = await POST(
      new Request("http://localhost/api/v1/geo/fallwild-location", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          lat: "48.339",
          lng: 16.7201
        })
      })
    );

    expect(response.status).toBe(400);
    expect(mockResolveFallwildLocation).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid GPS accuracy", async () => {
    const response = await POST(
      new Request("http://localhost/api/v1/geo/fallwild-location", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          lat: 48.339,
          lng: 16.7201,
          accuracyMeters: -1
        })
      })
    );

    expect(response.status).toBe(400);
    expect(mockResolveFallwildLocation).not.toHaveBeenCalled();
  });

  it("allows platform admins to resolve fallwild locations consistently", async () => {
    mockGetRequestContext.mockResolvedValueOnce({
      membershipId: "member-admin",
      revierId: "revier-gaenserndorf",
      role: "platform-admin"
    });
    mockResolveFallwildLocation.mockResolvedValueOnce({
      location: { lat: 48.339, lng: 16.7201 },
      warnings: []
    });

    const response = await POST(
      new Request("http://localhost/api/v1/geo/fallwild-location", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          lat: 48.339,
          lng: 16.7201
        })
      })
    );

    expect(response.status).toBe(200);
    expect(mockResolveFallwildLocation).toHaveBeenCalledWith({
      lat: 48.339,
      lng: 16.7201
    });
  });
});
