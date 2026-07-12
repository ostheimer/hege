import type { FallwildVorgang } from "@hege/domain";
import { describe, expect, it, vi } from "vitest";

import type {
  FallwildDeleteScope,
  FallwildPhotoInsert,
  FallwildPhotoRecord,
  FallwildRepository,
  FallwildUploadScope
} from "./repository";
import { createFallwildService } from "./service";

describe("fallwild service", () => {
  it("creates a new fallwild entry with default timestamp", async () => {
    const service = createFallwildService({
      generateId: () => "fallwild-new",
      getNow: () => "2026-04-04T06:00:00.000Z",
      repository: createMemoryRepository(),
      useDemoStore: false
    });

    const result = await service.create({
      revierId: "revier-attersee",
      reportedByMembershipId: "member-jaeger",
      location: {
        lat: 47.92,
        lng: 13.51,
        label: "Nordrand",
        source: "device-gps",
        addressLabel: "L127, 4853 Steinbach am Attersee"
      },
      wildart: "Fuchs",
      geschlecht: "weiblich",
      altersklasse: "Adult",
      bergungsStatus: "geborgen",
      gemeinde: "Steinbach am Attersee",
      roadReference: {
        roadName: "L127",
        roadKilometer: "8,2",
        source: "gip"
      },
      note: "Browsertest"
    });

    expect(result).toMatchObject({
      id: "fallwild-new",
      recordedAt: "2026-04-04T06:00:00.000Z",
      wildart: "Fuchs",
      roadReference: {
        roadKilometer: "8,2"
      },
      photos: []
    });
  });

  it("uploads a photo and persists the media asset", async () => {
    const uploadObject = vi.fn(async (input: any) => ({
      objectKey: input.key,
      publicUrl: `https://storage.example/${input.key}`
    }));
    const repository = createMemoryRepository({
      scope: {
        fallwildId: "fallwild-1",
        revierId: "revier-attersee",
        tenantKey: "attersee"
      }
    });
    const service = createFallwildService({
      generatePhotoId: () => "photo-abc",
      getNow: () => "2026-04-04T06:10:00.000Z",
      repository,
      uploadObject,
      useDemoStore: false
    });

    const result = await service.uploadPhoto({
      body: Buffer.from("photo-data"),
      contentType: "image/jpeg",
      fallwildId: "fallwild-1",
      fileName: "Unfallstelle Attersee.jpg",
      reportedByMembershipId: "member-jaeger",
      revierId: "revier-attersee",
      title: "Unfallstelle"
    });

    expect(uploadObject).toHaveBeenCalledWith({
      key: "attersee/fallwild/fallwild-1/photo-abc-Unfallstelle-Attersee.jpg",
      body: Buffer.from("photo-data"),
      contentType: "image/jpeg"
    });
    expect(result).toEqual({
      id: "photo-abc",
      title: "Unfallstelle",
      url: "https://storage.example/attersee/fallwild/fallwild-1/photo-abc-Unfallstelle-Attersee.jpg",
      createdAt: "2026-04-04T06:10:00.000Z"
    });
    expect(repository.insertedPhotos).toHaveLength(1);
    expect(repository.insertedPhotos[0]).toMatchObject({
      entityId: "fallwild-1",
      objectKey: "attersee/fallwild/fallwild-1/photo-abc-Unfallstelle-Attersee.jpg",
      title: "Unfallstelle"
    });
  });

  it("rejects uploads after three stored photos", async () => {
    const service = createFallwildService({
      repository: createMemoryRepository({
        scope: {
          fallwildId: "fallwild-1",
          revierId: "revier-attersee",
          tenantKey: "attersee"
        },
        existingPhotos: 3
      }),
      uploadObject: vi.fn(),
      useDemoStore: false
    });

    await expect(
      service.uploadPhoto({
        body: Buffer.from("photo-data"),
        contentType: "image/png",
        fallwildId: "fallwild-1",
        fileName: "bild.png",
        reportedByMembershipId: "member-jaeger",
        revierId: "revier-attersee"
      })
    ).rejects.toMatchObject({
      message: "Maximal drei Fotos pro Fallwild-Vorgang sind erlaubt.",
      status: 422
    });
  });

  it("rejects empty photo payloads", async () => {
    const uploadObject = vi.fn();
    const service = createFallwildService({
      repository: createMemoryRepository({
        scope: {
          fallwildId: "fallwild-1",
          revierId: "revier-attersee",
          tenantKey: "attersee"
        }
      }),
      uploadObject,
      useDemoStore: false
    });

    await expect(
      service.uploadPhoto({
        body: Buffer.alloc(0),
        contentType: "image/jpeg",
        fallwildId: "fallwild-1",
        fileName: "bild.jpg",
        reportedByMembershipId: "member-jaeger",
        revierId: "revier-attersee"
      })
    ).rejects.toMatchObject({
      message: "Die Fotodatei darf nicht leer sein.",
      status: 422
    });
    expect(uploadObject).not.toHaveBeenCalled();
  });

  it("rejects unsupported photo content types", async () => {
    const service = createFallwildService({
      repository: createMemoryRepository({
        scope: {
          fallwildId: "fallwild-1",
          revierId: "revier-attersee",
          tenantKey: "attersee"
        }
      }),
      uploadObject: vi.fn(),
      useDemoStore: false
    });

    await expect(
      service.uploadPhoto({
        body: Buffer.from("photo-data"),
        contentType: "application/pdf",
        fallwildId: "fallwild-1",
        fileName: "bild.pdf",
        reportedByMembershipId: "member-jaeger",
        revierId: "revier-attersee"
      })
    ).rejects.toMatchObject({
      message: "Nur JPEG- und PNG-Dateien sind erlaubt.",
      status: 422
    });
  });

  it("rejects uploads for missing fallwild entries", async () => {
    const service = createFallwildService({
      repository: createMemoryRepository({
        scope: undefined
      }),
      uploadObject: vi.fn(),
      useDemoStore: false
    });

    await expect(
      service.uploadPhoto({
        body: Buffer.from("photo-data"),
        contentType: "image/jpeg",
        fallwildId: "fallwild-1",
        fileName: "bild.jpg",
        reportedByMembershipId: "member-jaeger",
        revierId: "revier-attersee"
      })
    ).rejects.toMatchObject({
      message: "Fallwild-Vorgang wurde nicht gefunden.",
      status: 404
    });
  });

  it("surfaces storage failures as service unavailable", async () => {
    const repository = createMemoryRepository({
      scope: {
        fallwildId: "fallwild-1",
        revierId: "revier-attersee",
        tenantKey: "attersee"
      }
    });
    const service = createFallwildService({
      repository,
      uploadObject: vi.fn(async () => {
        throw Object.assign(new Error("Storage ist nicht konfiguriert."), {
          status: 503,
          code: "service-unavailable"
        });
      }),
      useDemoStore: false
    });

    await expect(
      service.uploadPhoto({
        body: Buffer.from("photo-data"),
        contentType: "image/jpeg",
        fallwildId: "fallwild-1",
        fileName: "bild.jpg",
        reportedByMembershipId: "member-jaeger",
        revierId: "revier-attersee"
      })
    ).rejects.toMatchObject({
      message: "Storage ist nicht konfiguriert.",
      status: 503
    });
    expect(repository.insertedPhotos).toHaveLength(0);
  });

  it("maps unexpected storage errors to service unavailable", async () => {
    const repository = createMemoryRepository({
      scope: {
        fallwildId: "fallwild-1",
        revierId: "revier-attersee",
        tenantKey: "attersee"
      }
    });
    const service = createFallwildService({
      repository,
      uploadObject: vi.fn(async () => {
        throw new Error("socket hang up");
      }),
      useDemoStore: false
    });

    await expect(
      service.uploadPhoto({
        body: Buffer.from("photo-data"),
        contentType: "image/jpeg",
        fallwildId: "fallwild-1",
        fileName: "bild.jpg",
        reportedByMembershipId: "member-jaeger",
        revierId: "revier-attersee"
      })
    ).rejects.toMatchObject({
      message: "Foto konnte nicht im Storage gespeichert werden.",
      status: 503
    });
    expect(repository.insertedPhotos).toHaveLength(0);
  });

  it("surfaces a missing media_assets table as service unavailable", async () => {
    const service = createFallwildService({
      repository: {
        ...createMemoryRepository({
          scope: {
            fallwildId: "fallwild-1",
            revierId: "revier-attersee",
            tenantKey: "attersee"
          }
        }),
        async countPhotos() {
          throw Object.assign(new Error('relation "media_assets" does not exist'), {
            code: "42P01"
          });
        }
      },
      uploadObject: vi.fn(),
      useDemoStore: false
    });

    await expect(
      service.uploadPhoto({
        body: Buffer.from("photo-data"),
        contentType: "image/jpeg",
        fallwildId: "fallwild-1",
        fileName: "bild.jpg",
        reportedByMembershipId: "member-jaeger",
        revierId: "revier-attersee"
      })
    ).rejects.toMatchObject({
      message: "Fallwild-Fotos sind in dieser Umgebung noch nicht aktiviert.",
      status: 503
    });
  });

  it("surfaces a missing media_assets table during photo persistence", async () => {
    const deleteObject = vi.fn();
    const uploadObject = vi.fn(async (input: any) => ({
      objectKey: input.key,
      publicUrl: `https://storage.example/${input.key}`
    }));
    const service = createFallwildService({
      generatePhotoId: () => "photo-abc",
      repository: {
        ...createMemoryRepository({
          scope: {
            fallwildId: "fallwild-1",
            revierId: "revier-attersee",
            tenantKey: "attersee"
          }
        }),
        async insertPhoto() {
          throw Object.assign(new Error('relation "media_assets" does not exist'), {
            code: "42P01"
          });
        }
      },
      deleteObject,
      uploadObject,
      useDemoStore: false
    });

    await expect(
      service.uploadPhoto({
        body: Buffer.from("photo-data"),
        contentType: "image/jpeg",
        fallwildId: "fallwild-1",
        fileName: "bild.jpg",
        reportedByMembershipId: "member-jaeger",
        revierId: "revier-attersee"
      })
    ).rejects.toMatchObject({
      message: "Fallwild-Fotos sind in dieser Umgebung noch nicht aktiviert.",
      status: 503
    });
    expect(deleteObject).toHaveBeenCalledWith("attersee/fallwild/fallwild-1/photo-abc-bild.jpg");
    expect(uploadObject).toHaveBeenCalledTimes(1);
  });

  it("keeps the persistence error when storage rollback fails", async () => {
    const deleteObject = vi.fn(async () => {
      throw new Error("delete failed");
    });
    const service = createFallwildService({
      generatePhotoId: () => "photo-rollback",
      repository: {
        ...createMemoryRepository({
          scope: {
            fallwildId: "fallwild-1",
            revierId: "revier-attersee",
            tenantKey: "attersee"
          }
        }),
        async insertPhoto() {
          throw Object.assign(new Error('relation "media_assets" does not exist'), {
            code: "42P01"
          });
        }
      },
      deleteObject,
      uploadObject: vi.fn(async (input: any) => ({
        objectKey: input.key,
        publicUrl: `https://storage.example/${input.key}`
      })),
      useDemoStore: false
    });

    await expect(
      service.uploadPhoto({
        body: Buffer.from("photo-data"),
        contentType: "image/jpeg",
        fallwildId: "fallwild-1",
        fileName: "bild.jpg",
        reportedByMembershipId: "member-jaeger",
        revierId: "revier-attersee"
      })
    ).rejects.toMatchObject({
      message: "Fallwild-Fotos sind in dieser Umgebung noch nicht aktiviert.",
      status: 503
    });
    expect(deleteObject).toHaveBeenCalledWith("attersee/fallwild/fallwild-1/photo-rollback-bild.jpg");
  });

  it("deletes stored photos before removing the scoped fallwild entry", async () => {
    const deleteObject = vi.fn();
    const repository = createMemoryRepository({
      deleteScope: {
        fallwildId: "fallwild-1",
        objectKeys: ["gaenserndorf/fallwild/fallwild-1/photo-1.jpg"],
        mediaSchemaAvailable: true
      }
    });
    const service = createFallwildService({
      deleteObject,
      repository,
      useDemoStore: false
    });

    await expect(
      service.delete({
        fallwildId: "fallwild-1",
        revierId: "revier-attersee"
      })
    ).resolves.toEqual({
      deleted: true,
      id: "fallwild-1"
    });

    expect(deleteObject).toHaveBeenCalledWith("gaenserndorf/fallwild/fallwild-1/photo-1.jpg");
    expect(repository.deletedIds).toEqual(["fallwild-1"]);
  });

  it("keeps the database entry when photo cleanup fails", async () => {
    const repository = createMemoryRepository({
      deleteScope: {
        fallwildId: "fallwild-1",
        objectKeys: ["gaenserndorf/fallwild/fallwild-1/photo-1.jpg"],
        mediaSchemaAvailable: true
      }
    });
    const service = createFallwildService({
      deleteObject: vi.fn(async () => {
        throw new Error("R2 nicht erreichbar");
      }),
      repository,
      useDemoStore: false
    });

    await expect(
      service.delete({
        fallwildId: "fallwild-1",
        revierId: "revier-attersee"
      })
    ).rejects.toMatchObject({
      message: "R2 nicht erreichbar",
      status: 503
    });
    expect(repository.deletedIds).toEqual([]);
  });

  it("returns not found for a fallwild entry outside the active revier", async () => {
    const service = createFallwildService({
      repository: createMemoryRepository(),
      useDemoStore: false
    });

    await expect(
      service.delete({
        fallwildId: "fallwild-404",
        revierId: "revier-attersee"
      })
    ).rejects.toMatchObject({
      message: "Fallwild-Vorgang wurde nicht gefunden.",
      status: 404
    });
  });

  it("rejects mutations without a database-backed store", async () => {
    const service = createFallwildService({
      repository: createMemoryRepository(),
      useDemoStore: true
    });

    await expect(
      service.create({
        revierId: "revier-attersee",
        reportedByMembershipId: "member-jaeger",
        location: { lat: 47.92, lng: 13.51 },
        wildart: "Fuchs",
        geschlecht: "weiblich",
        altersklasse: "Adult",
        bergungsStatus: "geborgen",
        gemeinde: "Steinbach am Attersee"
      })
    ).rejects.toMatchObject({
      message: "Fallwild-Mutationen benötigen eine aktive Datenbank.",
      status: 503
    });
  });
});

