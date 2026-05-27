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
import type { AufgabeListItem, CreateReviermeldungRequest, ReviermeldungListItem } from "../../lib/api";
import type {
  AufgabePrioritaet,
  AufgabeStatus,
  ReviermeldungKategorie,
  ReviermeldungStatus
} from "@hege/domain";

import { EntityMap, type EntityPin } from "../../components/entity-map";
import { FilterChipRow } from "../../components/filter-chip-row";
import { PinDetailSheet, type SelectedPin } from "../../components/pin-detail-sheet";
import { ScreenShell } from "../../components/screen-shell";
import { SearchInput } from "../../components/search-input";
import { ViewToggle } from "../../components/view-toggle";
import {
  createAufgabe,
  createReviermeldung,
  fetchAufgabenList,
  fetchReviermeldungenList,
  updateAufgabe,
  updateReviermeldung
} from "../../lib/api";
import {
  applyAufgabeFilter,
  DEFAULT_AUFGABE_FILTER,
  isAufgabeFilterActive,
  OFFEN_STATUSES,
  type AufgabeFilterState,
  type AufgabePrioritaetFilter,
  type AufgabeSortKey,
  type AufgabeStatusFilter
} from "../../lib/aufgabe-filter.helpers";
import { formatDateTime } from "../../lib/format";
import { buildGeoPoint, trimToUndefined } from "../../lib/form-utils";
import {
  buildReviermeldungPins,
  formatReviermeldungCategoryLabel,
  formatReviermeldungStatusLabel,
  formatRevierResourceTypeLabel,
  REVIERMELDUNG_STATUS_LABELS
} from "../../lib/revierarbeit-map.helpers";
import { useThemeColors, type ThemeColors } from "../../lib/theme";
import { useThemedStyles } from "../../lib/use-themed-styles";

type ViewMode = "liste" | "karte";
const MAP_HEIGHT = 380;

interface ReviermeldungFormState {
  category: ReviermeldungKategorie;
  title: string;
  description: string;
  locationLabel: string;
  lat: string;
  lng: string;
}

const DEFAULT_FORM: ReviermeldungFormState = {
  category: "schaden",
  title: "",
  description: "",
  locationLabel: "",
  lat: "",
  lng: ""
};

const CATEGORIES: Array<{
  value: ReviermeldungKategorie;
  label: string;
}> = [
  { value: "schaden", label: "Schaden" },
  { value: "gefahr", label: "Gefahr" },
  { value: "sichtung", label: "Sichtung" },
  { value: "reviereinrichtung", label: "Einrichtung" },
  { value: "fuetterung", label: "Fütterung" },
  { value: "wasserung", label: "Wässerung" },
  { value: "sonstiges", label: "Sonstiges" }
];

/**
 * Default-Prioritaet je Reviermeldung-Kategorie. Gleiches Mapping wie
 * im Web (#98), damit Mobile-erzeugte Aufgaben dieselben Prioritaeten
 * bekommen wie Backoffice-erzeugte. Wer feiner steuern will, bearbeitet
 * die Aufgabe danach in der Aufgaben-Liste.
 */
/**
 * Auswahlbare Reviermeldungs-Status-Transitions im Mobile-Card-Pickers.
 * Gleiche Liste wie Web #102 — natuerlicher Workflow neu -> geprueft ->
 * in_bearbeitung -> erledigt / verworfen. 'archiviert' bleibt
 * draussen, das ist eine Admin-Operation.
 */
const MELDUNG_STATUS_TRANSITIONS: ReadonlyArray<ReviermeldungStatus> = [
  "neu",
  "geprueft",
  "in_bearbeitung",
  "erledigt",
  "verworfen"
];

const KATEGORIE_TO_PRIORITAET: Record<ReviermeldungKategorie, AufgabePrioritaet> = {
  gefahr: "dringend",
  schaden: "hoch",
  reviereinrichtung: "normal",
  fuetterung: "normal",
  wasserung: "normal",
  sonstiges: "normal",
  sichtung: "niedrig"
};

