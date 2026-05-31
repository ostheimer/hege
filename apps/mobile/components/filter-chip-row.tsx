import * as Haptics from "expo-haptics";
import { Pressable, ScrollView, Text, View } from "react-native";

import type { ThemeColors } from "../lib/theme";
import { useThemedStyles } from "../lib/use-themed-styles";

export interface FilterChipOption<K extends string> {
  key: K;
  label: string;
  /** Optionaler Counter — wird rechts neben dem Label klein angezeigt. */
  count?: number;
}

interface FilterChipRowProps<K extends string> {
  value: K;
  options: ReadonlyArray<FilterChipOption<K>>;
  onChange: (key: K) => void;
  accessibilityLabel?: string;
}

/**
 * `<FilterChipRow>` — horizontale, scrollbare Chip-Reihe fuer Listen-
 * Filter. Wird in M1/M2/M3 fuer Mobile-Filter wiederverwendet.
 *
 * Im Gegensatz zu `<ViewToggle>` (segmented control mit fester Breite)
 * skaliert die Chip-Reihe horizontal scrollbar, weil Filter-Optionen
 * je nach Domain (Bergungsstatus, Einrichtungstyp, ...) bis zu 5-7
 * Werte haben. Die Optik bleibt aber gleich: aktive Chip mit Akzent-
 * Hintergrund, inaktive transparent mit dezenter Border.
 */
export function FilterChipRow<K extends string>({
  value,
  options,
  onChange,
  accessibilityLabel
}: FilterChipRowProps<K>) {
  const styles = useThemedStyles(createStyles);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
    >
      {options.map((option) => {
        const isActive = option.key === value;
        const accessibilityLabel =
          typeof option.count === "number"
            ? `${option.label} (${option.count})`
            : option.label;

        return (
          <Pressable
            key={option.key}
            accessibilityRole="radio"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={accessibilityLabel}
            onPress={() => {
              if (isActive) {
                return;
              }
              void Haptics.selectionAsync();
              onChange(option.key);
            }}
            style={({ pressed }) => [
              styles.chip,
              isActive ? styles.chipActive : styles.chipInactive,
              pressed && !isActive ? styles.chipPressed : null
            ]}
          >
            <Text
              style={[
                styles.chipLabel,
                isActive ? styles.chipLabelActive : styles.chipLabelInactive
              ]}
            >
              {option.label}
            </Text>
            {typeof option.count === "number" ? (
              <View style={isActive ? styles.countBadgeActive : styles.countBadgeInactive}>
                <Text style={isActive ? styles.countActive : styles.countInactive}>
                  {option.count}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const createStyles = (theme: ThemeColors) =>
  ({
    container: {
      gap: 8,
      paddingVertical: 2
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 14,
      borderRadius: 999,
      borderWidth: 1
    },
    chipActive: {
      backgroundColor: theme.accent,
      borderColor: theme.accent
    },
    chipInactive: {
      backgroundColor: "transparent",
      borderColor: theme.muted
    },
    chipPressed: {
      opacity: 0.6
    },
    chipLabel: {
      fontSize: 13,
      fontWeight: "600"
    },
    chipLabelActive: {
      color: theme.onAccent
    },
    chipLabelInactive: {
      color: theme.ink
    },
    countBadgeActive: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 999,
      backgroundColor: "rgba(255, 249, 239, 0.22)"
    },
    countBadgeInactive: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 999,
      backgroundColor: theme.card
    },
    countActive: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.onAccent
    },
    countInactive: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.muted
    }
  }) as const;
