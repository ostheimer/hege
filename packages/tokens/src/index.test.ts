import { describe, expect, it } from "vitest";

import {
  buildRootCss,
  darkColors,
  darkSemantic,
  lightColors,
  lightSemantic,
  radius,
  rnShadow,
  shadow,
  spacing,
  typography,
  webCssVariables
} from "./index";

describe("@hege/tokens", () => {
  it("haelt die kanonisch gewaehlten Light-Werte fest", () => {
    expect(lightColors.background).toBe("#f3efe3");
    expect(lightColors.ink).toBe("#173328");
    expect(lightColors.muted).toBe("#5f7167");
    // Mobile gewinnt: accent ist das satte Tannengruen, nicht das helle.
    expect(lightColors.accent).toBe("#29503f");
    expect(lightColors.accentStrong).toBe("#24493a");
    expect(lightColors.accentSoft).toBe("#d6e1bf");
  });

  it("definiert ein vollstaendiges Dark-Token-Set fuer F-19", () => {
    expect(darkColors.background).toBe("#0e1c16");
    expect(darkColors.ink).toBe("#f5f1e7");
    expect(darkColors.accent).toBe("#9db36f");
  });

  it("haelt die semantischen Farb-Rollen fuer Light + Dark fest", () => {
    // Werterhaltend zu den bisherigen Hardcodings der Mobile-App.
    expect(lightSemantic.onAccent).toBe("#fff9ef");
    expect(lightSemantic.surfaceMuted).toBe("#e3dccd");
    expect(lightSemantic.inputBorder).toBe("#d9d2c4");
    expect(lightSemantic.dangerSurface).toBe("rgba(157, 74, 63, 0.12)");
    expect(lightSemantic.infoSurface).toBe("rgba(36, 73, 58, 0.08)");
    // Dark kippt die Text-auf-Akzent-Rolle bewusst auf eine dunkle Tinte.
    expect(darkSemantic.onAccent).toBe("#10231d");
    // onWarning teilt die Werte mit onAccent (beide Flaechen sind hell-in-dunkel),
    // bleibt aber als eigene semantische Rolle getrennt.
    expect(lightSemantic.onWarning).toBe("#fff9ef");
    expect(darkSemantic.onWarning).toBe("#10231d");
    // Beide Sets decken dieselben Rollen ab.
    expect(Object.keys(darkSemantic).sort()).toEqual(Object.keys(lightSemantic).sort());
  });

  it("hat numerische Spacing- und Radius-Werte", () => {
    expect(spacing.md).toBe(16);
    expect(spacing["2xl"]).toBe(48);
    expect(radius.full).toBe(999);
  });

  it("liefert Schatten in CSS- und RN-Form", () => {
    expect(shadow.card).toMatch(/rgba\(/);
    expect(rnShadow.card.shadowColor).toMatch(/^#/);
    expect(rnShadow.card.shadowOffset.height).toBeGreaterThan(0);
  });

  it("setzt Web-Variablen passend zum Light-Theme", () => {
    expect(webCssVariables["--bg"]).toBe(lightColors.background);
    expect(webCssVariables["--accent"]).toBe(lightColors.accent);
    expect(webCssVariables["--accent-strong"]).toBe(lightColors.accentStrong);
    expect(webCssVariables["--shadow"]).toBe(shadow.card);
  });

  it("baut ein gueltiges :root-Stylesheet", () => {
    const css = buildRootCss();
    expect(css).toContain(":root {");
    expect(css).toContain("--bg: #f3efe3");
    expect(css).toContain("--accent: #29503f");
    expect(css.trim().endsWith("}")).toBe(true);
  });

  it("setzt Typografie-Stacks mit CSS-Variablen-Fallbacks", () => {
    expect(typography.heading).toContain("--font-heading");
    expect(typography.body).toContain("--font-body");
  });
});
