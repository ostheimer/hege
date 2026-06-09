import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Switch, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { DashboardResponse } from "@hege/domain";

import { FilterChipRow } from "../../components/filter-chip-row";
import { InitialsAvatar } from "../../components/initials-avatar";
import { ScreenShell } from "../../components/screen-shell";
import { fetchDashboardSnapshot, logout } from "../../lib/api";
import { BUILD_TAG } from "../../lib/build-tag";
import {
  disableDeviceUnlock,
  enableDeviceUnlock,
  getDeviceUnlockState,
  type DeviceUnlockState
} from "../../lib/device-unlock";
import { formatRoleLabel } from "../../lib/format";
import { useSessionSnapshot } from "../../lib/session";
import { setThemeMode, useThemeMode, type ThemeMode } from "../../lib/theme-mode";
import { useThemeColors, type ThemeColors } from "../../lib/theme";
import { cardSurface } from "../../lib/surfaces";
import { eyebrowText } from "../../lib/typography";
import { useThemedStyles } from "../../lib/use-themed-styles";
import { spacing, radius } from "@hege/tokens";

/**
 * Eigenstaendiger Profil-Screen (hidden Tab, erreichbar ueber die
 * Profil-Zeile im Mehr-Tab und den Avatar im Heute-Hero).
 *
 * Buendelt alles "Meins": Identitaet (Avatar/Name/Rolle/Revier),
 * Erscheinungsbild (Theme-Umschalter, umgezogen aus dem Mehr-Tab),
 * Sicherheit (Face-ID-Entsperren als Schalter; die Logik lebte schon
 * in lib/device-unlock, war aber nirgends bedienbar) und Konto
 * (Benutzername, E-Mail, Abmelden). Die Fusszeile zeigt den BUILD_TAG,
 * damit die laufende OTA-Version ohne Logout ablesbar ist.
 */
