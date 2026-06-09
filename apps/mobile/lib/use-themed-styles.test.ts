import { beforeEach, describe, expect, it, vi } from "vitest";

import { darkSemantic, lightSemantic } from "@hege/tokens";

import type { ThemeColors } from "./theme";

/**
 * Verifiziert, dass `useThemedStyles` bei Wechsel des Color-Schemes
 * (`useColorScheme()` -> `light`/`dark`) auch tatsaechlich neu evaluierte
 * Styles zurueckgibt - andernfalls greift `userInterfaceStyle: "automatic"`
 * in `app.json` nicht und der Dark-Mode bleibt visuell stehen.
 *
 * Wir koennen den Hook hier nicht ueber React rendern (keine Renderer-Dep
 * im Mobile-Test-Setup). Stattdessen mocken wir `react` so, dass `useMemo`
 * die Factory direkt aufruft, und `react-native`/`./theme` so, dass sie das
 * Light/Dark-Token-Set deterministisch liefern.
 */

const lightColors: ThemeColors = {
  ...lightSemantic,
  background: "#f3efe3",
  surface: "rgba(255, 252, 244, 0.8)",
  card: "rgba(252, 248, 238, 0.88)",
  ink: "#173328",
  muted: "#5f7167",
  accent: "#29503f",
  accentSoft: "#d6e1bf",
  warning: "#866323",
  danger: "#96483d",
  backdropGradient: ["#fff8ec", "#dde6c3"]
};

const darkColors: ThemeColors = {
  ...darkSemantic,
  background: "#0e1c16",
  surface: "rgba(21, 41, 33, 0.8)",
  card: "rgba(28, 53, 43, 0.88)",
  ink: "#f5f1e7",
  muted: "#a3b5ab",
  accent: "#9db36f",
  accentSoft: "#3a5a47",
  warning: "#cdb069",
  danger: "#d68a7d",
  backdropGradient: ["#15291f", "#1c352b"]
};

describe("useThemedStyles", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("liefert Light-Token-Werte wenn useColorScheme 'light' meldet", async () => {
    const { useThemedStyles } = await loadModule({ scheme: "light" });

    const styles = useThemedStyles((theme) => ({
      surface: { backgroundColor: theme.background, color: theme.ink }
    }));

    expect(styles.surface).toMatchObject({
      backgroundColor: lightColors.background,
      color: lightColors.ink
    });
  });

  it("liefert Dark-Token-Werte wenn useColorScheme 'dark' meldet", async () => {
    const { useThemedStyles } = await loadModule({ scheme: "dark" });

    const styles = useThemedStyles((theme) => ({
      surface: { backgroundColor: theme.background, color: theme.ink }
    }));

    expect(styles.surface).toMatchObject({
      backgroundColor: darkColors.background,
      color: darkColors.ink
    });
  });

  it("propagiert Token-Wechsel: gleicher Factory-Aufruf liefert in Light und Dark unterschiedliche Werte", async () => {
    const factory = (theme: ThemeColors) => ({
      surface: { backgroundColor: theme.background }
    });

    const lightModule = await loadModule({ scheme: "light" });
    const lightStyles = lightModule.useThemedStyles(factory);

    vi.resetModules();
    const darkModule = await loadModule({ scheme: "dark" });
    const darkStyles = darkModule.useThemedStyles(factory);

    expect(lightStyles.surface.backgroundColor).toBe(lightColors.background);
    expect(darkStyles.surface.backgroundColor).toBe(darkColors.background);
    expect(lightStyles.surface.backgroundColor).not.toBe(darkStyles.surface.backgroundColor);
  });
});

async function loadModule({ scheme }: { scheme: "light" | "dark" }) {
  vi.doMock("react", () => ({
    useMemo: <T,>(factory: () => T) => factory()
  }));
  vi.doMock("react-native", () => ({
    StyleSheet: {
      create: <T,>(styles: T) => styles
    },
    useColorScheme: () => scheme
  }));
  vi.doMock("./theme", () => ({
    useThemeColors: () => (scheme === "dark" ? darkColors : lightColors)
  }));

  return await import("./use-themed-styles");
}
