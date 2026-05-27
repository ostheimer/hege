import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, useRouter } from "expo-router";
import * as Updates from "expo-updates";

import { AppLoader } from "../components/app-loader";
import { loginWithCredentials, MobileApiError } from "../lib/api";
import {
  authenticateDeviceUnlock,
  enableDeviceUnlock,
  getDeviceUnlockState,
  type DeviceUnlockState
} from "../lib/device-unlock";
import { unlockStoredSession, useSessionSnapshot } from "../lib/session";
import { useThemeColors, type ThemeColors } from "../lib/theme";
import { useThemedStyles } from "../lib/use-themed-styles";

const logoMark = require("../assets/logo-mark.png");

export default function LoginScreen() {
  const router = useRouter();
  const session = useSessionSnapshot();
  const styles = useThemedStyles(createStyles);
  const theme = useThemeColors();
  const [identifier, setIdentifier] = useState("");
  const [pin, setPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deviceUnlock, setDeviceUnlock] = useState<DeviceUnlockState | null>(null);

  useEffect(() => {
    setError(null);
  }, [identifier, pin]);

  useEffect(() => {
    let isMounted = true;

    if (!session.hydrated || !session.session) {
      setDeviceUnlock(null);
      return () => {
        isMounted = false;
      };
    }

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
  }, [session.hydrated, session.session?.user.id]);

  if (session.status === "loading" || !session.hydrated) {
    return <AppLoader />;
  }

  if (session.status === "authenticated") {
    return <Redirect href="/" />;
  }

  async function handleLogin() {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await loginWithCredentials({ identifier, pin });
      await enableDeviceUnlock().catch(() => null);
      router.replace("/");
    } catch (loginError) {
      if (loginError instanceof MobileApiError) {
        setError(loginError.message);
      } else if (loginError instanceof Error) {
        setError(loginError.message);
      } else {
        setError("Login fehlgeschlagen.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeviceUnlock() {
    if (isUnlocking) {
      return;
    }

    setIsUnlocking(true);
    setError(null);

    try {
      const result = await authenticateDeviceUnlock();

      if (!result.success) {
        setError(result.reason ?? "Entsperren fehlgeschlagen.");
        return;
      }

      const unlockedSession = unlockStoredSession();

      if (!unlockedSession) {
        setError("Keine gespeicherte Sitzung gefunden. Bitte melde dich mit PIN an.");
        return;
      }

      router.replace("/");
    } catch (unlockError) {
      if (unlockError instanceof Error) {
        setError(unlockError.message);
      } else {
        setError("Entsperren fehlgeschlagen.");
      }
    } finally {
      setIsUnlocking(false);
    }
  }

  const unlockLabel = deviceUnlock?.label ?? "Face ID";
  const canUseDeviceUnlock = session.status === "locked" && deviceUnlock?.available && deviceUnlock.enabled;

  const versionLabel = useMemo(() => {
    const runtime = Updates.runtimeVersion ?? "dev";
    const channel = Updates.channel ?? "lokal";
    const updateId = Updates.updateId?.slice(0, 8) ?? "embedded";
    return `${runtime} · ${channel} · ${updateId}`;
  }, []);

  return (
    <LinearGradient colors={["#fff8ec", "#dde6c3"]} style={styles.root}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <View style={styles.card}>
          <View accessibilityLabel="hege" accessibilityRole="header" style={styles.brand}>
            <Image accessibilityIgnoresInvertColors source={logoMark} style={styles.logo} />
            <Text style={styles.brandText}>hege</Text>
          </View>
          <Text style={styles.title}>Anmelden und Revierkontext laden</Text>
          <Text style={styles.copy}>
            {session.status === "locked"
              ? `Deine Sitzung ist gespeichert. Entsperre hege mit ${unlockLabel} oder melde dich erneut mit PIN an.`
              : "Der Zugriff läuft jetzt über E-Mail oder Benutzername und eine vierstellige PIN."}
          </Text>

          {session.status === "locked" ? (
            <View style={styles.unlockPanel}>
              <Text style={styles.unlockTitle}>Sitzung gesperrt</Text>
              {canUseDeviceUnlock ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Mit ${unlockLabel} entsperren`}
                  style={[styles.secondaryButton, isUnlocking ? styles.primaryButtonDisabled : null]}
                  onPress={() => void handleDeviceUnlock()}
                  disabled={isUnlocking}
                >
                  {isUnlocking ? (
                    <ActivityIndicator color={theme.accent} />
                  ) : (
                    <Text style={styles.secondaryButtonText}>Mit {unlockLabel} entsperren</Text>
                  )}
                </Pressable>
              ) : (
                <Text style={styles.unlockHint}>
                  {deviceUnlock?.reason ?? "Face ID wird geprüft. Du kannst dich jederzeit mit PIN anmelden."}
                </Text>
              )}
            </View>
          ) : null}

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>E-Mail oder Benutzername</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="E-Mail oder Benutzername eingeben"
                placeholderTextColor={theme.muted}
                style={styles.input}
                value={identifier}
                onChangeText={setIdentifier}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>PIN</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
                maxLength={4}
                placeholder="4-stellige PIN"
                placeholderTextColor={theme.muted}
                secureTextEntry
                style={styles.input}
                value={pin}
                onChangeText={setPin}
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Anmelden"
              style={[styles.primaryButton, isSubmitting ? styles.primaryButtonDisabled : null]}
              onPress={() => void handleLogin()}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={theme.surface} />
              ) : (
                <Text style={styles.primaryButtonText}>Anmelden</Text>
              )}
            </Pressable>
          </View>

          <Text style={styles.footer}>Nach erfolgreichem Login werden Dashboard und Tabs automatisch freigeschaltet.</Text>
          <Text accessibilityLabel={`App-Version ${versionLabel}`} style={styles.versionLabel}>
            {versionLabel}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const createStyles = (theme: ThemeColors) =>
  ({
  root: {
    flex: 1,
    padding: 20
  },
  flex: {
    flex: 1,
    justifyContent: "center"
  },
  card: {
    gap: 18,
    padding: 24,
    borderRadius: 28,
    backgroundColor: theme.card,
    shadowColor: "#10231d",
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 18 },
    elevation: 4
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 4
  },
  logo: {
    width: 56,
    height: 56,
    resizeMode: "contain"
  },
  brandText: {
    color: theme.accent,
    fontFamily: Platform.select({ ios: "Georgia", default: "serif" }),
    fontSize: 48,
    lineHeight: 54,
    fontWeight: "700",
    letterSpacing: -1.5
  },
  title: {
    fontSize: 30,
    lineHeight: 34,
    color: theme.ink,
    fontWeight: "700"
  },
  copy: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.muted
  },
  unlockPanel: {
    gap: 10,
    padding: 14,
    borderRadius: 20,
    backgroundColor: "#f0eadc"
  },
  unlockTitle: {
    color: theme.ink,
    fontSize: 14,
    fontWeight: "700"
  },
  unlockHint: {
    color: theme.muted,
    fontSize: 13,
    lineHeight: 19
  },
  form: {
    gap: 14
  },
  field: {
    gap: 6
  },
  label: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    color: theme.muted
  },
  input: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d9d2c4",
    paddingHorizontal: 14,
    color: theme.ink,
    backgroundColor: theme.surface
  },
  error: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.danger
  },
  primaryButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: theme.accent
  },
  primaryButtonDisabled: {
    opacity: 0.7
  },
  primaryButtonText: {
    color: theme.surface,
    fontSize: 16,
    fontWeight: "700"
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#cfc7b7",
    backgroundColor: theme.surface
  },
  secondaryButtonText: {
    color: theme.accent,
    fontSize: 15,
    fontWeight: "700"
  },
  footer: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.muted
  },
  versionLabel: {
    fontSize: 10,
    lineHeight: 14,
    color: theme.muted,
    textAlign: "center",
    opacity: 0.6,
    marginTop: 2,
    fontVariant: ["tabular-nums"]
  }
}) as const;
