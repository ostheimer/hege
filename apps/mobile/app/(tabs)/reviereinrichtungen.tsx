import * as Haptics from "expo-haptics";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { ReviereinrichtungListItem } from "@hege/domain";

import { EntityMap, type EntityPin } from "../../components/entity-map";
import { FilterChipRow } from "../../components/filter-chip-row";
import { PinDetailSheet, type SelectedPin } from "../../components/pin-detail-sheet";
import { ScreenShell } from "../../components/screen-shell";
import { SearchInput } from "../../components/search-input";
import { StateView } from "../../components/state-view";
import { ViewToggle } from "../../components/view-toggle";
import { fetchReviereinrichtungenList } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import {
  applyReviereinrichtungFilter,
  DEFAULT_REVIEREINRICHTUNG_FILTER,
  isReviereinrichtungFilterActive,
  type EinrichtungTypFilter,
  type EinrichtungZustandFilter,
  type ReviereinrichtungFilterState,
  type ReviereinrichtungSortKey
} from "../../lib/reviereinrichtung-filter.helpers";
import type { ThemeColors } from "../../lib/theme";
import { useThemeColors } from "../../lib/theme";
import { cardSurface } from "../../lib/surfaces";
import { eyebrowText } from "../../lib/typography";
import { useThemedStyles } from "../../lib/use-themed-styles";
import { spacing, radius } from "@hege/tokens";

type ViewMode = "liste" | "karte";

const MAP_HEIGHT = 380;

