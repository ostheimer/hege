import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockUploadFallwildPhoto, mockGetRequestContext } = vi.hoisted(() => ({
  mockUploadFallwildPhoto: vi.fn(),
  mockGetRequestContext: vi.fn()
}));

vi.mock("../../../../../../server/auth/context", () => ({
  getRequestContext: mockGetRequestContext
}));

vi.mock("../../../../../../server/modules/fallwild/service", () => ({
  uploadFallwildPhoto: mockUploadFallwildPhoto
}));

import { POST } from "./route";

describe("POST /api/v1/fallwild/:id/fotos", () => {
  beforeEach(() => {
    mockUploadFallwildPhoto.mockReset();
    mockGetRequestContext.mockReset();
    mockGetRequestContext.mockResolvedValue({
      membershipId: "member-jaeger",
      revierId: "revier-attersee",
      role: "jaeger"
    });
  });

  it("uploads a jpeg photo from multipart form data", async () => {
    mockUploadFallwildPhoto.mockResolvedValue({
      id: "photo-1",
      title: "Unfallstelle",
      url: "https://storage.example/photo-1.jpg",
      createdAt: "2026-04-04T06:10:00.000Z"
    });

    const formData = new FormData();
    formData.append("file", new Blob(["photo-data"], { type: "image/jpeg" }), "bild.jpg");
    formData.append("title", "Unfallstelle");

    const response = await POST(
      new Request("http://localhost/api/v1/fallwild/fallwild-1/fotos", {
        method: "POST",
        body: formData
      }),
      {
        params: Promise.resolve({
          id: "fallwild-1"
        })
      }
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      photo: {
        id: "photo-1",
        title: "Unfallstelle",
        url: "https://storage.example/photo-1.jpg",
        createdAt: "2026-04-04T06:10:00.000Z"
      }
    });
    expect(mockUploadFallwildPhoto).toHaveBeenCalledWith({
      body: Buffer.from("photo-data"),
      contentType: "image/jpeg",
      fallwildId: "fallwild-1",
      fileName: "bild.jpg",
      reportedByMembershipId: "member-jaeger",
      revierId: "revier-attersee",
      title: "Unfallstelle"
    });
  });

  it("rejects non-multipart uploads", async () => {
    const response = await POST(
      new Request("http://localhost/api/v1/fallwild/fallwild-1/fotos", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({})
      }),
      {
        params: Promise.resolve({
          id: "fallwild-1"
        })
      }
    );

    expect(response.status).toBe(400);
    expect(mockUploadFallwildPhoto).not.toHaveBeenCalled();
  });

  it("rejects requests without a file", async () => {
    const formData = new FormData();
    formData.append("title", "Unfallstelle");

    const response = await POST(
      new Request("http://localhost/api/v1/fallwild/fallwild-1/fotos", {
        method: "POST",
        body: formData
      }),
      {
        params: Promise.resolve({
          id: "fallwild-1"
        })
      }
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: {
        code: "validation-error",
        message: "Genau eine Datei im Feld file ist erforderlich."
      }
    });
    expect(mockUploadFallwildPhoto).not.toHaveBeenCalled();
  });

  it("rejects unsupported file content types before calling the service", async () => {
    const formData = new FormData();
    formData.append("file", new Blob(["photo-data"], { type: "application/pdf" }), "bild.pdf");

    const response = await POST(
      new Request("http://localhost/api/v1/fallwild/fallwild-1/fotos", {
        method: "POST",
        body: formData
      }),
      {
        params: Promise.resolve({
          id: "fallwild-1"
        })
      }
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: {
        code: "validation-error",
        message: "Nur JPEG- und PNG-Dateien sind erlaubt."
      }
    });
    expect(mockUploadFallwildPhoto).not.toHaveBeenCalled();
  });

  it("rejects oversized files", async () => {
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([new Uint8Array(10 * 1024 * 1024 + 1)], { type: "image/png" }),
      "bild.png"
    );

    const response = await POST(
      new Request("http://localhost/api/v1/fallwild/fallwild-1/fotos", {
        method: "POST",
        body: formData
      }),
      {
        params: Promise.resolve({
          id: "fallwild-1"
        })
      }
    );

    expect(response.status).toBe(400);
    expect(mockUploadFallwildPhoto).not.toHaveBeenCalled();
  });

  it("returns validation errors from the photo upload contract", async () => {
    mockUploadFallwildPhoto.mockRejectedValueOnce(
      Object.assign(new Error("Maximal drei Fotos pro Fallwild-Vorgang sind erlaubt."), {
        status: 422
      })
    );

    const formData = new FormData();
    formData.append("file", new Blob(["photo-data"], { type: "image/jpeg" }), "bild.jpg");

    const response = await POST(
      new Request("http://localhost/api/v1/fallwild/fallwild-1/fotos", {
        method: "POST",
        body: formData
      }),
      {
        params: Promise.resolve({
          id: "fallwild-1"
        })
      }
    );

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({
      error: {
        code: "validation-error",
        message: "Maximal drei Fotos pro Fallwild-Vorgang sind erlaubt."
      }
    });
  });

  it("returns service unavailable errors from storage", async () => {
    mockUploadFallwildPhoto.mockRejectedValueOnce(
      Object.assign(new Error("Storage ist nicht konfiguriert."), {
        status: 503
      })
    );

    const formData = new FormData();
    formData.append("file", new Blob(["photo-data"], { type: "image/png" }), "bild.png");

    const response = await POST(
      new Request("http://localhost/api/v1/fallwild/fallwild-1/fotos", {
        method: "POST",
        body: formData
      }),
      {
        params: Promise.resolve({
          id: "fallwild-1"
        })
      }
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      error: {
        code: "service-unavailable",
        message: "Storage ist nicht konfiguriert."
      }
    });
  });

  it("allows platform admins to upload fallwild photos consistently", async () => {
    mockGetRequestContext.mockResolvedValueOnce({
      membershipId: "member-admin",
      revierId: "revier-attersee",
      role: "platform-admin"
    });
    mockUploadFallwildPhoto.mockResolvedValueOnce({
      id: "photo-platform",
      title: "Bild",
      url: "https://storage.example/photo-platform.jpg",
      createdAt: "2026-07-12T12:00:00.000Z"
    });

    const formData = new FormData();
    formData.append("file", new Blob(["photo-data"], { type: "image/jpeg" }), "bild.jpg");

    const response = await POST(
      new Request("http://localhost/api/v1/fallwild/fallwild-1/fotos", {
        method: "POST",
        body: formData
      }),
      {
        params: Promise.resolve({
          id: "fallwild-1"
        })
      }
    );

    expect(response.status).toBe(201);
    expect(mockUploadFallwildPhoto).toHaveBeenCalledWith(
      expect.objectContaining({
        fallwildId: "fallwild-1",
        reportedByMembershipId: "member-admin",
        revierId: "revier-attersee"
      })
    );
  });
});
