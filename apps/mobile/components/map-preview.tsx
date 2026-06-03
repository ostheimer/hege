import type { AnsitzSession } from "@hege/domain";
import { Platform, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

import type { ThemeColors } from "../lib/theme";
import { useThemedStyles } from "../lib/use-themed-styles";
import {
  AUSTRIA_DEFAULT_CENTER,
  buildInitialRegion,
  type RevierCenter
} from "./map-preview.helpers";
import { spacing, radius } from "@hege/tokens";

interface MapPreviewProps {
  revierName: string;
  ansitze: AnsitzSession[];
  revierCenter?: RevierCenter;
}

/**
 * Auf Android braucht `react-native-maps` mit Provider Google einen API-Key
 * im Manifest (siehe `apps/mobile/app.json` -> `android.config.googleMaps.apiKey`).
 * Wenn keiner gesetzt ist, faellt die Karte still aus. In diesem Fall
 * rendern wir den frueheren Fake-Look mit einem Hinweistext, damit Android
 * nicht broken wirkt.
 *
 * Auf iOS nutzen wir den Apple-Maps-Fallback (Provider undefined), weil das
 * out-of-the-box ohne Key funktioniert.
 */
const ANDROID_GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY;
const ANDROID_HAS_GOOGLE_KEY = Platform.OS === "android" && !!ANDROID_GOOGLE_KEY;

const MAP_PROVIDER =
  Platform.OS === "android"
    ? ANDROID_HAS_GOOGLE_KEY
      ? PROVIDER_GOOGLE
      : undefined
    : undefined;

const SHOULD_RENDER_NATIVE_MAP =
  Platform.OS === "ios" || ANDROID_HAS_GOOGLE_KEY;

export function MapPreview({ revierName, ansitze, revierCenter }: MapPreviewProps) {
  const center: RevierCenter = revierCenter ?? AUSTRIA_DEFAULT_CENTER;
  const initialRegion = buildInitialRegion(center, ansitze);
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.heading}>Revierkarte</Text>
        <Text style={styles.caption}>{revierName}</Text>
      </View>
      <View style={styles.mapSurface}>
        {SHOULD_RENDER_NATIVE_MAP ? (
          <MapView
            provider={MAP_PROVIDER}
            style={StyleSheet.absoluteFillObject}
            initialRegion={initialRegion}
            pointerEvents="auto"
            showsCompass={false}
            showsScale={false}
            toolbarEnabled={false}
          >
            {ansitze.map((entry) => (
              <Marker
                key={entry.id}
                coordinate={{
                  latitude: entry.location.lat,
                  longitude: entry.location.lng
                }}
                title={entry.standortName}
                description={entry.location.label ?? "Aktiver Ansitz"}
              />
            ))}
          </MapView>
        ) : (
          <View style={styles.androidFallback}>
            <Text style={styles.fallbackTitle}>Karte nicht aktiv</Text>
            <Text style={styles.fallbackCopy}>
              Karte wird mit Google-Key aktiviert.
            </Text>
            {ansitze.length > 0 ? (
              <Text style={styles.fallbackHint}>
                {`${ansitze.length} aktive Ansitze warten auf Anzeige.`}
              </Text>
            ) : null}
          </View>
        )}
        {ansitze.length === 0 ? (
          <View pointerEvents="none" style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Keine aktiven Ansitze</Text>
            <Text style={styles.emptyCopy}>
              Die Karte wird aktualisiert, sobald jemand im Revier ansitzt.
            </Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.footer}>
        {ansitze.length > 0
          ? `${ansitze.length} aktive Ansitze auf der Karte`
          : "Aktuell keine Ansitze im Revier"}
      </Text>
    </View>
  );
}

const createStyles = (theme: ThemeColors) =>
  ({
    card: {
      padding: 18,
      borderRadius: 24,
      backgroundColor: theme.card,
      gap: 12
    },
    header: {
      gap: spacing.xs
    },
    heading: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.ink
    },
    caption: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.muted
    },
    mapSurface: {
      position: "relative",
      height: 250,
      borderRadius: radius.lg,
      overflow: "hidden",
      backgroundColor: theme.accent
    },
    androidFallback: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      padding: 22,
      gap: 6
    },
    // Text direkt auf Accent-Flaechen nutzt onAccent: Light bleibt creme,
    // Dark kippt auf dunkle Tinte fuer ausreichenden Kontrast.
    fallbackTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: theme.onAccent,
      textAlign: "center"
    },
    fallbackCopy: {
      fontSize: 13,
      lineHeight: 18,
      color: theme.onAccent,
      textAlign: "center"
    },
    fallbackHint: {
      fontSize: 12,
      lineHeight: 16,
      color: theme.onAccent,
      textAlign: "center"
    },
    emptyState: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: "center",
      justifyContent: "center",
      padding: 22,
      gap: spacing.xs,
      backgroundColor: "rgba(41, 80, 63, 0.55)"
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: "#fff9ef",
      textAlign: "center"
    },
    emptyCopy: {
      fontSize: 13,
      lineHeight: 18,
      color: "#f7f2e5",
      textAlign: "center"
    },
    footer: {
      fontSize: 13,
      lineHeight: 18,
      color: theme.muted
    }
  }) as const;