export default function ReviereinrichtungenScreen() {
  const styles = useThemedStyles(createStyles);
  const theme = useThemeColors();
  const [reviereinrichtungen, setReviereinrichtungen] = useState<ReviereinrichtungListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ViewMode>("karte");
  const [selectedPin, setSelectedPin] = useState<SelectedPin | null>(null);
  const [filter, setFilter] = useState<ReviereinrichtungFilterState>(
    DEFAULT_REVIEREINRICHTUNG_FILTER
  );

  const visibleEntries = useMemo(
    () => applyReviereinrichtungFilter(reviereinrichtungen, filter),
    [reviereinrichtungen, filter]
  );
  const filterActive = useMemo(() => isReviereinrichtungFilterActive(filter), [filter]);

  useEffect(() => {
    void loadReviereinrichtungen();
  }, []);

  async function loadReviereinrichtungen(options?: { refreshing?: boolean }) {
    const refreshing = options?.refreshing ?? false;
    if (refreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      setReviereinrichtungen(await fetchReviereinrichtungenList());
    } catch (fetchError) {
      setReviereinrichtungen([]);
      setError(fetchError instanceof Error ? fetchError.message : "Unbekannter Fehler");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  // Map des Listen-Items auf das schlanke EntityPin-Shape, das die
  // generische `<EntityMap>` versteht. `id`/`location` reichen — title
  // + subtitle nur fuer die optionale native Callout (haben wir hier
  // deaktiviert, weil wir das eigene PinDetailSheet nutzen).
  // Karte verwendet die gefilterte Liste, damit Filter-Wirkung in
  // beiden Modi gleich ist.
  const pins: ReadonlyArray<EntityPin> = useMemo(
    () =>
      visibleEntries.map((entry) => ({
        id: entry.id,
        kind: "einrichtung",
        location: entry.location,
        title: entry.name,
        subtitle: `${entry.type} · ${entry.status}`
      })),
    [visibleEntries]
  );

  return (
    <ScreenShell
      eyebrow="Revier"
      title="Einrichtungen direkt im Gelände kontrollieren."
      subtitle="Zustand, Mängel und Wartungen werden aus dem zentralen Client gelesen."
      refresh={{
        refreshing: isRefreshing,
        onRefresh: () => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          void loadReviereinrichtungen({ refreshing: true });
        }
      }}
    >
      <View style={styles.toolbar}>
        <ViewToggle<ViewMode>
          value={mode}
          onChange={setMode}
          accessibilityLabel="Anzeige umschalten"
          options={[
            { key: "liste", label: "Liste", icon: "list" },
            { key: "karte", label: "Karte", icon: "map" }
          ]}
        />
        <Pressable style={styles.refreshButton} onPress={() => void loadReviereinrichtungen()}>
          <Text style={styles.refreshButtonText}>Aktualisieren</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <StateView
          mode="loading"
          title="Einrichtungen werden geladen"
          description="Die Revierdaten werden über die API geladen."
        />
      ) : error ? (
        <StateView mode="error" title="API nicht erreichbar" description={error} />
      ) : null}

      <View style={styles.filterSection}>
        <SearchInput
          value={filter.search}
          onChangeText={(text) => setFilter((current) => ({ ...current, search: text }))}
          placeholder="Suche Name, Typ oder Beschreibung ..."
          accessibilityLabel="Einrichtungen durchsuchen"
        />
        <View style={styles.filterGroup}>
          <Text style={styles.filterEyebrow}>Typ</Text>
          <FilterChipRow<EinrichtungTypFilter>
            value={filter.typ}
            onChange={(key) => setFilter((current) => ({ ...current, typ: key }))}
            accessibilityLabel="Einrichtungs-Typ filtern"
            options={[
              { key: "alle", label: "Alle" },
              { key: "hochstand", label: "Hochstand" },
              { key: "fuetterung", label: "Fütterung" },
              { key: "salzlecke", label: "Salzlecke" },
              { key: "kirrung", label: "Kirrung" },
              { key: "kamera", label: "Kamera" },
              { key: "wildacker", label: "Wildacker" }
            ]}
          />
        </View>
        <View style={styles.filterGroup}>
          <Text style={styles.filterEyebrow}>Zustand</Text>
          <FilterChipRow<EinrichtungZustandFilter>
            value={filter.zustand}
            onChange={(key) => setFilter((current) => ({ ...current, zustand: key }))}
            accessibilityLabel="Zustand filtern"
            options={[
              { key: "alle", label: "Alle" },
              { key: "gut", label: "Gut" },
              { key: "wartung-faellig", label: "Wartung fällig" },
              { key: "gesperrt", label: "Gesperrt" }
            ]}
          />
        </View>
        <View style={styles.filterGroup}>
          <Text style={styles.filterEyebrow}>Sortierung</Text>
          <FilterChipRow<ReviereinrichtungSortKey>
            value={filter.sort}
            onChange={(key) => setFilter((current) => ({ ...current, sort: key }))}
            accessibilityLabel="Sortierung waehlen"
            options={[
              { key: "alphabetisch", label: "Alphabetisch" },
              { key: "nach-zustand", label: "Nach Zustand" },
              { key: "nach-wartungen-desc", label: "Wartungen zuerst" },
              { key: "nach-typ", label: "Nach Typ" }
            ]}
          />
        </View>
        {filterActive ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Filter zurücksetzen"
            onPress={() => setFilter(DEFAULT_REVIEREINRICHTUNG_FILTER)}
            style={styles.filterReset}
          >
            <Text style={styles.filterResetText}>
              Filter zurücksetzen ({visibleEntries.length}/{reviereinrichtungen.length})
            </Text>
          </Pressable>
        ) : null}
      </View>

      {!isLoading && !error && visibleEntries.length === 0 ? (
        <StateView
          mode="empty"
          title={reviereinrichtungen.length === 0 ? "Noch keine Einrichtungen" : "Keine Treffer"}
          description={
            reviereinrichtungen.length === 0
              ? "Sobald die ersten Hochstände, Fütterungen oder Salzlecken erfasst sind, tauchen sie hier auf."
              : "Mit den aktuellen Filtern findet sich keine Einrichtung. Filter zurücksetzen oder Suchbegriff anpassen."
          }
        />
      ) : null}

      {mode === "karte" && !isLoading ? (
        <EntityMap
          pins={pins}
          pinColor={theme.ink}
          height={MAP_HEIGHT}
          onPinPress={(pin) => {
            const target = visibleEntries.find((entry) => entry.id === pin.id);
            if (target) {
              setSelectedPin({ type: "einrichtung", data: target });
            }
          }}
        />
      ) : null}

      {mode === "liste" ? (
        <ScrollView contentContainerStyle={styles.list} nestedScrollEnabled>
          {visibleEntries.map((entry) => (
            <View key={entry.id} style={styles.card}>
              <View style={styles.row}>
                <View style={styles.grow}>
                  <Text style={styles.type}>{entry.type}</Text>
                  <Text style={styles.title}>{entry.name}</Text>
                </View>
                <Text style={entry.status === "gut" ? styles.okText : styles.warningText}>
                  {entry.status}
                </Text>
              </View>
              <Text style={styles.copy}>{entry.beschreibung ?? "Keine Beschreibung"}</Text>
              <Text style={styles.copy}>Standort: {entry.location.label ?? "Ohne Standort"}</Text>
              <Text style={styles.copy}>Kontrollen: {entry.kontrollen.length}</Text>
              <Text style={styles.copy}>Offene Wartungen: {entry.offeneWartungen}</Text>
              {entry.letzteKontrolleAt ? (
                <Text style={styles.copy}>
                  Letzte Kontrolle: {formatDateTime(entry.letzteKontrolleAt)}
                </Text>
              ) : null}
              {entry.wartung[0] ? (
                <Text style={styles.copy}>Nächste Wartung: {formatDateTime(entry.wartung[0].dueAt)}</Text>
              ) : null}
            </View>
          ))}
        </ScrollView>
      ) : null}

      <PinDetailSheet
        pin={selectedPin}
        onClose={() => setSelectedPin(null)}
        // Detail-Tap soll auf die Listen-Ansicht zurueckholen, falls der
        // Nutzer aus der Karte heraus mehr Detail will. Wir wechseln den
        // Mode zurueck auf "liste" und schliessen das Sheet.
        onOpenDetails={() => {
          setSelectedPin(null);
          setMode("liste");
        }}
      />
    </ScreenShell>
  );
}

const createStyles = (theme: ThemeColors) =>
  ({
    toolbar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10
    },
    filterSection: {
      gap: 10,
      padding: 14,
      borderRadius: 18,
      backgroundColor: theme.card
    },
    filterGroup: {
      gap: 6
    },
    filterEyebrow: { ...eyebrowText(theme) },
    filterReset: {
      alignSelf: "flex-start",
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: radius.full,
      backgroundColor: theme.accent
    },
    filterResetText: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.onAccent
    },
    refreshButton: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: radius.full,
      backgroundColor: theme.card
    },
    refreshButtonText: {
      color: theme.ink,
      fontWeight: "600"
    },
    list: {
      gap: 12
    },
    card: { ...cardSurface(theme), gap: spacing.sm },
    row: {
      flexDirection: "row",
      gap: 10,
      alignItems: "flex-start"
    },
    grow: {
      flex: 1,
      gap: spacing.xs
    },
    type: { ...eyebrowText(theme) },
    title: {
      fontSize: 19,
      fontWeight: "700",
      color: theme.ink
    },
    copy: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.muted
    },
    okText: {
      color: theme.accent,
      fontWeight: "700"
    },
    warningText: {
      color: theme.warning,
      fontWeight: "700"
    }
  }) as const;
