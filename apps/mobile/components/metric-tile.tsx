import { Text, View } from "react-native";

import type { ThemeColors } from "../lib/theme";
import { eyebrowText } from "../lib/typography";
import { useThemedStyles } from "../lib/use-themed-styles";

interface MetricTileProps {
  label: string;
  value: string | number;
  detail: string;
}

export function MetricTile({ label, value, detail }: MetricTileProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.detail}>{detail}</Text>
    </View>
  );
}

const createStyles = (theme: ThemeColors) =>
  ({
    card: {
      flex: 1,
      minWidth: 150,
      gap: 8,
      padding: 18,
      borderRadius: 22,
      backgroundColor: theme.card
    },
    label: { ...eyebrowText(theme) },
    value: {
      fontSize: 28,
      color: theme.ink,
      fontWeight: "700"
    },
    detail: {
      fontSize: 14,
      color: theme.muted,
      lineHeight: 20
    }
  }) as const;
