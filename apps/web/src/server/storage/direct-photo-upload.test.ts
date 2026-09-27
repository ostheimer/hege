import { beforeEach, describe, expect, it } from "vitest";

import {
  issueDirectPhotoUploadGrant,
  verifyDirectPhotoUploadGrant
} from "./direct-photo-upload";

describe("direct photo upload grants", () => {
  beforeEach(() => {
    process.env.AUTH_TOKEN_SECRET = "direct-upload-test-secret";
  });

  it("bindet eine Upload-Freigabe an Revier, Mitglied, Objekt und Dateimetadaten", () => {
    const issued = issueDirectPhotoUploadGrant(createGrantInput(), 1_800_000_000);

    expect(
      verifyDirectPhotoUploadGrant(
        issued.token,
        {
          entityType: "fallwild",
          entityId: "fallwild-1",
          revierId: "revier-1",
          membershipId: "member-1"
        },
        1_800_000_100
      )
    ).toMatchObject({
      objectKey: "gaenserndorf/fallwild/fallwild-1/photo-1-bild.jpg",
      contentType: "image/jpeg",
      sizeBytes: 6 * 1024 * 1024
    });
  });

  it("weist manipulierte, fremde und abgelaufene Freigaben ab", () => {
    const issued = issueDirectPhotoUploadGrant(createGrantInput(), 1_800_000_000);
    const expected = {
      entityType: "fallwild" as const,
      entityId: "fallwild-1",
      revierId: "revier-1",
      membershipId: "member-1"
    };

    expect(() => verifyDirectPhotoUploadGrant(`${issued.token}x`, expected, 1_800_000_100)).toThrow(
      "Upload-Freigabe"
    );
    expect(() =>
      verifyDirectPhotoUploadGrant(issued.token, { ...expected, membershipId: "member-2" }, 1_800_000_100)
    ).toThrow("Upload-Freigabe");
    expect(() => verifyDirectPhotoUploadGrant(issued.token, expected, 1_800_001_000)).toThrow(
      "Upload-Freigabe"
    );
  });
});

function createGrantInput() {
  return {
    entityType: "fallwild" as const,
    entityId: "fallwild-1",
    photoId: "photo-1",
    objectKey: "gaenserndorf/fallwild/fallwild-1/photo-1-bild.jpg",
    fileName: "bild.jpg",
    contentType: "image/jpeg" as const,
    sizeBytes: 6 * 1024 * 1024,
    title: "Bild",
    revierId: "revier-1",
    membershipId: "member-1"
  };
}
