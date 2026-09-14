import { beforeEach, describe, expect, it, vi } from "vitest";

const { getInfoAsync, uploadAsync } = vi.hoisted(() => ({
  getInfoAsync: vi.fn(),
  uploadAsync: vi.fn()
}));

vi.mock("expo-file-system", () => ({
  FileSystemUploadType: { BINARY_CONTENT: 0 },
  getInfoAsync,
  uploadAsync
}));

vi.mock("./session", () => ({
  clearSession: vi.fn(),
  getAccessToken: () => "access-token",
  getRefreshToken: () => null,
  saveSession: vi.fn()
}));

import { uploadFallwildPhoto, uploadReviereinrichtungPhoto } from "./api";

describe("direkter Foto-Upload", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    getInfoAsync.mockReset();
    uploadAsync.mockReset();
    process.env.EXPO_PUBLIC_API_BASE_URL = "https://hege.test/api/v1";
  });

  it("überträgt ein mehr als 4,5 MB großes Fallwildfoto direkt in den Objektspeicher", async () => {
    const sizeBytes = 6 * 1024 * 1024;
    getInfoAsync.mockResolvedValue({
      exists: true,
      isDirectory: false,
      size: sizeBytes,
      uri: "file:///fallwild.jpg"
    });
    uploadAsync.mockResolvedValue({ status: 200, headers: {}, mimeType: null, body: "" });
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({
        uploadUrl: "https://storage.test/signed-put",
        uploadToken: "grant",
        expiresAt: "2026-09-13T12:00:00.000Z",
        headers: { "Content-Type": "image/jpeg" }
      }))
      .mockResolvedValueOnce(jsonResponse({
        photo: {
          id: "photo-1",
          title: "Fallwild-Foto 1",
          url: "https://storage.test/signed-get",
          createdAt: "2026-09-13T11:55:00.000Z"
        }
      }, 201));

    await expect(
      uploadFallwildPhoto("fallwild-1", {
        id: "local-1",
        uri: "file:///fallwild.jpg",
        fileName: "fallwild.jpg",
        mimeType: "image/jpeg",
        title: "Fallwild-Foto 1"
      })
    ).resolves.toMatchObject({ photo: { id: "photo-1" } });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      fileName: "fallwild.jpg",
      contentType: "image/jpeg",
      sizeBytes
    });
    expect(uploadAsync).toHaveBeenCalledWith(
      "https://storage.test/signed-put",
      "file:///fallwild.jpg",
      expect.objectContaining({
        httpMethod: "PUT",
        headers: { "Content-Type": "image/jpeg" }
      })
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "https://hege.test/api/v1/fallwild/fallwild-1/fotos/upload"
    );
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe("PUT");
  });

  it("nutzt denselben Direkt-Upload für Fotos jagdlicher Einrichtungen", async () => {
    getInfoAsync.mockResolvedValue({
      exists: true,
      isDirectory: false,
      size: 1234,
      uri: "file:///kanzel.png"
    });
    uploadAsync.mockResolvedValue({ status: 200, headers: {}, mimeType: null, body: "" });
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({
        uploadUrl: "https://storage.test/facility",
        uploadToken: "grant-facility",
        expiresAt: "2026-09-13T12:00:00.000Z",
        headers: { "Content-Type": "image/png" }
      }))
      .mockResolvedValueOnce(jsonResponse({
        photo: {
          id: "photo-facility",
          title: "Kanzel",
          url: "https://storage.test/read",
          createdAt: "2026-09-13T11:55:00.000Z"
        }
      }, 201));

    await uploadReviereinrichtungPhoto("einrichtung-1", {
      id: "local-2",
      uri: "file:///kanzel.png",
      fileName: "kanzel.png",
      mimeType: "image/png"
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://hege.test/api/v1/reviereinrichtungen/einrichtung-1/fotos/upload"
    );
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe("PUT");
  });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}
