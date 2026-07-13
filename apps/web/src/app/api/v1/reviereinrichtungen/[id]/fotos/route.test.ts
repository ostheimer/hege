import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetRequestContext, mockUploadReviereinrichtungPhoto } = vi.hoisted(() => ({
  mockGetRequestContext: vi.fn(),
  mockUploadReviereinrichtungPhoto: vi.fn()
}));

vi.mock("../../../../../../server/auth/context", () => ({
  getRequestContext: mockGetRequestContext
}));

vi.mock("../../../../../../server/modules/reviereinrichtungen/service", () => ({
  uploadReviereinrichtungPhoto: mockUploadReviereinrichtungPhoto
}));

import { POST } from "./route";

describe("POST /api/v1/reviereinrichtungen/:id/fotos", () => {
  beforeEach(() => {
    mockGetRequestContext.mockReset();
    mockUploadReviereinrichtungPhoto.mockReset();
    mockGetRequestContext.mockResolvedValue({
      membershipId: "member-jaeger",
      revierId: "revier-1",
      role: "jaeger"
    });
  });

  it("uploads a JPEG for an allowed field role", async () => {
    mockUploadReviereinrichtungPhoto.mockResolvedValue({
      id: "photo-1",
      title: "Nordkanzel",
      url: "https://storage.example/photo.jpg",
      createdAt: "2026-07-13T10:00:00.000Z"
    });
    const formData = new FormData();
    formData.append("file", new File(["image"], "Nordkanzel.jpg", { type: "image/jpeg" }));
    formData.append("title", "Nordkanzel");

    const response = await POST(
      new Request("http://localhost/api/v1/reviereinrichtungen/einrichtung-1/fotos", {
        method: "POST",
        body: formData
      }),
      { params: Promise.resolve({ id: "einrichtung-1" }) }
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ photo: { id: "photo-1" } });
    expect(mockUploadReviereinrichtungPhoto).toHaveBeenCalledWith(
      expect.objectContaining({
        einrichtungId: "einrichtung-1",
        fileName: "Nordkanzel.jpg",
        contentType: "image/jpeg",
        uploadedByMembershipId: "member-jaeger",
        revierId: "revier-1",
        title: "Nordkanzel"
      })
    );
  });

  it("rejects photo uploads from the read-only role", async () => {
    mockGetRequestContext.mockResolvedValueOnce({
      membershipId: "member-ausgeher",
      revierId: "revier-1",
      role: "ausgeher"
    });

    const response = await POST(
      new Request("http://localhost/api/v1/reviereinrichtungen/einrichtung-1/fotos", {
        method: "POST",
        body: new FormData()
      }),
      { params: Promise.resolve({ id: "einrichtung-1" }) }
    );

    expect(response.status).toBe(403);
    expect(mockUploadReviereinrichtungPhoto).not.toHaveBeenCalled();
  });
});
