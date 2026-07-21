import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { stopImpersonation } from "../lib/api";
import { formatRoleLabel } from "../lib/format";
import { useSessionSnapshot } from "../lib/session";
import { type ThemeColors } from "../lib/theme";
import { useThemedStyles } from "../lib/use-themed-styles";
import { spacing } from "@hege/tokens";

export function ImpersonationBanner() {
  const router = useRouter();
  const session = useSessionSnapshot().session;
  const styles = useThemedStyles(createStyles);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!session?.impersonation) return null;

  async function handleStop() {
    if (stopping) return;
    setStopping(true);
    setError(null);
    try {
      await stopImpersonation();
      router.replace("/(tabs)/mehr");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impersonation konnte nicht beendet werden.");
      setStopping(false);
    }
  }

  return (
    <View accessibilityLiveRegion="polite" style={styles.banner} testID="impersonation-banner">
      <View style={styles.icon}><Ionicons color="#59421f" name="eye-outline" size={20} /></View>
      <View style={styles.copy}>
        <Text style={styles.title}>Du arbeitest als {session.user.name}</Text>
        <Text style={styles.meta}>{formatRoleLabel(session.membership.role)} · Admin: {session.impersonation.actor.name}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Zurück zu ${session.impersonation.actor.name}`}
        disabled={stopping}
        onPress={() => void handleStop()}
        style={({ pressed }) => [styles.stop, pressed ? styles.pressed : null]}
      >
        {stopping ? <ActivityIndicator color="#fffaf0" size="small" /> : <Ionicons color="#fffaf0" name="return-up-back" size={20} />}
      </Pressable>
    </View>
  );
}

const createStyles = (theme: ThemeColors) => ({
  banner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: 12,
    borderRadius: 14,
    backgroundColor: theme.warningSurface,
    borderWidth: 1,
    borderColor: theme.warning
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "rgba(255,255,255,0.45)"
  },
  copy: { flex: 1, gap: 2 },
  title: { color: theme.ink, fontSize: 14, fontWeight: "700" as const },
  meta: { color: theme.muted, fontSize: 12, lineHeight: 16 },
  error: { color: theme.danger, fontSize: 12, lineHeight: 16 },
  stop: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "#59421f"
  },
  pressed: { opacity: 0.72 }
});
