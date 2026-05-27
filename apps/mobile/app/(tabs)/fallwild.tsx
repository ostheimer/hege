import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View
} from "react-native";
import type { Dispatch, SetStateAction } from "react";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";

import { EntityMap, type EntityPin } from "../../components/entity-map";
import { FilterChipRow } from "../../components/filter-chip-row";
import { PinDetailSheet, type SelectedPin } from "../../components/pin-detail-sheet";
import { ScreenShell } from "../../components/screen-shell";
import { SearchInput } from "../../components/search-input";
import { SelectField } from "../../components/select-field";
import { ViewToggle } from "../../components/view-toggle";
import { computeFallwildSmartDefaults } from "../../lib/fallwild-smart-defaults.helpers";
import {
  applyFallwildFilter,
  DEFAULT_FALLWILD_FILTER,
  isFallwildFilterActive,
  type BergungsStatusFilter,
  type FallwildFilterState,
  type FallwildSortKey,
  type ZeitraumFilter
} from "../../lib/fallwild-filter.helpers";
import { formatDateTime } from "../../lib/format";
import { buildGeoPoint, trimToUndefined } from "../../lib/form-utils";
import {
  fetchFallwildDetail,
  fetchFallwildList,
  resolveFallwildLocation,
  type CreateFallwildRequest,
  type FallwildListItem
} from "../../lib/api";
import {
  applyFallwildLocationSuggestion,
  buildFallwildRoadReference,
  formatCoordinate,
  formatRoadKilometerSourceLabel,
  summarizeFallwildLocationSuggestion
} from "../../lib/fallwild-location";
import {
  FALLWILD_PHOTO_QUALITY,
  MAX_FALLWILD_PHOTOS,
  getRemainingFallwildPhotoSlots,
  limitFallwildPhotoAttachments,
  mergePickedFallwildPhotos,
  type LocalPendingPhoto
} from "../../lib/fallwild-photos";
import { submitFallwildSubmission } from "../../lib/fallwild-submission";
import {
  getOfflineQueueEntryAttachmentHint,
  getOfflineQueueEntryRetryHint,
  getOfflineQueueEntryStatusLine,
  summarizeOfflineQueue
} from "../../lib/offline-queue-status";
import {
  discardOfflineQueueEntry,
  retryOfflineQueueEntry,
  syncOfflineQueue,
  useOfflineQueueSnapshot
} from "../../lib/offline-queue";
import { useThemeColors, type ThemeColors } from "../../lib/theme";
import { useThemedStyles } from "../../lib/use-themed-styles";

interface FallwildFormState {
  locationLabel: string;
  lat: string;
  lng: string;
  accuracyMeters: string;
  locationSource: "manual" | "device-gps";
  addressLabel: string;
  googlePlaceId: string;
  wildart: CreateFallwildRequest["wildart"];
  geschlecht: CreateFallwildRequest["geschlecht"];
  altersklasse: CreateFallwildRequest["altersklasse"];
  bergungsStatus: CreateFallwildRequest["bergungsStatus"];
  gemeinde: string;
  strasse: string;
  roadName: string;
  roadKilometer: string;
  roadKilometerSource: "manual" | "gip" | "unavailable";
  note: string;
}

const DEFAULT_FORM: FallwildFormState = {
  locationLabel: "",
  lat: "",
  lng: "",
  accuracyMeters: "",
  locationSource: "manual",
  addressLabel: "",
  googlePlaceId: "",
  wildart: "Fuchs",
  geschlecht: "weiblich",
  altersklasse: "Adult",
  bergungsStatus: "geborgen",
  gemeinde: "",
  strasse: "",
  roadName: "",
  roadKilometer: "",
  roadKilometerSource: "manual",
  note: ""
};

const WILDLIFE_OPTIONS: Array<CreateFallwildRequest["wildart"]> = ["Reh", "Rotwild", "Schwarzwild", "Fuchs", "Dachs", "Hase", "Muffelwild"];
const GESCHLECHT_OPTIONS: Array<CreateFallwildRequest["geschlecht"]> = ["maennlich", "weiblich", "unbekannt"];
const ALTERSKLASSE_OPTIONS: Array<CreateFallwildRequest["altersklasse"]> = ["Kitz", "Jaehrling", "Adult", "unbekannt"];
const BERGUNGS_STATUS_OPTIONS: Array<CreateFallwildRequest["bergungsStatus"]> = [
  "erfasst",
  "geborgen",
  "entsorgt",
  "an-behoerde-gemeldet"
];

type FeedbackState = {
  variant: "success" | "warning";
  title: string;
  copy: string;
} | null;

type ViewMode = "liste" | "karte";
const MAP_HEIGHT = 380;

