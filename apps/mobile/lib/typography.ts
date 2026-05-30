import type { TextStyle } from "react-native";

import type { ThemeColors } from "./theme";

/**
 * Kanonische Eyebrow-/Section-Label-Typografie (UI-Audit §10.7).
 *
 * Ersetzt die zuvor 9+ leicht abweichenden Inline-Definitionen (fontSize
 * 11/12, letterSpacing 1.1/1.2, mal mit/ohne fontWeight) durch eine einzige
 * Quelle. Verwendung als Spread in den jeweiligen StyleSheet-Definitionen;
 * Layout-Extras (z. B. marginBottom) bleiben pro Verwendung erhalten:
 *
 *   sectionLabel: { ...eyebrowText(theme), marginBottom: 4 }
 *
 * Bewusst KEINE Komponente: das Fragment vermeidet, jede einzelne
 * `<Text>`-Verwendung (in Formularen dutzendfach) anzufassen.
 */
export function eyebrowText(theme: ThemeColors): TextStyle {
  return {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: theme.muted
  };
}
