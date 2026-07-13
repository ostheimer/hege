import { describe, expect, it } from "vitest";

import {
  formatDirection,
  formatEinrichtungTyp,
  formatWindDirection,
  isAnsitzeinrichtung,
  isFuetterungseinrichtung,
  supportsOrientation
} from "./reviereinrichtung";

describe("reviereinrichtung helpers", () => {
  it("unterscheidet Ansitz- und Fütterungseinrichtungen", () => {
    expect(isAnsitzeinrichtung("kanzel")).toBe(true);
    expect(isAnsitzeinrichtung("kamera")).toBe(false);
    expect(isFuetterungseinrichtung("kirrung")).toBe(true);
    expect(isFuetterungseinrichtung("wildacker")).toBe(false);
  });

  it("erlaubt eine Ausrichtung für Ansitze und Wildkameras", () => {
    expect(supportsOrientation("ansitzleiter")).toBe(true);
    expect(supportsOrientation("kamera")).toBe(true);
    expect(supportsOrientation("salzlecke")).toBe(false);
  });

  it("formatiert Typen und normalisierte Himmelsrichtungen", () => {
    expect(formatEinrichtungTyp("drueckjagdbock")).toBe("Drückjagdbock");
    expect(formatDirection(-45)).toBe("NW · 315°");
    expect(formatWindDirection(90)).toBe("aus O (90°)");
  });
});
