/**
 * Geteilte Design-Tokens fuer Web und Mobile (F-21 aus dem UI-Audit).
 *
 * Die Werte hier sind die einzige Quelle der Wahrheit. `apps/web` zieht sie
 * per Codegen-Skript in CSS-Custom-Properties, `apps/mobile` importiert die
 * TypeScript-Konstanten direkt.
 *
 * ## Wert-Entscheidungen bei Drift zwischen Web und Mobile
 *
 * Vor F-21 hatten Web (`globals.css`) und Mobile (`lib/theme.ts`) leicht
 * abweichende Hex-Werte fuer "dieselben" Konzepte. Die Einheitlichkeit folgt
 * diesen Regeln:
 *
 * - `accent`, `ink`, `muted`, `accentSoft`: **Mobile-Werte gewinnen.** Sie
 *   sind feiner abgestimmt (z. B. Mobile `accent: #29503f` statt Web
 *   `--accent: #9db36f`). Das aendert das visuelle Erscheinungsbild von Web
 *   bewusst leicht.
 * - `background`, `surfaceCard`, `border`, `shadow`-rgba: **Web-Werte
 *   gewinnen**, weil sie laut UI-Audit die distinktive Farbwelt tragen.
 * - `accentStrong`: existierte nur in Web, wird kanonisch uebernommen.
 *
 * Das Mobile-Dark-Set bleibt identisch zur F-19-Implementierung.
 */

export interface ThemeColors {
  /** App-Hintergrundfarbe (Body/Root). */
  background: string;
  /** Dunkle Vordergrund-Surface (Sidebar etc., Web-spezifisch). */
  surface: string;
  /** Helle Karten-Surface fuer Layouts mit Glas-Effekt. */
  surfaceSoft: string;
  /** Karten-Surface fuer Listen und Boxen. */
  surfaceCard: string;
  /** Dezente Trennlinien-Farbe. */
  border: string;
  /** Primaerer Text/Tinte. */
  ink: string;
  /** Sekundaerer Text. */
  muted: string;
  /** Akzent-Farbe (Buttons, aktive States). */
  accent: string;
  /** Stark gesaettigter Akzent (Highlight-Surfaces, Web-Sidebar etc.). */
  accentStrong: string;
  /** Heller Akzent-Hintergrund (Chips, Badges). */
  accentSoft: string;
  /** Warn-Status. */
  warning: string;
  /** Fehler/Gefahr-Status. */
  danger: string;
}

export const lightColors: ThemeColors = {
  background: "#f3efe3",
  surface: "rgba(18, 36, 28, 0.9)",
  surfaceSoft: "rgba(255, 252, 244, 0.8)",
  surfaceCard: "rgba(252, 248, 238, 0.88)",
  border: "rgba(25, 57, 44, 0.15)",
  ink: "#173328",
  muted: "#5f7167",
  accent: "#29503f",
  accentStrong: "#24493a",
  accentSoft: "#d6e1bf",
  warning: "#866323",
  danger: "#96483d"
};

export const darkColors: ThemeColors = {
  background: "#0e1c16",
  surface: "rgba(14, 28, 22, 0.9)",
  surfaceSoft: "rgba(21, 41, 33, 0.8)",
  surfaceCard: "rgba(28, 53, 43, 0.88)",
  border: "rgba(157, 179, 111, 0.18)",
  ink: "#f5f1e7",
  muted: "#a3b5ab",
  accent: "#9db36f",
  accentStrong: "#bcd194",
  accentSoft: "#3a5a47",
  warning: "#cdb069",
  danger: "#d68a7d"
};

/**
 * Semantische Farb-Rollen (F-21 / UI-Audit §10.1). Bewusst getrennt von
 * {@link ThemeColors}: das sind keine Basis-Tinten, sondern abgeleitete
 * Rollen (Status-Flaechen, Text-auf-Akzent, Input-Rahmen). Die Werte sind
 * aus den bisher verstreuten Hardcodings der Mobile-App kanonisiert, damit
 * die Adoption rein werterhaltend ist.
 */
export interface SemanticColors {
  /** Textfarbe auf Akzent-Flaechen (Primary-Buttons, Pills). */
  onAccent: string;
  /** Gedaempfte Creme-Flaeche (Sekundaer-Buttons, Panels, Chips). */
  surfaceMuted: string;
  /** Kraeftigere gedaempfte Flaeche. */
  surfaceMutedStrong: string;
  /** Rahmenfarbe fuer Text-Inputs. */
  inputBorder: string;
  /** Status-Flaechen fuer Badges, Icon-Wraps und State-Anzeigen. */
  successSurface: string;
  warningSurface: string;
  dangerSurface: string;
  infoSurface: string;
  conflictSurface: string;
}

export const lightSemantic: SemanticColors = {
  onAccent: "#fff9ef",
  surfaceMuted: "#e3dccd",
  surfaceMutedStrong: "#ddcfb7",
  inputBorder: "#d9d2c4",
  successSurface: "rgba(157, 179, 111, 0.18)",
  warningSurface: "rgba(134, 99, 35, 0.14)",
  dangerSurface: "rgba(157, 74, 63, 0.12)",
  infoSurface: "rgba(36, 73, 58, 0.08)",
  conflictSurface: "rgba(134, 99, 35, 0.2)"
};

