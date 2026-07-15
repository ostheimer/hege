import { expect, test } from "@playwright/test";

import { loginAs, loginViaUi, logout } from "./support/auth";
import { resetE2eDatabase } from "./support/reset-db";

test.describe("Auth und geschuetzte Routen", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async () => {
    await resetE2eDatabase();
  });

  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/app/sitzungen");

    await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fsitzungen$/);
    await expect(page.getByRole("button", { name: "Anmelden" })).toBeVisible();
  });

  test("does not leak seeded credentials on the login form", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/login");

    await expect(page.locator("#login-identifier")).not.toHaveAttribute(
      "placeholder",
      /ostheimer|andreas@ostheimer\.at/i
    );
    await expect(page.locator("#login-pin")).not.toHaveAttribute("placeholder", /9526/);
  });

  test("logs in and out with the visible sidebar action", async ({ page }) => {
    await loginViaUi(page, "schriftfuehrer");
    await expect(page.getByRole("button", { name: "Abmelden" })).toBeVisible();

    await logout(page);

    await page.goto("/");
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole("heading", {
        name: "Das Revier. Gemeinsam im Blick."
      })
    ).toBeVisible();
  });

  test("keeps jaeger away from sitzungen routes", async ({ page }) => {
    test.skip(test.info().project.name !== "desktop-chromium", "Role redirect is covered once on desktop.");

    await loginAs(page, "jaeger");
    await page.goto("/app/sitzungen");

    // requirePageRoles leitet sichtbar auf das Dashboard mit Forbidden-Banner um.
    await expect(page).toHaveURL(/\/app\?error=keine-berechtigung&path=%2Fapp%2Fsitzungen$/);
    await expect(page.getByRole("alert").filter({ hasText: "Keine Berechtigung" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^Weidmannsheil/ })).toBeVisible();
  });
});
