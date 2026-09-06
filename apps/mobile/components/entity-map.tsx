import * as Haptics from "expo-haptics";
import { useMemo, useRef, useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker, PROVIDER_GOOGLE, type MapPressEvent } from "react-native-maps";
import type { GeoPoint } from "@hege/domain";

import type { ThemeColors } from "../lib/theme";
import { useThemeColors } from "../lib/theme";
import { useThemedStyles } from "../lib/use-themed-styles";
import { buildEntityMapRegionKey } from "./entity-map.helpers";
import {
  buildInitialRegion,
  type RevierCenter
} from "./map-preview.helpers";
import { spacing } from "@hege/tokens";

const ANDROID_GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY;
const ANDROID_HAS_GOOGLE_KEY = Platform.OS === "android" && !!ANDROID_GOOGLE_KEY;
const MAP_PROVIDER =
  Platform.OS === "android" ? (ANDROID_HAS_GOOGLE_KEY ? PROVIDER_GOOGLE : undefined) : undefined;
const SHOULD_RENDER_NATIVE_MAP = Platform.OS === "ios" || ANDROID_HAS_GOOGLE_KEY;

export interface EntityPin {
  id: string;
  location: GeoPoint;
  title: string;
  subtitle?: string;
  color?: string;
  kind?: "ansitz" | "fallwild" | "einrichtung" | "reviermeldung";
}

interface EntityMapProps {
  pins: ReadonlyArray<EntityPin>;
  testID?: string;
  revierCenter?: RevierCenter;
  /** Pin-Farbe — Domain-Tab-spezifisch. Default theme.accent (Ansitz). */
  pinColor?: string;
  /**
   * Tap auf einen Pin. Aufrufer kann z.B. ein Detail-Sheet öffnen
   * oder zur Detail-Route navigieren.
   */
  onPinPress?: (pin: EntityPin) => void;
  /** Tap auf die Karte, etwa um den Standort eines neuen Objekts zu setzen. */
  onMapPress?: (location: GeoPoint) => void;
  /**
   * Fixe Höhe in px. Default `null` = `flex: 1`, füllt den Eltern-
   * Container. Praktisch zum Einbetten in ScrollView-Tabs, wo man
   * eine begrenzte Höhe braucht.
   */
  height?: number | null;
}

/**
 * `<EntityMap>` — schlanke Single-Layer-Karte für Locations-Tabs
 * (Ansitze / Fallwild / Reviereinrichtungen).
 *
 * Anders als `<MapStage>` (das Multi-Layer für das Heute-Dashboard
 * war): keine Filter-Chips, kein Bottom-Banner, kein
 * Tagesuebersicht-Hook. Eine Liste Pins, eine Pin-Farbe, optional
 * ein `onPinPress`-Callback. Die Region wird beim ersten Render auf
 * die Bounding-Box der Pins gerechnet. Wenn sich Center oder
 * Pin-Koordinaten ändern, remounten wir die native Map gezielt, weil
 * `react-native-maps` spätere `initialRegion`-Updates ignoriert.
 *
 * Auf Android ohne Google-Key fällt die Komponente auf einen
 * Hinweis-Fallback zurück. Das Verhalten entspricht
 * `<MapPreview>` und `<MapStage>`, damit sich alle Karten
 * gleich verhalten.
 */
