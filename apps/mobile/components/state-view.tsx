import Ionicons from "@expo/vector-icons/Ionicons";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import type { ReactNode } from "react";

import { useThemeColors, type ThemeColors } from "../lib/theme";
import { useThemedStyles } from "../lib/use-themed-styles";
import { spacing, radius } from "@hege/tokens";

export type StateViewMode = "loading" | "empty" | "error";

interface StateViewActionProp {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

interface StateViewProps {
  mode: StateViewMode;
  /**
   * Headline like "Noch keine aktiven Ansitze". Pflicht.
   */
  title: string;
  /**
   * Beschreibung in 1-2 Saetzen, was als Naechstes passiert.
   */
  description?: string;
  /**
   * Custom Ionicon-Name ueberschreibt das Default-Icon je Mode.
   */
  icon?: keyof typeof Ionicons.glyphMap;
  /**
   * Optionaler CTA als Pressable-Button.
   */
  action?: StateViewActionProp;
  /**
   * Falls die Komponente in einer Card haengt, kann das eigene Card-
   * Wrapping abgeschaltet werden.
   */
  bare?: boolean;
  /**
   * Zusaetzlicher Inhalt unter dem Standard-Body, z. B. Diagnostik-Details.
   */
  footer?: ReactNode;
}

/**
 * Vereinheitlichte Empty/Loading/Error-Anzeige fuer die Mobile-Tabs.
 *
 * Voice-Regeln (siehe docs/design-system-v1.md):
 * - Title beschreibt den Zustand, nicht den Tool-Vorgang.
 * - Description sagt, was als Naechstes passiert oder was der Nutzer tun kann.
 * - Action ist verb-getrieben.
 */
export function StateView({ mode, title, description, icon, action, bare, footer }: StateViewProps) {
  const styles = useThemedStyles(createStyles);
  const theme = useThemeColors();
  const containerStyle = [styles.card, bare ? styles.cardBare : null];

  return (
    <View accessibilityLiveRegion={mode === "error" ? "assertive" : "polite"} style={containerStyle}>
      <View style={[styles.iconWrap, iconWrapStyle(mode, theme)]}>
        {mode === "loading" ? (
          <ActivityIndicator color={theme.accent} />
        ) : (
          <Ionicons color={iconColor(mode, theme)} name={icon ?? defaultIconName(mode)} size={24} />
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {action ? (
        <Pressable
          accessibilityLabel={action.label}
          accessibilityRole="button"
          disabled={action.disabled}
          onPress={action.onPress}
          style={({ pressed }) => [styles.action, pressed ? styles.actionPressed : null]}
        >
          <Text style={styles.actionText}>{action.label}</Text>
        </Pressable>
      ) : null}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

function defaultIconName(mode: StateViewMode): keyof typeof Ionicons.glyphMap {
  switch (mode) {
    case "error":
      return "alert-circle-outline";
    case "empty":
    default:
      return "information-circle-outline";
  }
}

function iconColor(mode: StateViewMode, theme: ThemeColors): string {
  if (mode === "error") {
    return theme.danger;
  }
  return theme.accent;
}

function iconWrapStyle(mode: StateViewMode, theme: ThemeColors) {
  if (mode === "error") {
    return { backgroundColor: theme.dangerSurface };
  }
  if (mode === "loading") {
    return { backgroundColor: theme.successSurface };
  }
  return { backgroundColor: theme.infoSurface };
}

const createStyles = (theme: ThemeColors) =>
  ({
    card: {
      gap: 12,
      padding: 22,
      borderRadius: 22,
      backgroundColor: theme.card
    },
    cardBare: {
      backgroundColor: "transparent",
      padding: 0
    },
    iconWrap: {
      width: 48,
      height: 48,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center"
    },
    body: {
      gap: spacing.xs
    },
    title: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.ink
    },
    description: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.muted
    },
    action: {
      alignSelf: "flex-start",
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: radius.full,
      backgroundColor: theme.surfaceMuted
    },
    actionPressed: {
      opacity: 0.8
    },
    actionText: {
      color: theme.ink,
      fontWeight: "700",
      fontSize: 14
    },
    footer: {
      paddingTop: spacing.xs
    }
  }) as const;
