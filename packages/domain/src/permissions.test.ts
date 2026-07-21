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
      "members-manage",
      "platform-users-manage",
      "platform-users-impersonate"
    ] as const) {
      expect(canRoleAccess("platform-admin", feature)).toBe(true);
    }
  });

  it("reserves platform user management and impersonation for platform admins", () => {
    expect(rolesForFeature("platform-users-manage")).toEqual(["platform-admin"]);
    expect(rolesForFeature("platform-users-impersonate")).toEqual(["platform-admin"]);
    expect(canRoleAccess("revier-admin", "platform-users-manage")).toBe(false);
  });
});
