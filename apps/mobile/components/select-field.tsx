import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { ActionSheetIOS, Modal, Platform, Pressable, Text, useColorScheme, View } from "react-native";

import { useThemeColors, type ThemeColors } from "../lib/theme";
import { useThemedStyles } from "../lib/use-themed-styles";
import { spacing } from "@hege/tokens";

export interface SelectFieldOption<T extends string> {
  value: T;
  label: string;
}

interface SelectFieldProps<T extends string> {
  label: string;
  options: ReadonlyArray<SelectFieldOption<T>>;
  value: T;
  onChange: (value: T) => void;
  helperText?: string;
}

export function SelectField<T extends string>({
  label,
  options,
  value,
  onChange,
  helperText
}: SelectFieldProps<T>) {
  const [isModalOpen, setModalOpen] = useState(false);
  const selected = options.find((entry) => entry.value === value);
  const styles = useThemedStyles(createStyles);
  const theme = useThemeColors();
  const scheme = useColorScheme();

  function open() {
    if (Platform.OS === "ios") {
      const cancelIndex = options.length;
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: label,
          options: [...options.map((entry) => entry.label), "Abbrechen"],
          cancelButtonIndex: cancelIndex,
          userInterfaceStyle: scheme === "dark" ? "dark" : "light"
        },
        (selectedIndex) => {
          if (selectedIndex === cancelIndex || selectedIndex < 0 || selectedIndex >= options.length) {
            return;
          }

          const next = options[selectedIndex];

          if (next) {
            onChange(next.value);
          }
        }
      );
      return;
    }

    setModalOpen(true);
  }

  function pickFromModal(option: SelectFieldOption<T>) {
    setModalOpen(false);
    onChange(option.value);
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? value}`}
        onPress={open}
        style={({ pressed }) => [styles.trigger, pressed ? styles.triggerPressed : null]}
      >
        <Text style={styles.triggerValue}>{selected?.label ?? value}</Text>
        <Ionicons color={theme.muted} name="chevron-down" size={18} />
      </Pressable>
      {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}

      <Modal
        animationType="fade"
        transparent
        visible={isModalOpen && Platform.OS !== "ios"}
        onRequestClose={() => setModalOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setModalOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <Text style={styles.sheetTitle}>{label}</Text>
            {options.map((option) => {
              const isActive = option.value === value;

              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                  onPress={() => pickFromModal(option)}
                  style={({ pressed }) => [
                    styles.sheetOption,
                    isActive ? styles.sheetOptionActive : null,
                    pressed ? styles.sheetOptionPressed : null
                  ]}
                >
                  <Text style={[styles.sheetOptionLabel, isActive ? styles.sheetOptionLabelActive : null]}>
                    {option.label}
                  </Text>
                  {isActive ? <Ionicons color={theme.onAccent} name="checkmark" size={18} /> : null}
                </Pressable>
              );
            })}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Abbrechen"
              onPress={() => setModalOpen(false)}
              style={styles.sheetCancel}
            >
              <Text style={styles.sheetCancelText}>Abbrechen</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const createStyles = (theme: ThemeColors) =>
  ({
    field: {
      gap: 6
    },
    label: {
      fontSize: 12,
      textTransform: "uppercase",
      letterSpacing: 1.1,
      color: theme.muted
    },
    trigger: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      minHeight: 52,
      paddingHorizontal: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.inputBorder,
      backgroundColor: theme.surface
    },
    triggerPressed: {
      opacity: 0.85
    },
    triggerValue: {
      flex: 1,
      fontSize: 16,
      color: theme.ink
    },
    helperText: {
      fontSize: 13,
      lineHeight: 18,
      color: theme.muted
    },
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(16, 35, 28, 0.45)",
      justifyContent: "flex-end"
    },
    sheet: {
      padding: spacing.md,
      paddingBottom: spacing.lg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      backgroundColor: theme.card,
      gap: spacing.sm
    },
    sheetTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.ink,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xs
    },
    sheetOption: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 14,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: theme.surfaceMuted
    },
    sheetOptionActive: {
      backgroundColor: theme.accent
    },
    sheetOptionPressed: {
      opacity: 0.85
    },
    sheetOptionLabel: {
      fontSize: 15,
      color: theme.ink,
      fontWeight: "600"
    },
    sheetOptionLabelActive: {
      color: theme.onAccent
    },
    sheetCancel: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 14,
      marginTop: spacing.xs,
      borderRadius: 14,
      backgroundColor: theme.surfaceMuted
    },
    sheetCancelText: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.ink
    }
  }) as const;
