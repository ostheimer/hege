import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, Switch, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import type { DashboardResponse } from "@hege/domain";

import { FilterChipRow } from "../../components/filter-chip-row";
import { InitialsAvatar } from "../../components/initials-avatar";
import { ScreenShell } from "../../components/screen-shell";
import { changePin, fetchDashboardSnapshot, logout, switchMembership } from "../../lib/api";
import { FeedbackBanner } from "../../components/feedback-banner";
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
  const [loadedSnapshot, setSnapshot] = useState<DashboardResponse | null>(null);
  const snapshot = loadedSnapshot?.membership.id === session.session?.membership.id ? loadedSnapshot : null;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [deviceUnlock, setDeviceUnlock] = useState<DeviceUnlockState | null>(null);
  const [isTogglingUnlock, setIsTogglingUnlock] = useState(false);
  const [isPinFormOpen, setIsPinFormOpen] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isSavingPin, setIsSavingPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState<string | null>(null);

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
  }, [session.status, session.session?.user.id, session.session?.membership.id]);

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

  async function handleChangePin() {
    if (isSavingPin) {
      return;
    }
    setPinError(null);
    setPinSuccess(null);

    if (!/^\d{4}$/.test(currentPin) || !/^\d{4}$/.test(newPin)) {
      setPinError("Die PIN muss vierstellig sein.");
      return;
    }
    if (newPin !== confirmPin) {
      setPinError("Die Bestätigung stimmt nicht mit der neuen PIN überein.");
      return;
    }
    if (newPin === currentPin) {
      setPinError("Die neue PIN muss sich von der aktuellen unterscheiden.");
      return;
    }

    setIsSavingPin(true);
    try {
      await changePin({ currentPin, newPin });
      setPinSuccess("PIN geändert. Ab jetzt mit der neuen PIN anmelden.");
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      setPinError(error instanceof Error ? error.message : "PIN-Änderung fehlgeschlagen.");
    } finally {
      setIsSavingPin(false);
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
          {snapshot?.membership.functionLabel ? <Text style={styles.identityMeta}>Funktion: {snapshot.membership.functionLabel}</Text> : null}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionLabel}>Konto</Text>
        <Text style={styles.accountValue}>{user?.username ?? "—"}</Text>
        <Text style={styles.accountValue}>{user?.email ?? "—"}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Abmelden" onPress={() => void handleLogout()}
          disabled={isLoggingOut} style={styles.logoutButton}>
          <Text style={styles.logoutText}>{isLoggingOut ? "Wird abgemeldet …" : "Abmelden"}</Text>
        </Pressable>
      </View>

      {switchError ? <FeedbackBanner tone="danger" title="Revierwechsel nicht möglich" description={switchError} /> : null}
      {!session.session?.impersonation && (session.session?.availableMemberships.length ?? 0) > 1 ? <View style={styles.sectionCard}>
        <Text style={styles.sectionLabel}>Meine Reviere</Text>
        {session.session?.availableMemberships.map(membership => <Pressable key={membership.id}
          accessibilityRole="button" accessibilityLabel={`Revier wählen: ${membership.revierName}`}
          disabled={isSwitching || membership.id === session.session?.membership.id}
          onPress={() => {
            setIsSwitching(true); setSwitchError(null);
            void switchMembership(membership.id).then(() => router.replace("/(tabs)"))
              .catch(reason => setSwitchError(reason instanceof Error ? reason.message : "Revierwechsel fehlgeschlagen."))
              .finally(() => setIsSwitching(false));
          }} style={{ paddingVertical: 12 }}>
          <Text style={styles.identityName}>{membership.revierName}</Text>
          <Text style={styles.identityMeta}>{formatRoleLabel(membership.role)}{membership.id === session.session?.membership.id ? " · Aktiv" : " · Wechseln"}</Text>
        </Pressable>)}
      </View> : null}

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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="PIN ändern"
          accessibilityState={{ expanded: isPinFormOpen }}
          onPress={() => {
            setIsPinFormOpen((open) => !open);
            setPinError(null);
            setPinSuccess(null);
          }}
          style={({ pressed }) => [styles.settingRow, pressed ? styles.settingRowPressed : null]}
        >
          <View style={styles.settingCopy}>
            <Text style={styles.settingTitle}>PIN ändern</Text>
            <Text style={styles.settingDescription}>Vierstellige Login-PIN neu setzen.</Text>
          </View>
          <Ionicons color={theme.muted} name={isPinFormOpen ? "chevron-up" : "chevron-down"} size={18} />
        </Pressable>
        {isPinFormOpen ? (
          <View style={styles.pinForm}>
            <View style={styles.pinField}>
              <Text style={styles.pinLabel}>Aktuelle PIN</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
                maxLength={4}
                placeholder="4-stellige PIN"
                placeholderTextColor={theme.muted}
                secureTextEntry
                style={styles.pinInput}
                value={currentPin}
                onChangeText={setCurrentPin}
              />
            </View>
            <View style={styles.pinField}>
              <Text style={styles.pinLabel}>Neue PIN</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
                maxLength={4}
                placeholder="4-stellige PIN"
                placeholderTextColor={theme.muted}
                secureTextEntry
                style={styles.pinInput}
                value={newPin}
                onChangeText={setNewPin}
              />
            </View>
            <View style={styles.pinField}>
              <Text style={styles.pinLabel}>Neue PIN bestätigen</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
                maxLength={4}
                placeholder="4-stellige PIN"
                placeholderTextColor={theme.muted}
                secureTextEntry
                style={styles.pinInput}
                value={confirmPin}
                onChangeText={setConfirmPin}
              />
            </View>
            {pinError ? <Text style={styles.pinError}>{pinError}</Text> : null}
            {pinSuccess ? <Text style={styles.pinSuccess}>{pinSuccess}</Text> : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Neue PIN speichern"
              onPress={() => void handleChangePin()}
              disabled={isSavingPin}
              style={({ pressed }) => [
                styles.pinSubmit,
                pressed ? styles.settingRowPressed : null,
                isSavingPin ? styles.pinSubmitDisabled : null
              ]}
            >
              {isSavingPin ? (
                <ActivityIndicator color={theme.onAccent} />
              ) : (
                <Text style={styles.pinSubmitText}>Neue PIN speichern</Text>
              )}
            </Pressable>
          </View>
        ) : null}
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
    settingRowPressed: {
      opacity: 0.85
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
    settingDescription: {
      fontSize: 13,
      lineHeight: 18,
      color: theme.muted
    },
    pinForm: {
      gap: 10,
      paddingTop: spacing.xs
    },
    pinField: {
      gap: spacing.xs
    },
    pinLabel: {
      fontSize: 12,
      textTransform: "uppercase",
      letterSpacing: 1.1,
      color: theme.muted
    },
    pinInput: {
      minHeight: 48,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: theme.inputBorder,
      paddingHorizontal: 14,
      color: theme.ink,
      backgroundColor: theme.surface
    },
    pinError: {
      fontSize: 13,
      lineHeight: 18,
      color: theme.danger
    },
    pinSuccess: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "600",
      color: theme.accent
    },
    pinSubmit: {
      minHeight: 48,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.md,
      backgroundColor: theme.accent
    },
    pinSubmitDisabled: {
      opacity: 0.7
    },
    pinSubmitText: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.onAccent
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
