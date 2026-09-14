import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Linking, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import type { ReviereinrichtungListItem } from "@hege/domain";
import { spacing } from "@hege/tokens";

import { Badge } from "../../components/badge";
import { EntityMap, type EntityPin } from "../../components/entity-map";
import { FacilityPhotoHero } from "../../components/facility-photo-hero";
import { FeedbackBanner } from "../../components/feedback-banner";
import { StateView } from "../../components/state-view";
import { fetchReviereinrichtungenList } from "../../lib/api";
import { formatDateTime, formatEinrichtungZustand } from "../../lib/format";
import { formatDirection, formatEinrichtungTyp } from "../../lib/reviereinrichtung";
import { useSessionSnapshot } from "../../lib/session";
import { useThemeColors, type ThemeColors } from "../../lib/theme";
import { useThemedStyles } from "../../lib/use-themed-styles";

export default function ReviereinrichtungDetailScreen() {
  const { id: rawId } = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const [entry, setEntry] = useState<ReviereinrichtungListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const session = useSessionSnapshot().session;
  const styles = useThemedStyles(createStyles);
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();

  const load = useCallback(async (refresh = false) => {
    if (!id) {
      setError("Einrichtung wurde nicht gefunden.");
      setLoading(false);
      return;
    }
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const found = (await fetchReviereinrichtungenList()).find((item) => item.id === id);
      if (!found) throw new Error("Einrichtung wurde nicht gefunden oder gehört nicht zum aktiven Revier.");
      setEntry(found);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Einrichtung konnte nicht geladen werden.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (loading && !entry) return <SafeAreaView edges={["left", "right"]} style={styles.safe}><StateView mode="loading" title="Einrichtung wird geladen" description="" /></SafeAreaView>;

  if (!entry) return <SafeAreaView edges={["left", "right"]} style={styles.safe}><View style={styles.errorWrap}><FeedbackBanner tone="danger" title="Einrichtung nicht verfügbar" description={error ?? "Unbekannter Fehler"} /></View></SafeAreaView>;

  const pin: EntityPin = {
    id: entry.id,
    kind: "einrichtung",
    location: entry.location,
    title: entry.name,
    subtitle: formatEinrichtungTyp(entry.type),
    color: theme.ink
  };
  const badgeTone = entry.status === "gut" ? "success" : entry.status === "gesperrt" ? "danger" : "warning";
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${entry.location.lat},${entry.location.lng}`)}`;

  return (
    <SafeAreaView edges={["left", "right"]} style={styles.safe} testID="reviereinrichtung-detail-screen">
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 18) + 18 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={theme.accent} />}
        showsVerticalScrollIndicator={false}
      >
        <FacilityPhotoHero
          mode="detail"
          photos={entry.photos.map((photo) => ({ id: photo.id, title: photo.title, uri: photo.url }))}
          title={entry.name}
        />

        <View style={styles.titleBlock}>
          <Text style={styles.society}>{session?.revier.name ?? "Aktives Revier"}</Text>
          <View style={styles.titleRow}>
            <View style={styles.grow}>
              <Text style={styles.eyebrow}>Einrichtungsdetails</Text>
              <Text style={styles.title}>{entry.name}</Text>
            </View>
            <Badge tone={badgeTone}>{formatEinrichtungZustand(entry.status)}</Badge>
          </View>
        </View>

        {error ? <FeedbackBanner tone="warning" title="Aktualisierung fehlgeschlagen" description={error} /> : null}

        <View style={styles.details}>
          <DetailRow icon="business-outline" label="Typ" value={formatEinrichtungTyp(entry.type)} styles={styles} theme={theme} />
          <DetailRow icon="shield-checkmark-outline" label="Zustand" value={formatEinrichtungZustand(entry.status)} styles={styles} theme={theme} />
          {entry.orientationDegrees !== undefined ? <DetailRow icon="compass-outline" label="Ausrichtung" value={formatDirection(entry.orientationDegrees)} styles={styles} theme={theme} /> : null}
          {entry.offeneWartungen > 0 ? <DetailRow icon="construct-outline" label="Offene Wartungen" value={`${entry.offeneWartungen}`} styles={styles} theme={theme} /> : null}
          {entry.letzteKontrolleAt ? <DetailRow icon="checkmark-circle-outline" label="Letzte Kontrolle" value={formatDateTime(entry.letzteKontrolleAt)} styles={styles} theme={theme} /> : null}
          {entry.beschreibung ? <DetailRow icon="document-text-outline" label="Beschreibung" value={entry.beschreibung} styles={styles} theme={theme} /> : null}
          {entry.details?.accessNote ? <DetailRow icon="walk-outline" label="Zugang" value={entry.details.accessNote} styles={styles} theme={theme} /> : null}
          {entry.details?.capacityPersons !== undefined ? <DetailRow icon="people-outline" label="Personen" value={`${entry.details.capacityPersons}`} styles={styles} theme={theme} /> : null}
          {entry.details?.constructionYear !== undefined ? <DetailRow icon="calendar-outline" label="Baujahr" value={`${entry.details.constructionYear}`} styles={styles} theme={theme} /> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Standort</Text>
          <EntityMap pins={[pin]} height={230} testID="reviereinrichtung-detail-map" />
          <Text style={styles.locationCopy}>{entry.location.label ?? `${entry.location.lat.toFixed(5)}, ${entry.location.lng.toFixed(5)}`}</Text>
          <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(mapsUrl)} style={({ pressed }) => [styles.mapAction, pressed ? styles.pressed : null]} testID="reviereinrichtung-google-maps-link">
            <Ionicons color={theme.ink} name="map-outline" size={22} />
            <Text style={styles.mapActionText}>In Google Maps öffnen</Text>
            <Ionicons color={theme.muted} name="chevron-forward" size={20} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ icon, label, value, styles, theme }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
  theme: ThemeColors;
}) {
  return <View style={styles.detailRow}>
    <View style={styles.detailIcon}><Ionicons color={theme.onAccent} name={icon} size={19} /></View>
    <View style={styles.grow}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>
  </View>;
}

