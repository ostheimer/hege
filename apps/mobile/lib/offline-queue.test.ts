import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CreateFallwildRequest } from "./api";
import type { LocalPendingPhoto } from "./fallwild-photos";

const payload: CreateFallwildRequest = {
  location: { lat: 47.9, lng: 13.5, label: "Test" },
  wildart: "Fuchs",
  geschlecht: "weiblich",
  altersklasse: "Adult",
  bergungsStatus: "geborgen",
  gemeinde: "Steinbach am Attersee"
};

const photo: LocalPendingPhoto = {
  id: "photo-1",
  uri: "file:///tmp/photo-1.jpg",
  fileName: "photo-1.jpg",
  mimeType: "image/jpeg"
};

describe("offline queue", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-24T10:00:00.000Z"));
  });

  it("syncs fallwild creation and generated photo uploads in the same run", async () => {
    const createFallwild = vi.fn(async () => ({ id: "fallwild-created" }));
    const uploadFallwildPhoto = vi.fn(async () => ({
      photo: {
        id: "photo-stored",
        title: "stored",
        url: "https://example.test/photo.jpg",
        createdAt: "2026-04-24T10:00:00.000Z"
      }
    }));
    const { queue } = await loadQueueModule({ createFallwild, uploadFallwildPhoto });

    await queue.queueFallwildCreate(payload, [photo]);

    await expect(queue.syncOfflineQueue()).resolves.toEqual([]);
    expect(createFallwild).toHaveBeenCalledWith(payload);
    expect(uploadFallwildPhoto).toHaveBeenCalledWith("fallwild-created", photo);
    expect(await queue.readOfflineQueue()).toEqual([]);
    expect(queue.getOfflineQueueSnapshot()).toMatchObject({
      lastSuccessfulSyncAt: "2026-04-24T10:00:00.000Z",
      lastSuccessfulSyncCount: 1,
      lastSuccessfulSyncKinds: ["fallwild-create"]
    });
  });

  it("backs off failed entries before the next automatic retry", async () => {
    const createFallwild = vi.fn(async () => {
      throw new Error("network down");
    });
    const { queue } = await loadQueueModule({ createFallwild });

    await queue.queueFallwildCreate(payload);
    await queue.syncOfflineQueue();

    let entries = await queue.readOfflineQueue();
    expect(entries[0]).toMatchObject({
      status: "failed",
      attemptCount: 1,
      nextAttemptAt: "2026-04-24T10:01:00.000Z"
    });

    await queue.syncOfflineQueue();
    expect(createFallwild).toHaveBeenCalledTimes(1);

    await queue.syncOfflineQueue({ retryFailed: true });
    expect(createFallwild).toHaveBeenCalledTimes(2);

    vi.setSystemTime(new Date("2026-04-24T10:05:00.000Z"));
    await queue.syncOfflineQueue();

    entries = await queue.readOfflineQueue();
    expect(createFallwild).toHaveBeenCalledTimes(3);
    expect(entries[0]).toMatchObject({
      status: "failed",
      attemptCount: 3,
      nextAttemptAt: "2026-04-24T10:20:00.000Z"
    });
  });

  it("does not automatically retry conflicts until the entry is reset manually", async () => {
    const createFallwild = vi.fn(async () => {
      throw Object.assign(new Error("already changed"), { status: 409 });
    });
    const { queue } = await loadQueueModule({ createFallwild });

    const entry = await queue.queueFallwildCreate(payload);
    await queue.syncOfflineQueue();

    let entries = await queue.readOfflineQueue();
    expect(entries[0]).toMatchObject({
      status: "conflict",
      attemptCount: 1,
      nextAttemptAt: undefined
    });

    vi.setSystemTime(new Date("2026-04-24T11:00:00.000Z"));
    await queue.syncOfflineQueue({ retryFailed: true });
    expect(createFallwild).toHaveBeenCalledTimes(1);

    await queue.retryOfflineQueueEntry(entry.id);
    entries = await queue.readOfflineQueue();
    expect(entries[0]).toMatchObject({
      status: "pending",
      lastError: undefined,
      nextAttemptAt: undefined
    });

    await queue.syncOfflineQueue();
    expect(createFallwild).toHaveBeenCalledTimes(2);
  });
});

async function loadQueueModule({
  createAnsitz = vi.fn(async () => ({ id: "ansitz-created" })),
  createFallwild = vi.fn(async () => ({ id: "fallwild-created" })),
  uploadFallwildPhoto = vi.fn(async () => ({
    photo: {
      id: "photo-stored",
      title: "stored",
      url: "https://example.test/photo.jpg",
      createdAt: "2026-04-24T10:00:00.000Z"
    }
  }))
}: {
  createAnsitz?: ReturnType<typeof vi.fn>;
  createFallwild?: ReturnType<typeof vi.fn>;
  uploadFallwildPhoto?: ReturnType<typeof vi.fn>;
}) {
  const storage = new Map<string, string>();
  const AsyncStorage = {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      storage.set(key, value);
    })
  };

  vi.doMock("@react-native-async-storage/async-storage", () => ({
    default: AsyncStorage
  }));
  vi.doMock("./api", () => ({
    createAnsitz,
    createFallwild,
    isRecoverableMutationError: (error: unknown) =>
      error instanceof TypeError ||
      (typeof error === "object" && error !== null && (error as { recoverable?: boolean }).recoverable === true),
    uploadFallwildPhoto
  }));

  return {
    queue: await import("./offline-queue"),
    AsyncStorage,
    createAnsitz,
    createFallwild,
    uploadFallwildPhoto
  };
}
