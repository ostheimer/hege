import { describe, expect, it } from "vitest";

import { darkColors, darkSemantic, lightColors, lightSemantic } from "@hege/tokens";

const MINIMUM_BODY_TEXT_CONTRAST = 4.5;

describe("accent foreground contrast", () => {
  it("keeps onAccent readable on accent surfaces in light and dark mode", () => {
    expect(contrastRatio(lightSemantic.onAccent, lightColors.accent)).toBeGreaterThanOrEqual(
      MINIMUM_BODY_TEXT_CONTRAST
    );
    expect(contrastRatio(darkSemantic.onAccent, darkColors.accent)).toBeGreaterThanOrEqual(
      MINIMUM_BODY_TEXT_CONTRAST
    );
  });

  it("documents the old cream map fallback colors as dark-mode contrast regressions", () => {
    expect(contrastRatio("#f7f2e5", darkColors.accent)).toBeLessThan(
      MINIMUM_BODY_TEXT_CONTRAST
    );
    expect(contrastRatio("#e5efd9", darkColors.accent)).toBeLessThan(
      MINIMUM_BODY_TEXT_CONTRAST
    );
  });
});

function contrastRatio(foreground: string, background: string): number {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort(
    (a, b) => b - a
  );

  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(hex: string): number {
  const [red, green, blue] = hexToRgb(hex).map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function hexToRgb(hex: string): [number, number, number] {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);

  if (!match) {
    throw new Error(`Unsupported color value: ${hex}`);
  }

  return [
    Number.parseInt(match[1], 16),
    Number.parseInt(match[2], 16),
    Number.parseInt(match[3], 16)
  ];
}
