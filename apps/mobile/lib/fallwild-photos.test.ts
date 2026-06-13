import { describe, expect, it } from "vitest";

import {
  getRemainingFallwildPhotoSlots,
  limitFallwildPhotoAttachments,
  mergePickedFallwildPhotos,
  normalizeFallwildPhotoMimeType,
  normalizePickedFallwildPhoto,
  type LocalPendingPhoto
} from "./fallwild-photos";

describe("fallwild photo helpers", () => {
  it("normalizes picked photo metadata without unstable IDs", () => {
    const first = normalizePickedFallwildPhoto(
      {
        uri: "file:///tmp/Fallwild Ärger.PNG?cache=1",
        fileName: "Fallwild Ärger.PNG",
        mimeType: "image/png"
      },
      0
    );
    const second = normalizePickedFallwildPhoto(
      {
        uri: "file:///tmp/Fallwild Ärger.PNG?cache=1",
        fileName: "Fallwild Ärger.PNG",
        mimeType: "image/png"
      },
      0
    );

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      fileName: "Fallwild-Arger.png",
      mimeType: "image/png",
      title: "Fallwild Ärger"
    });
  });

  it("replaces technical asset names with a readable title, keeps human names", () => {
    const uuid = normalizePickedFallwildPhoto(
      { uri: "file:///tmp/6FEB0C11-F30E-4D74-BAC1-227679F474AB.jpg" },
      0
    );
    const counter = normalizePickedFallwildPhoto(
      { uri: "file:///tmp/IMG_1234.jpg", fileName: "IMG_1234.jpg" },
      1
    );
    const human = normalizePickedFallwildPhoto(
      { uri: "file:///tmp/Rehbock an der B8.jpg", fileName: "Rehbock an der B8.jpg" },
      2
    );

    expect(uuid?.title).toBe("Fallwild-Foto 1");
    expect(counter?.title).toBe("Fallwild-Foto 2");
    expect(human?.title).toBe("Rehbock an der B8");
  });

  it("falls back to jpeg unless png is explicit or inferred", () => {
    expect(normalizeFallwildPhotoMimeType({ uri: "file:///tmp/foto.jpg" })).toBe("image/jpeg");
    expect(normalizeFallwildPhotoMimeType({ uri: "file:///tmp/foto.png" })).toBe("image/png");
    expect(normalizeFallwildPhotoMimeType({ uri: "file:///tmp/foto", mimeType: "image/jpg" })).toBe("image/jpeg");
  });

  it("keeps at most three valid attachments", () => {
    const photos: LocalPendingPhoto[] = [
      createPhoto("1"),
      createPhoto("2"),
      createPhoto("3"),
      createPhoto("4")
    ];

    expect(limitFallwildPhotoAttachments(photos)).toHaveLength(3);
    expect(getRemainingFallwildPhotoSlots(2)).toBe(1);
    expect(getRemainingFallwildPhotoSlots(10)).toBe(0);
  });

  it("merges picked assets into open slots and keeps IDs unique", () => {
    const existing = [createPhoto("1")];
    const merged = mergePickedFallwildPhotos(existing, [
      { uri: "file:///tmp/reused.jpg", assetId: "same", fileName: "reused.jpg" },
      { uri: "file:///tmp/reused-copy.jpg", assetId: "same", fileName: "reused-copy.jpg" },
      { uri: "file:///tmp/ignored.jpg", fileName: "ignored.jpg" }
    ]);

    expect(merged).toHaveLength(3);
    expect(new Set(merged.map((photo) => photo.id)).size).toBe(3);
    expect(merged.map((photo) => photo.fileName)).toEqual(["photo-1.jpg", "reused.jpg", "reused-copy.jpg"]);
  });
});

function createPhoto(id: string): LocalPendingPhoto {
  return {
    id: `photo-${id}`,
    uri: `file:///tmp/photo-${id}.jpg`,
    fileName: `photo-${id}.jpg`,
    mimeType: "image/jpeg"
  };
}
