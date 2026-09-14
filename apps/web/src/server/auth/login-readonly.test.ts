import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rows: {} as Record<string, unknown[]>, write: vi.fn() }));
vi.mock("../env", () => ({ getServerEnv: () => ({useDemoStore:false,authTokenSecret:"local-test-secret",demoPassword:"9526"}) }));
vi.mock("../db/client", () => ({ getDb: () => ({
  insert: mocks.write, update: mocks.write, execute: mocks.write,
  select: () => ({from: (table: Record<symbol,string>) => ({where: () => {
    const rows = mocks.rows[table[Symbol.for("drizzle:Name")]!] ?? [];
    return Object.assign(Promise.resolve(rows), {limit: async () => rows});
  }})})
}) }));
import { createSeedPasswordHash, login } from "./service";
beforeEach(() => {
  mocks.write.mockReset();
  mocks.rows = {
    users:[{id:"user-steyrer",name:"Andreas Ostheimer",username:"ostheimer",email:"andreas@example.test",phone:"",passwordHash:createSeedPasswordHash(),disabledAt:null}],
    memberships:[{id:"own-membership",userId:"user-steyrer",revierId:"own-revier",role:"platform-admin",functionLabel:"Jäger",jagdzeichen:"",pushEnabled:false}],
    reviere:[{id:"own-revier",tenantKey:"own",name:"Unverändertes echtes Revier",bundesland:"Niederösterreich",bezirk:"Gänserndorf",flaecheHektar:1,zentrumLat:48,zentrumLng:16,setupCompletedAt:"2026-09-05T00:00:00Z"}]
  };
});
it("schreibt bei Anmeldung eines früheren Seed-Benutzers keine Beispieldaten", async () => {
  const session=await login({identifier:"ostheimer",pin:"9526"});
  expect(session.revier.name).toBe("Unverändertes echtes Revier");
  expect(session.membership.functionLabel).toBe("Jäger");
  expect(mocks.write).not.toHaveBeenCalled();
});
it("legt auch nach fehlgeschlagener Anmeldung kein Demo-Konto an", async () => {
  mocks.rows.users=[];
  await expect(login({identifier:"ostheimer",pin:"9526"})).rejects.toMatchObject({status:401});
  expect(mocks.write).not.toHaveBeenCalled();
});
