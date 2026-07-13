import { beforeEach, describe, expect, it, vi } from "vitest";

import { clearWeatherCacheForTests, getLocationWeather } from "./service";

const LOCATION = { lat: 48.33597, lng: 16.732315, label: "Nordkanzel" };
const NOW = new Date("2026-07-13T10:00:00.000Z");

describe("getLocationWeather", () => {
  beforeEach(() => clearWeatherCacheForTests());

  it("liest Wind und Temperatur aus dem GeoSphere-Nowcast", async () => {
    const fetcher = vi.fn(async (_input: URL | RequestInfo) =>
      new Response(
        JSON.stringify({
          timestamps: ["2026-07-13T10:15:00Z"],
          features: [
            {
              properties: {
                parameters: {
                  t2m: { data: [22.3] },
                  ff: { data: [5] },
                  dd: { data: [270] },
                  fx: { data: [8] },
                  rr: { data: [0] }
                }
              }
            }
          ]
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );

    const result = await getLocationWeather(LOCATION, { fetcher: fetcher as typeof fetch, now: () => NOW });

    expect(result).toMatchObject({
      source: "geosphere-austria",
      weatherAvailable: true,
      temperatureC: 22.3,
      windSpeedKmh: 18,
      windDirectionDegrees: 270,
      windGustKmh: 28.8,
      precipitationMm: 0,
      validAt: "2026-07-13T10:15:00.000Z"
    });
    expect(Date.parse(result.sunriseAt)).not.toBeNaN();
    expect(Date.parse(result.sunsetAt)).not.toBeNaN();
    expect(String(fetcher.mock.calls[0]?.[0])).toContain("parameters=t2m%2Cff%2Cdd%2Cfx%2Crr");
  });

  it("liefert Sonnenzeiten auch bei einem Wetterausfall", async () => {
    const result = await getLocationWeather(LOCATION, {
      fetcher: vi.fn(async () => {
        throw new Error("offline");
      }) as typeof fetch,
      now: () => NOW
    });

    expect(result.weatherAvailable).toBe(false);
    expect(result.windSpeedKmh).toBeUndefined();
    expect(Date.parse(result.dawnAt)).not.toBeNaN();
    expect(Date.parse(result.duskAt)).not.toBeNaN();
  });

  it("cached denselben Kartenpunkt fünf Minuten lang", async () => {
    const fetcher = vi.fn(async () =>
      new Response(
        JSON.stringify({
          timestamps: ["2026-07-13T10:15:00Z"],
          features: [{ properties: { parameters: {
            t2m: { data: [20] }, ff: { data: [1] }, dd: { data: [0] }, fx: { data: [2] }
          } } }]
        }),
        { status: 200 }
      )
    );

    await getLocationWeather(LOCATION, { fetcher: fetcher as typeof fetch, now: () => NOW });
    await getLocationWeather(LOCATION, {
      fetcher: fetcher as typeof fetch,
      now: () => new Date(NOW.valueOf() + 60_000)
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
