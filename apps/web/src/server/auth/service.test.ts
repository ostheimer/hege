import { describe, expect, it } from "vitest";

import { parseChangePinPayload } from "./schemas";
import {
  changePin,
  createImpersonatedSession,
  endImpersonatedSession,
  login
} from "./service";
import { verifyAccessToken } from "./tokens";

describe("auth service", () => {
  it("logs Andreas Ostheimer in as seeded platform admin with username and pin", async () => {
    const session = await login({
      identifier: "ostheimer",
      pin: "9526"
    });

    expect(session.user.email).toBe("andreas@ostheimer.at");
    expect(session.user.name).toBe("Andreas Ostheimer");
    expect(session.membership.role).toBe("platform-admin");
    expect(session.revier.name).toBe("Jagdgesellschaft Gänserndorf");
    expect(session.revier.bezirk).toBe("Gänserndorf");
    expect(session.user).not.toHaveProperty("passwordHash");
  });

  it("issues an auditable impersonation session and restores the platform admin", async () => {
    const actor = await login({ identifier: "ostheimer", pin: "9526" });
    const startedAt = "2026-07-21T14:00:00.000Z";
    const impersonated = await createImpersonatedSession(
      verifyAccessToken(actor.tokens.accessToken),
      "member-jaeger",
      { sessionId: "impersonation-1", startedAt }
    );

    expect(impersonated.user.name).toBe("Lukas Huber");
    expect(impersonated.membership.role).toBe("jaeger");
    expect(impersonated.impersonation).toEqual({
      sessionId: "impersonation-1",
      actor: actor.user,
      startedAt
    });
    expect(verifyAccessToken(impersonated.tokens.accessToken).impersonator).toMatchObject({
      userId: actor.user.id,
      membershipId: actor.membership.id,
      role: "platform-admin"
    });

    const restored = await endImpersonatedSession(verifyAccessToken(impersonated.tokens.accessToken));
    expect(restored.user.id).toBe(actor.user.id);
    expect(restored.membership.role).toBe("platform-admin");
    expect(restored.impersonation).toBeUndefined();
  });

  it("rejects nested and self impersonation", async () => {
    const actor = await login({ identifier: "ostheimer", pin: "9526" });
    const actorContext = verifyAccessToken(actor.tokens.accessToken);

    await expect(
      createImpersonatedSession(actorContext, actor.membership.id, {
        sessionId: "self",
        startedAt: new Date().toISOString()
      })
    ).rejects.toMatchObject({ status: 409, code: "conflict" });

    const impersonated = await createImpersonatedSession(actorContext, "member-jaeger", {
      sessionId: "first",
      startedAt: new Date().toISOString()
    });
    await expect(
      createImpersonatedSession(verifyAccessToken(impersonated.tokens.accessToken), "member-schrift", {
        sessionId: "nested",
        startedAt: new Date().toISOString()
      })
    ).rejects.toMatchObject({ status: 409, code: "conflict" });
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
