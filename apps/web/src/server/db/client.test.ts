import { afterEach, describe, expect, it, vi } from "vitest";
import { createPool } from "./client";
import { jsonError } from "../http/responses";

afterEach(() => vi.unstubAllEnvs());

describe("Cloud-Datenbankkonfiguration", () => {
  it.each(["preview", "production"])("verhindert den lokalen Fallback in %s", async (environment) => {
    vi.stubEnv("VERCEL_ENV", environment);
    vi.stubEnv("DATABASE_URL", " ");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      let error: unknown;
      try { createPool(); } catch (caught) { error = caught; }
      expect(error).toBeInstanceOf(Error);
      const response = jsonError(error);
      expect(response.status).toBe(503);
      expect((await response.json()).error.code).toBe("service-unavailable");
    } finally { log.mockRestore(); }
  });

  it("erhält explizite Verbindungen für lokale Prüfdatenbanken", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("DATABASE_URL", "");
    const pool = createPool("postgresql://hege:hege@127.0.0.1:15432/hege_e2e_test");
    expect(pool.options.connectionString).toBe("postgresql://hege:hege@127.0.0.1:15432/hege_e2e_test");
    await pool.end();
  });
});
