import { beforeEach, describe, expect, it, vi } from "vitest";

const { completeUpload, getContext, prepareUpload } = vi.hoisted(() => ({
  completeUpload: vi.fn(),
  getContext: vi.fn(),
  prepareUpload: vi.fn()
}));

vi.mock("../../../../../../../server/auth/context", () => ({ getRequestContext: getContext }));
vi.mock("../../../../../../../server/modules/fallwild/service", () => ({
  completeFallwildPhotoUpload: completeUpload,
  prepareFallwildPhotoUpload: prepareUpload
}));

import { POST, PUT } from "./route";

describe("direkter Fallwild-Fotoupload", () => {
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

  it("nimmt für ein 6-MB-Foto nur Metadaten entgegen und erstellt eine Upload-URL", async () => {
    prepareUpload.mockResolvedValue({
      uploadUrl: "https://storage.test/signed-put",
      uploadToken: "grant",
      expiresAt: "2026-09-13T12:00:00.000Z",
      headers: { "Content-Type": "image/jpeg" }
    });

    const response = await POST(jsonRequest({
      fileName: "foto.jpg",
      contentType: "image/jpeg",
      sizeBytes: 6 * 1024 * 1024,
      title: "Unfallstelle"
    }), routeContext());

    expect(response.status).toBe(200);
    expect(prepareUpload).toHaveBeenCalledWith({
      fallwildId: "fallwild-1",
      fileName: "foto.jpg",
      contentType: "image/jpeg",
      sizeBytes: 6 * 1024 * 1024,
      title: "Unfallstelle",
      reportedByMembershipId: "member-1",
      revierId: "revier-1"
    });
  });

  it("ordnet den bereits im Speicher liegenden Upload anschließend zu", async () => {
    completeUpload.mockResolvedValue({
      id: "photo-1",
      title: "Unfallstelle",
      url: "https://storage.test/signed-get",
      createdAt: "2026-09-13T11:55:00.000Z"
    });

    const response = await PUT(jsonRequest({ uploadToken: "grant" }), routeContext());

    expect(response.status).toBe(201);
    expect(completeUpload).toHaveBeenCalledWith({
      fallwildId: "fallwild-1",
      reportedByMembershipId: "member-1",
      revierId: "revier-1",
      uploadToken: "grant"
    });
  });
});

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/v1/fallwild/fallwild-1/fotos/upload", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

function routeContext() {
  return { params: Promise.resolve({ id: "fallwild-1" }) };
}
