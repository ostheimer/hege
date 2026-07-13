import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCreateReviereinrichtung, mockGetRequestContext, mockListReviereinrichtungen } = vi.hoisted(() => ({
  mockCreateReviereinrichtung: vi.fn(),
  mockGetRequestContext: vi.fn(),
  mockListReviereinrichtungen: vi.fn()
}));

vi.mock("../../../../server/auth/context", () => ({
  getRequestContext: mockGetRequestContext
}));

vi.mock("../../../../server/modules/reviereinrichtungen/queries", () => ({
  listReviereinrichtungen: mockListReviereinrichtungen
}));

vi.mock("../../../../server/modules/reviereinrichtungen/service", () => ({
  createReviereinrichtung: mockCreateReviereinrichtung
}));

import { GET, POST } from "./route";

describe("/api/v1/reviereinrichtungen", () => {
  beforeEach(() => {
    mockCreateReviereinrichtung.mockReset();
    mockGetRequestContext.mockReset();
    mockListReviereinrichtungen.mockReset();
    mockGetRequestContext.mockResolvedValue({
      membershipId: "member-jaeger",
      revierId: "revier-attersee",
      role: "jaeger"
    });
  });

  it("returns the list slice", async () => {
    mockListReviereinrichtungen.mockResolvedValue([
      {
        id: "einrichtung-1",
        revierId: "revier-attersee",
        type: "hochstand",
        name: "Hochstand Buchenhang",
        status: "gut",
        location: {
          lat: 47.9161,
          lng: 13.5182,
          label: "Buchenhang"
        },
        beschreibung: "Leiterstand mit Blick auf Schneise und Graben.",
        photos: [],
        kontrollen: [],
        wartung: [],
        letzteKontrolleAt: "2026-03-28T10:00:00+01:00",
        offeneWartungen: 0
      }
    ]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      expect.objectContaining({
        id: "einrichtung-1",
        name: "Hochstand Buchenhang"
      })
    ]);
    expect(mockListReviereinrichtungen).toHaveBeenCalledTimes(1);
  });

  it("creates a facility with GPS, orientation and details", async () => {
    mockCreateReviereinrichtung.mockResolvedValue({ id: "einrichtung-new" });

    const response = await POST(
      new Request("http://localhost/api/v1/reviereinrichtungen", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "kanzel",
          name: "Nordkanzel",
          location: { lat: 48.33597, lng: 16.732315, source: "device-gps" },
          orientationDegrees: 315,
          details: { capacityPersons: 2 }
        })
      })
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: "einrichtung-new" });
    expect(mockCreateReviereinrichtung).toHaveBeenCalledWith({
      type: "kanzel",
      name: "Nordkanzel",
      status: undefined,
      location: { lat: 48.33597, lng: 16.732315, source: "device-gps", label: undefined, accuracyMeters: undefined },
      beschreibung: undefined,
      orientationDegrees: 315,
      details: { capacityPersons: 2 },
      createdByMembershipId: "member-jaeger",
      revierId: "revier-attersee"
    });
  });

  it("rejects creating facilities for the read-only role", async () => {
    mockGetRequestContext.mockResolvedValueOnce({
      membershipId: "member-ausgeher",
      revierId: "revier-attersee",
      role: "ausgeher"
    });

    const response = await POST(
      new Request("http://localhost/api/v1/reviereinrichtungen", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "hochstand", name: "Test", location: { lat: 48, lng: 16 } })
      })
    );

    expect(response.status).toBe(403);
    expect(mockCreateReviereinrichtung).not.toHaveBeenCalled();
  });
});
