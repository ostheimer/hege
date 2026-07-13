import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetLocationWeather, mockGetRequestContext } = vi.hoisted(() => ({
  mockGetLocationWeather: vi.fn(),
  mockGetRequestContext: vi.fn()
}));

vi.mock("../../../../../server/auth/context", () => ({
  getRequestContext: mockGetRequestContext
}));

vi.mock("../../../../../server/modules/weather/service", () => ({
  getLocationWeather: mockGetLocationWeather
}));

import { GET } from "./route";

describe("GET /api/v1/weather/point", () => {
  beforeEach(() => {
    mockGetLocationWeather.mockReset();
    mockGetRequestContext.mockReset();
    mockGetRequestContext.mockResolvedValue({ role: "jaeger" });
  });

  it("returns weather and sun data for a point", async () => {
    mockGetLocationWeather.mockResolvedValue({
      source: "geosphere-austria",
      weatherAvailable: true,
      windSpeedKmh: 12,
      sunriseAt: "2026-07-13T03:10:00.000Z",
      sunsetAt: "2026-07-13T18:50:00.000Z"
    });

    const response = await GET(new Request("http://localhost/api/v1/weather/point?lat=48.3&lng=16.7"));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, max-age=300");
    expect(mockGetLocationWeather).toHaveBeenCalledWith({ lat: 48.3, lng: 16.7 });
  });

  it("passes missing coordinates as invalid numbers to validation", async () => {
    mockGetLocationWeather.mockRejectedValue(
      Object.assign(new Error("Ungültige Koordinaten."), { status: 400, code: "validation-error" })
    );

    const response = await GET(new Request("http://localhost/api/v1/weather/point"));

    expect(response.status).toBe(400);
    expect(mockGetLocationWeather).toHaveBeenCalledWith({ lat: Number.NaN, lng: Number.NaN });
  });
});
