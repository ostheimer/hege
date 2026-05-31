import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { ActionSheetIOS, Platform, Pressable, Text, View } from "react-native";

import type { ThemeColors } from "../lib/theme";
import { useThemedStyles } from "../lib/use-themed-styles";

export type ErfassenAction = "ansitz" | "fallwild" | "wartung";

interface ErfassenFabProps {
  onSelectAction: (action: ErfassenAction) => void;
  /**
   * Vertikaler Offset von unten in px. Nutzt der Heute-Tab, um den FAB
   * ueber dem Bottom-Summary-Banner zu platzieren.
   */
  bottomOffset?: number;
}

const ACTION_LABELS: Record<ErfassenAction, string> = {
  ansitz: "Ansitz starten",
  fallwild: "Fallwild melden",
  wartung: "Wartung melden"
};

const ACTION_ORDER: ReadonlyArray<ErfassenAction> = ["ansitz", "fallwild", "wartung"];

/**
 * Floating-Action-Button "+ Erfassen" fuer den Map-First Heute-Tab
 * (P2.1, PR B). Tap loest auf iOS einen nativen ActionSheet aus, auf
 * Android fallback ein einfaches Inline-Menu. Auswahl ruft
 * `onSelectAction` mit dem Schluessel auf — der Aufrufer entscheidet,
 * wohin er routet.
 */
export function ErfassenFab({ onSelectAction, bottomOffset = 92 }: ErfassenFabProps) {
  const styles = useThemedStyles(createStyles);

  // Bewusster Android-Stopp: Bis ein nativer Bottom-Sheet/Dialog fuer
  // die Aktion-Auswahl da ist, rendern wir den FAB auf Android nicht.
  // Der frueher hier aktive Auto-Pick auf "fallwild" war ein Bug — der
  // FAB-Label "Erfassen" verspricht eine Auswahl, die er auf Android
  // nicht haelt. Aktuell haben wir keinen Android-Build im aktiven
  // Test, deshalb verstecken statt umstellen.
  if (Platform.OS !== "ios") {
    return null;
  }

  function open() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: "Was möchtest du erfassen?",
        options: [...ACTION_ORDER.map((key) => ACTION_LABELS[key]), "Abbrechen"],
        cancelButtonIndex: ACTION_ORDER.length
      },
      (buttonIndex) => {
        const action = ACTION_ORDER[buttonIndex];

        if (action) {
          onSelectAction(action);
        }
      }
    );
  }

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, { bottom: bottomOffset }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Eintrag erfassen"
        onPress={open}
        style={({ pressed }) => [styles.fab, pressed ? styles.fabPressed : null]}
      >
        <Ionicons color={styles.fabLabel.color} name="add" size={28} />
        <Text style={styles.fabLabel}>Erfassen</Text>
      </Pressable>
    </View>
  );
}

const createStyles = (theme: ThemeColors) =>
  ({
    wrapper: {
      position: "absolute",
      right: 14,
      alignItems: "flex-end"
    },
    fab: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 12,
      paddingHorizontal: 18,
      borderRadius: 999,
      backgroundColor: theme.accent,
      shadowColor: "#10231d",
      shadowOpacity: 0.32,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6
    },
    fabPressed: {
      opacity: 0.92,
      transform: [{ scale: 0.98 }]
    },
    fabLabel: {
      color: theme.onAccent,
      fontWeight: "700",
      fontSize: 15
    }
  }) as const;
