import type { Reviereinrichtung, ReviereinrichtungListItem } from "@hege/domain";
import { describe, expect, it, vi } from "vitest";

import type {
  ReviereinrichtungPhotoInsert,
  ReviereinrichtungPhotoRecord,
  ReviereinrichtungenRepository,
  ReviereinrichtungUploadScope
} from "./repository";
import { createReviereinrichtungenService } from "./service";

describe("reviereinrichtungen service", () => {
  it("legt eine Ansitzeinrichtung mit Ausrichtung an", async () => {
    const service = createReviereinrichtungenService({
      generateId: () => "einrichtung-new",
      getNow: () => "2026-07-13T10:00:00.000Z",
      repository: createMemoryRepository(),
      useDemoStore: false
    });

    await expect(
      service.create({
        revierId: "revier-1",
        createdByMembershipId: "member-1",
        type: "kanzel",
        name: "Nordkanzel",
        location: { lat: 48.3, lng: 16.7 },
        orientationDegrees: 315,
        details: { capacityPersons: 2 }
      })
    ).resolves.toMatchObject({
      id: "einrichtung-new",
      orientationDegrees: 315,
      details: { capacityPersons: 2 },
      createdAt: "2026-07-13T10:00:00.000Z"
    });
  });

  it("speichert ein Foto unter dem revierbezogenen Objektpfad", async () => {
    const repository = createMemoryRepository({
      scope: { einrichtungId: "einrichtung-1", revierId: "revier-1", tenantKey: "gaenserndorf" }
    });
    const uploadObject = vi.fn(async (input: { key: string }) => ({
      objectKey: input.key,
      publicUrl: `https://storage.example/${input.key}`
    }));
    const service = createReviereinrichtungenService({
      generatePhotoId: () => "photo-1",
      getNow: () => "2026-07-13T10:05:00.000Z",
      repository,
      uploadObject: uploadObject as never,
      useDemoStore: false
    });

    await expect(
      service.uploadPhoto({
        body: Buffer.from("image"),
        contentType: "image/jpeg",
        einrichtungId: "einrichtung-1",
        fileName: "Nordkanzel.jpg",
        uploadedByMembershipId: "member-1",
        revierId: "revier-1"
      })
    ).resolves.toMatchObject({
      id: "photo-1",
      url: "https://storage.example/gaenserndorf/reviereinrichtungen/einrichtung-1/photo-1-Nordkanzel.jpg"
    });
    expect(repository.insertedPhotos).toHaveLength(1);
  });

  it("begrenzt Fotos auf drei und behandelt einen Storage-Ausfall als 503", async () => {
    const scope = { einrichtungId: "einrichtung-1", revierId: "revier-1", tenantKey: "gaenserndorf" };
    const fullService = createReviereinrichtungenService({
      repository: createMemoryRepository({ scope, existingPhotos: 3 }),
      uploadObject: vi.fn(),
      useDemoStore: false
    });
    const command = {
      body: Buffer.from("image"), contentType: "image/jpeg", einrichtungId: "einrichtung-1",
      fileName: "bild.jpg", uploadedByMembershipId: "member-1", revierId: "revier-1"
    };

    await expect(fullService.uploadPhoto(command)).rejects.toMatchObject({ status: 422 });

    const unavailableService = createReviereinrichtungenService({
      repository: createMemoryRepository({ scope }),
      uploadObject: vi.fn(async () => { throw new Error("socket hang up"); }),
      useDemoStore: false
    });
    await expect(unavailableService.uploadPhoto(command)).rejects.toMatchObject({
      status: 503,
      message: "Foto konnte nicht im Storage gespeichert werden."
    });
  });
});

function createMemoryRepository({
  existingPhotos = 0,
  scope
}: {
  existingPhotos?: number;
  scope?: ReviereinrichtungUploadScope;
} = {}): ReviereinrichtungenRepository & { insertedPhotos: ReviereinrichtungPhotoRecord[] } {
  const store: Reviereinrichtung[] = [];
  const insertedPhotos: ReviereinrichtungPhotoRecord[] = Array.from({ length: existingPhotos }, (_, index) => ({
    id: `photo-${index}`,
    revierId: "revier-1",
    entityType: "reviereinrichtung",
    entityId: "einrichtung-1",
    uploadedByMembershipId: "member-1",
    title: `Bild ${index}`,
    objectKey: `bild-${index}.jpg`,
    fileName: `bild-${index}.jpg`,
    contentType: "image/jpeg",
    createdAt: "2026-07-13T10:00:00.000Z"
  }));

  return {
    insertedPhotos,
    async listByRevier() { return []; },
    async insert(entry) {
      store.push(entry);
      return { ...entry, offeneWartungen: 0 } as ReviereinrichtungListItem;
    },
    async countPhotos(einrichtungId) {
      return insertedPhotos.filter((photo) => photo.entityId === einrichtungId).length;
    },
    async findUploadScope(einrichtungId, revierId) {
      return scope?.einrichtungId === einrichtungId && scope.revierId === revierId ? scope : undefined;
    },
    async insertPhoto(entry: ReviereinrichtungPhotoInsert) {
      const row: ReviereinrichtungPhotoRecord = { ...entry, entityType: "reviereinrichtung" };
      insertedPhotos.push(row);
      return row;
    }
  };
}
