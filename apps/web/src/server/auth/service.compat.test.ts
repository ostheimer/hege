import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    execute: vi.fn(),
    select: vi.fn()
  }
}));

vi.mock("../db/client", () => ({
  getDb: () => mockDb
}));

vi.mock("../env", () => ({
  getServerEnv: () => ({
    authTokenSecret: "compat-secret",
    demoPassword: "9526",
    useDemoStore: false
  })
}));

import { memberships, reviere, users } from "../db/schema";
import { hashPassword } from "./passwords";
import { login, resolveAuthContext } from "./service";

describe("auth service legacy schema compatibility", () => {
  beforeEach(() => {
    mockDb.execute.mockReset();
    mockDb.select.mockImplementation(() => createSelectBuilder());
  });

  it("logs in with a derived username when users.username is missing", async () => {
    mockDb.execute.mockImplementation(createLegacyUserExecuteMock());

    const session = await login({
      identifier: "ostheimer",
      pin: "9526"
    });

    expect(session.user.email).toBe("andreas@ostheimer.at");
    expect(session.user.username).toBe("ostheimer");
    expect(session.membership.role).toBe("ausgeher");
    expect(mockDb.execute).toHaveBeenCalled();
  });

  it("resolves auth context from a legacy users table without username", async () => {
    mockDb.execute.mockResolvedValueOnce({
      rows: [createLegacyUserRow()]
    });

    const context = await resolveAuthContext({
      membershipId: "member-ausgeher",
      revierId: "revier-attersee",
      role: "ausgeher",
      userId: "user-steyrer"
    });

    expect(context.user.email).toBe("andreas@ostheimer.at");
    expect(context.user.username).toBe("ostheimer");
    expect(context.revier.name).toBe("Jagdgesellschaft Gänserndorf");
  });

  it("reads known users on legacy schemas without seeding during login", async () => {
    mockDb.execute.mockImplementation(createLegacyUserExecuteMock());

    const session = await login({
      identifier: "ostheimer",
      pin: "9526"
    });

    expect(session.user.email).toBe("andreas@ostheimer.at");
    expect(mockDb.execute).toHaveBeenCalled();
    expect(mockDb.execute.mock.calls.map(([query]) => stringifyQuery(query)).every(query => !query.includes("insert into"))).toBe(true);
  });

  it("does not overwrite administered seed users or memberships during login", async () => {
    mockDb.execute.mockImplementation(createLegacyUserExecuteMock());
    mockDb.select.mockImplementation(() => createSelectBuilder({ hasUsernameColumn: true }));

    await login({
      identifier: "ostheimer",
      pin: "9526"
    });

    const protectedSeedWrites = mockDb.execute.mock.calls
      .map(([query]) => stringifyQuery(query))
      .filter(
        (query) => query.includes("insert into") || query.includes("update ")
      );

    expect(protectedSeedWrites).toEqual([]);
  });
});

function createSelectBuilder({ hasUsernameColumn = false }: { hasUsernameColumn?: boolean } = {}) {
  return {
    from(table: unknown) {
      if (table === users) {
        return {
          where() {
            return {
              async limit() {
                if (hasUsernameColumn) {
                  return [{ ...createLegacyUserRow(), disabledAt: null }];
                }
                throw Object.assign(new Error('column "username" does not exist'), {
                  code: "42703"
                });
              }
            };
          }
        };
      }

      if (table === memberships) {
        return {
          async where() {
            return [
              {
                id: "member-ausgeher",
                jagdzeichen: "AO-01",
                pushEnabled: true,
                revierId: "revier-attersee",
                role: "ausgeher",
                userId: "user-steyrer"
              }
            ];
          }
        };
      }

      if (table === reviere) {
        return {
          where() {
            return {
              async limit() {
                return [
                  {
                    bezirk: "Gänserndorf",
                    bundesland: "Niederösterreich",
                    flaecheHektar: 2150,
                    id: "revier-attersee",
                    name: "Jagdgesellschaft Gänserndorf",
                    tenantKey: "gaenserndorf",
                    zentrumLabel: "Gänserndorf",
                    zentrumLat: 48.3394,
                    zentrumLng: 16.7202
                  }
                ];
              }
            };
          }
        };
      }

      throw new Error("Unexpected table access in auth compatibility test.");
    }
  };
}

function createLegacyUserExecuteMock() {
  return async (query: unknown) => {
    if (isLegacyUserLookupQuery(query)) {
      return { rows: [createLegacyUserRow()] };
    }

    return { rows: [] };
  };
}

function isLegacyUserLookupQuery(query: unknown): boolean {
  const text = stringifyQuery(query);
  return (
    text.includes("from users") &&
    text.includes("split_part(email") &&
    !text.includes("insert into users")
  );
}

function stringifyQuery(query: unknown): string {
  if (!query) {
    return "";
  }
  if (typeof query === "string") {
    return query;
  }
  if (typeof query === "object") {
    const candidate = query as { queryChunks?: unknown; sql?: string };
    if (typeof candidate.sql === "string") {
      return candidate.sql;
    }
    if (Array.isArray(candidate.queryChunks)) {
      return candidate.queryChunks
        .map((chunk) => {
          if (chunk && typeof chunk === "object" && "value" in chunk) {
            const value = (chunk as { value?: unknown }).value;
            return Array.isArray(value) ? value.join(" ") : String(value ?? "");
          }
          return String(chunk ?? "");
        })
        .join(" ");
    }
  }
  return String(query);
}

function createLegacyUserRow() {
  return {
    email: "andreas@ostheimer.at",
    id: "user-steyrer",
    name: "Andreas Ostheimer",
    passwordHash: hashPassword("9526"),
    phone: "+43 660 0000000",
    username: "ostheimer"
  };
}
