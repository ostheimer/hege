import { describe, expect, it, vi } from "vitest";

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn()
  }
}));

import { resolveEffectiveThemeScheme } from "./theme-mode";

describe("resolveEffectiveThemeScheme", () => {
  it("folgt dem System-Schema im Modus system", () => {
    expect(resolveEffectiveThemeScheme("system", "dark")).toBe("dark");
    expect(resolveEffectiveThemeScheme("system", "light")).toBe("light");
  });

  it("erzwingt den In-App-Dunkelmodus auch bei hellem System-Schema", () => {
    expect(resolveEffectiveThemeScheme("dark", "light")).toBe("dark");
  });

  it("erzwingt den In-App-Hellmodus auch bei dunklem System-Schema", () => {
    expect(resolveEffectiveThemeScheme("light", "dark")).toBe("light");
  });

  it("faellt ohne System-Schema auf hell zurueck", () => {
    expect(resolveEffectiveThemeScheme("system", null)).toBe("light");
    expect(resolveEffectiveThemeScheme("system", undefined)).toBe("light");
  });
});
