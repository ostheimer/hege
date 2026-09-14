import { demoData, type AuthContextResponse } from "@hege/domain";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as demoStore from "../../demo-store";

import { getDashboardSnapshot } from "./queries";

describe("dashboard queries", () => {
  afterEach(() => vi.restoreAllMocks());

  it("liefert die vollständige Historie einschließlich beendeter Ansitze nur aus dem aktiven Revier", async () => {
    const store = demoStore.createDemoStore();
    store.fallwild = Array.from({ length: 9 }, (_, i) => ({ ...store.fallwild[0]!, id: `history-${i}`, revierId: "revier-attersee" }));
    store.notifications = Array.from({ length: 8 }, (_, i) => ({ ...store.notifications[0]!, id: `notification-${i}`, revierId: "revier-attersee" }));
    store.ansitze.push({ ...store.ansitze[0]!, id: "ended-history", status: "completed", revierId: "revier-attersee" });
    store.fallwild.push({ ...store.fallwild[0]!, id: "foreign-fallwild", revierId: "not-authorized" });
    store.notifications.push({ ...store.notifications[0]!, id: "foreign-notification", revierId: "not-authorized" });
    store.ansitze.push({ ...store.ansitze[0]!, id: "foreign-ansitz", revierId: "not-authorized" });
    vi.spyOn(demoStore, "createDemoStore").mockReturnValue(store);
    const history = await getDashboardSnapshot({ context: createDemoAuthContext(), activityHistory: true });
    expect(history.recentFallwild).toHaveLength(9);
    expect(history.overview.letzteBenachrichtigungen).toHaveLength(8);
    expect(history.activeAnsitze.some((item) => item.id === "ended-history")).toBe(true);
    expect([...history.recentFallwild, ...history.activeAnsitze, ...history.overview.letzteBenachrichtigungen].every((item) => item.revierId === "revier-attersee")).toBe(true);
    const dashboard = await getDashboardSnapshot({ context: createDemoAuthContext() });
    expect(dashboard.recentFallwild).toHaveLength(5);
    expect(dashboard.overview.letzteBenachrichtigungen).toHaveLength(5);
    expect(dashboard.activeAnsitze.every((item) => item.status === "active")).toBe(true);
  });
  it("builds the dashboard snapshot from the shared demo store", async () => {
    const context = createDemoAuthContext();
    const snapshot = await getDashboardSnapshot({
      context,
      now: new Date("2026-04-03T12:00:00+02:00")
    });

    expect(snapshot.activeRevierId).toBe("revier-attersee");
    expect(snapshot.overview.aktiveAnsitze).toBe(2);
    expect(snapshot.overview.ansitzeMitKonflikt).toBe(0);
    expect(snapshot.overview.offeneWartungen).toBe(1);
    expect(snapshot.overview.offeneAufgaben).toBeGreaterThanOrEqual(1);
    expect(snapshot.overview.heutigeFallwildBergungen).toBe(1);
    expect(snapshot.overview.unveroeffentlichteProtokolle).toBe(1);
    expect(snapshot.overview.naechsteSitzung?.id).toBe("sitzung-1");
    expect(snapshot.overview.letzteBenachrichtigungen[0]?.id).toBe("notification-2");
    expect(snapshot.activeAnsitze.map((entry) => entry.id)).toEqual(["ansitz-2", "ansitz-1"]);
    expect(snapshot.recentFallwild[0]?.id).toBe("fallwild-1");
  });
});

function createDemoAuthContext(): AuthContextResponse {
  const user = demoData.users[0]!;
  const membership = demoData.memberships[0]!;
  const revier = demoData.reviere[0]!;

    return {
      user,
      membership,
      revier,
      activeRevierId: revier.id,
      setupRequired: false,
      availableMemberships: demoData.memberships.map((membership) => ({
        id: membership.id,
        revierId: membership.revierId,
        role: membership.role,
      jagdzeichen: membership.jagdzeichen,
      revierName: demoData.reviere.find((reier) => reier.id === membership.revierId)?.name ?? ""
    }))
  };
}
