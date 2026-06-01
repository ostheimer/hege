import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import type { AnsitzSession, FallwildVorgang, Reviereinrichtung } from "@hege/domain";

import type { ThemeColors } from "../lib/theme";
import { useThemeColors } from "../lib/theme";
import { useThemedStyles } from "../lib/use-themed-styles";
import { ErfassenFab, type ErfassenAction } from "./erfassen-fab";
import {
  buildMapStageRegion,
  computeMapStageCounts,
  DEFAULT_MAP_LAYERS,
  type MapLayers,
  type RevierCenter
} from "./map-stage.helpers";
import { PinDetailSheet, type SelectedPin } from "./pin-detail-sheet";
import { QueueBadge } from "./queue-badge";

/**
 * Auf Android braucht `react-native-maps` mit Provider Google einen API-Key
 * im Manifest. Auf iOS faellt `provider={undefined}` auf Apple Maps zurueck.
 * Wir spiegeln das Verhalten von `<MapPreview>`.
 */
const ANDROID_GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY;
const ANDROID_HAS_GOOGLE_KEY = Platform.OS === "android" && !!ANDROID_GOOGLE_KEY;

const MAP_PROVIDER =
  Platform.OS === "android" ? (ANDROID_HAS_GOOGLE_KEY ? PROVIDER_GOOGLE : undefined) : undefined;

const SHOULD_RENDER_NATIVE_MAP = Platform.OS === "ios" || ANDROID_HAS_GOOGLE_KEY;

interface MapStageProps {
  revierName: string;
  revierCenter?: RevierCenter;
  ansitze: ReadonlyArray<AnsitzSession>;
  fallwild: ReadonlyArray<FallwildVorgang>;
  einrichtungen: ReadonlyArray<Reviereinrichtung>;
  queueCount: number;
  /**
   * Failed-Subset von `queueCount` — wird im roten Queue-Badge separat
   * dargestellt, weil Fehler dringender als nur "warten auf Sync" sind.
   */
  failedQueueCount?: number;
  onOpenTagesuebersicht?: () => void;
  onErfassen?: (action: ErfassenAction) => void;
  onOpenPinDetails?: (pin: SelectedPin) => void;
}

/**
 * `<MapStage>` — Full-Bleed-Karte als Heute-Tab (P2.1, PR A).
 *
 * Drei Layer-Toggle-Chips am oberen Rand schalten Ansitze, Fallwild und
 * Reviereinrichtungen ein/aus. Die Karte zentriert sich beim Mounten auf
 * die initiale Bounding-Box aller eingeschalteten Pins (Revierzentrum als
 * Fallback). Tap auf einen Pin: rendert die native Marker-Callout
 * (`title`/`description`) — interaktive Bottom-Sheets kommen in PR B.
 *
 * Am unteren Rand (oberhalb der Tab-Bar) liegt ein kleiner
 * Summary-Banner mit Tageszahlen plus einer Affordance, die alte
 * Heute-Liste (= Detail-Funktionen wie Queue-Sync) zu oeffnen. Das ist
 * die Bruecke, damit nichts verloren geht, was vorher auf "Heute" war.
 */
