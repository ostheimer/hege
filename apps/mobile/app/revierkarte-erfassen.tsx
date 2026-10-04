import { useEffect, useReducer, useRef, useState } from "react";
import { Alert, AppState, Platform, Pressable, Text, View } from "react-native";
import { Redirect } from "expo-router";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MapView, { Marker, Polyline, Polygon } from "react-native-maps";
import {
  boundaryDraftReducer,
  canRoleAccess,
  createGpsBoundary,
  mapBounds,
  validSample,
  type BoundarySample,
} from "@hege/domain";
import { ScreenShell } from "../components/screen-shell";
import { FeedbackBanner } from "../components/feedback-banner";
import { useSessionSnapshot } from "../lib/session";
import { useThemeColors } from "../lib/theme";
import { saveGpsBoundary } from "../lib/api";

export default function BoundaryScreen() {
  const { session, status } = useSessionSnapshot();
  if (status === "loading") return null;
  if (!session || status !== "authenticated") return <Redirect href="/login" />;
  if (!canRoleAccess(session.membership.role, "revier-map-manage"))
    return <Redirect href="/" />;
  const owner = `${session.user.id}:${session.membership.id}`;
  return (
    <Recorder key={owner} owner={owner} revierName={session.revier.name} />
  );
}

function Recorder({
  owner,
  revierName,
}: {
  owner: string;
  revierName: string;
}) {
  const theme = useThemeColors();
  const [draft, dispatch] = useReducer(boundaryDraftReducer, {
    samples: [],
    history: [],
  });
  const { samples } = draft;
  const [mode, setMode] = useState<"manual" | "automatic">("manual");
  const [position, setPosition] = useState<BoundarySample | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const [addOnMap, setAddOnMap] = useState(false);
  const [pointPage, setPointPage] = useState(0);
  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const subscription = useRef<Location.LocationSubscription | null>(null);
  const generation = useRef(0);
  const writes = useRef(Promise.resolve());
  const mounted = useRef(true);
  const storageKey = `hege.boundary-draft.v1:${owner}`;

  function pause() {
    generation.current++;
    subscription.current?.remove();
    subscription.current = null;
    setRecording(false);
  }
  useEffect(() => {
    mounted.current = true;
    let active = true;
    void AsyncStorage.getItem(storageKey)
      .then((raw) => {
        if (!active) return;
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (
            !Array.isArray(parsed) ||
            parsed.length > 2000 ||
            !parsed.every((point) => point && validSample(point))
          )
            throw new Error("Gespeicherter Entwurf ist ungültig.");
          dispatch({ type: "load", samples: parsed });
        }
        setReady(true);
      })
      .catch((reason) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Entwurf konnte nicht geladen werden.",
          );
      });
    const listener = AppState.addEventListener("change", (state) => {
      if (
        state === "background" ||
        (state !== "active" && subscription.current)
      ) {
        const wasRecording = Boolean(subscription.current);
        pause();
        if (wasRecording)
          setMessage(
            "Aufzeichnung pausiert. Zum Fortsetzen App geöffnet lassen.",
          );
      }
    });
    return () => {
      active = false;
      mounted.current = false;
      generation.current++;
      subscription.current?.remove();
      listener.remove();
    };
  }, [storageKey]);
  useEffect(() => {
    if (!ready) return;
    // Reihenfolge beibehalten, damit eine langsamere alte Speicherung keine neuere überschreibt.
    writes.current = writes.current
      .then(() => AsyncStorage.setItem(storageKey, JSON.stringify(samples)))
      .catch(() => {
        if (mounted.current) {
          pause();
          setError("Lokale Sicherung fehlgeschlagen. Aufzeichnung pausiert.");
        }
      });
  }, [samples, ready, storageKey]);

  async function start() {
    const token = ++generation.current;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted")
        throw new Error("Standortfreigabe wird für die Aufzeichnung benötigt.");
      if (token !== generation.current || !mounted.current) return;
      const watcher = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 0,
          timeInterval: 1000,
        },
        (position) => {
          if (token !== generation.current || !mounted.current) return;
          const sample = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy ?? Infinity,
            timestamp: position.timestamp,
          };
          setAccuracy(position.coords.accuracy);
          setPosition(sample);
          if (!validSample(sample))
            setMessage(
              "GPS noch zu ungenau. Warten, bis die Genauigkeit höchstens 25 m beträgt.",
            );
          else setMessage(null);
          if (mode === "automatic")
            dispatch({ type: "add", sample, automatic: true });
        },
      );
      if (token !== generation.current || !mounted.current) {
        watcher.remove();
        return;
      }
      subscription.current = watcher;
      setRecording(true);
    } catch (reason) {
      if (mounted.current)
        setError(
          reason instanceof Error
            ? reason.message
            : "GPS konnte nicht gestartet werden.",
        );
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  let preview: ReturnType<typeof createGpsBoundary> | null = null;
  let validation = "Mindestens drei GPS-Punkte erfassen.";
  try {
    preview = createGpsBoundary(samples);
    validation =
      "Grenzentwurf ist geometrisch prüfbar. Die Verbindung zum Startpunkt wird geschlossen.";
  } catch (reason) {
    if (samples.length)
      validation = reason instanceof Error ? reason.message : validation;
  }
  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await writes.current;
      createGpsBoundary(samples);
      await saveGpsBoundary(samples);
      setMessage(
        "Reviergrenze gespeichert. Der lokale Entwurf bleibt als Sicherung erhalten.",
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Speichern fehlgeschlagen. Entwurf bleibt lokal erhalten.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function setPointHere() {
    const token = generation.current;
    setBusy(true);
    setError(null);
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const current = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        }),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(
            () =>
              reject(
                new Error(
                  "GPS antwortet noch nicht. Kurz warten und erneut versuchen.",
                ),
              ),
            12000,
          );
        }),
      ]);
      if (token !== generation.current || !mounted.current) return;
      const sample = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        accuracy: current.coords.accuracy ?? Infinity,
        timestamp: current.timestamp,
      };
      if (!validSample(sample) || Date.now() - sample.timestamp > 15000)
        throw new Error(
          "Noch kein genauer, aktueller GPS-Standort. Kurz warten.",
        );
      if (
        samples.some(
          (p) =>
            p.latitude === sample.latitude && p.longitude === sample.longitude,
        )
      )
        throw new Error(
          "Dieser Punkt ist bereits im Entwurf. Zum nächsten Grenzpunkt gehen.",
        );
      setPosition(sample);
      setAccuracy(sample.accuracy);
      dispatch({ type: "add", sample });
    } catch (reason) {
      if (mounted.current)
        setError(
          reason instanceof Error
            ? reason.message
            : "GPS-Punkt konnte nicht gesetzt werden.",
        );
    } finally {
      if (timeout) clearTimeout(timeout);
      if (mounted.current) setBusy(false);
    }
  }
  function button(
    label: string,
    onPress: () => void,
    disabled = false,
    testID?: string,
  ) {
    return (
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={{
          padding: 16,
          borderRadius: 16,
          backgroundColor: theme.accent,
          opacity: disabled ? 0.45 : 1,
        }}
      >
        <Text style={{ color: theme.onAccent, fontWeight: "700" }}>
          {label}
        </Text>
      </Pressable>
    );
  }
  return (
    <ScreenShell
      eyebrow="GPS-Grenzentwurf"
      title="Reviergrenze aufzeichnen"
      subtitle={revierName}
      testID="boundary-recorder"
      topSafeArea={false}
      compactHero
    >
      <Text style={{ color: theme.ink }}>
        Privater Grenzentwurf, keine amtliche Grenze. Nur im Stillstand
        bedienen; App geöffnet lassen.
      </Text>
      {error ? (
        <FeedbackBanner
          tone="danger"
          title="Hinweis zur Aufzeichnung"
          description={error}
        />
      ) : null}
      {message ? (
        <FeedbackBanner
          tone="success"
          title="Aufzeichnung"
          description={message}
        />
      ) : null}
      <Text testID="boundary-status" style={{ color: theme.ink }}>
        {samples.length} / 2000 Punkte ·{" "}
        {recording ? "Aufzeichnung aktiv" : "Pausiert"}
        {accuracy !== null ? ` · GPS ±${Math.round(accuracy)} m` : ""}
      </Text>
      <Text style={{ color: theme.ink }}>
        Nur Punkte mit höchstens 25 m Ungenauigkeit werden übernommen.
      </Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {(["manual", "automatic"] as const).map((value) => (
          <Pressable
            key={value}
            testID={`boundary-mode-${value}`}
            accessibilityRole="button"
            accessibilityState={{
              selected: mode === value,
              disabled: recording || busy,
            }}
            disabled={recording || busy}
            onPress={() => setMode(value)}
            style={{
              flex: 1,
              padding: 14,
              borderRadius: 12,
              backgroundColor: mode === value ? theme.accent : theme.card,
            }}
          >
            <Text
              style={{ color: mode === value ? theme.onAccent : theme.ink }}
            >
              {value === "manual"
                ? "Gezielt Punkte setzen"
                : "Automatisch aufzeichnen"}
            </Text>
          </Pressable>
        ))}
      </View>
      {button(
        recording
          ? "GPS pausieren"
          : mode === "manual"
            ? "GPS starten"
            : samples.length
              ? "Aufzeichnung fortsetzen"
              : "Aufzeichnung starten",
        () => (recording ? pause() : void start()),
        !ready || busy || (samples.length >= 2000 && !recording),
        "boundary-start-pause",
      )}
      <Text style={{ color: theme.ink }}>
        {mode === "manual"
          ? "GPS zeigt deinen Standort. Nur mit der Taste wird ein Grenzpunkt übernommen."
          : "Gültige GPS-Punkte werden während der Bewegung automatisch ergänzt."}
      </Text>
      {mode === "manual"
        ? button(
            "Punkt hier setzen",
            () => void setPointHere(),
            !recording ||
              busy ||
              !position ||
              !validSample(position) ||
              samples.length >= 2000,
            "boundary-set-point",
          )
        : null}
      {Platform.OS === "ios" && (position || samples.length) ? (
        <MapView
          style={{ height: 280 }}
          testID="boundary-map"
          showsUserLocation
          rotateEnabled={false}
          initialRegion={
            preview
              ? mapBounds(preview.areas)!
              : {
                  latitude: (samples[0] ?? position!).latitude,
                  longitude: (samples[0] ?? position!).longitude,
                  latitudeDelta: 0.004,
                  longitudeDelta: 0.004,
                }
          }
          onPress={(event) => {
            if (!addOnMap || recording || busy) return;
            dispatch({
              type: "add",
              sample: {
                ...event.nativeEvent.coordinate,
                accuracy: 0,
                timestamp: Date.now(),
                source: "manual",
              },
            });
          }}
        >
          <Polyline
            coordinates={samples}
            strokeColor={theme.accent}
            strokeWidth={3}
          />
          {preview ? (
            <Polygon
              coordinates={preview.areas[0].polygons[0][0].map(
                ([longitude, latitude]) => ({ latitude, longitude }),
              )}
              fillColor="rgba(36,97,62,0.15)"
              strokeColor={theme.accent}
            />
          ) : null}
          {samples.map((sample, index) => (
            <Marker
              key={index}
              coordinate={sample}
              title={`Punkt ${index + 1}`}
              draggable={!recording && !busy}
              pinColor={selectedPoint === index ? "#CAAE42" : theme.accent}
              onPress={() => {
                setSelectedPoint(index);
                setPointPage(Math.floor(index / 20));
              }}
              onDragEnd={(event) =>
                dispatch({
                  type: "move",
                  index,
                  sample: {
                    ...event.nativeEvent.coordinate,
                    accuracy: 0,
                    timestamp: Date.now(),
                    source: "manual",
                  },
                })
              }
            />
          ))}
        </MapView>
      ) : null}
      {!recording && samples.length ? (
        <>
          <Text style={{ color: theme.ink }}>
            Punkte auf der Karte gedrückt halten und verschieben. Zum Entfernen
            einen Punkt auswählen.
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {samples
              .slice(
                Math.min(pointPage, Math.floor((samples.length - 1) / 20)) * 20,
                (Math.min(pointPage, Math.floor((samples.length - 1) / 20)) +
                  1) *
                  20,
              )
              .map((_, offset) => {
                const index =
                  Math.min(pointPage, Math.floor((samples.length - 1) / 20)) *
                    20 +
                  offset;
                return (
                  <Pressable
                    key={index}
                    testID={`boundary-point-${index}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedPoint === index }}
                    onPress={() => {
                      setSelectedPoint(index);
                      setPointPage(Math.floor(index / 20));
                    }}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      backgroundColor:
                        selectedPoint === index ? theme.accent : theme.card,
                    }}
                  >
                    <Text
                      style={{
                        color:
                          selectedPoint === index ? theme.onAccent : theme.ink,
                      }}
                    >
                      {index + 1}
                    </Text>
                  </Pressable>
                );
              })}
          </View>
          {samples.length > 20 ? (
            <View style={{ gap: 8 }}>
              {button(
                "Vorherige Punkte",
                () => setPointPage((value) => Math.max(0, value - 1)),
                busy || pointPage === 0,
              )}
              {button(
                "Weitere Punkte",
                () => setPointPage((value) => value + 1),
                busy || (pointPage + 1) * 20 >= samples.length,
              )}
            </View>
          ) : null}
          {button(
            addOnMap
              ? "Ergänzen auf Karte beenden"
              : "Punkt auf Karte ergänzen",
            () => setAddOnMap((value) => !value),
            busy || samples.length >= 2000,
            "boundary-add-map",
          )}
          {button(
            selectedPoint !== null
              ? `Punkt ${selectedPoint + 1} entfernen`
              : "Punkt zum Entfernen auswählen",
            () => {
              if (selectedPoint !== null)
                dispatch({ type: "remove", index: selectedPoint });
              setSelectedPoint(null);
            },
            busy || selectedPoint === null || !samples[selectedPoint],
            "boundary-remove-point",
          )}
        </>
      ) : null}
      {button(
        "Letzten Punkt entfernen",
        () => {
          dispatch({ type: "remove", index: samples.length - 1 });
          setSelectedPoint(null);
        },
        recording || busy || !samples.length,
        "boundary-remove-last",
      )}
      {button(
        "Letzten Schritt rückgängig machen",
        () => {
          dispatch({ type: "undo" });
          setSelectedPoint(null);
        },
        recording || busy || !draft.history.length,
        "boundary-undo",
      )}
      <Text style={{ color: theme.ink }}>{validation}</Text>
      {button(
        "Als Reviergrenze übernehmen",
        () =>
          Alert.alert(
            "Grenzentwurf übernehmen?",
            "Die gezeigte Linie wird zum Startpunkt geschlossen. Bestehende Karten werden nicht überschrieben. Bitte Grenze vorher kontrollieren.",
            [
              { text: "Abbrechen", style: "cancel" },
              { text: "Übernehmen", onPress: () => void submit() },
            ],
          ),
        !preview || recording || busy || !ready,
      )}
      {button(
        "Lokalen Entwurf verwerfen",
        () =>
          Alert.alert(
            "Entwurf verwerfen?",
            "Nur diese lokale GPS-Aufzeichnung wird gelöscht. Die gespeicherte Revierkarte bleibt unverändert.",
            [
              { text: "Abbrechen", style: "cancel" },
              {
                text: "Verwerfen",
                style: "destructive",
                onPress: () => {
                  dispatch({ type: "clear" });
                  setSelectedPoint(null);
                  setMessage(null);
                },
              },
            ],
          ),
        recording || busy || !samples.length,
      )}
    </ScreenShell>
  );
}
