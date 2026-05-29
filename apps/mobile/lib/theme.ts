import {
  darkColors as tokensDarkColors,
  darkSemantic as tokensDarkSemantic,
  lightColors as tokensLightColors,
  lightSemantic as tokensLightSemantic,
  type SemanticColors,
  type ThemeColors as TokensThemeColors
} from "@hege/tokens";
import { useColorScheme } from "react-native";

/**
 * Re-Exports der Token-Werte aus `@hege/tokens` (F-21).
 *
 * Die UI-Schicht in `app/` und `components/` greift weiter auf `colors.x`
 * bzw. `useThemeColors()` zu - die Indirektion ueber das geteilte Token-
 * Paket bleibt fuer Verbraucher unsichtbar.
 *
 * Die mobile Variante projeziert das volle Token-Set auf das schmalere,
 * historisch gewachsene Mobile-Interface, damit bestehende Components ohne
 * Refactor weiterlaufen:
 *   - `surface`/`card` -> `surfaceSoft`/`surfaceCard` (rgba, RN versteht das)
 *   - die uebrigen Felder werden 1:1 uebernommen.
 */

export interface ThemeColors extends SemanticColors {
  background: string;
  surface: string;
  card: string;
  ink: string;
  muted: string;
  accent: string;
  accentSoft: string;
  warning: string;
  danger: string;
}

function projectTokens(theme: TokensThemeColors, semantic: SemanticColors): ThemeColors {
  return {
    background: theme.background,
    surface: theme.surfaceSoft,
    card: theme.surfaceCard,
    ink: theme.ink,
    muted: theme.muted,
    accent: theme.accent,
    accentSoft: theme.accentSoft,
    warning: theme.warning,
    danger: theme.danger,
    ...semantic
  };
}

export const lightColors: ThemeColors = projectTokens(tokensLightColors, tokensLightSemantic);
export const darkColors: ThemeColors = projectTokens(tokensDarkColors, tokensDarkSemantic);

/**
 * Default token-Set, mit dem die meisten Screens heute statisch arbeiten.
 * Bleibt bewusst auf Light, damit F-19 keinen flaechigen Refactor erzwingt.
 * Components, die auf das aktive Schema reagieren sollen, importieren stattdessen
 * `useThemeColors()`.
 */
export const colors = lightColors;

/**
 * Liefert das passende Token-Set fuer das aktuelle System-Color-Scheme.
 * Mit `userInterfaceStyle: "automatic"` in app.json folgt das System dem User-
 * Setting; Components koennen damit Stueck fuer Stueck auf die getrennten
 * Token-Sets migriert werden.
 */
export function useThemeColors(): ThemeColors {
  const scheme = useColorScheme();
  return scheme === "dark" ? darkColors : lightColors;
}