export default function ProfilScreen() {
  const router = useRouter();
  const session = useSessionSnapshot();
  const styles = useThemedStyles(createStyles);
  const theme = useThemeColors();
  const themeMode = useThemeMode();
  const [snapshot, setSnapshot] = useState<DashboardResponse | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [deviceUnlock, setDeviceUnlock] = useState<DeviceUnlockState | null>(null);
  const [isTogglingUnlock, setIsTogglingUnlock] = useState(false);

  const user = session.session?.user ?? null;

  useEffect(() => {
    if (session.status !== "authenticated") {
      return;
    }

    let isMounted = true;

    fetchDashboardSnapshot()
      .then((data) => {
        if (isMounted) {
          setSnapshot(data);
        }
      })
      .catch(() => {
        if (isMounted) {
          setSnapshot(null);
        }
      });
    getDeviceUnlockState()
      .then((state) => {
        if (isMounted) {
          setDeviceUnlock(state);
        }
      })
      .catch(() => {
        if (isMounted) {
          setDeviceUnlock(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [session.status, session.session?.user.id]);

  async function handleRefresh() {
    if (isRefreshing) {
      return;
    }
    setIsRefreshing(true);
    try {
      const [data, unlockState] = await Promise.all([fetchDashboardSnapshot(), getDeviceUnlockState()]);
      setSnapshot(data);
      setDeviceUnlock(unlockState);
    } catch {
      // Alte Werte weiterzeigen ist hier weniger irritierend als ein
      // Fehler-Banner auf einem reinen Einstellungs-Screen.
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleToggleUnlock(next: boolean) {
    if (isTogglingUnlock) {
      return;
    }
    setIsTogglingUnlock(true);
    try {
      const state = next ? await enableDeviceUnlock() : await disableDeviceUnlock();
      setDeviceUnlock(state);
      void Haptics.selectionAsync();
    } catch {
      // Zustand neu lesen, damit der Schalter nicht luegt.
      setDeviceUnlock(await getDeviceUnlockState().catch(() => null));
    } finally {
      setIsTogglingUnlock(false);
    }
  }

  async function handleLogout() {
    if (isLoggingOut) {
      return;
    }
    setIsLoggingOut(true);
    try {
      await logout();
      router.replace("/login");
    } finally {
      setIsLoggingOut(false);
    }
  }

  const unlockLabel = deviceUnlock?.label ?? "Face ID";

  return (
    <ScreenShell
      eyebrow="Profil"
      title={user?.name ?? "Profil"}
      subtitle="Konto, Erscheinungsbild und Sicherheit an einem Ort."
      refresh={{
        refreshing: isRefreshing,
        onRefresh: () => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          void handleRefresh();
        }
      }}
    >
      <View style={styles.identityCard}>
        <InitialsAvatar name={user?.name ?? ""} size={56} />
        <View style={styles.identityCopy}>
          <Text style={styles.identityName}>{user?.name ?? "Wird geladen..."}</Text>
          <Text style={styles.identityMeta}>
            {snapshot
              ? `${formatRoleLabel(snapshot.membership.role)} · ${snapshot.membership.jagdzeichen}`
              : "Rolle wird geladen..."}
          </Text>
          <Text style={styles.identityMeta}>{snapshot?.revier.name ?? "Revier wird geladen..."}</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionLabel}>Erscheinungsbild</Text>
        <FilterChipRow<ThemeMode>
          value={themeMode}
          onChange={(mode) => {
            void Haptics.selectionAsync();
            void setThemeMode(mode);
          }}
          accessibilityLabel="Erscheinungsbild wählen"
          options={[
            { key: "system", label: "System" },
            { key: "light", label: "Hell" },
            { key: "dark", label: "Dunkel" }
          ]}
        />
        <Text style={styles.sectionHint}>
          „System" folgt der iOS-Einstellung. „Hell"/„Dunkel" erzwingen das Erscheinungsbild in der App.
        </Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionLabel}>Sicherheit</Text>
        <View style={styles.settingRow}>
          <View style={styles.settingCopy}>
            <Text style={styles.settingTitle}>Mit {unlockLabel} entsperren</Text>
            <Text style={styles.settingDescription}>
              {deviceUnlock?.available
                ? "Gespeicherte Sitzung beim App-Start biometrisch entsperren."
                : (deviceUnlock?.reason ?? "Verfügbarkeit wird geprüft...")}
            </Text>
          </View>
          <Switch
            accessibilityLabel={`Mit ${unlockLabel} entsperren`}
            disabled={!deviceUnlock?.available || isTogglingUnlock}
            ios_backgroundColor={theme.surfaceMutedStrong}
            trackColor={{ false: theme.surfaceMutedStrong, true: theme.accent }}
            value={Boolean(deviceUnlock?.available && deviceUnlock.enabled)}
            onValueChange={(next) => void handleToggleUnlock(next)}
          />
        </View>
        <View style={[styles.settingRow, styles.settingRowDisabled]}>
          <View style={styles.settingCopy}>
            <Text style={styles.settingTitleMuted}>PIN ändern</Text>
            <Text style={styles.settingDescription}>Kommt mit der Kontoverwaltung.</Text>
          </View>
          <View style={styles.soonPill}>
            <Text style={styles.soonPillText}>bald</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionLabel}>Konto</Text>
        {user?.username ? (
          <View style={styles.settingRow}>
            <Text style={styles.accountKey}>Benutzername</Text>
            <Text style={styles.accountValue}>{user.username}</Text>
          </View>
        ) : null}
        <View style={styles.settingRow}>
          <Text style={styles.accountKey}>E-Mail</Text>
          <Text numberOfLines={1} style={styles.accountValue}>
            {user?.email ?? "—"}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abmelden"
          onPress={() => void handleLogout()}
          disabled={isLoggingOut}
          style={({ pressed }) => [
            styles.logoutButton,
            pressed ? styles.logoutPressed : null,
            isLoggingOut ? styles.logoutDisabled : null
          ]}
        >
          {isLoggingOut ? (
            <ActivityIndicator color={theme.danger} />
          ) : (
            <Text style={styles.logoutText}>Abmelden</Text>
          )}
        </Pressable>
      </View>

      <Text accessibilityLabel={`App-Version ${BUILD_TAG}`} style={styles.versionLabel}>
        {BUILD_TAG}
      </Text>
    </ScreenShell>
  );
}

const createStyles = (theme: ThemeColors) =>
  ({
    identityCard: {
      ...cardSurface(theme),
      flexDirection: "row",
      alignItems: "center",
      gap: 14
    },
    identityCopy: {
      flex: 1,
      gap: 2
    },
    identityName: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.ink
    },
    identityMeta: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.muted
    },
    sectionCard: { ...cardSurface(theme), gap: 12 },
    sectionLabel: { ...eyebrowText(theme) },
    sectionHint: {
      fontSize: 13,
      lineHeight: 18,
      color: theme.muted
    },
    settingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12
    },
    settingRowDisabled: {
      opacity: 0.75
    },
    settingCopy: {
      flex: 1,
      gap: 2
    },
    settingTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.ink
    },
    settingTitleMuted: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.muted
    },
    settingDescription: {
      fontSize: 13,
      lineHeight: 18,
      color: theme.muted
    },
    soonPill: {
      paddingHorizontal: 10,
      paddingVertical: spacing.xs,
      borderRadius: radius.full,
      backgroundColor: theme.surfaceMuted
    },
    soonPillText: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.muted
    },
    accountKey: {
      flex: 1,
      fontSize: 14,
      color: theme.muted
    },
    accountValue: {
      flexShrink: 1,
      fontSize: 14,
      fontWeight: "600",
      color: theme.ink
    },
    logoutButton: {
      minHeight: 48,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 16,
      backgroundColor: theme.dangerSurface,
      marginTop: spacing.xs
    },
    logoutPressed: {
      opacity: 0.85
    },
    logoutDisabled: {
      opacity: 0.7
    },
    logoutText: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.danger
    },
    versionLabel: {
      fontSize: 11,
      lineHeight: 14,
      color: theme.muted,
      textAlign: "center",
      opacity: 0.7,
      fontVariant: ["tabular-nums"] as ("tabular-nums")[]
    }
  }) as const;