export function MapStage({
  revierName,
  revierCenter,
  ansitze,
  fallwild,
  einrichtungen,
  queueCount,
  failedQueueCount = 0,
  onOpenTagesuebersicht,
  onErfassen,
  onOpenPinDetails
}: MapStageProps) {
  const styles = useThemedStyles(createStyles);
  const theme = useThemeColors();
  const [layers, setLayers] = useState<MapLayers>(DEFAULT_MAP_LAYERS);
  const [selectedPin, setSelectedPin] = useState<SelectedPin | null>(null);

  const initialRegion = useMemo(
    () => buildMapStageRegion(revierCenter, layers, ansitze, fallwild, einrichtungen),
    // initialRegion soll bewusst NUR beim Mounten + bei Layer-Wechsel neu
    // berechnet werden, nicht bei jedem Pin-Update. `react-native-maps`
    // ignoriert `initialRegion`-Updates ohnehin nach dem ersten Render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layers]
  );

  const counts = computeMapStageCounts(ansitze, fallwild, einrichtungen, queueCount);

  function toggleLayer(key: keyof MapLayers) {
    void Haptics.selectionAsync();
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <View style={styles.root}>
      {SHOULD_RENDER_NATIVE_MAP ? (
        <MapView
          provider={MAP_PROVIDER}
          style={StyleSheet.absoluteFillObject}
          initialRegion={initialRegion}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass={false}
          toolbarEnabled={false}
        >
          {layers.ansitze
            ? ansitze.map((entry) => (
                <Marker
                  key={`ansitz-${entry.id}`}
                  coordinate={{ latitude: entry.location.lat, longitude: entry.location.lng }}
                  pinColor={theme.accent}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setSelectedPin({ type: "ansitz", data: entry });
                  }}
                />
              ))
            : null}
          {layers.fallwild
            ? fallwild.map((entry) => (
                <Marker
                  key={`fallwild-${entry.id}`}
                  coordinate={{ latitude: entry.location.lat, longitude: entry.location.lng }}
                  pinColor={theme.warning}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setSelectedPin({ type: "fallwild", data: entry });
                  }}
                />
              ))
            : null}
          {layers.einrichtungen
            ? einrichtungen.map((entry) => (
                <Marker
                  key={`einrichtung-${entry.id}`}
                  coordinate={{ latitude: entry.location.lat, longitude: entry.location.lng }}
                  pinColor={theme.ink}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setSelectedPin({ type: "einrichtung", data: entry });
                  }}
                />
              ))
            : null}
        </MapView>
      ) : (
        <View style={styles.androidFallback}>
          <Text style={styles.fallbackTitle}>Karte nicht aktiv</Text>
          <Text style={styles.fallbackCopy}>
            Karte wird mit Google-Key aktiviert. Liste bleibt unter „Tagesübersicht" erreichbar.
          </Text>
        </View>
      )}

      <SafeAreaView edges={["top"]} pointerEvents="box-none" style={styles.topBar}>
        <View style={styles.topBarRow} pointerEvents="box-none">
          <View style={styles.brandPill}>
            <Text style={styles.brandPillEyebrow}>Heute im Revier</Text>
            <Text style={styles.brandPillTitle} numberOfLines={1}>
              {revierName}
            </Text>
          </View>
        </View>

        <View style={styles.chipsRow}>
          <LayerChip
            active={layers.ansitze}
            label="Ansitze"
            count={counts.ansitze}
            iconName="trail-sign"
            onPress={() => toggleLayer("ansitze")}
            styles={styles}
          />
          <LayerChip
            active={layers.fallwild}
            label="Fallwild"
            count={counts.fallwild}
            iconName="camera"
            onPress={() => toggleLayer("fallwild")}
            styles={styles}
          />
          <LayerChip
            active={layers.einrichtungen}
            label="Einrichtungen"
            count={counts.einrichtungen}
            iconName="location"
            onPress={() => toggleLayer("einrichtungen")}
            styles={styles}
          />
        </View>
      </SafeAreaView>

      <SafeAreaView edges={["bottom"]} pointerEvents="box-none" style={styles.bottomBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tagesübersicht öffnen"
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onOpenTagesuebersicht?.();
          }}
          style={({ pressed }) => [styles.summaryCard, pressed ? styles.summaryCardPressed : null]}
        >
          <View style={styles.summaryStats}>
            <SummaryStat label="Ansitze" value={counts.ansitze} styles={styles} />
            <View style={styles.summaryDivider} />
            <SummaryStat label="Fallwild" value={counts.fallwild} styles={styles} />
            <View style={styles.summaryDivider} />
            <SummaryStat
              label="Queue"
              value={counts.queue}
              variant={counts.queue > 0 ? "warning" : "default"}
              styles={styles}
            />
          </View>
          <View style={styles.summaryAffordance}>
            <Text style={styles.summaryAffordanceLabel}>Tagesübersicht</Text>
            <Ionicons color={theme.muted} name="chevron-forward" size={18} />
          </View>
        </Pressable>
      </SafeAreaView>

      <QueueBadge
        count={counts.queue}
        failedCount={failedQueueCount}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onOpenTagesuebersicht?.();
        }}
      />

      {onErfassen ? <ErfassenFab onSelectAction={onErfassen} /> : null}

      <PinDetailSheet
        pin={selectedPin}
        onClose={() => setSelectedPin(null)}
        onOpenDetails={(pin) => {
          setSelectedPin(null);
          onOpenPinDetails?.(pin);
        }}
      />
    </View>
  );
}

