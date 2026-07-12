import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockDeleteFallwildVorgang, mockGetFallwildById, mockGetRequestContext } = vi.hoisted(() => ({
  mockDeleteFallwildVorgang: vi.fn(),
  mockGetFallwildById: vi.fn(),
  mockGetRequestContext: vi.fn()
}));

vi.mock("../../../../../server/auth/context", () => ({
  getRequestContext: mockGetRequestContext
}));

vi.mock("../../../../../server/modules/fallwild/queries", () => ({
  getFallwildById: mockGetFallwildById
}));

vi.mock("../../../../../server/modules/fallwild/service", () => ({
  deleteFallwildVorgang: mockDeleteFallwildVorgang
}));

import { DELETE, GET } from "./route";

describe("GET /api/v1/fallwild/:id", () => {
  beforeEach(() => {
    mockGetFallwildById.mockReset();
    mockDeleteFallwildVorgang.mockReset();
    mockGetRequestContext.mockReset();
    mockGetRequestContext.mockResolvedValue({
      membershipId: "member-jaeger",
      revierId: "revier-attersee",
      role: "jaeger"
    });
  });

  it("returns the requested fallwild detail with photos", async () => {
    mockGetFallwildById.mockResolvedValue({
      id: "fallwild-1",
      photos: [
        {
          id: "photo-1",
          title: "Unfallstelle",
          url: "https://storage.example/photo-1.jpg",
          createdAt: "2026-04-03T06:56:00.000Z"
        }
      ]
    });

    const response = await GET(new Request("http://localhost/api/v1/fallwild/fallwild-1"), {
      params: Promise.resolve({
        id: "fallwild-1"
      })
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      id: "fallwild-1",
      photos: [
        {
          id: "photo-1",
          title: "Unfallstelle",
          url: "https://storage.example/photo-1.jpg",
          createdAt: "2026-04-03T06:56:00.000Z"
        }
      ]
    });
    expect(mockGetFallwildById).toHaveBeenCalledWith("fallwild-1");
  });

  it("returns 404 when the fallwild entry does not exist", async () => {
    mockGetFallwildById.mockResolvedValue(undefined);

    const response = await GET(new Request("http://localhost/api/v1/fallwild/fallwild-404"), {
      params: Promise.resolve({
        id: "fallwild-404"
      })
    });

    expect(response.status).toBe(404);
  });

  it("allows platform admins to read fallwild consistently", async () => {
    mockGetRequestContext.mockResolvedValueOnce({
      membershipId: "member-admin",
      revierId: "revier-attersee",
      role: "platform-admin"
    });
    mockGetFallwildById.mockResolvedValueOnce({ id: "fallwild-1", photos: [] });

    const response = await GET(new Request("http://localhost/api/v1/fallwild/fallwild-1"), {
      params: Promise.resolve({
        id: "fallwild-1"
      })
    });

    expect(response.status).toBe(200);
    expect(mockGetFallwildById).toHaveBeenCalledWith("fallwild-1");
  });
});

describe("DELETE /api/v1/fallwild/:id", () => {
  beforeEach(() => {
    mockDeleteFallwildVorgang.mockReset();
    mockGetRequestContext.mockReset();
    mockGetRequestContext.mockResolvedValue({
      membershipId: "member-schriftfuehrer",
      revierId: "revier-attersee",
      role: "schriftfuehrer"
    });
  });

  it("deletes a fallwild entry inside the active revier", async () => {
    mockDeleteFallwildVorgang.mockResolvedValue({ deleted: true, id: "fallwild-1" });

    const response = await DELETE(new Request("http://localhost/api/v1/fallwild/fallwild-1"), {
      params: Promise.resolve({ id: "fallwild-1" })
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ deleted: true, id: "fallwild-1" });
    expect(mockDeleteFallwildVorgang).toHaveBeenCalledWith({
      fallwildId: "fallwild-1",
      revierId: "revier-attersee"
    });
  });

  it("rejects destructive cleanup for field roles", async () => {
    mockGetRequestContext.mockResolvedValueOnce({
      membershipId: "member-jaeger",
      revierId: "revier-attersee",
      role: "jaeger"
    });

    const response = await DELETE(new Request("http://localhost/api/v1/fallwild/fallwild-1"), {
      params: Promise.resolve({ id: "fallwild-1" })
    });

    expect(response.status).toBe(403);
    expect(mockDeleteFallwildVorgang).not.toHaveBeenCalled();
  });

  it("maps missing scoped entries to not found", async () => {
    mockDeleteFallwildVorgang.mockRejectedValue(
      Object.assign(new Error("Fallwild-Vorgang wurde nicht gefunden."), { status: 404 })
    );

    const response = await DELETE(new Request("http://localhost/api/v1/fallwild/fallwild-404"), {
      params: Promise.resolve({ id: "fallwild-404" })
    });

    expect(response.status).toBe(404);
  });
});
