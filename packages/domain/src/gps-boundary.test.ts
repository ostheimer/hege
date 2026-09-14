import { describe, it, expect } from "vitest";
import { acceptBoundarySample, createGpsBoundary, type BoundarySample } from "./gps-boundary";
import { mapBounds } from "./revier-map";
const p = (latitude: number, longitude: number, timestamp = 10000): BoundarySample => ({ latitude, longitude, timestamp, accuracy: 5 });
const square = [p(48,16), p(48,16.001), p(48.0005,16.001), p(48.0005,16)];
describe("GPS-Reviergrenzen", () => {
  it("schließt einen gültigen Entwurf und berechnet den Kartenausschnitt", () => {
    const map = createGpsBoundary(square);
    expect(map.areas[0]!.polygons[0]![0]).toHaveLength(5);
    expect(mapBounds(map.areas)?.latitude).toBeCloseTo(48.00025);
  });
  it("verwirft ungenaue Positionen und Sprünge", () => {
    expect(acceptBoundarySample([], {...square[0]!, accuracy: 26})).toBe(false);
    expect(acceptBoundarySample([square[0]!], p(49,17,11000))).toBe(false);
    expect(acceptBoundarySample([square[0]!], p(48,16.0001,20000))).toBe(true);
    expect(acceptBoundarySample([square[0]!], square[0]!)).toBe(false);
  });
  it("verwirft Kreuzungen, degenerierte Flächen und große Ringschluss-Lücken", () => {
    expect(() => createGpsBoundary([square[0]!,square[2]!,square[1]!,square[3]!])).toThrow(/überschneidet/);
    expect(() => createGpsBoundary([p(48,16),p(48,16.0001),p(48,16.0002)])).toThrow(/Fläche/);
    expect(() => createGpsBoundary([p(48,16),p(48,16.01),p(48.01,16.01)])).toThrow(/100 m/);
  });
  it("behandelt fehlende, doppelte und ungültige Daten ohne Grenzerstellung", () => {
    expect(() => createGpsBoundary(null as never)).toThrow();
    expect(() => createGpsBoundary([p(NaN,16),...square])).toThrow();
    expect(() => createGpsBoundary([...square,square[1]!])).toThrow(/Doppelte/);
    expect(mapBounds([])).toBeNull();
  });
});
