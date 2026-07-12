import { describe, expect, it } from "vitest";

import { canRoleAccess, rolesForFeature } from "./permissions";

describe("role feature matrix", () => {
  it("allows every active revier role to read and create fallwild", () => {
    for (const role of ["ausgeher", "jaeger", "schriftfuehrer", "revier-admin", "platform-admin"] as const) {
      expect(canRoleAccess(role, "fallwild-read")).toBe(true);
      expect(canRoleAccess(role, "fallwild-create")).toBe(true);
    }
  });

  it("restricts destructive fallwild cleanup to management roles", () => {
    expect(rolesForFeature("fallwild-manage")).toEqual([
      "schriftfuehrer",
      "revier-admin",
      "platform-admin"
    ]);
    expect(canRoleAccess("jaeger", "fallwild-manage")).toBe(false);
    expect(canRoleAccess("ausgeher", "fallwild-manage")).toBe(false);
  });

  it("keeps platform admins aligned across managed features", () => {
    for (const feature of [
      "contacts-manage",
      "fallwild-manage",
      "revierarbeit-manage",
      "sitzungen-manage",
      "sitzungen-approve",
      "members-manage"
    ] as const) {
      expect(canRoleAccess("platform-admin", feature)).toBe(true);
    }
  });
});