export function EntityMap({
  pins,
  testID,
  revierCenter,
  pinColor,
  onPinPress,
  onMapPress,
  height = null
}: EntityMapProps) {
  const styles = useThemedStyles(createStyles);
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);
  const mapRef = useRef<MapView>(null);
  const regionRef = useRef<ReturnType<typeof buildInitialRegion> | null>(null);

  const regionKey = useMemo(
    () => buildEntityMapRegionKey(revierCenter, pins),
    [pins, revierCenter]
  );

  const initialRegion = useMemo(() => {
    return buildInitialRegion(revierCenter, pins);
  }, [pins, revierCenter]);

  const containerStyle =
    expanded || height === null ? styles.containerFlex : [styles.containerFixed, { height }];

  if (!SHOULD_RENDER_NATIVE_MAP) {
    return (
      <View style={[containerStyle, styles.fallback]} testID={testID}>
        <Text style={styles.fallbackTitle}>Karte nicht aktiv</Text>
        <Text style={styles.fallbackCopy}>
          Karte wird mit Google-Maps-Key aktiviert. Liste bleibt unter dem Toggle erreichbar.
        </Text>
      </View>
    );
  }

  const mapContent = (
    <View style={containerStyle} testID={testID}>
      <MapView
        ref={mapRef}
        key={regionKey}
        provider={MAP_PROVIDER}
        style={StyleSheet.absoluteFillObject}
        initialRegion={initialRegion}
        zoomEnabled
        scrollEnabled
        onRegionChangeComplete={(region) => { regionRef.current = region; }}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass
        toolbarEnabled={false}
        onPress={
          onMapPress
            ? (event: MapPressEvent) => {
                void Haptics.selectionAsync();
                onMapPress({
                  lat: event.nativeEvent.coordinate.latitude,
                  lng: event.nativeEvent.coordinate.longitude,
                  source: "manual"
                });
              }
            : undefined
        }
      >
        {pins.map((pin) => (
          <Marker
            key={pin.id}
            coordinate={{ latitude: pin.location.lat, longitude: pin.location.lng }}
            pinColor={pin.color ?? pinColor ?? theme.accent}
            onPress={() => {
              if (!onPinPress) {
                return;
              }
              void Haptics.selectionAsync();
              setExpanded(false);
              onPinPress(pin);
            }}
            // Wir behalten die native Callout absichtlich bei: wer keinen
            // Pin-Press-Handler liefert, sieht trotzdem Title/Subtitle,
            // sonst koennen wir vom Aufrufer aus ein eigenes Sheet rendern.
            title={onPinPress ? undefined : pin.title}
            description={onPinPress ? undefined : pin.subtitle}
          />
        ))}
      </MapView>
      <View style={{ position: "absolute", top: 12, right: 12, gap: 8 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={expanded ? "Karte schließen" : "Karte bildschirmfüllend öffnen"} onPress={() => setExpanded(!expanded)} style={{ backgroundColor: theme.card, padding: 14, borderRadius: 12 }}><Text style={{ color: theme.ink, fontWeight: "700" }}>{expanded ? "Schließen" : "Vollbild"}</Text></Pressable>
        {[{ label: "Vergrößern", text: "+", factor: 0.5 }, { label: "Verkleinern", text: "−", factor: 2 }].map(action => <Pressable key={action.label} accessibilityRole="button" accessibilityLabel={action.label} onPress={() => {
          const current = regionRef.current ?? initialRegion;
          const next = { ...current, latitudeDelta: Math.min(150, Math.max(0.0003, current.latitudeDelta * action.factor)), longitudeDelta: Math.min(150, Math.max(0.0003, current.longitudeDelta * action.factor)) };
          regionRef.current = next;
          mapRef.current?.animateToRegion(next, 200);
        }} style={{ backgroundColor: theme.card, width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 12 }}><Text style={{ color: theme.ink, fontSize: 28 }}>{action.text}</Text></Pressable>)}
      </View>
    </View>
  );
  return expanded ? <><View style={{ height: height ?? 300 }} /><Modal visible animationType="slide" onRequestClose={() => setExpanded(false)}><View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: theme.background }}>{mapContent}</View></Modal></> : mapContent;
}

const createStyles = (theme: ThemeColors) =>
  ({
    containerFlex: {
      flex: 1,
      borderRadius: 22,
      overflow: "hidden",
      backgroundColor: theme.card
    },
    containerFixed: {
      width: "100%",
      borderRadius: 22,
      overflow: "hidden",
      backgroundColor: theme.card
    },
    fallback: {
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.lg,
      gap: spacing.sm,
      backgroundColor: theme.accent,
      minHeight: 200
    },
    fallbackTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.onAccent,
      textAlign: "center"
    },
    fallbackCopy: {
      fontSize: 13,
      lineHeight: 18,
      color: theme.onAccent,
      textAlign: "center"
    }
  }) as const;
