import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

const e2ePort = 3200;
const e2eDatabaseName = process.env.HEGE_E2E_DB_NAME ?? `hege_e2e_${Date.now()}`;
const e2eDatabaseUrl = `postgresql://hege:hege@127.0.0.1:15432/${e2eDatabaseName}`;
const e2eBaseUrl = `http://127.0.0.1:${e2ePort}`;

process.env.HEGE_E2E_DB_NAME = e2eDatabaseName;
process.env.HEGE_E2E_DATABASE_URL = e2eDatabaseUrl;
process.env.HEGE_E2E_DATABASE_URL_UNPOOLED = e2eDatabaseUrl;
process.env.HEGE_E2E_BASE_URL = e2eBaseUrl;

export default defineConfig({
  testDir: "./apps/web/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 15_000
  },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: path.join(__dirname, "output/playwright/report") }]
  ],
  outputDir: path.join(__dirname, "output/playwright/test-results"),
  use: {
    baseURL: e2eBaseUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  webServer: {
    command: "pnpm test:e2e:web",
    url: `${e2eBaseUrl}/icon.png`,
    timeout: 180_000,
    reuseExistingServer: false,
    env: {
      ...process.env,
      APP_DOMAIN: "localhost",
      DATABASE_URL: e2eDatabaseUrl,
      DATABASE_URL_UNPOOLED: e2eDatabaseUrl,
      HEGE_USE_DEMO_STORE: "false",
      NEXT_PUBLIC_API_BASE_URL: `${e2eBaseUrl}/api/v1`,
      NEXT_PUBLIC_APP_URL: e2eBaseUrl
    }
  },
  projects: [
    {
      name: "setup db",
      testMatch: /global\.setup\.ts/
    },
    {
      name: "desktop-chromium",
      testIgnore: /global\.setup\.ts/,
      use: {
        ...devices["Desktop Chrome"]
      },
      dependencies: ["setup db"]
    },
    {
      name: "mobile-chromium",
      testIgnore: /global\.setup\.ts/,
      use: {
        ...devices["Pixel 7"]
      },
      dependencies: ["setup db"]
    }
  ]
});
