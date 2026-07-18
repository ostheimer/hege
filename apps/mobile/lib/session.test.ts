import type { AuthSessionResponse } from "@hege/domain";
import { beforeEach, describe, expect, it, vi } from "vitest";

const session: AuthSessionResponse = {
  user: {
    id: "user-1",
    email: "andreas@example.test",
    name: "Andreas Ostheimer",
    phone: "+4300000000",
    username: "ostheimer"
  },
  membership: {
    id: "membership-1",
    userId: "user-1",
    revierId: "revier-1",
    role: "ausgeher",
    jagdzeichen: "JG-GF-001",
    pushEnabled: true
  },
  revier: {
    id: "revier-1",
    tenantKey: "gaenserndorf",
    name: "Jagdgesellschaft Gänserndorf",
    bundesland: "Niederösterreich",
    bezirk: "Gänserndorf",
    flaecheHektar: 1200,
    zentrum: {
      lat: 48.339,
      lng: 16.7201
    }
  },
  activeRevierId: "revier-1",
  setupRequired: false,
  availableMemberships: [
    {
      id: "membership-1",
      revierId: "revier-1",
      role: "ausgeher",
      jagdzeichen: "JG-GF-001",
      revierName: "Jagdgesellschaft Gänserndorf"
    }
  ],
  tokens: {
    accessToken: "access-token",
    refreshToken: "refresh-token",
    expiresAt: "2026-05-06T01:00:00.000Z",
    refreshExpiresAt: "2026-06-06T00:00:00.000Z"
  }
};

describe("session restore", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("restores a saved session as locked when device unlock is active", async () => {
    const { module } = await loadSessionModule({ isDeviceUnlockEnabled: true });

    await expect(module.restoreSession()).resolves.toMatchObject({
      status: "locked",
      hydrated: true
    });
    expect(module.getAccessToken()).toBe("access-token");

    expect(module.unlockStoredSession()).toMatchObject({
      user: {
        id: "user-1"
      }
    });
    expect(module.getSessionSnapshot()).toMatchObject({
      status: "authenticated",
      hydrated: true
    });
  });

  it("restores a saved session as authenticated when device unlock is inactive", async () => {
    const { module } = await loadSessionModule({ isDeviceUnlockEnabled: false });

    await expect(module.restoreSession()).resolves.toMatchObject({
      status: "authenticated",
      hydrated: true
    });
  });
});

async function loadSessionModule({ isDeviceUnlockEnabled }: { isDeviceUnlockEnabled: boolean }) {
  const storage = new Map<string, string>([["hege.mobile.session", JSON.stringify(session)]]);
  const AsyncStorage = {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      storage.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      storage.delete(key);
    })
  };

  vi.doMock("@react-native-async-storage/async-storage", () => ({
    default: AsyncStorage
  }));
  vi.doMock("./device-unlock", () => ({
    isDeviceUnlockEnabled: vi.fn(async () => isDeviceUnlockEnabled)
  }));
  vi.doMock("./offline-queue", () => ({
    bindOfflineQueueToMembership: vi.fn(async () => [])
  }));

  return {
    module: await import("./session"),
    AsyncStorage
  };
}
