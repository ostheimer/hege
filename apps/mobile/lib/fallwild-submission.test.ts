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
  mimeType: "image/jpeg",
  title: "Foto 1"
};

describe("fallwild submission", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("queues the full fallwild submission when creation fails recoverably", async () => {
    const { module, queueFallwildCreate } = await loadSubmissionModule({
      createFallwild: vi.fn(async () => {
        throw Object.assign(new Error("offline"), { recoverable: true });
      })
    });

    await expect(module.submitFallwildSubmission(payload, [photo])).resolves.toEqual({
      mode: "queued",
      uploadedCount: 0,
      queuedCount: 1
    });
    expect(queueFallwildCreate).toHaveBeenCalledWith(payload, [photo], "member-a");
  });

  it("queues remaining photos when upload fails recoverably", async () => {
    const queueFallwildPhotoUploads = vi.fn(async () => []);
    const { module, uploadFallwildPhoto } = await loadSubmissionModule({
      queueFallwildPhotoUploads,
      uploadFallwildPhoto: vi
        .fn()
        .mockResolvedValueOnce({ photo: { id: "stored", title: "stored", url: "https://example.test", createdAt: "2026-04-24T10:00:00.000Z" } })
        .mockRejectedValueOnce(Object.assign(new Error("timeout"), { recoverable: true }))
    });
    const secondPhoto = { ...photo, id: "photo-2", fileName: "photo-2.jpg" };

    await expect(module.submitFallwildSubmission(payload, [photo, secondPhoto])).resolves.toEqual({
      mode: "partial",
      createdId: "fallwild-created",
      uploadedCount: 1,
      queuedCount: 1
    });
    expect(uploadFallwildPhoto).toHaveBeenCalledTimes(2);
    expect(queueFallwildPhotoUploads).toHaveBeenCalledWith(
      "fallwild-created",
      [secondPhoto],
      "member-a"
    );
  });

  it("throws non-recoverable upload errors without queueing photos", async () => {
    const queueFallwildPhotoUploads = vi.fn(async () => []);
    const { module } = await loadSubmissionModule({
      queueFallwildPhotoUploads,
      uploadFallwildPhoto: vi.fn(async () => {
        throw new Error("validation failed");
      })
    });

    await expect(module.submitFallwildSubmission(payload, [photo])).rejects.toThrow("validation failed");
    expect(queueFallwildPhotoUploads).not.toHaveBeenCalled();
  });

  it("does not start photo uploads after the membership changed", async () => {
    const uploadFallwildPhoto = vi.fn(async () => ({ photo: { id: "stored" } }));
    const { module } = await loadSubmissionModule({
      assertOfflineQueueMembershipActive: vi.fn(() => {
        throw new Error("Offline queue membership changed during the operation.");
      }),
      uploadFallwildPhoto
    });

    await expect(module.submitFallwildSubmission(payload, [photo])).rejects.toThrow(
      "Offline queue membership changed during the operation."
    );
    expect(uploadFallwildPhoto).not.toHaveBeenCalled();
  });
});

async function loadSubmissionModule({
  assertOfflineQueueMembershipActive = vi.fn(),
  createFallwild = vi.fn(async () => ({ id: "fallwild-created" })),
  queueFallwildCreate = vi.fn(async () => undefined),
  queueFallwildPhotoUploads = vi.fn(async () => []),
  uploadFallwildPhoto = vi.fn(async () => ({
    photo: {
      id: "photo-stored",
      title: "stored",
      url: "https://example.test/photo.jpg",
      createdAt: "2026-04-24T10:00:00.000Z"
    }
  }))
}: {
  assertOfflineQueueMembershipActive?: ReturnType<typeof vi.fn>;
  createFallwild?: ReturnType<typeof vi.fn>;
  queueFallwildCreate?: ReturnType<typeof vi.fn>;
  queueFallwildPhotoUploads?: ReturnType<typeof vi.fn>;
  uploadFallwildPhoto?: ReturnType<typeof vi.fn>;
}) {
  vi.doMock("./api", () => ({
    createFallwild,
    isRecoverableMutationError: (error: unknown) =>
      error instanceof TypeError ||
      (typeof error === "object" && error !== null && (error as { recoverable?: boolean }).recoverable === true),
    MobileApiError: class MobileApiError extends Error {
      constructor(
        message: string,
        readonly status: number,
        readonly code: string
      ) {
        super(message);
      }
    },
    uploadFallwildPhoto
  }));
  vi.doMock("./offline-queue", () => ({
    assertOfflineQueueMembershipActive,
    getBoundOfflineQueueMembershipId: () => "member-a",
    queueFallwildCreate,
    queueFallwildPhotoUploads
  }));

  return {
    module: await import("./fallwild-submission"),
    createFallwild,
    queueFallwildCreate,
    queueFallwildPhotoUploads,
    uploadFallwildPhoto
  };
}
