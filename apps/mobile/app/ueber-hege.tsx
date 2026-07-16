import { Linking, Platform, Pressable, Text, View } from "react-native";

import { ScreenShell } from "../components/screen-shell";
import { BUILD_TAG } from "../lib/build-tag";
import type { ThemeColors } from "../lib/theme";
import { eyebrowText } from "../lib/typography";
import { useThemedStyles } from "../lib/use-themed-styles";
import { spacing } from "@hege/tokens";

/**
 * Build-Konstanten — werden bewusst hier hartcodiert statt aus
 * `expo-constants` zu lesen. Grund: das Package ist aktuell nicht
 * installiert, und fuer die User-sichtbaren Info-Werte reicht ein
 * statisches Set. Beim Version-Bump in `app.json` bitte hier
 * mitziehen.
 */
const APP_VERSION = "0.1.0";
const EXPO_SDK = "53.0.0";
const RELEASE_CHANNEL = "preview";

interface LicenseEntry {
  name: string;
  version?: string;
  license: string;
  url: string;
}

const LICENSES: ReadonlyArray<LicenseEntry> = [
  { name: "react", license: "MIT", url: "https://github.com/facebook/react" },
  { name: "react-native", license: "MIT", url: "https://github.com/facebook/react-native" },
  { name: "expo", license: "MIT", url: "https://github.com/expo/expo" },
  { name: "expo-router", license: "MIT", url: "https://docs.expo.dev/router/introduction/" },
  { name: "expo-haptics", license: "MIT", url: "https://docs.expo.dev/versions/latest/sdk/haptics/" },
  { name: "expo-location", license: "MIT", url: "https://docs.expo.dev/versions/latest/sdk/location/" },
  { name: "expo-image-picker", license: "MIT", url: "https://docs.expo.dev/versions/latest/sdk/imagepicker/" },
  { name: "expo-local-authentication", license: "MIT", url: "https://docs.expo.dev/versions/latest/sdk/local-authentication/" },
  { name: "react-native-maps", license: "MIT", url: "https://github.com/react-native-maps/react-native-maps" },
  { name: "react-native-safe-area-context", license: "MIT", url: "https://github.com/AppAndFlow/react-native-safe-area-context" },
  { name: "@expo/vector-icons", license: "MIT", url: "https://docs.expo.dev/guides/icons/" },
  { name: "Ionicons", license: "MIT", url: "https://ionic.io/ionicons" }
];

/**
 * Ueber-hege-Seite (M5) — die letzte Liefereinheit aus dem Pfad-2-Plan.
 *
 * Zeigt Versions-/Build-Metadaten und eine Liste der Open-Source-
 * Lizenzen. Wird vom Mehr-Tab aus angesteuert. Pure-Render-Page,
 * keine Mutationen, kein API-Call.
 */
export default function UeberHegeScreen() {
  const styles = useThemedStyles(createStyles);
  const platform = `${Platform.OS} ${Platform.Version}`;

  function openUrl(url: string) {
    void Linking.openURL(url);
  }

  return (
    <ScreenShell
      testID="about-screen"
      eyebrow="Über"
      title="hege"
      subtitle="Reviermanagement für Jagdgesellschaften in Österreich — Backoffice im Web, Erfassung in der App."
      topSafeArea={false}
    >
        <View style={styles.card}>
          <Text style={styles.sectionEyebrow}>Build-Information</Text>
          <DetailRow label="App-Version" value={APP_VERSION} styles={styles} />
          <DetailRow label="App-Stand" value={BUILD_TAG} styles={styles} testID="about-build-tag" />
          <DetailRow label="Expo-SDK" value={EXPO_SDK} styles={styles} />
          <DetailRow label="Channel" value={RELEASE_CHANNEL} styles={styles} />
          <DetailRow label="Plattform" value={platform} styles={styles} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionEyebrow}>Kontakt</Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="E-Mail an Support"
            onPress={() => openUrl("mailto:info@hege.app")}
            style={({ pressed }) => [styles.linkRow, pressed ? styles.linkRowPressed : null]}
          >
            <Text style={styles.linkLabel}>info@hege.app</Text>
            <Text style={styles.linkHint}>E-Mail-Programm öffnen</Text>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Web-Backoffice öffnen"
            onPress={() => openUrl("https://hege.app")}
            style={({ pressed }) => [styles.linkRow, pressed ? styles.linkRowPressed : null]}
          >
            <Text style={styles.linkLabel}>hege.app</Text>
            <Text style={styles.linkHint}>Web-Backoffice öffnen</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionEyebrow}>Open-Source-Lizenzen</Text>
          <Text style={styles.licenseIntro}>
            hege baut auf freier Software. Eine Auswahl der wichtigsten Abhängigkeiten:
          </Text>
          {LICENSES.map((license) => (
            <Pressable
              key={license.name}
              accessibilityRole="link"
              accessibilityLabel={`${license.name} — ${license.license}`}
              onPress={() => openUrl(license.url)}
              style={({ pressed }) => [styles.licenseRow, pressed ? styles.linkRowPressed : null]}
            >
              <View style={styles.licenseBody}>
                <Text style={styles.licenseName}>{license.name}</Text>
                <Text style={styles.licenseLicense}>{license.license}</Text>
              </View>
              <Text style={styles.licenseLink}>›</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.footer}>
          © {new Date().getFullYear()} hege · Aufgebaut mit React Native, Expo und nachhaltiger
          Liebe zum Revier.
        </Text>
    </ScreenShell>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
  testID?: string;
}

function DetailRow({ label, value, styles, testID }: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text
        accessibilityLabel={testID ? `${label} ${value}` : undefined}
        style={styles.detailValue}
        testID={testID}
      >
        {value}
      </Text>
    </View>
  );
}

const createStyles = (theme: ThemeColors) =>
  ({
    card: {
      padding: spacing.md,
      borderRadius: 18,
      backgroundColor: theme.card,
      gap: 10
    },
    sectionEyebrow: { ...eyebrowText(theme), marginBottom: spacing.xs },
    detailRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: spacing.xs
    },
    detailLabel: {
      fontSize: 13,
      color: theme.muted
    },
    detailValue: {
      flexShrink: 1,
      fontSize: 13,
      color: theme.ink,
      fontWeight: "600",
      textAlign: "right"
    },
    linkRow: {
      paddingVertical: spacing.sm,
      gap: 2
    },
    linkRowPressed: {
      opacity: 0.6
    },
    linkLabel: {
      fontSize: 15,
      color: theme.accent,
      fontWeight: "600"
    },
    linkHint: {
      fontSize: 12,
      color: theme.muted
    },
    licenseIntro: {
      fontSize: 13,
      lineHeight: 18,
      color: theme.muted,
      marginBottom: spacing.xs
    },
    licenseRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: spacing.sm
    },
    licenseBody: {
      flex: 1
    },
    licenseName: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.ink
    },
    licenseLicense: {
      fontSize: 12,
      color: theme.muted
    },
    licenseLink: {
      fontSize: 18,
      color: theme.muted
    },
    footer: {
      fontSize: 11,
      color: theme.muted,
      textAlign: "center",
      marginTop: spacing.sm
    }
  }) as const;