export const darkSemantic: SemanticColors = {
  onAccent: "#10231d",
  surfaceMuted: "#243f33",
  surfaceMutedStrong: "#2c4a3b",
  inputBorder: "rgba(157, 179, 111, 0.28)",
  successSurface: "rgba(157, 179, 111, 0.18)",
  warningSurface: "rgba(205, 176, 105, 0.2)",
  dangerSurface: "rgba(214, 138, 125, 0.2)",
  infoSurface: "rgba(157, 179, 111, 0.1)",
  conflictSurface: "rgba(205, 176, 105, 0.24)"
};

export interface Spacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  "2xl": number;
}

/** Pixel-/Punkt-basierte Abstaende. RN nimmt die Zahlen direkt; Web nutzt sie als `Npx`. */
export const spacing: Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  "2xl": 48
};

export interface Radius {
  sm: number;
  md: number;
  lg: number;
  xl: number;
  full: number;
}

export const radius: Radius = {
  sm: 6,
  md: 12,
  lg: 20,
  xl: 28,
  full: 999
};

export interface Shadow {
  card: string;
  elevated: string;
}

/** CSS-Schatten-Strings (Web). */
export const shadow: Shadow = {
  card: "0 24px 60px rgba(16, 35, 28, 0.12)",
  elevated: "0 32px 80px rgba(16, 35, 28, 0.18)"
};

export interface RNShadow {
  shadowColor: string;
  shadowOpacity: number;
  shadowRadius: number;
  shadowOffset: { width: number; height: number };
  /** Android-Aequivalent (RN ignoriert es auf iOS). */
  elevation: number;
}

/**
 * React-Native-Schatten-Aequivalente. Bewusst manuell aus den CSS-Werten
 * abgeleitet, weil RN keine `box-shadow`-Strings versteht.
 */
export const rnShadow: { card: RNShadow; elevated: RNShadow } = {
  card: {
    shadowColor: "#10231d",
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 18 },
    elevation: 6
  },
  elevated: {
    shadowColor: "#10231d",
    shadowOpacity: 0.18,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 24 },
    elevation: 12
  }
};

export interface Typography {
  /** Font-Family-Stack fuer Ueberschriften. Web bindet Fraunces als CSS-Variable. */
  heading: string;
  /** Font-Family-Stack fuer Fliesstext. Web bindet Manrope als CSS-Variable. */
  body: string;
}

export const typography: Typography = {
  heading: "var(--font-heading), 'Fraunces', Georgia, serif",
  body: "var(--font-body), 'Manrope', system-ui, sans-serif"
};

/**
 * Mapping von Web-CSS-Custom-Property-Namen auf Token-Werte des Light-Themes.
 *
 * Hist. Web kannte:
 *   --bg, --surface, --surface-soft, --surface-card, --border,
 *   --text, --muted, --accent, --accent-strong, --danger, --warning, --shadow
 * Diese Variablen-Namen bleiben stabil, damit der bestehende CSS-Code in
 * `globals.css` (~1100 Zeilen) ohne Anpassung weiter funktioniert.
 */
export const webCssVariables: Record<string, string> = {
  "--bg": lightColors.background,
  "--surface": lightColors.surface,
  "--surface-soft": lightColors.surfaceSoft,
  "--surface-card": lightColors.surfaceCard,
  "--border": lightColors.border,
  "--text": lightColors.ink,
  "--muted": lightColors.muted,
  "--accent": lightColors.accent,
  "--accent-strong": lightColors.accentStrong,
  "--accent-soft": lightColors.accentSoft,
  "--danger": lightColors.danger,
  "--warning": lightColors.warning,
  "--shadow": shadow.card,
  "--shadow-elevated": shadow.elevated,
  "--radius-sm": `${radius.sm}px`,
  "--radius-md": `${radius.md}px`,
  "--radius-lg": `${radius.lg}px`,
  "--radius-xl": `${radius.xl}px`,
  "--radius-full": `${radius.full}px`,
  "--space-xs": `${spacing.xs}px`,
  "--space-sm": `${spacing.sm}px`,
  "--space-md": `${spacing.md}px`,
  "--space-lg": `${spacing.lg}px`,
  "--space-xl": `${spacing.xl}px`,
  "--space-2xl": `${spacing["2xl"]}px`
};

/**
 * Generiert das vollstaendige `:root { ... }`-Stylesheet als String. Wird vom
 * Web-Build-Skript (`apps/web/scripts/generate-tokens-css.mjs`) konsumiert,
 * lebt aber hier, damit Aenderungen am Mapping atomar mit den Token-Werten
 * passieren.
 */
export function buildRootCss(): string {
  const lines = Object.entries(webCssVariables).map(
    ([name, value]) => `  ${name}: ${value};`
  );
  return [
    "/* Auto-generated from @hege/tokens. Do not edit by hand. */",
    ":root {",
    ...lines,
    "}",
    ""
  ].join("\n");
}
