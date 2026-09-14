import { beforeEach, describe, expect, it, vi } from "vitest";
import { RouteError } from "../../../../server/http/errors";

const { getSnapshot } = vi.hoisted(() => ({ getSnapshot: vi.fn() }));
vi.mock("../../../../server/modules/dashboard/queries", () => ({ getDashboardSnapshot: getSnapshot }));
import { GET } from "./route";

describe("GET /api/v1/activities", () => {
  beforeEach(() => { getSnapshot.mockReset(); });
  it("gibt ohne Anmeldung keine Aktivitäten aus", async () => {
    getSnapshot.mockRejectedValue(new RouteError("Anmeldung erforderlich.", 401, "unauthenticated"));
    expect((await GET()).status).toBe(401);
  });
  it("liefert nur die Aktivitäten und keine zusätzlichen Kontodaten", async () => {
    getSnapshot.mockResolvedValue({ activeAnsitze: [], recentFallwild: [], overview: { letzteBenachrichtigungen: [] }, user: { email: "private@example.test" } });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ activeAnsitze: [], recentFallwild: [], overview: { letzteBenachrichtigungen: [] } });
    expect(getSnapshot).toHaveBeenCalledWith({ activityHistory: true });
  });
});
