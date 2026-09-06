import { useEffect, useRef, useState } from "react";
import { Alert, AppState, Platform, Pressable, Text, View } from "react-native";
import { Redirect } from "expo-router";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MapView, { Polyline, Polygon } from "react-native-maps";
import { acceptBoundarySample, canRoleAccess, createGpsBoundary, mapBounds, validSample, type BoundarySample } from "@hege/domain";
import { ScreenShell } from "../components/screen-shell";
import { FeedbackBanner } from "../components/feedback-banner";
import { useSessionSnapshot } from "../lib/session";
import { useThemeColors } from "../lib/theme";
import { saveGpsBoundary } from "../lib/api";

export default function BoundaryScreen() {
  const { session, status } = useSessionSnapshot();
  if (status === "loading") return null;
  if (!session || status !== "authenticated") return <Redirect href="/login" />;
  if (!canRoleAccess(session.membership.role, "revier-map-manage")) return <Redirect href="/" />;
  const owner = `${session.user.id}:${session.membership.id}`;
  return <Recorder key={owner} owner={owner} revierName={session.revier.name} />;
}

function Recorder({ owner, revierName }: { owner: string; revierName: string }) {
  const theme = useThemeColors();
  const [samples, setSamples] = useState<BoundarySample[]>([]);
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
    void AsyncStorage.getItem(storageKey).then(raw => {
      if (!active) return;
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed) || parsed.length > 2000 || !parsed.every(point => point && validSample(point))) throw new Error("Gespeicherter Entwurf ist ungültig.");
        setSamples(parsed);
      }
      setReady(true);
    }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Entwurf konnte nicht geladen werden."); });
    const listener = AppState.addEventListener("change", state => {
      if (state !== "active") {
        pause();
        setMessage("Aufzeichnung pausiert. Zum Fortsetzen App geöffnet lassen.");
      }
    });
    return () => { active = false; mounted.current = false; generation.current++; subscription.current?.remove(); listener.remove(); };
  }, [storageKey]);
  useEffect(() => {
    if (!ready) return;
    // Reihenfolge beibehalten, damit eine langsamere alte Speicherung keine neuere überschreibt.
    writes.current = writes.current.then(() => AsyncStorage.setItem(storageKey, JSON.stringify(samples)))
      .catch(() => { if (mounted.current) { pause(); setError("Lokale Sicherung fehlgeschlagen. Aufzeichnung pausiert."); } });
  }, [samples, ready, storageKey]);

  async function start() {
    const token = ++generation.current;
    setBusy(true); setError(null); setMessage(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") throw new Error("Standortfreigabe wird für die Aufzeichnung benötigt.");
      if (token !== generation.current || !mounted.current) return;
      const watcher = await Location.watchPositionAsync({ accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 3, timeInterval: 1000 }, position => {
        if (token !== generation.current || !mounted.current) return;
        const sample = { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy ?? Infinity, timestamp: position.timestamp };
        setAccuracy(position.coords.accuracy);
        setSamples(previous => acceptBoundarySample(previous, sample) ? [...previous, sample] : previous);
      });
      if (token !== generation.current || !mounted.current) { watcher.remove(); return; }
      subscription.current = watcher; setRecording(true);
    } catch (reason) { if (mounted.current) setError(reason instanceof Error ? reason.message : "GPS konnte nicht gestartet werden."); }
    finally { if (mounted.current) setBusy(false); }
  }
  let preview: ReturnType<typeof createGpsBoundary> | null = null;
  let validation = "Mindestens drei GPS-Punkte erfassen.";
  try { preview = createGpsBoundary(samples); validation = "Grenzentwurf ist geometrisch prüfbar. Die Verbindung zum Startpunkt wird geschlossen."; }
  catch (reason) { if (samples.length) validation = reason instanceof Error ? reason.message : validation; }
  async function submit() {
    setBusy(true); setError(null);
    try {
      await writes.current;
      createGpsBoundary(samples);
      await saveGpsBoundary(samples);
      setMessage("Reviergrenze gespeichert. Der lokale Entwurf bleibt als Sicherung erhalten.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Speichern fehlgeschlagen. Entwurf bleibt lokal erhalten."); }
    finally { setBusy(false); }
  }
  function button(label: string, onPress: () => void, disabled = false) {
    return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled}
      onPress={onPress} style={{ padding: 16, borderRadius: 16, backgroundColor: theme.accent, opacity: disabled ? 0.45 : 1 }}>
      <Text style={{ color: theme.onAccent, fontWeight: "700" }}>{label}</Text>
    </Pressable>;
  }
  return <ScreenShell eyebrow="GPS-Grenzentwurf" title="Reviergrenze aufzeichnen" subtitle={revierName} testID="boundary-recorder">
    <Text style={{ color: theme.ink }}>Nur im Stillstand bedienen. Die App muss geöffnet bleiben; im Hintergrund wird pausiert. GPS-Punkte werden als privater Entwurf auf diesem Gerät gesichert. Keine amtliche Grenzfeststellung.</Text>
    {error ? <FeedbackBanner tone="danger" title="Hinweis zur Aufzeichnung" description={error} /> : null}
    {message ? <FeedbackBanner tone="success" title="Aufzeichnung" description={message} /> : null}
    <Text style={{ color: theme.ink }}>{samples.length} / 2000 Punkte · {recording ? "Aufzeichnung aktiv" : "Pausiert"}{accuracy !== null ? ` · GPS ±${Math.round(accuracy)} m` : ""}</Text>
    <Text style={{ color: theme.ink }}>Nur Punkte mit höchstens 25 m Ungenauigkeit werden übernommen.</Text>
    {samples.length > 0 && Platform.OS === "ios" ? <MapView style={{ height: 280 }}
      initialRegion={preview ? mapBounds(preview.areas)! : { latitude: samples[0].latitude, longitude: samples[0].longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }}>
      <Polyline coordinates={samples} strokeColor={theme.accent} strokeWidth={3} />
      {preview ? <Polygon coordinates={preview.areas[0].polygons[0][0].map(([longitude,latitude]) => ({ latitude,longitude }))} fillColor="rgba(36,97,62,0.15)" strokeColor={theme.accent} /> : null}
    </MapView> : null}
    {button(recording ? "Pausieren / Beenden" : samples.length ? "Aufzeichnung fortsetzen" : "Aufzeichnung starten", () => recording ? pause() : void start(), !ready || busy || samples.length >= 2000 && !recording)}
    {button("Letzten Punkt entfernen", () => setSamples(previous => previous.slice(0,-1)), recording || busy || !samples.length)}
    <Text style={{ color: theme.ink }}>{validation}</Text>
    {button("Als Reviergrenze übernehmen", () => Alert.alert("Grenzentwurf übernehmen?", "Die gezeigte Linie wird zum Startpunkt geschlossen. Bestehende Karten werden nicht überschrieben. Bitte Grenze vorher kontrollieren.", [
      { text: "Abbrechen", style: "cancel" }, { text: "Übernehmen", onPress: () => void submit() }
    ]), !preview || recording || busy || !ready)}
    {button("Lokalen Entwurf verwerfen", () => Alert.alert("Entwurf verwerfen?", "Nur diese lokale GPS-Aufzeichnung wird gelöscht. Die gespeicherte Revierkarte bleibt unverändert.", [
      { text: "Abbrechen", style: "cancel" }, { text: "Verwerfen", style: "destructive", onPress: () => { setSamples([]); setMessage(null); } }
    ]), recording || busy || !samples.length)}
  </ScreenShell>;
}