function createMemoryRepository({
  deleteScope,
  existingPhotos = 0,
  scope
}: {
  deleteScope?: FallwildDeleteScope;
  existingPhotos?: number;
  scope?: FallwildUploadScope;
} = {}): FallwildRepository & {
  deletedIds: string[];
  insertedPhotos: FallwildPhotoRecord[];
} {
  const store: FallwildVorgang[] = [];
  const deletedIds: string[] = [];
  let currentDeleteScope = deleteScope;
  const insertedPhotos: FallwildPhotoRecord[] = Array.from({ length: existingPhotos }, (_, index) => ({
    contentType: "image/jpeg",
    createdAt: `2026-04-04T06:0${index}:00.000Z`,
    entityId: "fallwild-1",
    entityType: "fallwild",
    fileName: `bild-${index}.jpg`,
    id: `photo-existing-${index}`,
    objectKey: `attersee/fallwild/fallwild-1/photo-existing-${index}-bild-${index}.jpg`,
    revierId: "revier-attersee",
    title: `Bild ${index + 1}`,
    uploadedByMembershipId: "member-jaeger"
  }));

  return {
    deletedIds,
    insertedPhotos,
    async insert(entry: FallwildVorgang) {
      store.unshift(entry);
      return entry;
    },
    async countPhotos(fallwildId: string) {
      return insertedPhotos.filter((entry) => entry.entityId === fallwildId).length;
    },
    async findUploadScope(fallwildId: string, revierId: string) {
      if (!scope || scope.fallwildId !== fallwildId || scope.revierId !== revierId) {
        return undefined;
      }

      return scope;
    },
    async findDeleteScope(fallwildId: string, revierId: string) {
      if (!currentDeleteScope || currentDeleteScope.fallwildId !== fallwildId || revierId !== "revier-attersee") {
        return undefined;
      }

      return currentDeleteScope;
    },
    async insertPhoto(entry: FallwildPhotoInsert) {
      const row: FallwildPhotoRecord = {
        ...entry,
        entityType: "fallwild"
      };
      insertedPhotos.unshift(row);
      return row;
    },
    async deleteById(fallwildId: string, revierId: string) {
      if (!currentDeleteScope || currentDeleteScope.fallwildId !== fallwildId || revierId !== "revier-attersee") {
        return false;
      }

      deletedIds.push(fallwildId);
      currentDeleteScope = undefined;
      return true;
    }
  };
}
