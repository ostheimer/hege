import { describe, expect, it } from "vitest";
import { loadDashboardContent } from "./dashboard-load";

describe("Startseite bei Teilfehlern", () => {
  const snapshot = { id: "dashboard" };
  it("behält das Dashboard bei fehlendem Aktivitäten-Endpunkt", async () => {
    const result = await loadDashboardContent(async () => snapshot, async () => { throw { status: 404 }; });
    expect(result).toEqual({ snapshot, history: snapshot, historyUnavailable: true });
  });
  it("verwendet die vollständige Historie bei Erfolg", async () => {
    expect(await loadDashboardContent(async () => snapshot, async () => ({ id: "history" })))
      .toEqual({ snapshot, history: { id: "history" }, historyUnavailable: false });
  });
  it.each([401, 403])("verdeckt keinen Berechtigungsfehler %s", async (status) => {
    await expect(loadDashboardContent(async () => snapshot, async () => { throw { status }; })).rejects.toEqual({ status });
  });
  it("gibt Dashboard-Fehler weiter", async () => {
    await expect(loadDashboardContent(async () => { throw Error("Dashboard fehlt"); }, async () => snapshot)).rejects.toThrow("Dashboard fehlt");
  });
});
