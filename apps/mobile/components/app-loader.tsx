import { LinearGradient } from "expo-linear-gradient";
import { Image, Platform, Text, View } from "react-native";

import { useThemeColors, type ThemeColors } from "../lib/theme";
import { useThemedStyles } from "../lib/use-themed-styles";
import { spacing, radius, rnShadow } from "@hege/tokens";

const logoMark = require("../assets/logo-mark.png");

export function AppLoader() {
  const styles = useThemedStyles(createStyles);
  const theme = useThemeColors();

  return (
    <LinearGradient colors={theme.backdropGradient} style={styles.root}>
      <View style={styles.card}>
        <View accessibilityLabel="hege" accessibilityRole="image" style={styles.brand}>
          <Image accessibilityIgnoresInvertColors source={logoMark} style={styles.logo} />
          <Text style={styles.brandText}>ege</Text>
        </View>
        <Text style={styles.title}>Session wird geladen</Text>
        <Text style={styles.copy}>Wir stellen den gesicherten Revier-Kontext wieder her.</Text>
      </View>
    </LinearGradient>
  );
}

const createStyles = (theme: ThemeColors) =>
  ({
    root: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 20
    },
    card: {
      width: "100%",
      maxWidth: 420,
      gap: 10,
      padding: spacing.lg,
      borderRadius: radius.xl,
      backgroundColor: theme.card,
      ...rnShadow.card,
      elevation: 4
    },
    brand: {
      flexDirection: "row",
      alignItems: "flex-end",
      alignSelf: "center",
      justifyContent: "center",
      marginBottom: spacing.xs
    },
    logo: {
      width: 64,
      height: 64,
      resizeMode: "contain"
    },
    brandText: {
      marginLeft: -19,
      marginBottom: -5,
      color: theme.accent,
      fontFamily: Platform.select({ ios: "Georgia", default: "serif" }),
      fontSize: 69,
      lineHeight: 71,
      fontWeight: "700",
      letterSpacing: -3.2
    },
    title: {
      fontSize: 28,
      lineHeight: 32,
      color: theme.ink,
      fontWeight: "700"
    },
    copy: {
      fontSize: 15,
      lineHeight: 22,
      color: theme.muted
    }
  }) as const;
