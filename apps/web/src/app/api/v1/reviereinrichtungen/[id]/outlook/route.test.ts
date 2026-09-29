import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ context: vi.fn(), update: vi.fn() }));
vi.mock("../../../../../../server/auth/context", () => ({
  getRequestContext: mocks.context,
}));
vi.mock(
  "../../../../../../server/modules/reviereinrichtungen/outlook",
  async (importOriginal) => ({
    ...(await importOriginal<object>()),
    updateFacilityOutlook: mocks.update,
  }),
);
import { PATCH } from "./route";
const request = () =>
  new Request("http://localhost/api/v1/reviereinrichtungen/stand-1/outlook", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      orientationDegrees: 334,
      additionalViewDirections: [90],
    }),
  });
const params = { params: Promise.resolve({ id: "stand-1" }) };
describe("Blickrichtungen ändern", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.update.mockResolvedValue({ id: "stand-1" });
  });
  it("verwendet den Revierkontext der Anmeldung", async () => {
    mocks.context.mockResolvedValue({
      role: "revier-admin",
      revierId: "revier-a",
    });
    expect((await PATCH(request(), params)).status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith("revier-a", "stand-1", {
      orientationDegrees: 334,
      additionalViewDirections: [90],
    });
  });
  it.each(["jaeger", "ausgeher"])(
    "verweigert Änderungen für %s ohne Verwaltungsrecht",
    async (role) => {
      mocks.context.mockResolvedValue({ role, revierId: "revier-a" });
      expect((await PATCH(request(), params)).status).toBe(403);
      expect(mocks.update).not.toHaveBeenCalled();
    },
  );
});
