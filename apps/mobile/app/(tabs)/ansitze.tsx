import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View
} from "react-native";
import type { Dispatch, SetStateAction } from "react";

import type { AnsitzSession } from "@hege/domain";

import { Badge } from "../../components/badge";
import { EntityMap, type EntityPin } from "../../components/entity-map";
import { FilterChipRow } from "../../components/filter-chip-row";
import { PinDetailSheet, type SelectedPin } from "../../components/pin-detail-sheet";
import { QueueStatusPill } from "../../components/queue-status-pill";
import { ScreenShell } from "../../components/screen-shell";
import { SearchInput } from "../../components/search-input";
import { StateView } from "../../components/state-view";
import { ViewToggle } from "../../components/view-toggle";
import {
  applyAnsitzFilter,
  DEFAULT_ANSITZ_FILTER,
  isAnsitzFilterActive,
  type AnsitzFilterState,
  type AnsitzKonfliktFilter,
  type AnsitzSortKey,
  type AnsitzZeitraumFilter
} from "../../lib/ansitz-filter.helpers";
import { computeAnsitzSmartDefaults } from "../../lib/ansitz-smart-defaults.helpers";
import { formatDateTime } from "../../lib/format";
import { buildGeoPoint, trimToUndefined } from "../../lib/form-utils";
import { fetchLiveAnsitze, type CreateAnsitzRequest } from "../../lib/api";
import {
  syncOfflineQueue,
  submitAnsitzWithOfflineFallback,
  useOfflineQueueSnapshot
} from "../../lib/offline-queue";
import { useThemeColors, type ThemeColors } from "../../lib/theme";
import { useThemedStyles } from "../../lib/use-themed-styles";

type ViewMode = "liste" | "karte";
const MAP_HEIGHT = 380;

interface AnsitzFormState {
  standortName: string;
  locationLabel: string;
  lat: string;
  lng: string;
  note: string;
}

const DEFAULT_FORM: AnsitzFormState = {
  standortName: "",
  locationLabel: "Mobil gemeldet",
  lat: "47.9161",
  lng: "13.5182",
  note: ""
};

