import { expect, type Page } from "@playwright/test";

import { e2eBaseUrl } from "./e2e-env";

type DemoUserRole = "platform-admin" | "revier-admin" | "schriftfuehrer" | "jaeger" | "ausgeher";

const DEMO_PIN = "9526";

const credentialsByRole: Record<DemoUserRole, { identifier: string; name: string }> = {
  "platform-admin": {
    identifier: "ostheimer",
    name: "Andreas Ostheimer"
  },
  "revier-admin": {
    identifier: "revieradmin",
    name: "Anna Müller"
  },
  schriftfuehrer: {
    identifier: "martin.mair@hege.app",
    name: "Martin Mair"
  },
  jaeger: {
    identifier: "lukas.huber@hege.app",
    name: "Lukas Huber"
  },
  ausgeher: {
    identifier: "steiner",
    name: "Birgit Steiner"
  }
};

export async function loginAs(page: Page, role: DemoUserRole) {
  const credentials = credentialsByRole[role];

  await page.context().clearCookies();
  await loginViaApi(page, role);
  await page.goto("/app");
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByText(new RegExp(`${escapeRegExp(credentials.name)} \\|`))).toBeVisible();
}

export async function loginViaUi(page: Page, role: DemoUserRole) {
  const credentials = credentialsByRole[role];

  await page.context().clearCookies();
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveURL(/\/login$/);

  await page.locator("#login-identifier").fill(credentials.identifier);
  await page.locator("#login-pin").fill(DEMO_PIN);
  await page.getByRole("button", { name: "Anmelden" }).click();

  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByText(new RegExp(`${escapeRegExp(credentials.name)} \\|`))).toBeVisible();
}

export async function loginViaApi(page: Page, role: DemoUserRole) {
  const credentials = credentialsByRole[role];
  const response = await page.request.post("/api/v1/auth/login", {
    data: {
      identifier: credentials.identifier,
      pin: DEMO_PIN
    }
  });

  expect(response.ok()).toBe(true);

  const session = (await response.json()) as {
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
  };

  await page.context().addCookies([
    {
      name: "hege_access_token",
      value: session.tokens.accessToken,
      url: e2eBaseUrl
    },
    {
      name: "hege_refresh_token",
      value: session.tokens.refreshToken,
      url: e2eBaseUrl
    }
  ]);
}

export async function logout(page: Page) {
  await page.getByRole("button", { name: "Abmelden" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "Anmelden" })).toBeVisible();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
