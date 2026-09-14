import { describe, expect, it } from "vitest";

import {
  AUSTRIA_DEFAULT_CENTER,
  DEFAULT_REGION_DELTA,
  MIN_REGION_DELTA,
  buildInitialRegion
} from "../components/map-preview.helpers";

describe("buildInitialRegion", () => {
  it("verwendet das Oesterreich-Default, wenn Center fehlt und keine Ansitze vorhanden sind", () => {
    const region = buildInitialRegion(undefined, []);

    expect(region.latitude).toBeCloseTo(AUSTRIA_DEFAULT_CENTER.lat, 6);
    expect(region.longitude).toBeCloseTo(AUSTRIA_DEFAULT_CENTER.lng, 6);
    expect(region.latitudeDelta).toBe(DEFAULT_REGION_DELTA);
    expect(region.longitudeDelta).toBe(DEFAULT_REGION_DELTA);
  });

  it("erzeugt eine minimale Region um das Center, wenn keine Ansitze uebergeben werden", () => {
    const center = { lat: 48.0, lng: 16.0 };
    const region = buildInitialRegion(center, []);

    expect(region.latitude).toBe(48.0);
    expect(region.longitude).toBe(16.0);
    expect(region.latitudeDelta).toBe(DEFAULT_REGION_DELTA);
    expect(region.longitudeDelta).toBe(DEFAULT_REGION_DELTA);
  });

  it("zentriert einen einzelnen Eintrag ohne Revier-Center eng am Standort", () => {
    const region = buildInitialRegion(undefined, [
      { location: { lat: 48.3243612, lng: 16.7227598 } }
    ]);

    expect(region.latitude).toBeCloseTo(48.3243612, 6);
    expect(region.longitude).toBeCloseTo(16.7227598, 6);
    expect(region.latitudeDelta).toBe(MIN_REGION_DELTA);
    expect(region.longitudeDelta).toBe(MIN_REGION_DELTA);
  });

  it("umschliesst Center und Ansitze mit Padding und mittigem Centroid", () => {
    const center = { lat: 48.0, lng: 16.0 };
    const region = buildInitialRegion(center, [
      { location: { lat: 48.1, lng: 16.2 } },
      { location: { lat: 47.9, lng: 15.8 } }
    ]);

    // Bounding-Box: lat 47.9..48.1 (Span 0.2), lng 15.8..16.2 (Span 0.4)
    expect(region.latitude).toBeCloseTo(48.0, 6);
    expect(region.longitude).toBeCloseTo(16.0, 6);
    // Padding 1.4
    expect(region.latitudeDelta).toBeCloseTo(0.2 * 1.4, 6);
    expect(region.longitudeDelta).toBeCloseTo(0.4 * 1.4, 6);
    // Beide Deltas liegen ueber dem Mindestwert
    expect(region.latitudeDelta).toBeGreaterThanOrEqual(MIN_REGION_DELTA);
    expect(region.longitudeDelta).toBeGreaterThanOrEqual(MIN_REGION_DELTA);
  });

  it("haelt mindestens MIN_REGION_DELTA, wenn alle Punkte (fast) deckungsgleich sind", () => {
    const center = { lat: 48.0, lng: 16.0 };
    const region = buildInitialRegion(center, [
      { location: { lat: 48.0001, lng: 16.0001 } }
    ]);

    expect(region.latitudeDelta).toBe(MIN_REGION_DELTA);
    expect(region.longitudeDelta).toBe(MIN_REGION_DELTA);
  });

  it("ignoriert Eintraege ohne valide lat/lng-Koordinaten", () => {
    const center = { lat: 48.0, lng: 16.0 };
    const region = buildInitialRegion(center, [
      // @ts-expect-error - bewusst ungueltige Form, um Robustheit zu pruefen
      { location: undefined },
      { location: { lat: 48.2, lng: 16.4 } }
    ]);

    // Bounding-Box wird nur durch Center und den validen Marker gebildet.
    expect(region.latitude).toBeCloseTo(48.1, 6);
    expect(region.longitude).toBeCloseTo(16.2, 6);
  });
});
