import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import type { PropsWithChildren, ReactNode } from "react";

import { useThemeColors, type ThemeColors } from "../lib/theme";
import { useThemedStyles } from "../lib/use-themed-styles";
import { spacing } from "@hege/tokens";

/**
 * Tab-Bar-Hoehe wie in `apps/mobile/app/(tabs)/_layout.tsx` konfiguriert.
 * `height: 72` plus `paddingBottom: 12` plus `paddingTop: spacing.sm` = 92.
 * Wir lassen 16 px Atemraum oben drauf, damit Tiles nicht direkt am
 * Bar-Rand kleben. Den `safe-area`-Bottom-Inset zaehlen wir noch dazu.
 */
const TAB_BAR_VISUAL_HEIGHT = 92 + 16;

interface ScreenShellProps extends PropsWithChildren {
  eyebrow: string;
  title: string;
  subtitle: string;
  aside?: ReactNode;
  compactHero?: boolean;
  topSafeArea?: boolean;
  testID?: string;
  /**
   * Pull-to-Refresh aktivieren. Wenn gesetzt, rendert ScreenShell automatisch
   * einen nativen RefreshControl mit Brand-Farbe.
   */
  refresh?: {
    refreshing: boolean;
    onRefresh: () => void;
  };
}

export function ScreenShell({
  eyebrow,
  title,
  subtitle,
  aside,
  children,
  refresh,
  compactHero = false,
  topSafeArea = true,
  testID
}: ScreenShellProps) {
  const insets = useSafeAreaInsets();
  const bottomPadding = TAB_BAR_VISUAL_HEIGHT + insets.bottom;
  const styles = useThemedStyles(createStyles);
  const theme = useThemeColors();
  const safeAreaEdges = topSafeArea ? (["top", "left", "right"] as const) : (["left", "right"] as const);

  return (
    <SafeAreaView edges={safeAreaEdges} style={styles.safeArea} testID={testID}>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          refresh ? (
            <RefreshControl
              refreshing={refresh.refreshing}
              onRefresh={refresh.onRefresh}
              tintColor={theme.accent}
              colors={[theme.accent]}
            />
          ) : undefined
        }
      >
        <LinearGradient colors={theme.backdropGradient} style={[styles.hero, compactHero ? styles.heroCompact : null]}>
          <View style={styles.heroHeaderRow}>
            <Text style={styles.eyebrow} numberOfLines={1}>
              {eyebrow}
            </Text>
            {aside ? <View style={styles.asideSlot}>{aside}</View> : null}
          </View>
          <Text numberOfLines={3} style={[styles.title, compactHero ? styles.titleCompact : null]}>
            {title}
          </Text>
          <Text numberOfLines={compactHero ? 2 : undefined} style={[styles.subtitle, compactHero ? styles.subtitleCompact : null]}>
            {subtitle}
          </Text>
        </LinearGradient>
        <View style={styles.children}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: ThemeColors) =>
  ({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background
    },
    scrollContent: {
      padding: spacing.md,
      gap: spacing.md
    },
    hero: {
      borderRadius: 24,
      padding: 18,
      gap: 6
    },
    heroCompact: {
      borderRadius: 18,
      padding: 14,
      gap: spacing.xs
    },
    heroHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12
    },
    eyebrow: {
      flex: 1,
      fontSize: 12,
      letterSpacing: 1.5,
      textTransform: "uppercase",
      color: theme.muted
    },
    asideSlot: {
      flexShrink: 0,
      maxWidth: 140
    },
    title: {
      fontSize: 26,
      lineHeight: 30,
      color: theme.ink,
      fontWeight: "700",
      marginTop: spacing.xs
    },
    titleCompact: {
      fontSize: 20,
      lineHeight: 24,
      marginTop: 2
    },
    subtitle: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.muted
    },
    subtitleCompact: {
      fontSize: 13,
      lineHeight: 18
    },
    children: {
      gap: spacing.md
    }
  }) as const;
