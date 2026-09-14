import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { canRoleAccess, type ReviereinrichtungListItem } from "@hege/domain";
import { spacing } from "@hege/tokens";
import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { Badge } from "../../components/badge";
import { EntityMap, type EntityPin } from "../../components/entity-map";
import { FeedbackBanner } from "../../components/feedback-banner";
import { FacilityPhotoHero } from "../../components/facility-photo-hero";
import { FilterChipRow } from "../../components/filter-chip-row";
import { PinDetailSheet, type SelectedPin } from "../../components/pin-detail-sheet";
import { QueueStatusPill } from "../../components/queue-status-pill";
import { ScreenShell } from "../../components/screen-shell";
import { SearchInput } from "../../components/search-input";
import { SelectField } from "../../components/select-field";
import { StateView } from "../../components/state-view";
import { ViewToggle } from "../../components/view-toggle";
import { fetchReviereinrichtungenList } from "../../lib/api";
import { formatDateTime, formatEinrichtungZustand } from "../../lib/format";
import {
  discardOfflineQueueEntry,
  retryOfflineQueueEntry,
  syncOfflineQueue,
  useOfflineQueueSnapshot,
  type OfflineReviereinrichtungOperation
} from "../../lib/offline-queue";
import {
  getOfflineQueueEntryStatusLine,
  summarizeOfflineQueue
} from "../../lib/offline-queue-status";
import {
  EINRICHTUNG_TYP_OPTIONS,
  formatDirection,
  formatEinrichtungTyp,
  isAnsitzeinrichtung,
  isFuetterungseinrichtung,
  supportsOrientation
} from "../../lib/reviereinrichtung";
import {
  buildReviereinrichtungPayload,
  DEFAULT_REVIEREINRICHTUNG_FORM,
  type ReviereinrichtungFormState
} from "../../lib/reviereinrichtung-form";
import {
  applyReviereinrichtungFilter,
  DEFAULT_REVIEREINRICHTUNG_FILTER,
  isReviereinrichtungFilterActive,
  type EinrichtungTypFilter,
  type EinrichtungZustandFilter,
  type ReviereinrichtungFilterState,
  type ReviereinrichtungSortKey
} from "../../lib/reviereinrichtung-filter.helpers";
import {
  getRemainingReviereinrichtungPhotoSlots,
  limitReviereinrichtungPhotoAttachments,
  mergePickedReviereinrichtungPhotos,
  REVIEREINRICHTUNG_PHOTO_QUALITY,
  type LocalPendingPhoto
} from "../../lib/reviereinrichtung-photos";
import { submitReviereinrichtung } from "../../lib/reviereinrichtung-submission";
import { useSessionSnapshot } from "../../lib/session";
import { cardSurface } from "../../lib/surfaces";
import { useThemeColors, type ThemeColors } from "../../lib/theme";
import { eyebrowText } from "../../lib/typography";
import { useThemedStyles } from "../../lib/use-themed-styles";

type ViewMode = "liste" | "karte";
type CaptureSection = "erfassen" | "bestand";
type FeedbackState = { tone: "success" | "warning"; title: string; copy: string } | null;

const MAP_HEIGHT = 390;
const MAX_PHOTOS = 3;

