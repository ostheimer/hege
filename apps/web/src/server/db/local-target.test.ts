import { expect, it } from "vitest";
import { assertLocalDatabaseTarget } from "./local-target";
it("erlaubt nur die ausdrücklich lokale Hege-Datenbank", () => {
  expect(() => assertLocalDatabaseTarget("postgresql://hege:hege@127.0.0.1:15432/hege")).not.toThrow();
  for (const url of ["postgresql://x@db.neon.tech/hege", "postgresql://localhost:5432/hege", "postgresql://localhost:15432/other", "postgresql://localhost.evil:15432/hege"]) {
    expect(() => assertLocalDatabaseTarget(url)).toThrow();
  }
});
