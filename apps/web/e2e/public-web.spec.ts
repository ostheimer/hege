import { expect, test } from "@playwright/test";

import { loginViaApi } from "./support/auth";
import { resetE2eDatabase } from "./support/reset-db";

test.describe("Public web and onboarding contracts", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async () => {
    await resetE2eDatabase();
  });

  test("shows the public landing with pricing CTAs for guests", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/");

    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole("heading", {
        name: "Das Revier. Gemeinsam im Blick."
      })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Das Revier führen, ohne den Überblick zu verlieren." })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Draußen erfassen. Im Team weiterarbeiten." })
    ).toBeVisible();

    // Header, Hero, Produktkapitel, Pakete, CTA und Footer bleiben direkt verlinkt.
    await expect(page.locator('a[href="/login"]')).toHaveCount(8);
    await expect(page.locator('a[href="/registrieren?plan=starter"]')).toHaveCount(2);
    await expect(page.locator('a[href="/registrieren?plan=revier"]')).toHaveCount(5);
    await expect(
      page.locator('a[href="mailto:info@hege.app?subject=hege%20Organisation"]')
    ).toHaveCount(2);
    await expect(page.locator(".public-footer")).toContainText("info@hege.app");
    await expect(page.locator(".public-footer")).toContainText("© 2026 hege.app");
  });

  test("redirects authenticated users from /login to /app", async ({ page }) => {
    await loginViaApi(page, "schriftfuehrer");
    await page.goto("/login");

    await expect(page).toHaveURL(/\/app$/);
  });

  test("redirects anonymous /app routes to /login with a next target", async ({ page }) => {
    await page.goto("/app/sitzungen");

    await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fsitzungen$/);
  });

  test("routes completed registrations to /app/setup", async ({ page }) => {
    await page.goto("/registrieren?plan=starter");
    await page.locator("#register-first-name").fill("Maria");
    await page.locator("#register-last-name").fill("Tester");
    await page.locator("#register-email").fill("maria.tester@example.at");
    await page.locator("#register-phone").fill("+43 660 1234567");
    await page.locator("#register-username").fill("mariatester");
    await page.locator("#register-pin").fill("1234");
    await page.locator("#register-jagdzeichen").fill("MT-01");
    await page.locator("#register-revier-name").fill("Jagdgesellschaft Testtal");
    await page.locator("#register-bundesland").fill("Oberösterreich");
    await page.locator("#register-bezirk").fill("Gmunden");
    await page.getByRole("button", { name: "Revier anlegen" }).click();

    await expect(page).toHaveURL(/\/app\/setup$/);
    await expect(page.getByRole("heading", { name: "Willkommen, Maria Tester." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Revierdaten vervollständigen" })).toBeVisible();

    // Pflicht-Schritt 1 ueber die UI abschliessen — die Registrierung legt das
    // Revier mit Flaeche 0 an, der Wizard verlangt > 0.
    await page.locator("#setup-flaeche").fill("850");
    await page.getByRole("button", { name: "Weiter" }).click();
    await expect(page.getByRole("heading", { name: "Reviereinrichtungen erfassen" })).toBeVisible();

    // Nach Schritt 1 ist das Setup-Gate offen: /app leitet nicht mehr zurueck.
    await page.goto("/app");
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByRole("heading", { name: /^Weidmannsheil/ })).toBeVisible();
  });
});
