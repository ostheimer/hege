import { Text, View } from "react-native";
import type { ReactNode } from "react";

import { useThemeColors, type ThemeColors } from "../lib/theme";
import { useThemedStyles } from "../lib/use-themed-styles";
import { spacing, radius } from "@hege/tokens";

export type BadgeTone = "success" | "info" | "warning" | "danger" | "neutral";

interface BadgeProps {
  /** Semantischer Ton. Default `neutral`. */
  tone?: BadgeTone;
  children: ReactNode;
}

/**
 * `<Badge tone>` — einheitliche Status-Pille (UI-Audit §10.8).
 *
 * Ersetzt die zuvor pro Screen duplizierten `okBadge`/`infoBadge`/
 * `warningBadge`/`errorBadge`-Styles mit jeweils leicht abweichendem
 * Padding-Set ("5 Padding-Sets"). Die Flaechenfarben sind aus dem
 * bestehenden, ueber alle Screens konsistenten Badge-Pastell uebernommen
 * (werterhaltend); die Textfarben kommen aus den Theme-Tokens. `neutral`
 * nutzt das `surfaceMuted`-Token.
 */
export function Badge({ tone = "neutral", children }: BadgeProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.badge, containerTone(styles, tone)]}>
      <Text style={[styles.text, textTone(styles, tone)]}>{children}</Text>
    </View>
  );
}

function containerTone(styles: ReturnType<typeof createStyles>, tone: BadgeTone) {
  switch (tone) {
    case "success":
      return styles.containerSuccess;
    case "info":
      return styles.containerInfo;
    case "warning":
      return styles.containerWarning;
    case "danger":
      return styles.containerDanger;
    default:
      return styles.containerNeutral;
  }
}

function textTone(styles: ReturnType<typeof createStyles>, tone: BadgeTone) {
  switch (tone) {
    case "success":
      return styles.textSuccess;
    case "warning":
      return styles.textWarning;
    case "danger":
      return styles.textDanger;
    default:
      // info + neutral teilen sich die Tinten-Farbe.
      return styles.textInfo;
  }
}

const createStyles = (theme: ThemeColors) =>
  ({
    badge: {
      alignSelf: "flex-start",
      paddingHorizontal: 12,
      paddingVertical: spacing.sm,
      borderRadius: radius.full
    },
    containerSuccess: {
      backgroundColor: "#dde7cf"
    },
    containerInfo: {
      backgroundColor: "#dce6df"
    },
    containerWarning: {
      backgroundColor: "#efe3d1"
    },
    containerDanger: {
      backgroundColor: "#f0d9d4"
    },
    containerNeutral: {
      backgroundColor: theme.surfaceMuted
    },
    text: {
      fontSize: 14,
      fontWeight: "700"
    },
    textSuccess: {
      color: theme.accent
    },
    textInfo: {
      color: theme.ink
    },
    textWarning: {
      color: theme.warning
    },
    textDanger: {
      color: theme.danger
    }
  }) as const;
