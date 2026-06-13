import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { Pressable, Text, View } from "react-native";

import type { ThemeColors } from "../lib/theme";
import { useThemeColors } from "../lib/theme";
import { useThemedStyles } from "../lib/use-themed-styles";
import { spacing, radius } from "@hege/tokens";

export interface ViewToggleOption<K extends string> {
  key: K;
  label: string;
  /** Optional: Ionicon-Name links neben dem Label. */
  icon?: keyof typeof Ionicons.glyphMap;
}

interface ViewToggleProps<K extends string> {
  value: K;
  options: ReadonlyArray<ViewToggleOption<K>>;
  onChange: (key: K) => void;
  accessibilityLabel?: string;
  /**
   * Volle Breite statt links-buendiger Pill. Fuer einen primaeren
   * Section-Switch (z.B. "Erfassen | Bestand"), der die Seite gliedert —
   * die Segmente teilen sich dann gleichmaessig die Zeile.
   */
  block?: boolean;
}

/**
 * Schlanker Segmented-Control fuer "zwei Sichten umschalten" (z.B.
 * Liste/Karte in den Locations-Tabs). Render-Bar als gerundete
 * Pill mit aktivem Segment, das eine hellere Card-Surface bekommt;
 * inaktive Segmente bleiben transparent ueber dem Toggle-Hintergrund.
 *
 * Bewusst minimal: keine Animationen, keine Custom-Drag-Geste,
 * keine i18n-Pluralisierung — der Toggle hat exakt 2-3 Optionen
 * und wird per Tap geschaltet. Light-Haptic bestaetigt die Auswahl.
 *
 * Generic-Parameter `K` haelt die Option-Keys typsicher ueber den
 * Aufrufer hinweg ("liste" | "karte" o.a.).
 */
export function ViewToggle<K extends string>({
  value,
  options,
  onChange,
  accessibilityLabel,
  block = false
}: ViewToggleProps<K>) {
  const styles = useThemedStyles(createStyles);
  const theme = useThemeColors();

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[styles.bar, block ? styles.barBlock : null]}
    >
      {options.map((option) => {
        const isActive = option.key === value;

        return (
          <Pressable
            key={option.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={option.label}
            onPress={() => {
              if (isActive) {
                return;
              }
              void Haptics.selectionAsync();
              onChange(option.key);
            }}
            style={({ pressed }) => [
              styles.segment,
              block ? styles.segmentBlock : null,
              isActive ? styles.segmentActive : null,
              pressed && !isActive ? styles.segmentPressed : null
            ]}
          >
            {option.icon ? (
              <Ionicons
                color={isActive ? theme.ink : theme.muted}
                name={option.icon}
                size={15}
              />
            ) : null}
            <Text style={[styles.label, isActive ? styles.labelActive : styles.labelInactive]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (theme: ThemeColors) =>
  ({
    bar: {
      flexDirection: "row",
      padding: spacing.xs,
      borderRadius: radius.full,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.muted,
      // hairline-Look durch low-Opacity-Muted-Rand.
      alignSelf: "flex-start"
    },
    barBlock: {
      alignSelf: "stretch"
    },
    segment: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 7,
      paddingHorizontal: 14,
      borderRadius: radius.full,
      backgroundColor: "transparent"
    },
    segmentBlock: {
      flex: 1,
      justifyContent: "center"
    },
    segmentActive: {
      backgroundColor: theme.card,
      shadowColor: "#10231d",
      shadowOpacity: 0.08,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1
    },
    segmentPressed: {
      opacity: 0.65
    },
    label: {
      fontSize: 13,
      fontWeight: "600"
    },
    labelActive: {
      color: theme.ink
    },
    labelInactive: {
      color: theme.muted
    }
  }) as const;
