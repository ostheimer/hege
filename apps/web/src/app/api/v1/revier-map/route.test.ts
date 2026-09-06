import { beforeEach, describe, expect, it, vi } from "vitest";
import { RouteError } from "../../../../server/http/errors";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), env: vi.fn(), select: vi.fn(), insert: vi.fn(), where: vi.fn(), values: vi.fn(), limit: vi.fn(), returning: vi.fn() }));
vi.mock("../../../../server/auth/context", () => ({ getCurrentAuthContext: mocks.auth }));
vi.mock("../../../../server/env", () => ({ getServerEnv: mocks.env }));
vi.mock("../../../../server/db/client", () => ({ getDb: () => ({ select: mocks.select, insert: mocks.insert }) }));
import { GET, POST } from "./route";
const samples = [[48,16],[48,16.001],[48.0005,16.001],[48.0005,16]].map(([latitude,longitude]) => ({latitude,longitude,accuracy:5,timestamp:10000}));
const request = (body: unknown) => new Request("http://localhost/api/v1/revier-map", {method:"POST",body:JSON.stringify(body)});
describe("Revierkarte: Berechtigungen und Überschreibschutz", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({activeRevierId:"own-revier",membership:{role:"platform-admin"}});
    mocks.env.mockReturnValue({useDemoStore:false});
    mocks.select.mockReturnValue({from:()=>({where:mocks.where})});
    mocks.where.mockReturnValue({limit:mocks.limit});
    mocks.limit.mockResolvedValue([]);
    mocks.insert.mockReturnValue({values:mocks.values});
    mocks.values.mockReturnValue({onConflictDoNothing:()=>({returning:mocks.returning})});
    mocks.returning.mockResolvedValue([{revierId:"own-revier"}]);
  });
  it("verlangt Anmeldung beim Lesen und Schreiben", async () => {
    mocks.auth.mockRejectedValue(new RouteError("Anmeldung erforderlich",401,"unauthenticated"));
    expect((await GET()).status).toBe(401);
    expect((await POST(request({samples}))).status).toBe(401);
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("liefert ohne Karte einen expliziten Leerzustand", async () => {
    expect(await (await GET()).json()).toEqual({map:null});
    expect(mocks.where).toHaveBeenCalledOnce();
  });
  it("verweigert Jägern Schreibzugriff", async () => {
    mocks.auth.mockResolvedValue({activeRevierId:"own-revier",membership:{role:"jaeger"}});
    expect((await POST(request({samples}))).status).toBe(403);
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("validiert GPS-Daten vor dem Datenbankzugriff", async () => {
    expect((await POST(request({samples:[]}))).status).toBe(400);
    expect((await POST(request({samples:[null,null,null]}))).status).toBe(400);
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("ignoriert fremde Revier-ID im Body und schreibt nur das authentifizierte Revier", async () => {
    expect((await POST(request({samples,revierId:"foreign"}))).status).toBe(200);
    expect(mocks.values).toHaveBeenCalledWith(expect.objectContaining({revierId:"own-revier"}));
  });
  it("überschreibt keine vorhandene Karte", async () => {
    mocks.returning.mockResolvedValue([]);
    expect((await POST(request({samples}))).status).toBe(409);
  });
});
