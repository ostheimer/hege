import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, TextInput, View } from "react-native";

import type { ThemeColors } from "../lib/theme";
import { useThemeColors } from "../lib/theme";
import { useThemedStyles } from "../lib/use-themed-styles";
import { spacing } from "@hege/tokens";

interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  testID?: string;
  /** Erlaubt automatische Hinweis-Anpassung im Aufrufer (z.B. "Such Wildart, Gemeinde, Notiz..."). */
  accessibilityLabel?: string;
}

/**
 * `<SearchInput>` — vereinheitlichter Such-Input mit Lupensymbol links
 * und optionalem Clear-Button rechts. Wird in den Listen-Tabs (M1/M2/M3)
 * eingesetzt.
 *
 * Bewusst minimal: kein Debounce, kein Submit-Handler — die Aufrufer
 * filtern client-seitig auf jeder Eingabe und das ist bei den
 * realistischen Demo-Volumina (max ~30 Eintraege) schnell genug.
 */
export function SearchInput({
  value,
  onChangeText,
  placeholder = "Suchen...",
  accessibilityLabel,
  testID
}: SearchInputProps) {
  const styles = useThemedStyles(createStyles);
  const theme = useThemeColors();
  const hasValue = value.length > 0;

  return (
    <View style={styles.container}>
      <Ionicons color={theme.muted} name="search" size={16} />
      <TextInput
        testID={testID}
        accessibilityLabel={accessibilityLabel ?? placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder={placeholder}
        placeholderTextColor={theme.muted}
        returnKeyType="search"
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
      />
      {hasValue ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Suchfeld leeren"
          hitSlop={12}
          onPress={() => onChangeText("")}
          style={({ pressed }) => [styles.clearButton, pressed ? styles.clearPressed : null]}
        >
          <Ionicons color={theme.muted} name="close-circle" size={18} />
        </Pressable>
      ) : null}
    </View>
  );
}

const createStyles = (theme: ThemeColors) =>
  ({
    container: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: 12,
      paddingVertical: spacing.sm,
      borderRadius: 14,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.muted
    },
    input: {
      flex: 1,
      fontSize: 15,
      color: theme.ink,
      paddingVertical: 0
    },
    clearButton: {
      padding: 2
    },
    clearPressed: {
      opacity: 0.6
    }
  }) as const;
