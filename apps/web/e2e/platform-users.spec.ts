import { expect, test } from "@playwright/test";

import { loginAs } from "./support/auth";

test.describe("Plattform-Benutzerverwaltung", () => {
  test("platform admin can impersonate a member and return to the admin session", async ({ page }) => {
    await loginAs(page, "platform-admin");
    await page.getByRole("link", { name: "Benutzer" }).click();
    await expect(page).toHaveURL(/\/app\/benutzer$/);
    await expect(page.getByRole("heading", { name: "Benutzer verwalten" })).toBeVisible();
    if ((page.viewportSize()?.width ?? 1000) < 600) {
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth
        )
      ).toBeLessThanOrEqual(1);
    }

    const userRow = page.locator("details.platform-user").filter({ hasText: "Lukas Huber" });
    await userRow.locator("summary").click();
    await userRow.getByRole("button", { name: "Impersonieren" }).click();

    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByText("Impersonation aktiv")).toBeVisible();
    await expect(page.getByText(/Du arbeitest als Lukas Huber/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Benutzer" })).toHaveCount(0);

    await page.getByRole("button", { name: "Zurück zu Andreas Ostheimer" }).click();
    await expect(page).toHaveURL(/\/app\/benutzer$/);
    await expect(page.getByText("Impersonation aktiv")).toHaveCount(0);
  });

  test("revier admins cannot open platform user management", async ({ page }) => {
    await loginAs(page, "revier-admin");
    await page.goto("/app/benutzer");
    await expect(page).toHaveURL(/\/app\?error=keine-berechtigung/);
  });

  test("role changes are persisted and audited while the own admin account stays protected", async ({ page }) => {
    await loginAs(page, "platform-admin");

    try {
      const update = await page.request.patch(
        "/api/v1/platform/users/user-steiner/memberships/member-steiner",
        { data: { role: "jaeger", jagdzeichen: "BS-09" } }
      );
      expect(update.ok()).toBe(true);
      await expect(update.json()).resolves.toMatchObject({ role: "jaeger" });

      const list = await page.request.get("/api/v1/platform/users");
      expect(list.ok()).toBe(true);
      const body = (await list.json()) as {
        audit: Array<{ action: string; targetUserId?: string }>;
      };
      expect(body.audit).toContainEqual(
        expect.objectContaining({ action: "membership-updated", targetUserId: "user-steiner" })
      );

      const selfDisable = await page.request.patch("/api/v1/platform/users/user-steyrer", {
        data: { disabled: true }
      });
      expect(selfDisable.status()).toBe(409);
    } finally {
      const restore = await page.request.patch(
        "/api/v1/platform/users/user-steiner/memberships/member-steiner",
        { data: { role: "ausgeher", jagdzeichen: "BS-09" } }
      );
      expect(restore.ok()).toBe(true);
    }
  });
});