export default function AnsitzeScreen() {
  const queue = useOfflineQueueSnapshot();
  const styles = useThemedStyles(createStyles);
  const theme = useThemeColors();
  const [ansitze, setAnsitze] = useState<AnsitzSession[]>([]);
  const [form, setForm] = useState<AnsitzFormState>(DEFAULT_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<ViewMode>("karte");
  const [selectedPin, setSelectedPin] = useState<SelectedPin | null>(null);
  const [filter, setFilter] = useState<AnsitzFilterState>(DEFAULT_ANSITZ_FILTER);

  const visibleAnsitze = useMemo(() => applyAnsitzFilter(ansitze, filter), [ansitze, filter]);
  const filterActive = useMemo(() => isAnsitzFilterActive(filter), [filter]);

  useEffect(() => {
    void loadAnsitze();
  }, []);

  // EntityPin-Mapping fuer die Karten-Ansicht. Karte nutzt die
  // gefilterte Liste, damit Filter-Wirkung in beiden Modi gleich ist.
  const pins: ReadonlyArray<EntityPin> = useMemo(
    () =>
      visibleAnsitze.map((entry) => ({
        id: entry.id,
        kind: "ansitz",
        location: entry.location,
        title: entry.standortName,
        subtitle: entry.location.label ?? "Aktiver Ansitz"
      })),
    [visibleAnsitze]
  );

  async function loadAnsitze(options?: { refreshing?: boolean }) {
    const refreshing = options?.refreshing ?? false;

    if (refreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError(null);

    try {
      const entries = await fetchLiveAnsitze();
      setAnsitze(entries);
      // Smart-Defaults aus der Historie ableiten, sobald wir Daten haben.
      // Nur das Pristine-Form wird gefuettert — wenn der User schon
      // angefangen hat zu tippen (z.B. eigenen Standortnamen eingegeben),
      // lassen wir die Eingabe stehen.
      const defaults = computeAnsitzSmartDefaults(entries);
      setForm((current) => {
        if (current.standortName.trim().length > 0) {
          return current;
        }
        return {
          ...current,
          standortName: defaults.standortName ?? current.standortName,
          lat: defaults.location ? String(defaults.location.lat) : current.lat,
          lng: defaults.location ? String(defaults.location.lng) : current.lng
        };
      });
    } catch (fetchError) {
      setAnsitze([]);
      setError(fetchError instanceof Error ? fetchError.message : "Unbekannter Fehler");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  async function handleSubmit() {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const payload = buildAnsitzPayload(form);
      const result = await submitAnsitzWithOfflineFallback(payload);

      setMessage(
        result.mode === "sent"
          ? "Ansitz direkt an die API gesendet."
          : "Keine Verbindung: Ansitz wurde vorgemerkt und wird automatisch nachgereicht."
      );

      setForm({
        ...DEFAULT_FORM,
        lat: form.lat.trim() || DEFAULT_FORM.lat,
        lng: form.lng.trim() || DEFAULT_FORM.lng
      });

      await loadAnsitze({ refreshing: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Ansitz konnte nicht gemeldet werden.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleQueueSync() {
    setMessage(null);
    setError(null);

    try {
      const remaining = await syncOfflineQueue();
      setMessage(
        remaining.length === 0
          ? "Warteschlange ist leer."
          : `${remaining.length} Einträge warten weiter auf Synchronisierung.`
      );
      await loadAnsitze({ refreshing: true });
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Warteschlange konnte nicht gesendet werden.");
    }
  }

  const queueEntries = queue.entries.filter((entry) => entry.kind === "ansitz-create");
  const failedQueueCount = queueEntries.filter(
    (entry) => entry.status === "failed" || entry.status === "conflict"
  ).length;

  return (
    <ScreenShell
      eyebrow="Ansitz"
      title="Ansitz mobil erfassen."
      subtitle="Standort, Koordinaten und Notiz werden online direkt an die API gesendet oder offline vorgemerkt."
      aside={<QueueStatusPill count={queueEntries.length} failedCount={failedQueueCount} />}
    >
      <View style={styles.formCard}>
        <Text style={styles.sectionLabel}>Neuer Ansitz</Text>
        <Text style={styles.sectionCopy}>Die Erfassung bleibt bewusst knapp und funktioniert auch bei schlechter Verbindung.</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Standortname</Text>
          <TextInput
            autoCapitalize="words"
            placeholder="Ansitz Wiesenrand"
            placeholderTextColor={theme.muted}
            style={styles.input}
            value={form.standortName}
            onChangeText={updateField(setForm, "standortName")}
          />
        </View>

        <View style={styles.fieldRow}>
          <View style={[styles.field, styles.grow]}>
            <Text style={styles.label}>Breitengrad</Text>
            <TextInput
              keyboardType="decimal-pad"
              placeholder="47.9161"
              placeholderTextColor={theme.muted}
              style={styles.input}
              value={form.lat}
              onChangeText={updateField(setForm, "lat")}
            />
          </View>
          <View style={[styles.field, styles.grow]}>
            <Text style={styles.label}>Längengrad</Text>
            <TextInput
              keyboardType="decimal-pad"
              placeholder="13.5182"
              placeholderTextColor={theme.muted}
              style={styles.input}
              value={form.lng}
              onChangeText={updateField(setForm, "lng")}
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Standortbezeichnung</Text>
          <TextInput
            placeholder="Mobil gemeldet"
            placeholderTextColor={theme.muted}
            style={styles.input}
            value={form.locationLabel}
            onChangeText={updateField(setForm, "locationLabel")}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Notiz</Text>
          <TextInput
            multiline
            placeholder="Kurze Notiz für die Revierführung"
            placeholderTextColor={theme.muted}
            style={[styles.input, styles.textArea]}
            value={form.note}
            onChangeText={updateField(setForm, "note")}
          />
        </View>

        {message ? (
          <View style={styles.infoCard}>
            <Text style={styles.stateTitle}>Status</Text>
            <Text style={styles.stateCopy}>{message}</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.stateTitle}>Ansitz nicht verfügbar</Text>
            <Text style={styles.stateCopy}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ansitz speichern"
            style={[styles.primaryButton, isSubmitting ? styles.buttonDisabled : null]}
            onPress={() => void handleSubmit()}
            disabled={isSubmitting}
          >
            {isSubmitting ? <ActivityIndicator color={theme.surface} /> : <Text style={styles.primaryButtonText}>Ansitz speichern</Text>}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ansitz-Warteschlange senden"
            style={[styles.secondaryButton, queue.isSyncing ? styles.buttonDisabled : null]}
            onPress={() => void handleQueueSync()}
            disabled={queue.isSyncing}
          >
            <Text style={styles.secondaryButtonText}>{queue.isSyncing ? "Wird gesendet..." : "Warteschlange senden"}</Text>
          </Pressable>
        </View>
      </View>

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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ansitze aktualisieren"
          style={[styles.refreshButton, isRefreshing ? styles.buttonDisabled : null]}
          onPress={() => void loadAnsitze({ refreshing: true })}
          disabled={isRefreshing}
        >
          {isRefreshing ? <ActivityIndicator color={theme.ink} /> : <Text style={styles.refreshButtonText}>Aktualisieren</Text>}
        </Pressable>
      </View>

      <View style={styles.filterSection}>
        <SearchInput
          value={filter.search}
          onChangeText={(text) => setFilter((current) => ({ ...current, search: text }))}
          placeholder="Suche Standort, Lagebezeichnung oder Notiz ..."
          accessibilityLabel="Ansitze durchsuchen"
        />
        <View style={styles.filterGroup}>
          <Text style={styles.filterEyebrow}>Konflikt</Text>
          <FilterChipRow<AnsitzKonfliktFilter>
            value={filter.konflikt}
            onChange={(key) => setFilter((current) => ({ ...current, konflikt: key }))}
            accessibilityLabel="Konflikt-Status filtern"
            options={[
              { key: "alle", label: "Alle" },
              { key: "mit-konflikt", label: "Mit Konflikt" },
              { key: "ohne-konflikt", label: "Ohne Konflikt" }
            ]}
          />
        </View>
        <View style={styles.filterGroup}>
          <Text style={styles.filterEyebrow}>Zeitraum</Text>
          <FilterChipRow<AnsitzZeitraumFilter>
            value={filter.zeitraum}
            onChange={(key) => setFilter((current) => ({ ...current, zeitraum: key }))}
            accessibilityLabel="Zeitraum filtern"
            options={[
              { key: "alle", label: "Alle" },
              { key: "heute", label: "Heute" },
              { key: "woche", label: "7 Tage" }
            ]}
          />
        </View>
        <View style={styles.filterGroup}>
          <Text style={styles.filterEyebrow}>Sortierung</Text>
          <FilterChipRow<AnsitzSortKey>
            value={filter.sort}
            onChange={(key) => setFilter((current) => ({ ...current, sort: key }))}
            accessibilityLabel="Sortierung waehlen"
            options={[
              { key: "neueste-zuerst", label: "Neueste zuerst" },
              { key: "aelteste-zuerst", label: "Älteste zuerst" },
              { key: "nach-standort", label: "Nach Standort" }
            ]}
          />
        </View>
        {filterActive ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Filter zurücksetzen"
            onPress={() => setFilter(DEFAULT_ANSITZ_FILTER)}
            style={styles.filterReset}
          >
            <Text style={styles.filterResetText}>
              Filter zurücksetzen ({visibleAnsitze.length}/{ansitze.length})
            </Text>
          </Pressable>
        ) : null}
      </View>

      {isLoading ? (
        <StateView
          mode="loading"
          title="Ansitze werden geladen"
          description="Die aktuelle Liste wird von der API abgefragt."
        />
      ) : null}

      {queueEntries.length > 0 ? (
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>Offline-Vormerkungen</Text>
          {queueEntries.slice(0, 2).map((entry) => (
            <View key={entry.id} style={styles.queueRow}>
              <Text style={styles.queueRowTitle}>{entry.title}</Text>
              <Text style={styles.queueRowCopy}>
                {entry.status}
                {entry.lastError ? ` / ${entry.lastError}` : ""}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {mode === "karte" && !isLoading ? (
        <EntityMap
          pins={pins}
          pinColor={theme.accent}
          height={MAP_HEIGHT}
          onPinPress={(pin) => {
            const target = visibleAnsitze.find((entry) => entry.id === pin.id);
            if (target) {
              setSelectedPin({ type: "ansitz", data: target });
            }
          }}
        />
      ) : null}

      {mode === "liste" ? (
        <ScrollView
          nestedScrollEnabled
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void loadAnsitze({ refreshing: true })}
            />
          }
          contentContainerStyle={styles.listContent}
          style={styles.listScroll}
        >
          {!isLoading && !error && visibleAnsitze.length === 0 ? (
            <StateView
              mode="empty"
              title={ansitze.length === 0 ? "Keine aktiven Ansitze" : "Keine Treffer"}
              description={
                ansitze.length === 0
                  ? "Sobald ein Jäger einen Ansitz meldet, erscheint er hier."
                  : "Mit den aktuellen Filtern findet sich kein Ansitz. Filter zurücksetzen oder Suchbegriff anpassen."
              }
            />
          ) : null}

          {visibleAnsitze.map((entry) => (
            <View key={entry.id} style={styles.card}>
              <View style={styles.row}>
                <View style={styles.grow}>
                  <Text style={styles.title}>{entry.standortName}</Text>
                  <Text style={styles.copy}>{entry.location.label ?? "Ohne Standort"}</Text>
                </View>
                <Badge tone={entry.conflict ? "danger" : "success"}>{entry.conflict ? "Warnung" : "Aktiv"}</Badge>
              </View>

              <Text style={styles.copy}>Beginn: {formatDateTime(entry.startedAt)}</Text>
              {entry.plannedEndAt ? (
                <Text style={styles.copy}>Geplant bis: {formatDateTime(entry.plannedEndAt)}</Text>
              ) : null}
              <Text style={styles.copy}>{entry.note ?? "Keine Notiz"}</Text>
            </View>
          ))}
        </ScrollView>
      ) : null}

      <PinDetailSheet
        pin={selectedPin}
        onClose={() => setSelectedPin(null)}
        // Detail-Tap aus dem Pin-Sheet: zurueck zur Liste, das Sheet zu.
        onOpenDetails={() => {
          setSelectedPin(null);
          setMode("liste");
        }}
      />
    </ScreenShell>
  );
}

function updateField(
  setForm: Dispatch<SetStateAction<AnsitzFormState>>,
  key: keyof AnsitzFormState
) {
  return (value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };
}

function buildAnsitzPayload(form: AnsitzFormState): CreateAnsitzRequest {
  const standortName = form.standortName.trim();

  if (!standortName) {
    throw new Error("Bitte einen Standortnamen eingeben.");
  }

  return {
    standortName,
    location: buildGeoPoint(form.lat, form.lng, form.locationLabel, "Mobil gemeldet"),
    startedAt: new Date().toISOString(),
    note: trimToUndefined(form.note)
  };
}

const createStyles = (theme: ThemeColors) =>
  ({
  listScroll: {
    maxHeight: 520
  },
  toolbar: {
    flexDirection: "row",
    flexWrap: "wrap",
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
  filterEyebrow: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    color: theme.muted,
    fontWeight: "700"
  },
  filterReset: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: theme.accent
  },
  filterResetText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff9ef"
  },
  refreshButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: theme.card
  },
  refreshButtonText: {
    color: theme.ink,
    fontWeight: "600"
  },
  buttonDisabled: {
    opacity: 0.7
  },
  listContent: {
    gap: 12,
    paddingBottom: 24
  },
  formCard: {
    gap: 14,
    padding: 18,
    borderRadius: 22,
    backgroundColor: theme.card
  },
  sectionLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    color: theme.muted
  },
  sectionCopy: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.muted
  },
  fieldRow: {
    flexDirection: "row",
    gap: 12
  },
  field: {
    gap: 6
  },
  grow: {
    flex: 1
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
  textArea: {
    minHeight: 90,
    paddingTop: 12,
    textAlignVertical: "top"
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  primaryButton: {
    minHeight: 52,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: theme.accent
  },
  primaryButtonText: {
    color: theme.surface,
    fontSize: 16,
    fontWeight: "700"
  },
  secondaryButton: {
    minHeight: 52,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#e3dccd"
  },
  secondaryButtonText: {
    color: theme.ink,
    fontSize: 15,
    fontWeight: "600"
  },
  stateCard: {
    gap: 6,
    padding: 18,
    borderRadius: 22,
    backgroundColor: theme.card
  },
  infoCard: {
    gap: 6,
    padding: 18,
    borderRadius: 22,
    backgroundColor: "#efe3d1"
  },
  errorCard: {
    gap: 6,
    padding: 18,
    borderRadius: 22,
    backgroundColor: "#f0d9d4"
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.ink
  },
  stateCopy: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.muted
  },
  card: {
    gap: 10,
    padding: 18,
    borderRadius: 22,
    backgroundColor: theme.card
  },
  row: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start"
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.ink
  },
  copy: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.muted
  },
  queueRow: {
    gap: 2
  },
  queueRowTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.ink
  },
  queueRowCopy: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.muted
  }
}) as const;
