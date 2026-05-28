import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

describe("LoginScreen hook order", () => {
  it("haelt React-Hooks vor den fruehen Session-Returns", () => {
    const source = readFileSync(fileURLToPath(new URL("../app/login.tsx", import.meta.url).href), "utf8");
    const firstSessionReturn = source.indexOf('if (session.status === "loading" || !session.hydrated)');

    expect(firstSessionReturn).toBeGreaterThan(-1);
    expect(source.slice(firstSessionReturn)).not.toMatch(/\buse[A-Z][A-Za-z0-9_]*\s*\(/);
  });
});
