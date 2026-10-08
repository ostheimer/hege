import { describe, expect, it } from "vitest";
import { replaceMapRing, ringVertices, validateRevierMap } from "./map-editor";
import { createGpsBoundary } from "./gps-boundary";
const map = createGpsBoundary(
  [
    [48, 16],
    [48, 16.001],
    [48.0005, 16.001],
    [48.0005, 16],
  ].map(([latitude, longitude]) => ({
    latitude: latitude!,
    longitude: longitude!,
    accuracy: 5,
    timestamp: 10000,
  })),
);
describe("Revierkarteneditor", () => {
  it("erhält andere Ringe, Teilflächen und Kartenorte beim Punktverschieben", () => {
    const original = {
      ...map,
      places: [],
      areas: [
        {
          ...map.areas[0]!,
          polygons: [map.areas[0]!.polygons[0]!, map.areas[0]!.polygons[0]!],
        },
      ],
    };
    const address = { area: 0, polygon: 1, ring: 0 };
    const points = ringVertices(original, address);
    points[0] = [16.0001, 48];
    const next = replaceMapRing(original, address, points);
    expect(next.areas[0]!.polygons[0]).toEqual(original.areas[0]!.polygons[0]);
    expect(next.areas[0]!.polygons[1]![0]!.at(-1)).toEqual(points[0]);
    expect(original.areas[0]!.polygons[1]![0]![0]).toEqual([16, 48]);
    expect(next.places).toBe(original.places);
  });
  it("prüft Ringschluss, Mindestfläche, doppelte IDs und Koordinaten", () => {
    expect(() => validateRevierMap(map)).not.toThrow();
    const changed = structuredClone(map);
    changed.areas[0]!.polygons[0]![0]!.pop();
    expect(() => validateRevierMap(changed)).toThrow(/geschlossen/);
    expect(() =>
      validateRevierMap({ ...map, areas: [...map.areas, ...map.areas] }),
    ).toThrow(/doppelte/);
    expect(() =>
      validateRevierMap(
        replaceMapRing(map, { area: 0, polygon: 0, ring: 0 }, [
          [16, 48],
          [16, 48],
          [16, 48],
        ]),
      ),
    ).toThrow(/Doppelte/);
    expect(() =>
      validateRevierMap(
        replaceMapRing(map, { area: 0, polygon: 0, ring: 0 }, [
          [16, 48],
          [16.000001, 48],
          [16, 48.000001],
        ]),
      ),
    ).toThrow(/1 m²/);
    expect(() =>
      validateRevierMap(
        replaceMapRing(map, { area: 0, polygon: 0, ring: 0 }, [
          [NaN, 48],
          [16, 48],
          [16, 49],
        ]),
      ),
    ).toThrow(/koordinaten/i);
  });
});
