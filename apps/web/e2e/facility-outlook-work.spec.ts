import { expect, test, type Page } from "@playwright/test";
import type { Aufgabe, Reviermeldung, ReviereinrichtungListItem } from "@hege/domain";

import { loginViaApi } from "./support/auth";
import { resetE2eDatabase } from "./support/reset-db";

test.describe("Hochstand: Blickrichtungen, Notizen und Arbeiten dauerhaft speichern", () => {
  test.beforeEach(async ({ page }) => {
    await resetE2eDatabase();
    await loginViaApi(page, "revier-admin");
  });

  test("erhält Einrichtungsdetails und zugeordnete Einträge nach einer neuen Sitzung", async ({ page }) => {
    const facility = await createTestFacility(page);
    const directions = { orientationDegrees: 334, additionalViewDirections: [90, 180] };
    const response = await page.request.patch(`/api/v1/reviereinrichtungen/${facility.id}/outlook`, {
      data: directions
    });
    expect(response.status()).toBe(200);

    const noteResponse = await page.request.post("/api/v1/reviermeldungen", {
      data: {
        title: "Fenster im Süden klemmt",
        description: "Fenster im Süden klemmt. Scharnier beim nächsten Besuch prüfen.",
        category: "reviereinrichtung",
        relatedType: "reviereinrichtung",
        relatedId: facility.id
      }
    });
    expect(noteResponse.status()).toBe(201);
    const note = (await noteResponse.json()) as Reviermeldung;

    const taskResponse = await page.request.post("/api/v1/aufgaben", {
      data: {
        title: "Leitersprosse ersetzen",
        description: "Unterste Sprosse prüfen und ersetzen.",
        sourceType: "reviereinrichtung",
        sourceId: facility.id
      }
    });
    expect(taskResponse.status()).toBe(201);
    const task = (await taskResponse.json()) as Aufgabe;

    await startNewSession(page, "revier-admin");
    const reopened = await readFacility(page, facility.id);
    expect(reopened.orientationDegrees).toBe(334);
    expect(reopened.details).toMatchObject({
      capacityPersons: 2,
      accessNote: "Zugang über den Testweg",
      additionalViewDirections: [90, 180]
    });
    expect(reopened.name).toBe(facility.name);
    expect(reopened.location).toMatchObject({ lat: 48.33597, lng: 16.732315 });

    const notesResponse = await page.request.get("/api/v1/reviermeldungen");
    expect(notesResponse.status()).toBe(200);
    const notes = (await notesResponse.json()) as Reviermeldung[];
    expect(notes.find((entry) => entry.id === note.id)).toMatchObject({
      relatedType: "reviereinrichtung",
      relatedId: facility.id,
      description: note.description
    });
    const tasksResponse = await page.request.get("/api/v1/aufgaben");
    expect(tasksResponse.status()).toBe(200);
    const tasks = (await tasksResponse.json()) as Aufgabe[];
    expect(tasks.find((entry) => entry.id === task.id)).toMatchObject({
      sourceType: "reviereinrichtung",
      sourceId: facility.id,
      status: "offen"
    });

    const completedResponse = await page.request.patch(`/api/v1/aufgaben/${task.id}`, {
      data: { status: "erledigt" }
    });
    expect(completedResponse.status()).toBe(200);
    const completed = (await completedResponse.json()) as Aufgabe;
    expect(completed.completedAt).toBeTruthy();

    await startNewSession(page, "revier-admin");
    const rereadResponse = await page.request.get(`/api/v1/aufgaben/${task.id}`);
    expect(rereadResponse.status()).toBe(200);
    expect(await rereadResponse.json()).toMatchObject({
      id: task.id,
      sourceId: facility.id,
      status: "erledigt",
      completedAt: completed.completedAt
    });

    const clearedResponse = await page.request.patch(`/api/v1/reviereinrichtungen/${facility.id}/outlook`, {
      data: { orientationDegrees: 334, additionalViewDirections: [] }
    });
    expect(clearedResponse.status()).toBe(200);
    await startNewSession(page, "revier-admin");
    expect((await readFacility(page, facility.id)).details).toMatchObject({
      capacityPersons: 2,
      accessNote: "Zugang über den Testweg",
      additionalViewDirections: []
    });
  });

  test("ein Jäger kann eigene Arbeiten erledigen, die Blickrichtung bleibt Verwaltern vorbehalten", async ({ page }) => {
    const facility = await createTestFacility(page);
    await startNewSession(page, "jaeger");

    const directionsResponse = await page.request.patch(`/api/v1/reviereinrichtungen/${facility.id}/outlook`, {
      data: { orientationDegrees: 90, additionalViewDirections: [] }
    });
    expect(directionsResponse.status()).toBe(403);
    expect((await readFacility(page, facility.id)).orientationDegrees).toBe(334);

    const response = await page.request.post("/api/v1/aufgaben", {
      data: {
        title: "Testarbeit am Hochstand",
        sourceType: "reviereinrichtung",
        sourceId: facility.id
      }
    });
    expect(response.status()).toBe(201);
    const task = (await response.json()) as Aufgabe;

    const completedResponse = await page.request.patch(`/api/v1/aufgaben/${task.id}`, {
      data: { status: "erledigt" }
    });
    expect(completedResponse.status()).toBe(200);
    await startNewSession(page, "jaeger");

    const rereadResponse = await page.request.get(`/api/v1/aufgaben/${task.id}`);
    expect(rereadResponse.status()).toBe(200);
    expect(await rereadResponse.json()).toMatchObject({
      id: task.id,
      sourceId: facility.id,
      status: "erledigt"
    });
  });
});

async function createTestFacility(page: Page): Promise<ReviereinrichtungListItem> {
  const response = await page.request.post("/api/v1/reviereinrichtungen", {
    data: {
      name: "Test Hochstand Speicherabnahme",
      type: "hochstand",
      status: "gut",
      location: { lat: 48.33597, lng: 16.732315, source: "manual" },
      orientationDegrees: 334,
      details: { capacityPersons: 2, accessNote: "Zugang über den Testweg" }
    }
  });
  expect(response.status()).toBe(201);
  return response.json();
}

async function readFacility(page: Page, id: string): Promise<ReviereinrichtungListItem> {
  const response = await page.request.get("/api/v1/reviereinrichtungen");
  expect(response.status()).toBe(200);
  const entries = (await response.json()) as ReviereinrichtungListItem[];
  const entry = entries.find((candidate) => candidate.id === id);
  expect(entry).toBeDefined();
  return entry!;
}

async function startNewSession(page: Page, role: "revier-admin" | "jaeger") {
  const response = await page.request.post("/api/v1/auth/logout", { maxRedirects: 0 });
  expect(response.status()).toBe(303);
  await page.context().clearCookies();
  await loginViaApi(page, role);
}
