import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

function findRepoRoot(startDir: string): string {
  let dir = startDir;

  while (dir !== path.dirname(dir)) {
    if (existsSync(path.join(dir, "docs", "api-v1.md"))) {
      return dir;
    }

    dir = path.dirname(dir);
  }

  throw new Error("Could not locate repository root from docs contract test");
}

describe("API v1 documentation for GET /api/v1/ansitze/export.csv", () => {
  it("documents the implemented Ansitze CSV route", () => {
    const routePath = path.join(currentDir, "route.ts");
    const docsPath = path.join(findRepoRoot(currentDir), "docs", "api-v1.md");

    expect(existsSync(routePath)).toBe(true);
    expect(readFileSync(docsPath, "utf8")).toContain("- `GET /api/v1/ansitze/export.csv`");
  });
});
