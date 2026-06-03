import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, Text, View } from "react-native";

import type { ThemeColors } from "../lib/theme";
import { useThemeColors } from "../lib/theme";
import { useThemedStyles } from "../lib/use-themed-styles";

interface QueueBadgeProps {
  count: number;
  failedCount: number;
  onPress: () => void;
  /**
   * Vertikaler Offset von oben in px. Der Heute-Tab nutzt das, um die
   * Badge unter den Filter-Chips zu setzen.
   */
  topOffset?: number;
}

/**
 * Queue-Status-Badge — schwebt rechts oben auf der Karte, sobald Offline-
 * Eintraege auf Sync warten (P2.1, PR B). Tap fuehrt zur Tagesuebersicht,
 * wo Queue-Sync-Aktionen liegen.
 *
 * Wenn `count === 0` und `failedCount === 0` rendert die Komponente
 * `null` — kein Platzbedarf, keine Ablenkung.
 */
export function QueueBadge({ count, failedCount, onPress, topOffset = 132 }: QueueBadgeProps) {
  const styles = useThemedStyles(createStyles);
  const theme = useThemeColors();

  if (count === 0 && failedCount === 0) {
    return null;
  }

  const isFailed = failedCount > 0;
  const label = isFailed ? `${failedCount}` : `${count}`;
  const accessibility = isFailed
    ? `${failedCount} Queue-Einträge mit Fehler. Tippen für Tagesübersicht.`
    : `${count} Queue-Einträge offen. Tippen für Tagesübersicht.`;

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, { top: topOffset }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibility}
        onPress={onPress}
        style={({ pressed }) => [
          styles.badge,
          isFailed ? styles.badgeFailed : styles.badgePending,
          pressed ? styles.badgePressed : null
        ]}
      >
        <Ionicons
          color={isFailed ? theme.onWarning : theme.ink}
          name={isFailed ? "alert-circle" : "cloud-upload"}
          size={16}
        />
        <Text style={[styles.badgeText, isFailed ? styles.badgeTextFailed : styles.badgeTextPending]}>
          {label}
        </Text>
      </Pressable>
    </View>
  );
}

const createStyles = (theme: ThemeColors) =>
  ({
    wrapper: {
      position: "absolute",
      right: 12,
      alignItems: "flex-end"
    },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 999,
      shadowColor: "#10231d",
      shadowOpacity: 0.18,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4
    },
    badgePending: {
      backgroundColor: theme.card
    },
    badgeFailed: {
      backgroundColor: theme.warning
    },
    badgePressed: {
      opacity: 0.85
    },
    badgeText: {
      fontSize: 13,
      fontWeight: "700"
    },
    badgeTextPending: {
      color: theme.ink
    },
    badgeTextFailed: {
      color: theme.onWarning
    }
  }) as const;