export default function FallwildScreen() {
  const queue = useOfflineQueueSnapshot();
  const styles = useThemedStyles(createStyles);
  const theme = useThemeColors();
  const [fallwild, setFallwild] = useState<FallwildListItem[]>([]);
  const [form, setForm] = useState<FallwildFormState>(DEFAULT_FORM);
  const [attachments, setAttachments] = useState<LocalPendingPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPickingPhotos, setIsPickingPhotos] = useState(false);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const [discardingEntryId, setDiscardingEntryId] = useState<string | null>(null);
  const [retryingEntryId, setRetryingEntryId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [locationHint, setLocationHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ViewMode>("karte");
  const [selectedPin, setSelectedPin] = useState<SelectedPin | null>(null);
  const [filter, setFilter] = useState<FallwildFilterState>(DEFAULT_FALLWILD_FILTER);

  // Gefilterte + sortierte Liste, sowohl fuer Liste als auch Karte
  // verwendet. So bleibt die Filter-Wirkung in beiden Ansichten gleich
  // — wer in der Liste filtert, sieht die Karte mit den gleichen Pins.
  const visibleFallwild = useMemo(() => applyFallwildFilter(fallwild, filter), [fallwild, filter]);
  const filterActive = useMemo(() => isFallwildFilterActive(filter), [filter]);

  // Smart Defaults aus den letzten 30 Tagen (M4). Wir reagieren auf die
  // im Form bereits eingetippte Gemeinde, damit ein Jaeger in Gänserndorf
  // andere Vorschlaege bekommt als einer in Strasshof.
  const smartDefaults = useMemo(
    () =>
      computeFallwildSmartDefaults(fallwild, {
        gemeinde: form.gemeinde.trim() || undefined
      }),
    [fallwild, form.gemeinde]
  );

  // Form ist in seinem Default-Zustand, wenn weder Wildart noch Gemeinde
  // angefasst wurden. Dann lohnt der Vorschlag.
  const isFormUnchanged = form.gemeinde.trim() === "" && form.lat.trim() === "" && form.lng.trim() === "";
  const showSmartDefaults =
    isFormUnchanged &&
    (smartDefaults.wildart !== undefined || smartDefaults.location !== undefined);

  function applySmartDefaults() {
    setForm((current) => ({
      ...current,
      wildart: smartDefaults.wildart ?? current.wildart,
      gemeinde: smartDefaults.gemeinde ?? current.gemeinde,
      lat: smartDefaults.location ? String(smartDefaults.location.lat) : current.lat,
      lng: smartDefaults.location ? String(smartDefaults.location.lng) : current.lng,
      locationLabel:
        smartDefaults.location?.label ??
        (smartDefaults.location ? "Aus letzter Erfassung uebernommen" : current.locationLabel)
    }));
  }

  // EntityPin-Mapping fuer die Karten-Ansicht.
  const pins: ReadonlyArray<EntityPin> = useMemo(
    () =>
      visibleFallwild.map((entry) => ({
        id: entry.id,
        kind: "fallwild",
        location: entry.location,
        title: entry.gemeinde ?? entry.location.label ?? "Fallwild",
        subtitle: `${entry.wildart} · ${entry.bergungsStatus}`
      })),
    [visibleFallwild]
  );

  useEffect(() => {
    void loadFallwild();
  }, []);

  async function loadFallwild(options?: { refreshing?: boolean }) {
    const refreshing = options?.refreshing ?? false;

    if (refreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError(null);

    try {
      const entries = await fetchFallwildList();
      setFallwild(entries);
    } catch (fetchError) {
      setFallwild([]);
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
    setFeedback(null);
    setError(null);

    try {
      const payload = buildFallwildPayload(form);
      const attachmentSnapshot = limitFallwildPhotoAttachments(attachments);
      const result = await submitFallwildSubmission(payload, attachmentSnapshot);

      setAttachments([]);
      setForm(DEFAULT_FORM);
      setLocationHint(null);

      if (result.mode === "queued") {
        setFeedback({
          variant: "warning",
          title: "Fallwild vorgemerkt",
          copy:
            attachmentSnapshot.length > 0
              ? `${formatPhotoCount(attachmentSnapshot.length)} ${formatPhotoVerb(attachmentSnapshot.length)} gemeinsam mit dem Vorgang offline vorgemerkt.`
              : "Der Vorgang wurde offline vorgemerkt."
        });
      } else if (result.mode === "partial") {
        setFeedback({
          variant: "warning",
          title: "Fallwild gespeichert",
          copy:
            result.queuedCount > 0
              ? `${formatPhotoCount(result.uploadedCount)} hochgeladen, ${formatPhotoCount(result.queuedCount)} ${formatPhotoVerb(result.queuedCount)} in die Queue gelegt.`
              : `${formatPhotoCount(result.uploadedCount)} ${formatPhotoVerb(result.uploadedCount)} hochgeladen.`
        });
      } else {
        setFeedback({
          variant: "success",
          title: "Fallwild gespeichert",
          copy:
            result.uploadedCount > 0
              ? `${formatPhotoCount(result.uploadedCount)} ${formatPhotoVerb(result.uploadedCount)} direkt mitgespeichert.`
              : "Der Vorgang wurde direkt an die API gesendet."
        });
      }

      if (result.createdId) {
        await refreshFallwildAfterSubmit(result.createdId);
      } else {
        await loadFallwild({ refreshing: true });
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Fallwild konnte nicht erfasst werden.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleQueueSync() {
    setFeedback(null);
    setError(null);

    try {
      const remaining = await syncOfflineQueue();
      setFeedback({
        variant: remaining.length === 0 ? "success" : "warning",
        title: remaining.length === 0 ? "Warteschlange synchronisiert" : "Warteschlange teilweise synchronisiert",
        copy:
          remaining.length === 0
            ? "Alle Einträge wurden verarbeitet."
            : `${remaining.length} Queue-Einträge warten weiter auf Synchronisierung.`
      });
      await loadFallwild({ refreshing: true });
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Warteschlange konnte nicht gesendet werden.");
    }
  }

  async function handleRetryQueueEntry(entryId: string) {
    setRetryingEntryId(entryId);
    setFeedback(null);
    setError(null);

    try {
      await retryOfflineQueueEntry(entryId);
      const remaining = await syncOfflineQueue();
      setFeedback({
        variant: remaining.length === 0 ? "success" : "warning",
        title: remaining.length === 0 ? "Eintrag synchronisiert" : "Eintrag erneut versucht",
        copy:
          remaining.length === 0
            ? "Alle Einträge wurden verarbeitet."
            : `${remaining.length} Queue-Einträge warten weiter auf Synchronisierung.`
      });
      await loadFallwild({ refreshing: true });
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : "Eintrag konnte nicht erneut versucht werden.");
    } finally {
      setRetryingEntryId(null);
    }
  }

  async function handleDiscardQueueEntry(entryId: string) {
    setDiscardingEntryId(entryId);
    setFeedback(null);
    setError(null);

    try {
      await discardOfflineQueueEntry(entryId);
      setFeedback({
        variant: "warning",
        title: "Eintrag verworfen",
        copy: "Der Eintrag wurde aus der Warteschlange entfernt."
      });
    } catch (discardError) {
      setError(discardError instanceof Error ? discardError.message : "Eintrag konnte nicht verworfen werden.");
    } finally {
      setDiscardingEntryId(null);
    }
  }

  async function handleCapturePhoto() {
    const remainingSlots = getRemainingFallwildPhotoSlots(attachments.length);

    if (remainingSlots === 0 || isSubmitting || isPickingPhotos) {
      return;
    }

    setError(null);
    setFeedback(null);
    setIsPickingPhotos(true);

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        setError("Der Zugriff auf die Kamera ist nicht erlaubt.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: FALLWILD_PHOTO_QUALITY,
        allowsEditing: false
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      setAttachments((current) => mergePickedFallwildPhotos(current, result.assets));
    } catch (photoError) {
      setError(photoError instanceof Error ? photoError.message : "Foto konnte nicht aufgenommen werden.");
    } finally {
      setIsPickingPhotos(false);
    }
  }

  async function handleAddPhotos() {
    const remainingSlots = getRemainingFallwildPhotoSlots(attachments.length);

    if (remainingSlots === 0 || isSubmitting || isPickingPhotos) {
      return;
    }

    setError(null);
    setFeedback(null);
    setIsPickingPhotos(true);

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setError("Der Zugriff auf die Fotobibliothek ist nicht erlaubt.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: remainingSlots > 1,
        selectionLimit: remainingSlots,
        quality: FALLWILD_PHOTO_QUALITY,
        allowsEditing: false
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      setAttachments((current) => mergePickedFallwildPhotos(current, result.assets));
    } catch (photoError) {
      setError(photoError instanceof Error ? photoError.message : "Fotos konnten nicht ausgewählt werden.");
    } finally {
      setIsPickingPhotos(false);
    }
  }

  async function handleUseCurrentLocation() {
    if (isResolvingLocation || isSubmitting) {
      return;
    }

    setIsResolvingLocation(true);
    setFeedback(null);
    setLocationHint(null);
    setError(null);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (!permission.granted) {
        setError("Der Standortzugriff ist nicht erlaubt.");
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });
      const accuracyMeters =
        typeof position.coords.accuracy === "number" && Number.isFinite(position.coords.accuracy)
          ? String(Math.round(position.coords.accuracy))
          : "";
      const numericAccuracyMeters =
        typeof position.coords.accuracy === "number" && Number.isFinite(position.coords.accuracy)
          ? position.coords.accuracy
          : undefined;

      setForm((current) => ({
        ...current,
        lat: formatCoordinate(position.coords.latitude),
        lng: formatCoordinate(position.coords.longitude),
        accuracyMeters,
        locationSource: "device-gps"
      }));

      try {
        const suggestion = await resolveFallwildLocation(
          position.coords.latitude,
          position.coords.longitude,
          numericAccuracyMeters
        );
        setForm((current) => ({
          ...applyFallwildLocationSuggestion(current, suggestion),
          accuracyMeters,
          locationSource: "device-gps",
          googlePlaceId: suggestion.location.placeId ?? current.googlePlaceId
        }));
        setLocationHint(summarizeFallwildLocationSuggestion(suggestion));
      } catch (resolveError) {
        setLocationHint("GPS wurde übernommen. Adresse und Straßenkilometer bitte manuell ergänzen.");
        setError(resolveError instanceof Error ? resolveError.message : "Standortdetails konnten nicht ermittelt werden.");
      }
    } catch (locationError) {
      setError(locationError instanceof Error ? locationError.message : "Standort konnte nicht ermittelt werden.");
    } finally {
      setIsResolvingLocation(false);
    }
  }

  async function refreshFallwildAfterSubmit(createdId: string) {
    try {
      const detail = await fetchFallwildDetail(createdId);
      setFallwild((current) => [detail, ...current.filter((entry) => entry.id !== detail.id)]);
    } catch {
      await loadFallwild({ refreshing: true });
    }
  }

  const queueEntries = queue.entries.filter(
    (entry) => entry.kind === "fallwild-create" || entry.kind === "fallwild-photo-upload"
  );
  const queueSummary = summarizeOfflineQueue(queueEntries);

  return (
    <ScreenShell
      eyebrow="Fallwild"
      title="Fallwild mobil erfassen."
      subtitle="Zeitpunkt, GPS, Wildart und bis zu drei Bibliotheksfotos werden direkt oder offline erfasst."
      aside={
        <View style={styles.queueCard}>
          <Text style={styles.queueTitle}>Ausstehende Synchronisierung</Text>
          <Text style={styles.queueValue}>{queueSummary.totalCount}</Text>
          <Text style={styles.queueCopy}>
            {queueSummary.failedCount > 0
              ? `${queueSummary.failedCount} Einträge brauchen Aufmerksamkeit.`
              : queue.isSyncing
                ? "Warteschlange wird gerade gesendet."
                : "Erfasste Vorgänge werden automatisch nachgereicht."}
          </Text>
        </View>
      }
    >
      <View style={styles.formCard}>
        <Text style={styles.sectionLabel}>Neuer Fallwild-Vorgang</Text>
        <Text style={styles.sectionCopy}>Die Erfassung bleibt im Feld schnell bedienbar; bei Verbindungsproblemen werden Vorgänge vorgemerkt und automatisch nachgereicht.</Text>

        {showSmartDefaults ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Vorschlag aus den letzten 30 Tagen uebernehmen"
            onPress={applySmartDefaults}
            style={({ pressed }) => [
              styles.smartDefaultsBanner,
              pressed ? styles.buttonDisabled : null
            ]}
          >
            <Text style={styles.smartDefaultsEyebrow}>Vorschlag aus deinen letzten Erfassungen</Text>
            <Text style={styles.smartDefaultsTitle}>
              {smartDefaults.wildart ? `${smartDefaults.wildart}` : "Position"}
              {smartDefaults.gemeinde ? ` · ${smartDefaults.gemeinde}` : ""}
            </Text>
            <Text style={styles.smartDefaultsCopy}>
              Tippe, um Wildart, Gemeinde und letzte Position zu übernehmen — du kannst danach alles anpassen.
            </Text>
          </Pressable>
        ) : null}

        <View style={styles.fieldRow}>
          <View style={[styles.field, styles.grow]}>
            <Text style={styles.label}>Breitengrad</Text>
            <TextInput
              keyboardType="decimal-pad"
              placeholder="47.9184"
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
              placeholder="13.5219"
              placeholderTextColor={theme.muted}
              style={styles.input}
              value={form.lng}
              onChangeText={updateField(setForm, "lng")}
            />
          </View>
        </View>

        <View style={styles.locationActionCard}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Aktuellen Standort für Fallwild übernehmen"
            style={[styles.locationButton, isResolvingLocation || isSubmitting ? styles.buttonDisabled : null]}
            onPress={() => void handleUseCurrentLocation()}
            disabled={isResolvingLocation || isSubmitting}
          >
            {isResolvingLocation ? (
              <ActivityIndicator color={theme.surface} />
            ) : (
              <Text style={styles.locationButtonText}>Standort automatisch erfassen</Text>
            )}
          </Pressable>
          <Text style={styles.helperCopy}>
            GPS kommt vom iPhone. Adresse wird serverseitig ergänzt, wenn Google konfiguriert ist; Straßenkilometer kommen aus
            GIP oder bleiben manuell editierbar.
          </Text>
          {form.accuracyMeters ? (
            <Text style={styles.helperCopy}>GPS-Genauigkeit: ca. {form.accuracyMeters} m</Text>
          ) : null}
          {locationHint ? <Text style={styles.locationHint}>{locationHint}</Text> : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Standortbezeichnung</Text>
          <TextInput
            placeholder="Straßenrand L9"
            placeholderTextColor={theme.muted}
            style={styles.input}
            value={form.locationLabel}
            onChangeText={updateField(setForm, "locationLabel")}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Adresse</Text>
          <TextInput
            autoCapitalize="words"
            placeholder="Wird über Google ermittelt"
            placeholderTextColor={theme.muted}
            style={styles.input}
            value={form.addressLabel}
            onChangeText={updateField(setForm, "addressLabel")}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Gemeinde</Text>
          <TextInput
            autoCapitalize="words"
            placeholder="Gänserndorf"
            placeholderTextColor={theme.muted}
            style={styles.input}
            value={form.gemeinde}
            onChangeText={updateField(setForm, "gemeinde")}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Straße oder Lage</Text>
          <TextInput
            autoCapitalize="words"
            placeholder="L9"
            placeholderTextColor={theme.muted}
            style={styles.input}
            value={form.strasse}
            onChangeText={updateField(setForm, "strasse")}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Straßenkilometer</Text>
          <TextInput
            autoCapitalize="none"
            placeholder="z. B. km 12,4"
            placeholderTextColor={theme.muted}
            style={styles.input}
            value={form.roadKilometer}
            onChangeText={updateRoadKilometer(setForm)}
          />
          <Text style={styles.helperCopy}>
            Wichtig für Fallwild. {formatRoadKilometerSourceLabel(form.roadKilometerSource)}.
          </Text>
          <Text style={styles.helperCopy}>Wenn GIP keinen Wert liefert, bitte vor Ort manuell ergänzen.</Text>
        </View>

        <SelectField
          label="Wildart"
          options={WILDLIFE_OPTIONS.map((value) => ({ value, label: value }))}
          value={form.wildart}
          onChange={updateChoice(setForm, "wildart")}
        />
        <SelectField
          label="Geschlecht"
          options={GESCHLECHT_OPTIONS.map((value) => ({ value, label: formatGeschlechtLabel(value) }))}
          value={form.geschlecht}
          onChange={updateChoice(setForm, "geschlecht")}
        />
        <SelectField
          label="Altersklasse"
          options={ALTERSKLASSE_OPTIONS.map((value) => ({ value, label: formatAltersklasseLabel(value) }))}
          value={form.altersklasse}
          onChange={updateChoice(setForm, "altersklasse")}
        />
        <SelectField
          label="Bergungsstatus"
          options={BERGUNGS_STATUS_OPTIONS.map((value) => ({ value, label: formatBergungsStatusLabel(value) }))}
          value={form.bergungsStatus}
          onChange={updateChoice(setForm, "bergungsStatus")}
        />

        <View style={styles.field}>
          <Text style={styles.label}>Notiz</Text>
          <TextInput
            multiline
            placeholder="Kurze Dokumentation für die Revierleitung"
            placeholderTextColor={theme.muted}
            style={[styles.input, styles.textArea]}
            value={form.note}
            onChangeText={updateField(setForm, "note")}
          />
        </View>

        <View style={styles.photoSection}>
          <View>
            <Text style={styles.label}>Fotos</Text>
            <Text style={styles.helperCopy}>
              Vor Ort aufnehmen oder aus der Bibliothek wählen, Qualität 0,7, maximal {MAX_FALLWILD_PHOTOS} Bilder.
            </Text>
          </View>
          <View style={styles.photoActionsRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Foto aufnehmen"
              testID="fallwild-photo-camera-button"
              style={[
                styles.photoCameraButton,
                attachments.length >= MAX_FALLWILD_PHOTOS || isPickingPhotos || isSubmitting ? styles.buttonDisabled : null
              ]}
              onPress={() => void handleCapturePhoto()}
              disabled={attachments.length >= MAX_FALLWILD_PHOTOS || isPickingPhotos || isSubmitting}
            >
              {isPickingPhotos ? (
                <ActivityIndicator color={theme.surface} />
              ) : (
                <Text style={styles.photoCameraButtonText}>
                  {attachments.length >= MAX_FALLWILD_PHOTOS ? "Maximal erreicht" : "Foto aufnehmen"}
                </Text>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Aus Bibliothek wählen"
              testID="fallwild-photo-picker-button"
              style={[
                styles.photoPickerButton,
                attachments.length >= MAX_FALLWILD_PHOTOS || isPickingPhotos || isSubmitting ? styles.buttonDisabled : null
              ]}
              onPress={() => void handleAddPhotos()}
              disabled={attachments.length >= MAX_FALLWILD_PHOTOS || isPickingPhotos || isSubmitting}
            >
              {isPickingPhotos ? (
                <ActivityIndicator color={theme.ink} />
              ) : (
                <Text style={styles.photoPickerButtonText}>
                  {attachments.length >= MAX_FALLWILD_PHOTOS ? "Maximal erreicht" : "Aus Bibliothek"}
                </Text>
              )}
            </Pressable>
          </View>

          {attachments.length > 0 ? (
            <View style={styles.photoPreviewList}>
              {attachments.map((photo, index) => (
                <View key={photo.id} style={styles.photoPreviewCard}>
                  <Image accessibilityLabel={`Vorschau ${photo.fileName}`} source={{ uri: photo.uri }} style={styles.photoPreviewImage} />
                  <View style={styles.photoPreviewMeta}>
                    <Text style={styles.photoPreviewTitle}>{photo.title ?? `Foto ${index + 1}`}</Text>
                    <Text style={styles.photoPreviewCopy}>{photo.fileName}</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Foto entfernen: ${photo.fileName}`}
                    testID={`fallwild-photo-remove-${photo.id}`}
                    style={styles.photoRemoveButton}
                    onPress={removeAttachment(setAttachments, photo.id)}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.photoRemoveButtonText}>Entfernen</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.helperCopy}>Noch keine Fotos ausgewählt.</Text>
          )}
        </View>

        {feedback ? (
          <View style={[styles.feedbackCard, feedback.variant === "success" ? styles.feedbackCardSuccess : styles.feedbackCardWarning]}>
            <Text style={styles.stateTitle}>{feedback.title}</Text>
            <Text style={styles.stateCopy}>{feedback.copy}</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.stateTitle}>Fallwild nicht verfügbar</Text>
            <Text style={styles.stateCopy}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fallwild speichern"
            style={[styles.primaryButton, isSubmitting ? styles.buttonDisabled : null]}
            onPress={() => void handleSubmit()}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={theme.surface} />
            ) : (
              <Text style={styles.primaryButtonText}>Fallwild speichern</Text>
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fallwild-Warteschlange senden"
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
          accessibilityLabel="Fallwild aktualisieren"
          style={[styles.refreshButton, isRefreshing ? styles.buttonDisabled : null]}
          onPress={() => void loadFallwild({ refreshing: true })}
          disabled={isRefreshing}
        >
          {isRefreshing ? <ActivityIndicator color={theme.ink} /> : <Text style={styles.refreshButtonText}>Aktualisieren</Text>}
        </Pressable>
      </View>

      <View style={styles.filterSection}>
        <SearchInput
          value={filter.search}
          onChangeText={(text) => setFilter((current) => ({ ...current, search: text }))}
          placeholder="Suche Wildart, Gemeinde, Notiz ..."
          accessibilityLabel="Fallwild durchsuchen"
        />
        <View style={styles.filterGroup}>
          <Text style={styles.filterEyebrow}>Bergung</Text>
          <FilterChipRow<BergungsStatusFilter>
            value={filter.bergungsStatus}
            onChange={(key) => setFilter((current) => ({ ...current, bergungsStatus: key }))}
            accessibilityLabel="Bergungsstatus filtern"
            options={[
              { key: "alle", label: "Alle" },
              { key: "erfasst", label: "Erfasst" },
              { key: "geborgen", label: "Geborgen" },
              { key: "entsorgt", label: "Entsorgt" },
              { key: "an-behoerde-gemeldet", label: "Behörde" }
            ]}
          />
        </View>
        <View style={styles.filterGroup}>
          <Text style={styles.filterEyebrow}>Zeitraum</Text>
          <FilterChipRow<ZeitraumFilter>
            value={filter.zeitraum}
            onChange={(key) => setFilter((current) => ({ ...current, zeitraum: key }))}
            accessibilityLabel="Zeitraum filtern"
            options={[
              { key: "alle", label: "Alle" },
              { key: "heute", label: "Heute" },
              { key: "woche", label: "7 Tage" },
              { key: "monat", label: "30 Tage" }
            ]}
          />
        </View>
        <View style={styles.filterGroup}>
          <Text style={styles.filterEyebrow}>Sortierung</Text>
          <FilterChipRow<FallwildSortKey>
            value={filter.sort}
            onChange={(key) => setFilter((current) => ({ ...current, sort: key }))}
            accessibilityLabel="Sortierung waehlen"
            options={[
              { key: "neueste-zuerst", label: "Neueste zuerst" },
              { key: "aelteste-zuerst", label: "Älteste zuerst" },
              { key: "nach-wildart", label: "Nach Wildart" },
              { key: "nach-gemeinde", label: "Nach Gemeinde" }
            ]}
          />
        </View>
        {filterActive ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Filter zurücksetzen"
            onPress={() => setFilter(DEFAULT_FALLWILD_FILTER)}
            style={({ pressed }) => [styles.filterReset, pressed ? styles.buttonDisabled : null]}
          >
            <Text style={styles.filterResetText}>
              Filter zurücksetzen ({visibleFallwild.length}/{fallwild.length})
            </Text>
          </Pressable>
        ) : null}
      </View>

      {isLoading ? (
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>Fallwild wird geladen</Text>
          <Text style={styles.stateCopy}>Die aktuelle Liste wird über die API abgefragt.</Text>
        </View>
      ) : null}

      {queueEntries.length > 0 ? (
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>Offline-Vormerkungen</Text>
          {queueEntries.slice(0, 3).map((entry) => (
            <View key={entry.id} style={styles.queueRow}>
              <Text style={styles.queueRowTitle}>{entry.title}</Text>
              <Text style={styles.queueRowCopy}>{getOfflineQueueEntryStatusLine(entry)}</Text>
              <Text style={styles.queueRowCopy}>{getOfflineQueueEntryAttachmentHint(entry)}</Text>
              {getOfflineQueueEntryRetryHint(entry) ? (
                <Text style={styles.queueRowCopy}>{getOfflineQueueEntryRetryHint(entry)}</Text>
              ) : null}
              {entry.lastError ? <Text style={styles.queueRowCopy}>{entry.lastError}</Text> : null}
              {entry.status === "failed" || entry.status === "conflict" ? (
                <View style={styles.queueActionRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Fallwild-Eintrag ${entry.title} erneut versuchen`}
                    style={[styles.retryButton, retryingEntryId === entry.id ? styles.buttonDisabled : null]}
                    onPress={() => void handleRetryQueueEntry(entry.id)}
                    disabled={retryingEntryId === entry.id}
                  >
                    <Text style={styles.retryButtonText}>
                      {retryingEntryId === entry.id ? "..." : "Erneut versuchen"}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Fallwild-Eintrag ${entry.title} verwerfen`}
                    style={[styles.discardButton, discardingEntryId === entry.id ? styles.buttonDisabled : null]}
                    onPress={() => void handleDiscardQueueEntry(entry.id)}
                    disabled={discardingEntryId === entry.id}
                  >
                    <Text style={styles.discardButtonText}>
                      {discardingEntryId === entry.id ? "..." : "Verwerfen"}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ))}
          {queueEntries.length > 3 ? (
            <Text style={styles.queueRowCopy}>{`${queueEntries.length - 3} weitere Einträge in der Queue.`}</Text>
          ) : null}
        </View>
      ) : null}

      {mode === "karte" && !isLoading ? (
        <EntityMap
          pins={pins}
          pinColor={theme.warning}
          height={MAP_HEIGHT}
          onPinPress={(pin) => {
            const target = visibleFallwild.find((entry) => entry.id === pin.id);
            if (target) {
              setSelectedPin({ type: "fallwild", data: target });
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
              onRefresh={() => void loadFallwild({ refreshing: true })}
            />
          }
          contentContainerStyle={styles.listContent}
          style={styles.listScroll}
        >
          {!isLoading && !error && visibleFallwild.length === 0 ? (
            <View style={styles.stateCard}>
              <Text style={styles.stateTitle}>
                {fallwild.length === 0 ? "Kein Fallwild gemeldet" : "Keine Treffer"}
              </Text>
              <Text style={styles.stateCopy}>
                {fallwild.length === 0
                  ? "Sobald ein Vorgang erfasst ist, erscheint er hier."
                  : "Mit den aktuellen Filtern findet sich kein Eintrag. Filter zurücksetzen oder Suchbegriff anpassen."}
              </Text>
            </View>
          ) : null}

          {visibleFallwild.map((entry) => (
            <View key={entry.id} style={styles.card}>
              <View style={styles.row}>
                <View style={styles.grow}>
                  <Text style={styles.title}>
                    {entry.wildart} / {entry.gemeinde}
                  </Text>
                  <Text style={styles.copy}>
                    {formatGeschlechtLabel(entry.geschlecht)}, {formatAltersklasseLabel(entry.altersklasse)}
                  </Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{formatBergungsStatusLabel(entry.bergungsStatus)}</Text>
                </View>
              </View>

              <Text style={styles.copy}>{entry.location.label ?? "Ohne Standort"}</Text>
              {entry.location.addressLabel ? (
                <Text style={styles.copy}>{entry.location.addressLabel}</Text>
              ) : null}
              <Text style={styles.copy}>{formatDateTime(entry.recordedAt)}</Text>
              {entry.strasse ? <Text style={styles.copy}>{entry.strasse}</Text> : null}
              {entry.roadReference?.roadKilometer ? (
                <Text style={styles.copy}>Straßenkilometer {entry.roadReference.roadKilometer}</Text>
              ) : null}
              {entry.note ? <Text style={styles.copy}>{entry.note}</Text> : null}
              {entry.photos.length > 0 ? (
                <Text style={styles.copy}>{formatPhotoCount(entry.photos.length)}</Text>
              ) : null}
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
  setForm: Dispatch<SetStateAction<FallwildFormState>>,
  key: keyof FallwildFormState
) {
  return (value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };
}

function updateRoadKilometer(setForm: Dispatch<SetStateAction<FallwildFormState>>) {
  return (value: string) => {
    setForm((current) => ({
      ...current,
      roadKilometer: value,
      roadKilometerSource: value.trim().length > 0 ? "manual" : current.roadKilometerSource
    }));
  };
}

function updateChoice<Key extends keyof Pick<FallwildFormState, "wildart" | "geschlecht" | "altersklasse" | "bergungsStatus">>(
  setForm: Dispatch<SetStateAction<FallwildFormState>>,
  key: Key
) {
  return (value: FallwildFormState[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };
}

function buildFallwildPayload(form: FallwildFormState): CreateFallwildRequest {
  const gemeinde = form.gemeinde.trim();

  if (!gemeinde) {
    throw new Error("Bitte eine Gemeinde eingeben.");
  }

  const locationFallback =
    trimToUndefined(form.locationLabel) ??
    trimToUndefined(form.strasse) ??
    trimToUndefined(form.addressLabel) ??
    "Aktueller Standort";
  const location = buildGeoPoint(form.lat, form.lng, form.locationLabel, locationFallback);
  const accuracyMeters = parseOptionalPositiveNumber(form.accuracyMeters);

  return {
    recordedAt: new Date().toISOString(),
    location: {
      ...location,
      accuracyMeters,
      source: form.locationSource,
      addressLabel: trimToUndefined(form.addressLabel),
      placeId: trimToUndefined(form.googlePlaceId)
    },
    wildart: form.wildart,
    geschlecht: form.geschlecht,
    altersklasse: form.altersklasse,
    bergungsStatus: form.bergungsStatus,
    gemeinde,
    strasse: trimToUndefined(form.strasse),
    roadReference: buildFallwildRoadReference({
      roadName: trimToUndefined(form.strasse) ?? form.roadName,
      roadKilometer: form.roadKilometer,
      roadKilometerSource: form.roadKilometerSource
    }),
    note: trimToUndefined(form.note)
  };
}

function parseOptionalPositiveNumber(value: string): number | undefined {
  const normalized = value.replace(",", ".").trim();

  if (!normalized) {
    return undefined;
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("GPS-Genauigkeit muss eine positive Zahl sein.");
  }

  return parsed;
}

function formatPhotoCount(count: number) {
  return count === 1 ? "1 Foto" : `${count} Fotos`;
}

function formatPhotoVerb(count: number) {
  return count === 1 ? "wurde" : "wurden";
}

function removeAttachment(setAttachments: Dispatch<SetStateAction<LocalPendingPhoto[]>>, photoId: string) {
  return () => {
    setAttachments((current) => current.filter((photo) => photo.id !== photoId));
  };
}

function formatGeschlechtLabel(value: CreateFallwildRequest["geschlecht"]) {
  switch (value) {
    case "maennlich":
      return "männlich";
    default:
      return value;
  }
}

function formatAltersklasseLabel(value: CreateFallwildRequest["altersklasse"]) {
  switch (value) {
    case "Jaehrling":
      return "Jährling";
    default:
      return value;
  }
}

function formatBergungsStatusLabel(value: CreateFallwildRequest["bergungsStatus"]) {
  switch (value) {
    case "an-behoerde-gemeldet":
      return "an Behörde gemeldet";
    default:
      return value;
  }
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
  smartDefaultsBanner: {
    gap: 4,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(157, 179, 111, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(36, 73, 58, 0.18)",
    marginTop: 4
  },
  smartDefaultsEyebrow: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    color: theme.accent,
    fontWeight: "700"
  },
  smartDefaultsTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.ink
  },
  smartDefaultsCopy: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.muted
  },
  refreshButton: {
    minWidth: 132,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: theme.card
  },
  buttonDisabled: {
    opacity: 0.7
  },
  refreshButtonText: {
    color: theme.ink,
    fontWeight: "600"
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
  locationActionCard: {
    gap: 8,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#f3ecdf"
  },
  locationButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: theme.accent
  },
  locationButtonText: {
    color: theme.surface,
    fontSize: 14,
    fontWeight: "700"
  },
  locationHint: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.ink
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
  photoSection: {
    gap: 10,
    paddingTop: 4
  },
  photoActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  helperCopy: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.muted
  },
  photoCameraButton: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: theme.accent
  },
  photoCameraButtonText: {
    color: theme.surface,
    fontSize: 14,
    fontWeight: "700"
  },
  photoPickerButton: {
    flex: 1,
    minWidth: 138,
    minHeight: 48,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "#e8dfcc"
  },
  photoPickerButtonText: {
    color: theme.ink,
    fontSize: 13,
    fontWeight: "700"
  },
  photoPreviewList: {
    gap: 10
  },
  photoPreviewCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 18,
    backgroundColor: "#f3ecdf"
  },
  photoPreviewImage: {
    width: 68,
    height: 68,
    borderRadius: 14,
    backgroundColor: "#d5cbb8"
  },
  photoPreviewMeta: {
    flex: 1,
    gap: 3
  },
  photoPreviewTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.ink
  },
  photoPreviewCopy: {
    fontSize: 12,
    lineHeight: 16,
    color: theme.muted
  },
  photoRemoveButton: {
    minHeight: 36,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "#ddcfb7"
  },
  photoRemoveButtonText: {
    color: theme.ink,
    fontSize: 12,
    fontWeight: "700"
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
  feedbackCard: {
    gap: 6,
    padding: 18,
    borderRadius: 22
  },
  feedbackCardSuccess: {
    backgroundColor: "#e3ecd7"
  },
  feedbackCardWarning: {
    backgroundColor: "#efe3d1"
  },
  stateCard: {
    gap: 6,
    padding: 18,
    borderRadius: 22,
    backgroundColor: theme.card
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
  queueCard: {
    gap: 6,
    padding: 12,
    borderRadius: 14,
    backgroundColor: theme.accent
  },
  queueTitle: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    fontWeight: "700",
    color: "#f7f2e5"
  },
  queueValue: {
    fontSize: 26,
    fontWeight: "700",
    color: "#fff9ef"
  },
  queueCopy: {
    fontSize: 12,
    lineHeight: 16,
    color: "#f7f2e5"
  },
  card: {
    gap: 6,
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
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#efe3d1"
  },
  badgeText: {
    color: theme.warning,
    fontWeight: "600"
  },
  queueRow: {
    gap: 4
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
  },
  queueActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingTop: 4
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: theme.accent
  },
  retryButtonText: {
    color: theme.surface,
    fontSize: 12,
    fontWeight: "700"
  },
  discardButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#ddcfb7"
  },
  discardButtonText: {
    color: theme.ink,
    fontSize: 12,
    fontWeight: "700"
  }
}) as const;