interface LayerChipProps {
  active: boolean;
  label: string;
  count: number;
  iconName: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}

function LayerChip({ active, label, count, iconName, onPress, styles }: LayerChipProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: active }}
      accessibilityLabel={`${label} (${count})${active ? ", sichtbar" : ", ausgeblendet"}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active ? styles.chipActive : styles.chipInactive,
        pressed ? styles.chipPressed : null
      ]}
    >
      <Ionicons
        color={active ? styles.chipActiveIconColor.color : styles.chipInactiveIconColor.color}
        name={iconName}
        size={14}
      />
      <Text style={[styles.chipLabel, active ? styles.chipLabelActive : styles.chipLabelInactive]}>
        {label}
      </Text>
      <Text style={[styles.chipCount, active ? styles.chipLabelActive : styles.chipLabelInactive]}>
        {count}
      </Text>
    </Pressable>
  );
}

interface SummaryStatProps {
  label: string;
  value: number;
  variant?: "default" | "warning";
  styles: ReturnType<typeof createStyles>;
}

function SummaryStat({ label, value, variant = "default", styles }: SummaryStatProps) {
  return (
    <View style={styles.summaryStat}>
      <Text style={styles.summaryStatLabel}>{label}</Text>
      <Text style={[styles.summaryStatValue, variant === "warning" ? styles.summaryStatValueWarning : null]}>
        {value}
      </Text>
    </View>
  );
}

const createStyles = (theme: ThemeColors) =>
  ({
    root: {
      flex: 1,
      backgroundColor: theme.surface
    },
    androidFallback: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
      gap: 8,
      backgroundColor: theme.accent
    },
    fallbackTitle: {
      fontSize: 18,
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
    topBar: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 12,
      gap: 8
    },
    topBarRow: {
      flexDirection: "row",
      alignItems: "center"
    },
    brandPill: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 14,
      backgroundColor: theme.card,
      maxWidth: "85%",
      shadowColor: "#10231d",
      shadowOpacity: 0.18,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4
    },
    brandPillEyebrow: {
      fontSize: 10,
      textTransform: "uppercase",
      letterSpacing: 1.1,
      color: theme.muted
    },
    brandPillTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.ink
    },
    chipsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 4
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      shadowColor: "#10231d",
      shadowOpacity: 0.12,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3
    },
    chipActive: {
      backgroundColor: theme.accent
    },
    chipInactive: {
      backgroundColor: theme.card
    },
    chipPressed: {
      opacity: 0.85
    },
    chipLabel: {
      fontSize: 13,
      fontWeight: "600"
    },
    chipCount: {
      fontSize: 12,
      fontWeight: "700",
      opacity: 0.85
    },
    chipLabelActive: {
      color: theme.onAccent
    },
    chipLabelInactive: {
      color: theme.ink
    },
    chipActiveIconColor: {
      color: theme.onAccent
    },
    chipInactiveIconColor: {
      color: theme.ink
    },
    bottomBar: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 12,
      paddingBottom: 8
    },
    summaryCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 18,
      backgroundColor: theme.card,
      shadowColor: "#10231d",
      shadowOpacity: 0.18,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 5
    },
    summaryCardPressed: {
      opacity: 0.92
    },
    summaryStats: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 10
    },
    summaryStat: {
      gap: 2
    },
    summaryStatLabel: {
      fontSize: 10,
      textTransform: "uppercase",
      letterSpacing: 1.1,
      color: theme.muted
    },
    summaryStatValue: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.ink
    },
    summaryStatValueWarning: {
      color: theme.warning
    },
    summaryDivider: {
      width: 1,
      height: 22,
      backgroundColor: theme.muted,
      opacity: 0.2
    },
    summaryAffordance: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4
    },
    summaryAffordanceLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.muted
    }
  }) as const;
