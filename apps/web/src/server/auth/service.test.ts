import { describe, expect, it } from "vitest";

import { parseChangePinPayload } from "./schemas";
import { changePin, login } from "./service";

describe("auth service", () => {
  it("logs Andreas Ostheimer in as seeded Ausgeher with username and pin", async () => {
    const session = await login({
      identifier: "ostheimer",
      pin: "9526"
    });

    expect(session.user.email).toBe("andreas@ostheimer.at");
    expect(session.user.name).toBe("Andreas Ostheimer");
    expect(session.membership.role).toBe("ausgeher");
    expect(session.revier.name).toBe("Jagdgesellschaft Gänserndorf");
    expect(session.revier.bezirk).toBe("Gänserndorf");
    expect(session.user).not.toHaveProperty("passwordHash");
  });

  it("keeps a separate seeded admin account for admin-only flows", async () => {
    const session = await login({
      identifier: "revieradmin",
      pin: "9526"
    });

    expect(session.user.name).toBe("Anna Müller");
    expect(session.membership.role).toBe("revier-admin");
    expect(session.user).not.toHaveProperty("passwordHash");
  });

  it("logs a seeded user in with email and pin", async () => {
    const session = await login({
      identifier: "martin.mair@hege.app",
      pin: "9526"
    });

    expect(session.user.name).toBe("Martin Mair");
    expect(session.membership.role).toBe("schriftfuehrer");
    expect(session.user).not.toHaveProperty("passwordHash");
  });

  it("rejects invalid pins", async () => {
    await expect(
      login({
        identifier: "ostheimer",
        pin: "1111"
      })
    ).rejects.toMatchObject({
      code: "unauthenticated",
      status: 401
    });
  });
});

describe("parseChangePinPayload", () => {
  it("accepts two distinct four-digit pins", () => {
    expect(parseChangePinPayload({ currentPin: "9526", newPin: "4711" })).toEqual({
      currentPin: "9526",
      newPin: "4711"
    });
  });

  it("rejects non-four-digit pins", () => {
    expect(() => parseChangePinPayload({ currentPin: "9526", newPin: "12345" })).toThrowError(
      /vierstellige PIN/
    );
    expect(() => parseChangePinPayload({ currentPin: "abcd", newPin: "4711" })).toThrowError(
      /vierstellige PIN/
    );
    expect(() => parseChangePinPayload({ newPin: "4711" })).toThrowError(/vierstellige PIN/);
  });

  it("rejects a new pin equal to the current pin", () => {
    expect(() => parseChangePinPayload({ currentPin: "9526", newPin: "9526" })).toThrowError(
      /unterscheiden/
    );
  });
});

describe("changePin", () => {
  it("is rejected in demo-store mode instead of pretending to persist", async () => {
    // Tests laufen mit NODE_ENV=test -> useDemoStore. Der produktive
    // DB-Pfad (verify + scrypt-Rehash + update) haengt an einer echten
    // Datenbank und wird ueber den Preview-Smoke abgedeckt.
    await expect(changePin("u-andreas", { currentPin: "9526", newPin: "4711" })).rejects.toMatchObject({
      status: 400,
      code: "validation-error"
    });
  });
});
