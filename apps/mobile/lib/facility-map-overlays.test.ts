import { describe, expect, it } from "vitest";
import type { LocationWeather } from "@hege/domain";
import { currentWind, destination, viewCone, windArrow, windArrowPolygon } from "./facility-map-overlays";
const origin = { lat: 48, lng: 16 };
const now = Date.parse("2026-09-28T12:00:00Z");
const weather: LocationWeather = {
  source: "geosphere-austria", retrievedAt: new Date(now).toISOString(), validAt: new Date(now).toISOString(),
  location: origin, weatherAvailable: true, windSpeedKmh: 8, windDirectionDegrees: 0,
  sunriseAt: "2026-09-28T05:00:00Z", sunsetAt: "2026-09-28T17:00:00Z", dawnAt: "2026-09-28T04:30:00Z", duskAt: "2026-09-28T17:30:00Z"
};
describe("Blickfeld und Wind auf geografischer Karte", () => {
  it("zeichnet den Nord-Trichter geschlossen und symmetrisch über 360° hinweg", () => {
    const cone = viewCone(origin, 0);
    expect(cone[0]).toEqual(cone.at(-1));
    expect(cone[1]!.longitude).toBeLessThan(origin.lng);
    expect(cone.at(-2)!.longitude).toBeGreaterThan(origin.lng);
    expect(cone[9]!.latitude).toBeGreaterThan(origin.lat);
    expect(cone[9]!.longitude).toBeCloseTo(origin.lng, 8);
  });
  it("dreht den Trichter für Osten und die reale Abnahme mit 334°", () => {
    expect(viewCone(origin, 90)[9]!.longitude).toBeGreaterThan(origin.lng);
    const northwest = viewCone(origin, 334)[9]!;
    expect(northwest.latitude).toBeGreaterThan(origin.lat);
    expect(northwest.longitude).toBeLessThan(origin.lng);
  });
  it("erfindet bei fehlender oder ungültiger Blickrichtung keinen Nord-Trichter", () => {
    expect(viewCone(origin, undefined)).toEqual([]);
    expect(viewCone(origin, NaN)).toEqual([]);
  });
  it("zeichnet Nordwind von Norden nach Süden, Westwind nach Osten", () => {
    const north = windArrow(origin, 0);
    expect(north.shaft[0]!.latitude).toBeGreaterThan(origin.lat);
    expect(north.shaft[1]!.latitude).toBeLessThan(origin.lat);
    expect(north.head[0]!.latitude).toBeGreaterThan(north.head[1]!.latitude);
    const west = windArrow(origin, 270);
    expect(west.shaft[0]!.longitude).toBeLessThan(west.shaft[1]!.longitude);
  });
  it("bleibt bei hohen Breitengraden und am Datumsmeridian endlich", () => {
    const result = destination({ lat: 89, lng: 179.999 }, 90, 180);
    expect(Number.isFinite(result.latitude)).toBe(true);
    expect(Math.abs(result.longitude)).toBeLessThanOrEqual(180);
  });
});
describe("Aktualität der Windangabe", () => {
  it("akzeptiert echten Nordwind bei 0°", () => {
    expect(currentWind(weather, now)).toEqual({ state: "current", fromDegrees: 0 });
  });
  it("verwendet bei fehlender Richtung keinen erfundenen Nordwind", () => {
    expect(currentWind({ ...weather, windDirectionDegrees: undefined }, now).state).toBe("unavailable");
  });
  it("unterdrückt den Pfeil bei Windstille, Ausfall und ungültiger Stärke", () => {
    expect(currentWind({ ...weather, windSpeedKmh: 0 }, now).state).toBe("calm");
    expect(currentWind({ ...weather, weatherAvailable: false }, now).state).toBe("unavailable");
    expect(currentWind({ ...weather, windSpeedKmh: NaN }, now).state).toBe("unavailable");
    expect(currentWind(null, now).state).toBe("unavailable");
  });
  it("prüft Messzeit statt allein die frische Abrufzeit", () => {
    expect(currentWind({ ...weather, validAt: "2026-09-28T09:00:00Z" }, now).state).toBe("stale");
    expect(currentWind({ ...weather, validAt: "invalid" }, now).state).toBe("stale");
    expect(currentWind({ ...weather, validAt: "2026-09-28T14:00:00Z" }, now).state).toBe("stale");
  });
});

describe("sichtbarer Windpfeil", () => {
  it("hat bei Nordwind eine südliche Spitze und eine geschlossene Fläche", () => {
    const polygon = windArrowPolygon(origin, 0);
    expect(polygon[0]).toEqual(polygon.at(-1));
    expect(polygon[3]!.latitude).toBeLessThan(origin.lat);
    expect(polygon[2]!.longitude).not.toBe(polygon[4]!.longitude);
  });
  it("dreht den gesamten Pfeil bei Ostwind nach Westen", () => {
    const polygon = windArrowPolygon(origin, 90);
    expect(polygon[3]!.longitude).toBeLessThan(origin.lng);
    expect(polygon[0]!.longitude).toBeGreaterThan(origin.lng);
  });
});
