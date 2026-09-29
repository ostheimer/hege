import { describe, expect, it, vi, beforeEach } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
const mocks = vi.hoisted(() => ({
  returning: vi.fn(),
  where: vi.fn(),
  set: vi.fn(),
}));
vi.mock("../../db/client", () => ({
  getDb: () => ({ update: () => ({ set: mocks.set }) }),
}));
vi.mock("../../env", () => ({ getServerEnv: () => ({ useDemoStore: false }) }));
import { parseFacilityOutlook, updateFacilityOutlook } from "./outlook";

describe("Blickrichtungen einer Einrichtung", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.set.mockReturnValue({ where: mocks.where });
    mocks.where.mockReturnValue({ returning: mocks.returning });
    mocks.returning.mockResolvedValue([{ id: "stand-1" }]);
  });
  it("erhält die genaue Hauptblickrichtung und entfernt doppelte Fenster", () => {
    expect(
      parseFacilityOutlook({
        orientationDegrees: 334,
        additionalViewDirections: [90, 180, 90, 334],
      }),
    ).toEqual({ orientationDegrees: 334, additionalViewDirections: [90, 180] });
    expect(
      parseFacilityOutlook({
        orientationDegrees: 0,
        additionalViewDirections: [],
      }).orientationDegrees,
    ).toBe(0);
  });
  it.each([
    null,
    {},
    { orientationDegrees: 360, additionalViewDirections: [] },
    { orientationDegrees: 0, additionalViewDirections: [-1] },
    { orientationDegrees: 0, additionalViewDirections: Array(8).fill(45) },
    { orientationDegrees: "NW", additionalViewDirections: [] },
  ])("weist ungültige Richtungen zurück: %j", (input) => {
    expect(() => parseFacilityOutlook(input)).toThrow();
  });
  it("begrenzt Änderungen auf Einrichtung UND aktives Revier und ergänzt das bestehende JSON", async () => {
    await updateFacilityOutlook("revier-a", "stand-1", {
      orientationDegrees: 334,
      additionalViewDirections: [90],
    });
    const dialect = new PgDialect();
    const scope = dialect.sqlToQuery(mocks.where.mock.calls[0]![0]);
    expect(scope.params).toEqual(["stand-1", "revier-a"]);
    expect(scope.sql).toContain('"revier_id"');
    const details = dialect.sqlToQuery(mocks.set.mock.calls[0]![0].details);
    expect(details.sql).toContain('coalesce("reviereinrichtungen"."details"');
    expect(details.params).toEqual(['{"additionalViewDirections":[90]}']);
  });
  it("meldet ein fremdes oder fehlendes Objekt als nicht gefunden", async () => {
    mocks.returning.mockResolvedValue([]);
    await expect(
      updateFacilityOutlook("revier-b", "stand-1", {
        orientationDegrees: 0,
        additionalViewDirections: [],
      }),
    ).rejects.toMatchObject({ status: 404 });
  });
});