const createStyles = (theme: ThemeColors) => ({
  safe: { flex: 1, backgroundColor: theme.background },
  content: { padding: spacing.md, gap: spacing.md },
  errorWrap: { padding: spacing.md },
  titleBlock: { gap: 8 },
  society: { color: theme.muted, fontSize: 14 },
  titleRow: { flexDirection: "row" as const, alignItems: "flex-start" as const, gap: 12 },
  grow: { flex: 1, minWidth: 0 },
  eyebrow: { color: theme.muted, fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase" as const },
  title: { color: theme.ink, fontSize: 28, lineHeight: 34, fontWeight: "700" as const, marginTop: 3 },
  details: { borderTopWidth: 1, borderTopColor: theme.inputBorder },
  detailRow: { flexDirection: "row" as const, alignItems: "flex-start" as const, gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.inputBorder },
  detailIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center" as const, justifyContent: "center" as const, backgroundColor: theme.accent },
  detailLabel: { color: theme.muted, fontSize: 13, lineHeight: 18 },
  detailValue: { color: theme.ink, fontSize: 16, lineHeight: 22, fontWeight: "600" as const, marginTop: 2 },
  section: { gap: 10, marginTop: 4 },
  sectionTitle: { color: theme.ink, fontSize: 22, fontWeight: "700" as const },
  locationCopy: { color: theme.muted, fontSize: 14, lineHeight: 20 },
  mapAction: { minHeight: 52, flexDirection: "row" as const, alignItems: "center" as const, gap: 10, paddingHorizontal: 14, borderRadius: 16, backgroundColor: theme.card },
  mapActionText: { flex: 1, color: theme.ink, fontSize: 16, fontWeight: "700" as const },
  pressed: { opacity: 0.8 }
});
