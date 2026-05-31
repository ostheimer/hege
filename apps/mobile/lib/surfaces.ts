import type { ViewStyle } from "react-native";

import type { ThemeColors } from "./theme";

/**
 * Kanonische Content-Card-Flaeche (UI-Audit §1/§10.4): `padding 18`,
 * `borderRadius 22`, `backgroundColor: theme.card`.
 *
 * Ersetzt die ~17 verstreuten Inline-Definitionen (formCard/card/
 * detailCard/profileCard/state-cards …) durch eine einzige Quelle.
 * Verwendung als Spread in der jeweiligen StyleSheet-Definition; `gap`
 * und Sonder-Layout (flex/minWidth) bleiben pro Verwendung erhalten:
 *
 *   formCard: { ...cardSurface(theme), gap: 14 }
 *
 * Bewusst KEINE Komponente: vermeidet, jede `<View>`-Verwendung
 * anzufassen. Filter-Sections (14/18) und Login (24/28) bleiben vorerst
 * eigene Spezifikationen.
 */
export function cardSurface(theme: ThemeColors): ViewStyle {
  return {
    padding: 18,
    borderRadius: 22,
    backgroundColor: theme.card
  };
}
