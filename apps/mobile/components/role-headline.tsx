import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, Text, View } from "react-native";

import type { RoleHeadline as RoleHeadlineData } from "../lib/dashboard-role.helpers";
import { useThemeColors, type ThemeColors } from "../lib/theme";
import { cardSurface } from "../lib/surfaces";
import { eyebrowText } from "../lib/typography";
import { useThemedStyles } from "../lib/use-themed-styles";
import { spacing } from "@hege/tokens";

interface RoleHeadlineProps {
  data: RoleHeadlineData;
  onPressCta?: (route: string) => void;
}

/**
 * `<RoleHeadline>` — die rollenspezifische Headline-Card oben im
 * Heute-Tab (P2.2). Eyebrow + Title + Subtitle und optional eine
 * Tap-Affordance, die der Aufrufer aufloest.
 *
 * Bewusst flach: keine Bilder, keine Stat-Tiles im selben Block —
 * die kommen separat als MetricTile-Reihe darunter. Das laesst die
 * Komposition wiederverwenden, falls wir die Headline z.B. spaeter
 * im Sitzungs-Detail (Schriftfuehrung) nochmal einsetzen wollen.
 */
export function RoleHeadline({ data, onPressCta }: RoleHeadlineProps) {
  const styles = useThemedStyles(createStyles);
  const theme = useThemeColors();
  const cta = data.cta;

  if (cta && onPressCta) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${data.title}. ${cta.label}.`}
        onPress={() => onPressCta(cta.route)}
        style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
      >
        <Text style={styles.eyebrow}>{data.eyebrow}</Text>
        <Text style={styles.title}>{data.title}</Text>
        <Text style={styles.subtitle}>{data.subtitle}</Text>
        <View style={styles.ctaRow}>
          <Text style={styles.ctaLabel}>{cta.label}</Text>
          <Ionicons color={theme.accent} name="arrow-forward" size={16} />
        </View>
      </Pressable>
    );
  }

  return (
    <View accessibilityRole="summary" style={styles.card}>
      <Text style={styles.eyebrow}>{data.eyebrow}</Text>
      <Text style={styles.title}>{data.title}</Text>
      <Text style={styles.subtitle}>{data.subtitle}</Text>
    </View>
  );
}

const createStyles = (theme: ThemeColors) =>
  ({
    card: { ...cardSurface(theme), gap: spacing.sm },
    cardPressed: {
      opacity: 0.92
    },
    eyebrow: { ...eyebrowText(theme) },
    title: {
      fontSize: 20,
      lineHeight: 26,
      fontWeight: "700",
      color: theme.ink
    },
    subtitle: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.muted
    },
    ctaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: spacing.xs
    },
    ctaLabel: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.accent
    }
  }) as const;
