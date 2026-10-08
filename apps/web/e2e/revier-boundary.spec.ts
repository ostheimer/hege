import { test, expect } from "@playwright/test";
import { loginViaApi } from "./support/auth";
import { resetE2eDatabase } from "./support/reset-db";
import { createGpsBoundary, type RevierMapData } from "@hege/domain";
const square = createGpsBoundary(
  [
    [48.34, 16.72],
    [48.34, 16.721],
    [48.3405, 16.721],
    [48.3405, 16.72],
  ].map(([latitude, longitude]) => ({
    latitude: latitude!,
    longitude: longitude!,
    accuracy: 5,
    timestamp: 10000,
  })),
);
test.beforeEach(async () => {
  await resetE2eDatabase();
});
test("Punkte zeichnen, entfernen, rückgängig, Entwurf wiederöffnen und versioniert speichern", async ({
  page,
}, testInfo) => {
  await loginViaApi(page, "revier-admin");
  await page.goto("/app/revierkarte");
  const canvas = page.getByTestId("boundary-map");
  await expect(
    page.getByRole("button", { name: "Punkte auf Karte setzen", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Punkte auf Karte setzen", exact: true })
    .click();
  const box = (await canvas.boundingBox())!;
  for (const [x, y] of [
    [0.3, 0.3],
    [0.7, 0.3],
    [0.7, 0.7],
    [0.3, 0.7],
  ])
    await canvas.click({ position: { x: box.width * x!, y: box.height * y! } });
  await expect(
    page.getByText("4 Punkte im gewählten Ring", { exact: false }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("boundary-editor.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Grenzpunkt 2 auswählen", exact: true })
    .click();
  await page.getByRole("button", { name: "Gewählten Punkt entfernen" }).click();
  await expect(
    page.getByText("3 Punkte im gewählten Ring", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Rückgängig", exact: true }).click();
  await page.reload();
  await expect(
    page.getByText("4 Punkte im gewählten Ring", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Reviergrenze speichern", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Reviergrenze gespeichert",
  );
  const saved = await (await page.request.get("/api/v1/revier-map")).json();
  expect(saved.map.areas[0].polygons[0][0]).toHaveLength(5);
  // Drag ist ein einzelner Schritt im Verlauf.
  await canvas.scrollIntoViewIfNeeded();
  const point = page.getByTestId("map-point-0");
  const p = (await point.boundingBox())!;
  await page.mouse.move(p.x + p.width / 2, p.y + p.height / 2);
  await page.mouse.down();
  await page.mouse.move(p.x + p.width / 2 + 15, p.y + p.height / 2 + 10, {
    steps: 4,
  });
  await page.mouse.up();
  await expect(
    page.getByRole("button", { name: "Reviergrenze speichern", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Bestehende Reviergrenze bewusst ändern").check();
  await page
    .getByRole("button", { name: "Reviergrenze speichern", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Reviergrenze gespeichert",
  );
  await page.getByText("Frühere Grenzen (1)", { exact: true }).click();
  await page.getByRole("button", { name: "Version als Entwurf laden" }).click();
  await page.getByLabel("Bestehende Reviergrenze bewusst ändern").check();
  await page
    .getByRole("button", { name: "Reviergrenze speichern", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Reviergrenze gespeichert",
  );
  const restored = await (await page.request.get("/api/v1/revier-map")).json();
  expect(restored.map.areas).toEqual(saved.map.areas);
});
test("PostGIS, Konflikte, Mehrteiligkeit und Rollen schützen gespeicherte Grenzen", async ({
  page,
}) => {
  await loginViaApi(page, "revier-admin");
  const write = (
    map: RevierMapData,
    revision: string | null,
    confirmReplace = true,
  ) =>
    page.request.put("/api/v1/revier-map", {
      data: { map, revision, confirmReplace, revierId: "foreign-revier" },
    });
  const created = await write(square, null);
  expect(created.status()).toBe(200);
  const initial = await created.json();
  expect((await write(square, null)).status()).toBe(409);
  expect((await write(square, initial.revision, false)).status()).toBe(409);
  const multipart = structuredClone(square);
  multipart.areas[0]!.polygons.push([
    [
      [16.722, 48.34],
      [16.723, 48.34],
      [16.723, 48.341],
      [16.722, 48.341],
      [16.722, 48.34],
    ],
  ]);
  multipart.areas[0]!.polygons[0]!.push([
    [16.7202, 48.3401],
    [16.7204, 48.3401],
    [16.7204, 48.3403],
    [16.7202, 48.3403],
    [16.7202, 48.3401],
  ]);
  multipart.areas.push({
    id: "exclude",
    name: "Ausschluss",
    kind: "exclusion",
    polygons: [
      [
        [
          [16.7221, 48.3401],
          [16.7223, 48.3401],
          [16.7223, 48.3403],
          [16.7221, 48.3403],
          [16.7221, 48.3401],
        ],
      ],
    ],
  });
  const changed = await write(multipart, initial.revision);
  expect(changed.status()).toBe(200);
  const current = await changed.json();
  expect((await write(square, initial.revision)).status()).toBe(409);
  const invalid = structuredClone(multipart);
  invalid.areas[0]!.polygons[0]![1] = [
    [16.725, 48.34],
    [16.726, 48.34],
    [16.726, 48.341],
    [16.725, 48.341],
    [16.725, 48.34],
  ];
  expect((await write(invalid, current.revision)).status()).toBe(400);
  expect(
    (await (await page.request.get("/api/v1/revier-map")).json()).map.areas,
  ).toEqual(multipart.areas);
  const versions = await (
    await page.request.get("/api/v1/revier-map/versions")
  ).json();
  expect(versions.versions).toHaveLength(1);
  const concurrent = await Promise.all([
    write(square, current.revision),
    write(multipart, current.revision),
  ]);
  expect(concurrent.map((response) => response.status()).sort()).toEqual([
    200, 409,
  ]);
  const latest = await (await page.request.get("/api/v1/revier-map")).json();
  await loginViaApi(page, "jaeger");
  expect((await write(square, latest.revision)).status()).toBe(403);
  await page.goto("/app/revierkarte");
  await expect(
    page.getByRole("button", { name: "Reviergrenze speichern", exact: true }),
  ).toHaveCount(0);
  await page.context().clearCookies();
  expect((await page.request.get("/api/v1/revier-map/versions")).status()).toBe(
    401,
  );
});
