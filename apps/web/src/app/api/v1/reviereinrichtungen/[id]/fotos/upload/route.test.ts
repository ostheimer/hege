import { beforeEach, describe, expect, it, vi } from "vitest";

const { completeUpload, getContext, prepareUpload } = vi.hoisted(() => ({
  completeUpload: vi.fn(),
  getContext: vi.fn(),
  prepareUpload: vi.fn()
}));

vi.mock("../../../../../../../server/auth/context", () => ({ getRequestContext: getContext }));
vi.mock("../../../../../../../server/modules/reviereinrichtungen/service", () => ({
  completeReviereinrichtungPhotoUpload: completeUpload,
  prepareReviereinrichtungPhotoUpload: prepareUpload
}));

import { POST, PUT } from "./route";

describe("direkter Einrichtungs-Fotoupload", () => {
  beforeEach(() => {
    getContext.mockReset();
    prepareUpload.mockReset();
    completeUpload.mockReset();
    getContext.mockResolvedValue({
      membershipId: "member-1",
      revierId: "revier-1",
      role: "jaeger"
    });
  });

  it("erstellt eine auf das Einrichtungsfoto begrenzte Upload-Freigabe", async () => {
    prepareUpload.mockResolvedValue({
      uploadUrl: "https://storage.test/signed-put",
      uploadToken: "grant",
      expiresAt: "2026-09-13T12:00:00.000Z",
      headers: { "Content-Type": "image/png" }
    });

    const response = await POST(jsonRequest({
      fileName: "kanzel.png",
      contentType: "image/png",
      sizeBytes: 5 * 1024 * 1024
    }), routeContext());

    expect(response.status).toBe(200);
    expect(prepareUpload).toHaveBeenCalledWith(expect.objectContaining({
      einrichtungId: "einrichtung-1",
      uploadedByMembershipId: "member-1",
      revierId: "revier-1",
      sizeBytes: 5 * 1024 * 1024
    }));
  });

  it("schließt die Zuordnung nach dem Speicher-Upload ab", async () => {
    completeUpload.mockResolvedValue({
      id: "photo-1",
      title: "Kanzel",
      url: "https://storage.test/signed-get",
      createdAt: "2026-09-13T11:55:00.000Z"
    });

    const response = await PUT(jsonRequest({ uploadToken: "grant" }), routeContext());

    expect(response.status).toBe(201);
    expect(completeUpload).toHaveBeenCalledWith(expect.objectContaining({
      einrichtungId: "einrichtung-1",
      uploadToken: "grant"
    }));
  });
});

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/v1/reviereinrichtungen/einrichtung-1/fotos/upload", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

function routeContext() {
  return { params: Promise.resolve({ id: "einrichtung-1" }) };
}