export default function ReviereinrichtungenScreen() {
  const styles = useThemedStyles(createStyles);
  const theme = useThemeColors();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const session = useSessionSnapshot();
  const queue = useOfflineQueueSnapshot();
  const canCreate = session.session
    ? canRoleAccess(session.session.membership.role, "reviereinrichtungen-create")
    : false;
  const [entries, setEntries] = useState<ReviereinrichtungListItem[]>([]);
  const [form, setForm] = useState<ReviereinrichtungFormState>(DEFAULT_REVIEREINRICHTUNG_FORM);
  const [attachments, setAttachments] = useState<LocalPendingPhoto[]>([]);
  const [section, setSection] = useState<CaptureSection>(canCreate ? "erfassen" : "bestand");
  const [mode, setMode] = useState<ViewMode>("karte");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedPin, setSelectedPin] = useState<SelectedPin | null>(null);
  const [filter, setFilter] = useState<ReviereinrichtungFilterState>(DEFAULT_REVIEREINRICHTUNG_FILTER);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isReadingHeading, setIsReadingHeading] = useState(false);
  const [isPickingPhotos, setIsPickingPhotos] = useState(false);
  const [retryingEntryId, setRetryingEntryId] = useState<string | null>(null);
  const [discardingEntryId, setDiscardingEntryId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [queueError, setQueueError] = useState<string | null>(null);

  const queueEntries = queue.entries.filter(
    (entry) => entry.kind === "reviereinrichtung-create" || entry.kind === "reviereinrichtung-photo-upload"
  );
  const queueSummary = summarizeOfflineQueue(queueEntries);
  const pendingEntries = useMemo(
    () =>
      queueEntries
        .filter((entry): entry is OfflineReviereinrichtungOperation => entry.kind === "reviereinrichtung-create")
        .map(mapPendingEntry),
    [queueEntries]
  );
  const visibleEntries = useMemo(
    () => applyReviereinrichtungFilter([...pendingEntries, ...entries], filter),
    [entries, filter, pendingEntries]
  );
  const filterActive = useMemo(() => isReviereinrichtungFilterActive(filter), [filter]);
  const pins: ReadonlyArray<EntityPin> = useMemo(
    () =>
      visibleEntries.map((entry) => ({
        id: entry.id,
        kind: "einrichtung",
        location: entry.location,
        title: entry.name,
        subtitle: `${formatEinrichtungTyp(entry.type)} · ${formatEinrichtungZustand(entry.status)}`,
        color: entry.id.startsWith("offline-") ? theme.warning : theme.ink
      })),
    [theme.ink, theme.warning, visibleEntries]
  );
  const draftPin = useMemo<EntityPin | null>(() => {
    const lat = Number(form.lat.replace(",", "."));
    const lng = Number(form.lng.replace(",", "."));

    return form.lat.trim() && form.lng.trim() && Number.isFinite(lat) && Number.isFinite(lng)
      ? {
          id: "draft-reviereinrichtung",
          kind: "einrichtung",
          location: { lat, lng, label: form.locationLabel || form.name || "Neuer Standort" },
          title: form.name || "Neue Reviereinrichtung",
          color: theme.accent
        }
      : null;
  }, [form.lat, form.lng, form.locationLabel, form.name, theme.accent]);
  const photosDisabled = attachments.length >= MAX_PHOTOS || isPickingPhotos || isSubmitting;

  useEffect(() => {
    void loadEntries();
  }, []);

  useEffect(() => {
    if (!canCreate && section === "erfassen") {
      setSection("bestand");
    }
  }, [canCreate, section]);

  useEffect(() => {
    const synced = queue.lastSuccessfulSyncKinds.some(
      (kind) => kind === "reviereinrichtung-create" || kind === "reviereinrichtung-photo-upload"
    );

    if (!queue.lastSuccessfulSyncAt || !synced) {
      return;
    }

    const remaining = queue.entries.filter(
      (entry) => entry.kind === "reviereinrichtung-create" || entry.kind === "reviereinrichtung-photo-upload"
    ).length;
    setFeedback({
      tone: remaining === 0 ? "success" : "warning",
      title: remaining === 0 ? "Einrichtungen synchronisiert" : "Synchronisierung unvollständig",
      copy:
        remaining === 0
          ? "Alle vorgemerkten Reviereinrichtungen wurden übertragen."
          : `${remaining} Einträge warten weiter in der Warteschlange.`
    });
    void loadEntries({ refreshing: true });
  }, [queue.lastSuccessfulSyncAt]);

  async function loadEntries(options?: { refreshing?: boolean }) {
    const refreshing = options?.refreshing ?? false;
    refreshing ? setIsRefreshing(true) : setIsLoading(true);
    setLoadError(null);

    try {
      setEntries(await fetchReviereinrichtungenList());
    } catch {
      setLoadError("Die Einrichtungen konnten nicht geladen werden. Zum erneuten Laden nach unten ziehen.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  async function handleRefresh() {
    if (queueEntries.length > 0) {
      await syncOfflineQueue({ retryFailed: true }).catch(() => undefined);
    }
    await loadEntries({ refreshing: true });
  }

  async function handleSubmit() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setFeedback(null);
    setError(null);

    try {
      const photoSnapshot = limitReviereinrichtungPhotoAttachments(attachments);
      const result = await submitReviereinrichtung(buildReviereinrichtungPayload(form), photoSnapshot);
      setForm(DEFAULT_REVIEREINRICHTUNG_FORM);
      setLocationError(null);
      setAttachments([]);
      setSection("bestand");
      setMode("karte");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (result.mode === "queued") {
        setFeedback({
          tone: "warning",
          title: "Reviereinrichtung vorgemerkt",
          copy: "Der Standort ist bereits als gelber Pin sichtbar und wird automatisch übertragen."
        });
      } else if (result.mode === "partial") {
        setFeedback({
          tone: "warning",
          title: "Reviereinrichtung gespeichert",
          copy: `${result.uploadedCount} Fotos hochgeladen, ${result.queuedCount} warten auf die Übertragung.`
        });
      } else {
        setFeedback({
          tone: "success",
          title: "Reviereinrichtung gespeichert",
          copy: result.uploadedCount > 0 ? `${result.uploadedCount} Fotos wurden mitgespeichert.` : "Der neue Kartenpunkt ist verfügbar."
        });
      }

      await loadEntries({ refreshing: true });
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: false }));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Reviereinrichtung konnte nicht gespeichert werden.");
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUseCurrentLocation() {
    if (isLocating || isSubmitting) return;
    setIsLocating(true);
    setLocationError(null);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setLocationError("Erlaube den Standortzugriff in den Einstellungen oder tippe die Position direkt auf der Karte an.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setForm((current) => ({
        ...current,
        lat: position.coords.latitude.toFixed(6),
        lng: position.coords.longitude.toFixed(6),
        accuracyMeters:
          typeof position.coords.accuracy === "number" ? String(Math.round(position.coords.accuracy)) : "",
        locationSource: "device-gps"
      }));
    } catch {
      setLocationError("GPS liefert gerade keine Position. Versuche es erneut oder tippe die Position direkt auf der Karte an.");
    } finally {
      setIsLocating(false);
    }
  }

  async function handleUseHeading() {
    if (isReadingHeading || isSubmitting) return;
    setIsReadingHeading(true);
    setError(null);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error("Der Standortzugriff für den Kompass ist nicht erlaubt.");
      const heading = await Location.getHeadingAsync();
      const value = heading.trueHeading >= 0 ? heading.trueHeading : heading.magHeading;
      setForm((current) => ({ ...current, orientationDegrees: String(Math.round(value)) }));
    } catch {
      setError("Der Kompass ist gerade nicht verfügbar. Trage die Ausrichtung im Feld Grad ein.");
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } finally {
      setIsReadingHeading(false);
    }
  }

  async function pickPhotos(source: "camera" | "library") {
    const remaining = getRemainingReviereinrichtungPhotoSlots(attachments.length);
    if (remaining === 0 || photosDisabled) return;
    setIsPickingPhotos(true);
    setError(null);

    try {
      const permission =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) throw new Error(source === "camera" ? "Der Kamerazugriff ist nicht erlaubt." : "Der Zugriff auf die Mediathek ist nicht erlaubt.");
      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: REVIEREINRICHTUNG_PHOTO_QUALITY })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsMultipleSelection: remaining > 1,
              selectionLimit: remaining,
              quality: REVIEREINRICHTUNG_PHOTO_QUALITY
            });
      if (!result.canceled && result.assets?.length) {
        setAttachments((current) => mergePickedReviereinrichtungPhotos(current, result.assets));
      }
    } catch (photoError) {
      setError(photoError instanceof Error ? photoError.message : "Foto konnte nicht ausgewählt werden.");
    } finally {
      setIsPickingPhotos(false);
    }
  }

  async function handleRetry(entryId: string) {
    setRetryingEntryId(entryId);
    setQueueError(null);
    try {
      await retryOfflineQueueEntry(entryId);
      await syncOfflineQueue();
      await loadEntries({ refreshing: true });
    } catch (retryError) {
      setQueueError("Eintrag konnte nicht erneut gesendet werden. Er bleibt in der Warteschlange erhalten.");
    } finally {
      setRetryingEntryId(null);
    }
  }

  async function handleDiscard(entryId: string) {
    setDiscardingEntryId(entryId);
    try {
      await discardOfflineQueueEntry(entryId);
    } finally {
      setDiscardingEntryId(null);
    }
  }

  return (
    <ScreenShell
      scrollRef={scrollRef}
      testID="reviereinrichtungen-screen"
      eyebrow="Reviereinrichtungen"
      title={section === "erfassen" ? "Neue Einrichtung" : "Karte & Bestand"}
      subtitle={section === "erfassen" ? "Fotos, Standort und Zustand vor dem Speichern prüfen." : "Gespeicherte Einrichtungen im aktiven Revier."}
      aside={<QueueStatusPill count={queueSummary.totalCount} failedCount={queueSummary.failedCount} />}
      compactHero
      refresh={{ refreshing: isRefreshing, onRefresh: () => void handleRefresh() }}
    >
      {canCreate ? (
        <ViewToggle<CaptureSection>
          block
          value={section}
          onChange={setSection}
          accessibilityLabel="Zwischen Erfassen und Bestand umschalten"
          options={[
            { key: "erfassen", label: "Erfassen", icon: "add-circle-outline" },
            { key: "bestand", label: "Karte & Bestand", icon: "map-outline" }
          ]}
        />
      ) : null}

      {feedback ? <FeedbackBanner tone={feedback.tone} title={feedback.title} description={feedback.copy} /> : null}
      {loadError && section === "bestand" ? <FeedbackBanner tone="danger" title="Bestand konnte nicht geladen werden" description={loadError} /> : null}
      {error && section === "erfassen" ? <FeedbackBanner tone="danger" title="Bitte Angaben prüfen" description={error} /> : null}
      {queueError ? <FeedbackBanner tone="warning" title="Übertragung fehlgeschlagen" description={queueError} /> : null}

      {queueEntries.length > 0 ? (
        <View style={styles.queueCard} testID="reviereinrichtung-offline-queue">
          <View style={styles.rowBetween}>
            <View style={styles.grow}>
              <Text style={styles.cardTitle}>Offline-Vormerkungen</Text>
              <Text style={styles.copy}>{queueEntries.length} Einträge warten auf die Übertragung.</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Warteschlange jetzt senden"
              style={[styles.iconButton, queue.isSyncing ? styles.disabled : null]}
              disabled={queue.isSyncing}
              onPress={() => void syncOfflineQueue({ retryFailed: true })}
            >
              {queue.isSyncing ? <ActivityIndicator color={theme.ink} /> : <Ionicons name="sync" size={20} color={theme.ink} />}
            </Pressable>
          </View>
          {queueEntries.slice(0, 3).map((entry) => (
            <View key={entry.id} style={styles.queueRow}>
              <Text style={styles.queueTitle}>{entry.title}</Text>
              <Text style={styles.copy}>{getOfflineQueueEntryStatusLine(entry)}</Text>
              {entry.lastError ? <Text style={styles.errorCopy}>{entry.lastError}</Text> : null}
              {entry.status === "failed" || entry.status === "conflict" ? (
                <View style={styles.actionRow}>
                  <Pressable style={styles.secondaryButton} disabled={retryingEntryId === entry.id} onPress={() => void handleRetry(entry.id)}>
                    <Text style={styles.secondaryButtonText}>{retryingEntryId === entry.id ? "Wird versucht ..." : "Erneut versuchen"}</Text>
                  </Pressable>
                  <Pressable style={styles.dangerButton} disabled={discardingEntryId === entry.id} onPress={() => void handleDiscard(entry.id)}>
                    <Text style={styles.dangerButtonText}>{discardingEntryId === entry.id ? "..." : "Verwerfen"}</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {section === "erfassen" && canCreate ? (
        <View style={styles.formCard} testID="reviereinrichtung-form">
          <FacilityPhotoHero
            busy={isPickingPhotos || isSubmitting || attachments.length >= MAX_PHOTOS}
            mode="capture"
            onCamera={() => void pickPhotos("camera")}
            onLibrary={() => void pickPhotos("library")}
            onRemove={(id) => setAttachments((current) => current.filter((entry) => entry.id !== id))}
            photos={attachments.map((photo, index) => ({ id: photo.id, title: photo.title ?? `Einrichtungsfoto ${index + 1}`, uri: photo.uri }))}
            title={form.name || formatEinrichtungTyp(form.type)}
          />
          <Text style={styles.sectionLabel}>Angaben</Text>
          <FormField testID="reviereinrichtung-name" label="Name" placeholder="z. B. Hochstand Nord" value={form.name} onChangeText={updateText(setForm, "name")} theme={theme} styles={styles} />
          <SelectField label="Typ" options={EINRICHTUNG_TYP_OPTIONS} value={form.type} onChange={updateChoice(setForm, "type")} />
          <SelectField
            label="Zustand"
            options={[
              { value: "", label: "Bitte wählen" },
              { value: "gut", label: "Gut" },
              { value: "wartung-faellig", label: "Wartung fällig" },
              { value: "gesperrt", label: "Gesperrt" }
            ]}
            value={form.status}
            onChange={updateChoice(setForm, "status")}
            testID="reviereinrichtung-status"
          />
          <View style={styles.locationBox}>
            <View style={styles.rowBetween}>
              <View style={styles.grow}>
                <Text style={styles.label}>Standort</Text>
                <Text style={styles.copy}>{form.accuracyMeters ? `GPS-Genauigkeit ca. ${form.accuracyMeters} m` : "GPS oder Position auf der Karte wählen"}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Aktuellen Standort übernehmen"
                testID="reviereinrichtung-current-location"
                style={[styles.locationAction, isLocating ? styles.disabled : null]}
                disabled={isLocating}
                onPress={() => void handleUseCurrentLocation()}
              >
                {isLocating ? <ActivityIndicator color={theme.ink} /> : <Ionicons name="locate" size={22} color={theme.ink} />}
                <Text style={styles.locationActionText}>{isLocating ? "Standort wird ermittelt" : "GPS übernehmen"}</Text>
              </Pressable>
            </View>
            {locationError ? <FeedbackBanner tone="warning" title="Standort gerade nicht verfügbar" description={locationError} /> : null}
            <EntityMap
              testID="reviereinrichtung-location-map"
              pins={draftPin ? [draftPin] : []}
              revierCenter={draftPin ? undefined : session.session?.revier.zentrum}
              height={360}
              onMapPress={(location) => {
                setLocationError(null);
                setForm((current) => ({
                  ...current,
                  lat: location.lat.toFixed(6),
                  lng: location.lng.toFixed(6),
                  accuracyMeters: "",
                  locationSource: "manual"
                }));
              }}
            />
            <Text style={styles.mapHint}>Für eine manuelle Position direkt auf die Karte tippen.</Text>
            <View style={styles.fieldRow}>
              <FormField testID="reviereinrichtung-lat" label="Breitengrad" keyboardType="decimal-pad" value={form.lat} onChangeText={updateText(setForm, "lat")} theme={theme} styles={styles} grow />
              <FormField testID="reviereinrichtung-lng" label="Längengrad" keyboardType="decimal-pad" value={form.lng} onChangeText={updateText(setForm, "lng")} theme={theme} styles={styles} grow />
            </View>
            <FormField label="Standortbezeichnung" placeholder="Nordhang" value={form.locationLabel} onChangeText={updateText(setForm, "locationLabel")} theme={theme} styles={styles} />
          </View>

          {supportsOrientation(form.type) ? (
            <View style={styles.locationBox}>
              <View style={styles.rowBetween}>
                <View style={styles.grow}>
                  <Text style={styles.label}>{form.type === "kamera" ? "Blickrichtung" : "Ausrichtung"}</Text>
                  <Text style={styles.cardTitle}>{form.orientationDegrees ? formatDirection(Number(form.orientationDegrees)) : "Noch nicht gesetzt"}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Ausrichtung vom Kompass übernehmen"
                  style={[styles.iconButton, isReadingHeading ? styles.disabled : null]}
                  disabled={isReadingHeading}
                  onPress={() => void handleUseHeading()}
                >
                  {isReadingHeading ? <ActivityIndicator color={theme.ink} /> : <Ionicons name="compass-outline" size={22} color={theme.ink} />}
                </Pressable>
              </View>
              <FormField testID="reviereinrichtung-orientation" label="Grad" placeholder="0 bis 359" keyboardType="decimal-pad" value={form.orientationDegrees} onChangeText={updateText(setForm, "orientationDegrees")} theme={theme} styles={styles} />
            </View>
          ) : null}

          {isAnsitzeinrichtung(form.type) ? (
            <View style={styles.fieldGroup}>
              <Text style={styles.groupTitle}>Ansitzeinrichtung</Text>
              <View style={styles.fieldRow}>
                <FormField label="Personen" keyboardType="number-pad" value={form.capacityPersons} onChangeText={updateText(setForm, "capacityPersons")} theme={theme} styles={styles} grow />
                <FormField label="Baujahr" keyboardType="number-pad" value={form.constructionYear} onChangeText={updateText(setForm, "constructionYear")} theme={theme} styles={styles} grow />
              </View>
              <FormField label="Zugang" placeholder="Zufahrt, Fußweg, Schlüssel" value={form.accessNote} onChangeText={updateText(setForm, "accessNote")} theme={theme} styles={styles} multiline />
            </View>
          ) : null}

          {isFuetterungseinrichtung(form.type) ? (
            <View style={styles.fieldGroup}>
              <Text style={styles.groupTitle}>Betrieb</Text>
              <FormField label="Zielwildart" placeholder="z. B. Rehwild" value={form.targetSpecies} onChangeText={updateText(setForm, "targetSpecies")} theme={theme} styles={styles} />
              <FormField label="Futter oder Salz" placeholder="z. B. Heu" value={form.feedType} onChangeText={updateText(setForm, "feedType")} theme={theme} styles={styles} />
              <View style={styles.fieldRow}>
                <FormField label="Menge in kg" keyboardType="decimal-pad" value={form.feedQuantityKg} onChangeText={updateText(setForm, "feedQuantityKg")} theme={theme} styles={styles} grow />
                <FormField label="Intervall" placeholder="wöchentlich" value={form.feedInterval} onChangeText={updateText(setForm, "feedInterval")} theme={theme} styles={styles} grow />
              </View>
              <View style={styles.fieldRow}>
                <FormField label="Beginn" placeholder="JJJJ-MM-TT" value={form.operationStart} onChangeText={updateText(setForm, "operationStart")} theme={theme} styles={styles} grow />
                <FormField label="Ende" placeholder="JJJJ-MM-TT" value={form.operationEnd} onChangeText={updateText(setForm, "operationEnd")} theme={theme} styles={styles} grow />
              </View>
            </View>
          ) : null}

          <FormField label="Zustimmung Grundeigentümer" placeholder="JJJJ-MM-TT" value={form.ownerConsentAt} onChangeText={updateText(setForm, "ownerConsentAt")} theme={theme} styles={styles} />
          <FormField label="Beschreibung" placeholder="Bauweise, Besonderheiten, Hinweise" value={form.beschreibung} onChangeText={updateText(setForm, "beschreibung")} theme={theme} styles={styles} multiline />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reviereinrichtung speichern"
            testID="reviereinrichtung-submit"
            style={[styles.primaryButton, isSubmitting ? styles.disabled : null]}
            disabled={isSubmitting}
            onPress={() => void handleSubmit()}
          >
            {isSubmitting ? <ActivityIndicator color={theme.onAccent} /> : <Text style={styles.primaryButtonText}>Reviereinrichtung speichern</Text>}
          </Pressable>
        </View>
      ) : null}

      {section === "bestand" ? (
        <View style={styles.bestandStack}>
          <ViewToggle<ViewMode>
            value={mode}
            onChange={setMode}
            accessibilityLabel="Anzeige umschalten"
            options={[
              { key: "karte", label: "Karte", icon: "map" },
              { key: "liste", label: "Liste", icon: "list" }
            ]}
          />
          <Pressable accessibilityRole="button" onPress={() => setFiltersOpen(!filtersOpen)} style={styles.resetButton}><Text style={styles.resetText}>{filtersOpen ? "Filter schließen" : filterActive ? "Filter bearbeiten · aktiv" : "Suchen & Filtern"} · {visibleEntries.length} Einrichtungen</Text></Pressable>
          {filtersOpen ? <View style={styles.filterSection}>
            <SearchInput testID="reviereinrichtungen-search" value={filter.search} onChangeText={(search) => setFilter((current) => ({ ...current, search }))} placeholder="Name, Typ oder Standort" accessibilityLabel="Einrichtungen durchsuchen" />
            <SelectField<EinrichtungTypFilter>
              label="Typ"
              options={[{ value: "alle", label: "Alle Typen" }, ...EINRICHTUNG_TYP_OPTIONS]}
              value={filter.typ}
              onChange={(typ) => setFilter((current) => ({ ...current, typ }))}
            />
            <View style={styles.filterGroup}>
              <Text style={styles.filterEyebrow}>Zustand</Text>
              <FilterChipRow<EinrichtungZustandFilter>
                value={filter.zustand}
                onChange={(zustand) => setFilter((current) => ({ ...current, zustand }))}
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
                onChange={(sort) => setFilter((current) => ({ ...current, sort }))}
                accessibilityLabel="Sortierung wählen"
                options={[
                  { key: "alphabetisch", label: "Alphabetisch" },
                  { key: "nach-zustand", label: "Zustand" },
                  { key: "nach-wartungen-desc", label: "Wartungen" },
                  { key: "nach-typ", label: "Typ" }
                ]}
              />
            </View>
            {filterActive ? (
              <Pressable style={styles.resetButton} onPress={() => setFilter(DEFAULT_REVIEREINRICHTUNG_FILTER)}>
                <Text style={styles.resetText}>Filter zurücksetzen</Text>
              </Pressable>
            ) : null}
          </View> : null}

          {isLoading ? <StateView mode="loading" title="Einrichtungen werden geladen" description="" /> : null}
          {!isLoading && visibleEntries.length === 0 ? <StateView mode="empty" title="Keine Einrichtungen" description="Für diese Auswahl sind keine Kartenpunkte vorhanden." /> : null}

          {mode === "karte" && !isLoading ? (
            <EntityMap
              testID="reviereinrichtungen-map"
              pins={pins}
              pinColor={theme.ink}
              height={MAP_HEIGHT}
              onPinPress={(pin) => {
                const target = visibleEntries.find((entry) => entry.id === pin.id);
                if (!target) return;
                if (target.id.startsWith("offline-")) setSelectedPin({ type: "einrichtung", data: target });
                else router.push({ pathname: "/reviereinrichtung/[id]", params: { id: target.id } } as never);
              }}
            />
          ) : null}

          {mode === "liste" ? (
            <View style={styles.list}>
              {visibleEntries.map((entry) => (
                <Pressable
                  key={entry.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Reviereinrichtung ${entry.name}`}
                  style={styles.card}
                  onPress={() => entry.id.startsWith("offline-")
                    ? setSelectedPin({ type: "einrichtung", data: entry })
                    : router.push({ pathname: "/reviereinrichtung/[id]", params: { id: entry.id } } as never)}
                >
                  {entry.photos[0] ? <Image source={{ uri: entry.photos[0].url }} style={styles.cardImage} accessibilityLabel={entry.photos[0].title} /> : null}
                  <View style={styles.rowBetween}>
                    <View style={styles.grow}>
                      <Text style={styles.type}>{formatEinrichtungTyp(entry.type)}</Text>
                      <Text style={styles.cardTitle}>{entry.name}</Text>
                    </View>
                    <Badge tone={entry.id.startsWith("offline-") ? "warning" : entry.status === "gut" ? "success" : entry.status === "gesperrt" ? "danger" : "warning"}>
                      {entry.id.startsWith("offline-") ? "Vorgemerkt" : formatEinrichtungZustand(entry.status)}
                    </Badge>
                  </View>
                  {entry.orientationDegrees !== undefined ? <Text style={styles.copy}>Ausrichtung: {formatDirection(entry.orientationDegrees)}</Text> : null}
                  <Text style={styles.copy}>{entry.location.label ?? `${entry.location.lat.toFixed(5)}, ${entry.location.lng.toFixed(5)}`}</Text>
                  {entry.beschreibung ? <Text style={styles.copy}>{entry.beschreibung}</Text> : null}
                  {entry.letzteKontrolleAt ? <Text style={styles.copy}>Letzte Kontrolle: {formatDateTime(entry.letzteKontrolleAt)}</Text> : null}
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      <PinDetailSheet pin={selectedPin} onClose={() => setSelectedPin(null)} />
    </ScreenShell>
  );
}

function mapPendingEntry(entry: OfflineReviereinrichtungOperation): ReviereinrichtungListItem {
  return {
    id: `offline-${entry.id}`,
    revierId: "offline",
    type: entry.payload.type,
    name: entry.payload.name,
    status: entry.payload.status ?? "gut",
    location: entry.payload.location,
    beschreibung: entry.payload.beschreibung,
    orientationDegrees: entry.payload.orientationDegrees,
    details: entry.payload.details,
    photos: (entry.payload.attachments ?? []).map((photo) => ({
      id: photo.id,
      title: photo.title ?? photo.fileName,
      url: photo.uri,
      createdAt: entry.createdAt
    })),
    kontrollen: [],
    wartung: [],
    offeneWartungen: 0
  };
}

interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  theme: ThemeColors;
  styles: ReturnType<typeof createStyles>;
  placeholder?: string;
  keyboardType?: "default" | "decimal-pad" | "number-pad";
  multiline?: boolean;
  grow?: boolean;
  testID?: string;
}

function FormField({ label, value, onChangeText, theme, styles, placeholder, keyboardType = "default", multiline = false, grow = false, testID }: FormFieldProps) {
  return (
    <View style={[styles.field, grow ? styles.grow : null]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.muted}
        keyboardType={keyboardType}
        multiline={multiline}
        style={[styles.input, multiline ? styles.textArea : null]}
      />
    </View>
  );
}

function updateText<K extends keyof ReviereinrichtungFormState>(setForm: Dispatch<SetStateAction<ReviereinrichtungFormState>>, key: K) {
  return (value: string) => setForm((current) => ({ ...current, [key]: value }));
}

function updateChoice<K extends keyof ReviereinrichtungFormState>(setForm: Dispatch<SetStateAction<ReviereinrichtungFormState>>, key: K) {
  return (value: ReviereinrichtungFormState[K]) => setForm((current) => ({ ...current, [key]: value }));
}

const createStyles = (theme: ThemeColors) =>
  ({
    formCard: { ...cardSurface(theme), gap: spacing.md },
    queueCard: { ...cardSurface(theme), gap: spacing.sm },
    queueRow: { gap: spacing.xs, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: theme.inputBorder },
    queueTitle: { fontSize: 15, fontWeight: "700", color: theme.ink },
    sectionLabel: { ...eyebrowText(theme) },
    groupTitle: { fontSize: 17, fontWeight: "700", color: theme.ink },
    cardTitle: { fontSize: 18, lineHeight: 23, fontWeight: "700", color: theme.ink },
    fieldGroup: { gap: spacing.sm, paddingTop: spacing.sm },
    field: { gap: 6 },
    label: { ...eyebrowText(theme) },
    input: {
      minHeight: 52,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.inputBorder,
      backgroundColor: theme.surface,
      color: theme.ink,
      fontSize: 16
    },
    textArea: { minHeight: 100, textAlignVertical: "top" },
    fieldRow: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
    grow: { flex: 1, minWidth: 0 },
    rowBetween: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start", justifyContent: "space-between" },
    locationBox: { gap: spacing.sm, paddingVertical: 8 },
    locationAction: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 14, borderRadius: 16, backgroundColor: theme.card },
    locationActionText: { color: theme.ink, fontSize: 14, fontWeight: "700" },
    mapHint: { fontSize: 13, lineHeight: 18, color: theme.muted },
    iconButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: theme.card },
    disabled: { opacity: 0.5 },
    copy: { fontSize: 14, lineHeight: 20, color: theme.muted },
    errorCopy: { fontSize: 13, lineHeight: 18, color: theme.danger },
    photoSection: { gap: spacing.sm },
    photoActionRow: { flexDirection: "row", gap: spacing.sm },
    photoButton: { flex: 1, minHeight: 92, alignItems: "center", justifyContent: "center", gap: spacing.xs, borderRadius: 16, backgroundColor: theme.surfaceMuted },
    photoButtonText: { fontSize: 15, fontWeight: "700", color: theme.ink },
    photoList: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    photoCard: { width: 92, height: 92, borderRadius: 12, overflow: "hidden", backgroundColor: theme.surfaceMuted },
    photoPreview: { width: "100%", height: "100%" },
    photoRemove: { position: "absolute", right: 6, top: 6, width: 28, height: 28, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: theme.ink },
    primaryButton: { minHeight: 56, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: theme.accent, paddingHorizontal: 18 },
    primaryButtonText: { color: theme.onAccent, fontSize: 16, fontWeight: "700", textAlign: "center" },
    secondaryButton: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, backgroundColor: theme.surfaceMuted },
    secondaryButtonText: { color: theme.ink, fontWeight: "700" },
    dangerButton: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, backgroundColor: theme.dangerSurface },
    dangerButtonText: { color: theme.danger, fontWeight: "700" },
    actionRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
    bestandStack: { gap: spacing.md },
    filterSection: { gap: spacing.sm, padding: 14, borderRadius: 16, backgroundColor: theme.card },
    filterGroup: { gap: 6 },
    filterEyebrow: { ...eyebrowText(theme) },
    resetButton: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: theme.surfaceMuted },
    resetText: { color: theme.ink, fontWeight: "700" },
    list: { gap: spacing.sm },
    card: { ...cardSurface(theme), gap: spacing.sm, overflow: "hidden" },
    cardImage: { width: "100%", aspectRatio: 16 / 9, borderRadius: 12, backgroundColor: theme.surfaceMuted },
    type: { ...eyebrowText(theme) }
  }) as const;