export default function RevierarbeitScreen() {
  const styles = useThemedStyles(createStyles);
  const theme = useThemeColors();
  const [form, setForm] = useState<ReviermeldungFormState>(DEFAULT_FORM);
  const [aufgaben, setAufgaben] = useState<AufgabeListItem[]>([]);
  const [meldungen, setMeldungen] = useState<ReviermeldungListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [convertingMeldungId, setConvertingMeldungId] = useState<string | null>(null);
  const [updatingMeldungStatusId, setUpdatingMeldungStatusId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ViewMode>("karte");
  const [selectedPin, setSelectedPin] = useState<SelectedPin | null>(null);
  const [aufgabeFilter, setAufgabeFilter] = useState<AufgabeFilterState>(DEFAULT_AUFGABE_FILTER);

  const visibleAufgaben = useMemo(
    () => applyAufgabeFilter(aufgaben, aufgabeFilter),
    [aufgaben, aufgabeFilter]
  );
  const aufgabeFilterActive = useMemo(
    () => isAufgabeFilterActive(aufgabeFilter),
    [aufgabeFilter]
  );
  const meldungPins: ReadonlyArray<EntityPin> = useMemo(
    () => buildReviermeldungPins(meldungen),
    [meldungen]
  );

  // Counts pro Status-Bucket fuer die Chip-Labels. Wenn offen+erledigt <
  // alle ist, sieht der User direkt, dass abgelehnte/archivierte
  // Aufgaben unter "Alle" versteckt sind und kann gezielt darauf
  // wechseln.
  const aufgabeStatusCounts = useMemo(() => {
    let offen = 0;
    let erledigt = 0;
    for (const entry of aufgaben) {
      if (entry.status === "erledigt") {
        erledigt += 1;
      } else if (OFFEN_STATUSES.includes(entry.status)) {
        offen += 1;
      }
    }
    return { offen, erledigt, alle: aufgaben.length };
  }, [aufgaben]);

  useEffect(() => {
    void loadRevierarbeit();
  }, []);

  async function loadRevierarbeit(options?: { refreshing?: boolean }) {
    const refreshing = options?.refreshing ?? false;

    if (refreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError(null);

    try {
      const [nextMeldungen, nextAufgaben] = await Promise.all([
        fetchReviermeldungenList(),
        fetchAufgabenList()
      ]);
      setMeldungen(nextMeldungen);
      setAufgaben(nextAufgaben);
    } catch (fetchError) {
      setMeldungen([]);
      setAufgaben([]);
      setError(fetchError instanceof Error ? fetchError.message : "Revierarbeit konnte nicht geladen werden.");
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
      await createReviermeldung(buildReviermeldungPayload(form));
      setMessage("Reviermeldung gespeichert.");
      setForm(DEFAULT_FORM);
      await loadRevierarbeit({ refreshing: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Reviermeldung konnte nicht gespeichert werden.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleTaskStatus(aufgabeId: string, status: AufgabeStatus) {
    setUpdatingTaskId(aufgabeId);
    setMessage(null);
    setError(null);

    try {
      await updateAufgabe(aufgabeId, { status });
      setMessage(status === "erledigt" ? "Aufgabe erledigt." : "Aufgabe aktualisiert.");
      await loadRevierarbeit({ refreshing: true });
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Aufgabe konnte nicht aktualisiert werden.");
    } finally {
      setUpdatingTaskId(null);
    }
  }

  /**
   * One-Click-Konversion einer Reviermeldung in eine Aufgabe. Mobile-
   * Pendant zur Web-Konversion (#98): gleiches Prioritaets-Mapping,
   * gleicher Tradeoff (kein editierbares Modal vor Submit). Jaeger im
   * Feld sieht damit eine Schaden-Meldung und kann direkt eine
   * Aufgabe daraus generieren, ohne ins Backoffice zu wechseln.
   *
   * Nach Erfolg: refresh, damit die neue Aufgabe oben in der
   * "Meine Aufgaben"-Liste auftaucht (Default-Sort: faellig-zuerst,
   * neue Aufgabe ohne dueAt landet weiter unten — aber sie ist da).
   */
  async function handleConvertToAufgabe(meldung: ReviermeldungListItem) {
    if (convertingMeldungId) return;

    setConvertingMeldungId(meldung.id);
    setMessage(null);
    setError(null);

    try {
      await createAufgabe({
        title: meldung.title,
        description: meldung.description || undefined,
        priority: KATEGORIE_TO_PRIORITAET[meldung.category] ?? "normal",
        sourceType: "reviermeldung",
        sourceId: meldung.id
      });
      setMessage(`Aufgabe „${meldung.title}" wurde angelegt.`);
      await loadRevierarbeit({ refreshing: true });
    } catch (conversionError) {
      setError(
        conversionError instanceof Error
          ? conversionError.message
          : "Aufgabe konnte nicht aus der Meldung angelegt werden."
      );
    } finally {
      setConvertingMeldungId(null);
    }
  }

  /**
   * Status einer Reviermeldung aendern. Mobile-Pendant zu Web #102 —
   * gleicher Endpoint, gleiches Behavior. Im Feld primaer fuer Jaeger,
   * der eine Meldung als 'geprueft' markieren will, nachdem er den
   * gemeldeten Schaden vor Ort verifiziert hat.
   */
  async function handleMeldungStatusChange(
    meldungId: string,
    next: ReviermeldungStatus
  ) {
    if (updatingMeldungStatusId) return;

    setUpdatingMeldungStatusId(meldungId);
    setMessage(null);
    setError(null);

    try {
      await updateReviermeldung(meldungId, { status: next });
      setMessage(`Meldungsstatus aktualisiert: ${REVIERMELDUNG_STATUS_LABELS[next]}.`);
      await loadRevierarbeit({ refreshing: true });
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? statusError.message
          : "Status konnte nicht geändert werden."
      );
    } finally {
      setUpdatingMeldungStatusId(null);
    }
  }

  const openTaskCount = aufgaben.filter((entry) => !["erledigt", "abgelehnt", "archiviert"].includes(entry.status)).length;

  return (
    <ScreenShell
      eyebrow="Revierarbeit"
      title="Meldungen und Aufgaben dort festhalten, wo sie entstehen."
      subtitle="Reviermeldungen gehen direkt an die API. Aufgaben zeigen, was für dich oder das Revier offen ist."
      aside={
        <View style={styles.asideCard}>
          <Text style={styles.asideLabel}>Offene Aufgaben</Text>
          <Text style={styles.asideValue}>{openTaskCount}</Text>
          <Text style={styles.asideCopy}>{meldungen.length} Reviermeldungen im aktuellen Revier.</Text>
        </View>
      }
    >
      <View style={styles.formCard}>
        <Text style={styles.sectionLabel}>Neue Reviermeldung</Text>
        <Text style={styles.sectionCopy}>Kurztext reicht. Standort ist optional; Fotos folgen im nächsten Medien-Slice.</Text>

        <View style={styles.chipGrid}>
          {CATEGORIES.map((category) => (
            <Pressable
              key={category.value}
              accessibilityRole="button"
              accessibilityLabel={`Kategorie ${category.label}`}
              style={[styles.chip, form.category === category.value ? styles.chipActive : null]}
              onPress={() => setForm((current) => ({ ...current, category: category.value }))}
            >
              <Text style={[styles.chipText, form.category === category.value ? styles.chipTextActive : null]}>
                {category.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Kurztext</Text>
          <TextInput
            autoCapitalize="sentences"
            placeholder="Zaun beschädigt, Wildsichtung, Gefahr am Weg..."
            placeholderTextColor={theme.muted}
            style={styles.input}
            value={form.title}
            onChangeText={updateField(setForm, "title")}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Details</Text>
          <TextInput
            multiline
            placeholder="Was ist passiert? Was sollen andere wissen?"
            placeholderTextColor={theme.muted}
            style={[styles.input, styles.textArea]}
            value={form.description}
            onChangeText={updateField(setForm, "description")}
          />
        </View>

        <View style={styles.fieldRow}>
          <View style={[styles.field, styles.grow]}>
            <Text style={styles.label}>Breitengrad</Text>
            <TextInput
              keyboardType="decimal-pad"
              placeholder="optional"
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
              placeholder="optional"
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
            placeholder="z. B. Feldweg Süd"
            placeholderTextColor={theme.muted}
            style={styles.input}
            value={form.locationLabel}
            onChangeText={updateField(setForm, "locationLabel")}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reviermeldung speichern"
          style={[styles.primaryButton, isSubmitting ? styles.buttonDisabled : null]}
          onPress={() => void handleSubmit()}
          disabled={isSubmitting}
        >
          {isSubmitting ? <ActivityIndicator color={theme.surface} /> : <Text style={styles.primaryButtonText}>Meldung speichern</Text>}
        </Pressable>
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
          accessibilityLabel="Revierarbeit aktualisieren"
          style={[styles.refreshButton, isRefreshing ? styles.buttonDisabled : null]}
          onPress={() => void loadRevierarbeit({ refreshing: true })}
          disabled={isRefreshing}
        >
          {isRefreshing ? <ActivityIndicator color={theme.ink} /> : <Text style={styles.refreshButtonText}>Aktualisieren</Text>}
        </Pressable>
      </View>

      {message ? (
        <View style={styles.infoCard}>
          <Text style={styles.stateTitle}>Status</Text>
          <Text style={styles.stateCopy}>{message}</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.stateTitle}>Revierarbeit nicht verfügbar</Text>
          <Text style={styles.stateCopy}>{error}</Text>
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>Revierarbeit wird geladen</Text>
          <Text style={styles.stateCopy}>Meldungen und Aufgaben werden von der API abgefragt.</Text>
        </View>
      ) : null}

      {mode === "karte" && !isLoading ? (
        <>
          <EntityMap
            pins={meldungPins}
            pinColor={theme.danger}
            height={MAP_HEIGHT}
            onPinPress={(pin) => {
              const target = meldungen.find((entry) => entry.id === pin.id);
              if (target) {
                setSelectedPin({ type: "reviermeldung", data: target });
              }
            }}
          />
          {meldungPins.length === 0 && !isLoading && !error ? (
            <View style={styles.stateCard}>
              <Text style={styles.stateTitle}>Keine Standorte</Text>
              <Text style={styles.stateCopy}>
                Reviermeldungen ohne Koordinaten bleiben in der Liste sichtbar. Sobald ein Standort
                erfasst ist, erscheint er als Pin in der Karte.
              </Text>
            </View>
          ) : null}
        </>
      ) : null}

      {mode === "liste" ? (
        <ScrollView
          nestedScrollEnabled
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => void loadRevierarbeit({ refreshing: true })} />
          }
          contentContainerStyle={styles.listContent}
          style={styles.listScroll}
        >
          <Text style={styles.listHeadline}>Meine Aufgaben</Text>

        {!isLoading && aufgaben.length > 0 ? (
          <View style={styles.filterSection}>
            <SearchInput
              value={aufgabeFilter.search}
              onChangeText={(text) =>
                setAufgabeFilter((current) => ({ ...current, search: text }))
              }
              placeholder="Suche Titel, Details oder Notiz ..."
              accessibilityLabel="Aufgaben durchsuchen"
            />
            <View style={styles.filterGroup}>
              <Text style={styles.filterEyebrow}>Status</Text>
              <FilterChipRow<AufgabeStatusFilter>
                value={aufgabeFilter.status}
                onChange={(key) => setAufgabeFilter((current) => ({ ...current, status: key }))}
                accessibilityLabel="Aufgaben-Status filtern"
                options={[
                  { key: "offen", label: "Offen", count: aufgabeStatusCounts.offen },
                  { key: "erledigt", label: "Erledigt", count: aufgabeStatusCounts.erledigt },
                  { key: "alle", label: "Alle", count: aufgabeStatusCounts.alle }
                ]}
              />
            </View>
            <View style={styles.filterGroup}>
              <Text style={styles.filterEyebrow}>Priorität</Text>
              <FilterChipRow<AufgabePrioritaetFilter>
                value={aufgabeFilter.prioritaet}
                onChange={(key) =>
                  setAufgabeFilter((current) => ({ ...current, prioritaet: key }))
                }
                accessibilityLabel="Priorität filtern"
                options={[
                  { key: "alle", label: "Alle" },
                  { key: "dringend", label: "Dringend" },
                  { key: "hoch", label: "Hoch" },
                  { key: "normal", label: "Normal" },
                  { key: "niedrig", label: "Niedrig" }
                ]}
              />
            </View>
            <View style={styles.filterGroup}>
              <Text style={styles.filterEyebrow}>Sortierung</Text>
              <FilterChipRow<AufgabeSortKey>
                value={aufgabeFilter.sort}
                onChange={(key) => setAufgabeFilter((current) => ({ ...current, sort: key }))}
                accessibilityLabel="Sortierung wählen"
                options={[
                  { key: "faellig-zuerst", label: "Fällig zuerst" },
                  { key: "prioritaet-hoch", label: "Wichtig zuerst" },
                  { key: "neueste-zuerst", label: "Neueste zuerst" },
                  { key: "alphabetisch", label: "A-Z" }
                ]}
              />
            </View>
            {aufgabeFilterActive ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Filter zurücksetzen"
                onPress={() => setAufgabeFilter(DEFAULT_AUFGABE_FILTER)}
                style={styles.filterReset}
              >
                <Text style={styles.filterResetText}>
                  Filter zurücksetzen ({visibleAufgaben.length}/{aufgaben.length})
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {!isLoading && aufgaben.length === 0 ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Keine Aufgaben</Text>
            <Text style={styles.stateCopy}>Zugewiesene oder eigene Aufgaben erscheinen hier.</Text>
          </View>
        ) : null}

        {!isLoading && aufgaben.length > 0 && visibleAufgaben.length === 0 ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Keine Treffer</Text>
            <Text style={styles.stateCopy}>
              Mit den aktuellen Filtern findet sich keine Aufgabe. Filter zurücksetzen oder
              Suchbegriff anpassen.
            </Text>
          </View>
        ) : null}

        {visibleAufgaben.map((entry) => (
          <View key={entry.id} style={styles.card}>
            <View style={styles.row}>
              <View style={styles.grow}>
                <Text style={styles.badgeText}>{`${formatPriorityLabel(entry.priority)} / ${formatTaskStatusLabel(entry.status)}`}</Text>
                <Text style={styles.title}>{entry.title}</Text>
              </View>
              <View style={getTaskBadgeStyle(styles, entry.status)}>
                <Text style={getTaskBadgeTextStyle(styles, entry.status)}>
                  {formatTaskStatusLabel(entry.status)}
                </Text>
              </View>
            </View>
            {entry.description ? <Text style={styles.copy}>{entry.description}</Text> : null}
            {entry.dueAt ? <Text style={styles.copy}>Fällig: {formatDateTime(entry.dueAt)}</Text> : null}
            {entry.sourceType ? (
              <Text style={styles.copy}>Bezug: {formatRevierResourceTypeLabel(entry.sourceType)}</Text>
            ) : null}
            <View style={styles.actionRow}>
              {entry.status !== "in_arbeit" && entry.status !== "erledigt" ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Aufgabe ${entry.title} in Arbeit setzen`}
                  style={[styles.secondaryButton, updatingTaskId === entry.id ? styles.buttonDisabled : null]}
                  onPress={() => void handleTaskStatus(entry.id, "in_arbeit")}
                  disabled={updatingTaskId === entry.id}
                >
                  <Text style={styles.secondaryButtonText}>In Arbeit</Text>
                </Pressable>
              ) : null}
              {entry.status !== "erledigt" ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Aufgabe ${entry.title} erledigen`}
                  style={[styles.secondaryButton, updatingTaskId === entry.id ? styles.buttonDisabled : null]}
                  onPress={() => void handleTaskStatus(entry.id, "erledigt")}
                  disabled={updatingTaskId === entry.id}
                >
                  <Text style={styles.secondaryButtonText}>Erledigen</Text>
                </Pressable>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Aufgabe ${entry.title} wieder öffnen`}
                  style={[styles.secondaryButton, updatingTaskId === entry.id ? styles.buttonDisabled : null]}
                  onPress={() => void handleTaskStatus(entry.id, "offen")}
                  disabled={updatingTaskId === entry.id}
                >
                  <Text style={styles.secondaryButtonText}>Wieder öffnen</Text>
                </Pressable>
              )}
            </View>
          </View>
        ))}

        <Text style={styles.listHeadline}>Letzte Reviermeldungen</Text>
        {!isLoading && meldungen.length === 0 ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Keine Meldungen</Text>
            <Text style={styles.stateCopy}>Neue Hinweise aus dem Revier erscheinen hier.</Text>
          </View>
        ) : null}

          {meldungen.slice(0, 6).map((entry) => (
          <View key={entry.id} style={styles.card}>
            <Text style={styles.badgeText}>{`${formatReviermeldungCategoryLabel(entry.category)} / ${formatReviermeldungStatusLabel(entry.status)}`}</Text>
            <Text style={styles.title}>{entry.title}</Text>
            {entry.description ? <Text style={styles.copy}>{entry.description}</Text> : null}
            <Text style={styles.copy}>Zeitpunkt: {formatDateTime(entry.occurredAt)}</Text>
            {entry.location ? <Text style={styles.copy}>Standort: {entry.location.label ?? `${entry.location.lat}, ${entry.location.lng}`}</Text> : null}
            {entry.status !== "erledigt" && entry.status !== "archiviert" ? (
              <View style={styles.actionRow}>
                {MELDUNG_STATUS_TRANSITIONS.filter((status) => status !== entry.status).map(
                  (status) => (
                    <Pressable
                      key={status}
                      accessibilityRole="button"
                      accessibilityLabel={`Meldung auf ${REVIERMELDUNG_STATUS_LABELS[status]} setzen`}
                      style={[
                        styles.secondaryButton,
                        updatingMeldungStatusId === entry.id ? styles.buttonDisabled : null
                      ]}
                      onPress={() => void handleMeldungStatusChange(entry.id, status)}
                      disabled={updatingMeldungStatusId === entry.id}
                    >
                      <Text style={styles.secondaryButtonText}>
                        → {REVIERMELDUNG_STATUS_LABELS[status]}
                      </Text>
                    </Pressable>
                  )
                )}
              </View>
            ) : null}
            <View style={styles.actionRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Aufgabe aus Meldung "${entry.title}" anlegen`}
                style={[
                  styles.secondaryButton,
                  convertingMeldungId === entry.id ? styles.buttonDisabled : null
                ]}
                onPress={() => void handleConvertToAufgabe(entry)}
                disabled={convertingMeldungId === entry.id}
              >
                <Text style={styles.secondaryButtonText}>
                  {convertingMeldungId === entry.id ? "Wird angelegt …" : "Aufgabe daraus anlegen"}
                </Text>
              </Pressable>
            </View>
          </View>
          ))}
        </ScrollView>
      ) : null}

      <PinDetailSheet
        pin={selectedPin}
        onClose={() => setSelectedPin(null)}
        onOpenDetails={() => {
          setSelectedPin(null);
          setMode("liste");
        }}
      />
    </ScreenShell>
  );
}

function updateField(
  setForm: Dispatch<SetStateAction<ReviermeldungFormState>>,
  key: keyof ReviermeldungFormState
) {
  return (value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };
}

function buildReviermeldungPayload(form: ReviermeldungFormState): CreateReviermeldungRequest {
  const title = form.title.trim();

  if (!title) {
    throw new Error("Bitte einen Kurztext eingeben.");
  }

  const hasLat = form.lat.trim().length > 0;
  const hasLng = form.lng.trim().length > 0;

  if (hasLat !== hasLng) {
    throw new Error("Bitte Breitengrad und Längengrad gemeinsam eingeben oder beide leer lassen.");
  }

  return {
    category: form.category,
    title,
    description: trimToUndefined(form.description),
    occurredAt: new Date().toISOString(),
    location: hasLat && hasLng ? buildGeoPoint(form.lat, form.lng, form.locationLabel, "Mobil gemeldet") : undefined
  };
}

function formatTaskStatusLabel(value: AufgabeStatus) {
  switch (value) {
    case "offen":
      return "Offen";
    case "angenommen":
      return "Angenommen";
    case "in_arbeit":
      return "In Arbeit";
    case "blockiert":
      return "Blockiert";
    case "erledigt":
      return "Erledigt";
    case "abgelehnt":
      return "Abgelehnt";
    case "archiviert":
      return "Archiviert";
    default:
      return value;
  }
}

function getTaskBadgeStyle(styles: ReturnType<typeof createStyles>, status: AufgabeStatus) {
  if (status === "erledigt") {
    return styles.okBadge;
  }

  if (status === "in_arbeit" || status === "angenommen") {
    return styles.infoBadge;
  }

  if (status === "blockiert" || status === "abgelehnt") {
    return styles.errorBadge;
  }

  return styles.warningBadge;
}

function getTaskBadgeTextStyle(styles: ReturnType<typeof createStyles>, status: AufgabeStatus) {
  if (status === "erledigt") {
    return styles.okText;
  }

  if (status === "in_arbeit" || status === "angenommen") {
    return styles.infoText;
  }

  if (status === "blockiert" || status === "abgelehnt") {
    return styles.errorText;
  }

  return styles.warningText;
}

function formatPriorityLabel(value: AufgabeListItem["priority"]) {
  switch (value) {
    case "niedrig":
      return "Niedrig";
    case "normal":
      return "Normal";
    case "hoch":
      return "Hoch";
    case "dringend":
      return "Dringend";
    default:
      return value;
  }
}

const createStyles = (theme: ThemeColors) =>
  ({
  listScroll: {
    maxHeight: 720
  },
  listContent: {
    gap: 12,
    paddingBottom: 24
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
  asideCard: {
    gap: 6,
    padding: 12,
    borderRadius: 14,
    backgroundColor: theme.accent
  },
  asideLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    fontWeight: "700",
    color: "#f7f2e5"
  },
  asideValue: {
    fontSize: 26,
    fontWeight: "700",
    color: "#fff9ef"
  },
  asideCopy: {
    fontSize: 12,
    lineHeight: 16,
    color: "#f7f2e5"
  },
  toolbar: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 10
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
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "#e3dccd"
  },
  chipActive: {
    backgroundColor: theme.accent
  },
  chipText: {
    color: theme.ink,
    fontWeight: "600"
  },
  chipTextActive: {
    color: theme.surface
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
    minHeight: 44,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#e3dccd"
  },
  secondaryButtonText: {
    color: theme.ink,
    fontSize: 14,
    fontWeight: "600"
  },
  buttonDisabled: {
    opacity: 0.7
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
  listHeadline: {
    marginTop: 6,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2,
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
  badgeText: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    color: theme.muted
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  okBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#dde7cf"
  },
  infoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#dce6df"
  },
  warningBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#efe3d1"
  },
  errorBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#f0d9d4"
  },
  okText: {
    color: theme.accent,
    fontWeight: "700"
  },
  infoText: {
    color: theme.ink,
    fontWeight: "700"
  },
  warningText: {
    color: theme.warning,
    fontWeight: "700"
  },
  errorText: {
    color: theme.danger,
    fontWeight: "700"
  }
}) as const;
