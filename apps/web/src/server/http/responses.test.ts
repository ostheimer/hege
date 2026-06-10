import { afterEach, describe, expect, it, vi } from "vitest";

import { RouteError } from "./errors";
import { jsonError } from "./responses";

describe("jsonError", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps a RouteError to its status and ApiError body", async () => {
    const response = jsonError(new RouteError("Nicht angemeldet.", 401, "unauthenticated"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: { code: "unauthenticated", message: "Nicht angemeldet.", status: 401 }
    });
  });

  it("logs unexpected 5xx errors to the runtime log", () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const cause = new Error("DB nicht erreichbar");

    const response = jsonError(cause);

    expect(response.status).toBe(500);
    expect(errorLog).toHaveBeenCalledWith("[api] Unbehandelter Route-Fehler:", cause);
  });

  it("keeps expected 4xx errors out of the runtime log", () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = jsonError(new RouteError("Ungültige PIN.", 400, "validation-error"));

    expect(response.status).toBe(400);
    expect(errorLog).not.toHaveBeenCalled();
  });
});
