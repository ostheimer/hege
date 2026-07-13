import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CreateReviereinrichtungRequest } from "./api";
import type { LocalPendingPhoto } from "./reviereinrichtung-photos";

const payload: CreateReviereinrichtungRequest = {
  type: "hochstand",
  name: "Teststand",
  location: { lat: 48.3, lng: 16.7 }
};
const photo: LocalPendingPhoto = {
  id: "photo-1",
  uri: "file:///tmp/photo.jpg",
  fileName: "photo.jpg",
  mimeType: "image/jpeg"
};

describe("submitReviereinrichtung", () => {
  beforeEach(() => vi.resetModules());

  it("speichert Einrichtung und Fotos direkt", async () => {
    const api = await loadModule();

    await expect(api.module.submitReviereinrichtung(payload, [photo])).resolves.toEqual({
      mode: "sent",
      createdId: "einrichtung-1",
      uploadedCount: 1,
      queuedCount: 0
    });
    expect(api.uploadReviereinrichtungPhoto).toHaveBeenCalledWith("einrichtung-1", photo);
  });

  it("merkt den gesamten Vorgang bei einem Netzwerkfehler offline vor", async () => {
    const api = await loadModule({
      createReviereinrichtung: vi.fn(async () => { throw new TypeError("Network request failed"); })
    });

    await expect(api.module.submitReviereinrichtung(payload, [photo])).resolves.toEqual({
      mode: "queued",
      uploadedCount: 0,
      queuedCount: 1
    });
    expect(api.queueReviereinrichtungCreate).toHaveBeenCalledWith(payload, [photo]);
  });

  it("stellt nur noch nicht hochgeladene Fotos in die Queue", async () => {
    const second = { ...photo, id: "photo-2", fileName: "photo-2.jpg" };
    const upload = vi.fn()
      .mockResolvedValueOnce({ photo: { id: "stored" } })
      .mockRejectedValueOnce(new TypeError("offline"));
    const api = await loadModule({ uploadReviereinrichtungPhoto: upload });

    await expect(api.module.submitReviereinrichtung(payload, [photo, second])).resolves.toEqual({
      mode: "partial",
      createdId: "einrichtung-1",
      uploadedCount: 1,
      queuedCount: 1
    });
    expect(api.queueReviereinrichtungPhotoUploads).toHaveBeenCalledWith("einrichtung-1", [second]);
  });
});

async function loadModule({
  createReviereinrichtung = vi.fn(async () => ({ id: "einrichtung-1" })),
  uploadReviereinrichtungPhoto = vi.fn(async () => ({ photo: { id: "stored" } }))
}: {
  createReviereinrichtung?: ReturnType<typeof vi.fn>;
  uploadReviereinrichtungPhoto?: ReturnType<typeof vi.fn>;
} = {}) {
  const queueReviereinrichtungCreate = vi.fn(async () => ({ id: "queue-1" }));
  const queueReviereinrichtungPhotoUploads = vi.fn(async () => []);

  vi.doMock("./api", () => ({
    createReviereinrichtung,
    uploadReviereinrichtungPhoto,
    isRecoverableMutationError: (error: unknown) => error instanceof TypeError,
    MobileApiError: class MobileApiError extends Error {}
  }));
  vi.doMock("./offline-queue", () => ({
    queueReviereinrichtungCreate,
    queueReviereinrichtungPhotoUploads
  }));

  return {
    module: await import("./reviereinrichtung-submission"),
    createReviereinrichtung,
    uploadReviereinrichtungPhoto,
    queueReviereinrichtungCreate,
    queueReviereinrichtungPhotoUploads
  };
}
