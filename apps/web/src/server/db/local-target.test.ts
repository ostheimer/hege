import { expect, it } from "vitest";
import { assertLocalDatabaseTarget } from "./local-target";
it("erlaubt nur die ausdrücklich lokale Hege-Datenbank", () => {
  expect(() => assertLocalDatabaseTarget("postgresql://hege:hege@127.0.0.1:15432/hege")).not.toThrow();
  for (const url of ["postgresql://x@db.neon.tech/hege", "postgresql://localhost:5432/hege", "postgresql://localhost:15432/other", "postgresql://localhost.evil:15432/hege"]) {
    expect(() => assertLocalDatabaseTarget(url)).toThrow();
  }
});

it("erlaubt temporäre E2E-Datenbanken nur ausdrücklich und am lokalen Testport", () => {
  const local = "postgresql://hege:hege@127.0.0.1:15432/hege_e2e_1790520000000";
  expect(() => assertLocalDatabaseTarget(local)).toThrow();
  expect(() => assertLocalDatabaseTarget(local, { allowE2e: true })).not.toThrow();
  for (const url of [
    "postgresql://db.neon.tech:15432/hege_e2e_1790520000000",
    "postgresql://localhost:5432/hege_e2e_1790520000000",
    "postgresql://localhost:15432/hege_e2e_production",
    "postgresql://localhost:15432/other"
  ]) expect(() => assertLocalDatabaseTarget(url, { allowE2e: true })).toThrow();
});
