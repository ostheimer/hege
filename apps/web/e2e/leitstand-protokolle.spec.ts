import { expect, test } from "@playwright/test";

import { loginAs } from "./support/auth";
import { resetE2eDatabase } from "./support/reset-db";
import { visualSnapshotOptions } from "./support/visual";

const publishedProtokollId = "sitzung-2";

test.describe("Leitstand und Protokolle", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await resetE2eDatabase();
    await loginAs(page, "schriftfuehrer");
  });

  test("renders the dashboard on desktop and mobile", async ({ page }, testInfo) => {
    await page.goto("/app");

    await expect(page.getByRole("heading", { name: /^Weidmannsheil/ })).toBeVisible();
    await expect(page.locator("main")).toHaveScreenshot("dashboard-overview.png", visualSnapshotOptions);

    if (testInfo.project.name === "mobile-chromium") {
      const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(hasHorizontalOverflow).toBe(false);
    }
  });

  test("renders the reviereinrichtungen overview on desktop and mobile", async ({ page }, testInfo) => {
    await page.goto("/app/reviereinrichtungen");

    await expect(page.getByRole("heading", { name: "Standorte, Kontrollen und Wartungen im Blick." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Reviereinrichtungen und Status" })).toBeVisible();
    await expect(page.locator("main")).toHaveScreenshot("reviereinrichtungen-overview.png", visualSnapshotOptions);

    if (testInfo.project.name === "mobile-chromium") {
      const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(hasHorizontalOverflow).toBe(false);
    }
  });

  test("renders the protokolle list on desktop and mobile", async ({ page }, testInfo) => {
    await page.goto("/app/protokolle");

    await expect(page.getByRole("heading", { name: "Freigegebene Protokolle und Beschlüsse" })).toBeVisible();
    await expect(page.locator('a[href="/api/v1/documents/document-sitzung-2/download"]')).toBeVisible();
    await expect(page.locator('a[href="/api/v1/documents/document-sitzung-2/download"]')).toHaveText("Dokument öffnen");
    await expect(page.locator("main")).toHaveScreenshot("protokolle-overview.png", visualSnapshotOptions);

    if (testInfo.project.name === "mobile-chromium") {
      const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(hasHorizontalOverflow).toBe(false);
    }
  });

  test("renders a published protokoll detail on desktop and mobile", async ({ page }, testInfo) => {
    await page.goto(`/app/protokolle/${publishedProtokollId}`);

    await expect(page.getByRole("heading", { level: 1, name: "Winterabschluss 2025" })).toBeVisible();
    await expect(page.locator('a[href="/api/v1/documents/document-sitzung-2/download"]')).toBeVisible();
    await expect(page.locator('a[href="/api/v1/documents/document-sitzung-2/download"]')).toHaveText("PDF öffnen");
    await expect(page.locator("main")).toHaveScreenshot("protokolle-detail-overview.png", visualSnapshotOptions);

    if (testInfo.project.name === "mobile-chromium") {
      const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(hasHorizontalOverflow).toBe(false);
    }
  });

  test("downloads the published pdf on desktop", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "The PDF download is covered once on desktop.");

    await page.goto(`/app/protokolle/${publishedProtokollId}`);

    const downloadPromise = page.waitForEvent("download");
    await page.locator('a[href="/api/v1/documents/document-sitzung-2/download"]').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("winterabschluss-2025-protokoll.pdf");
  });
});
