import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import type { LocationWeather } from "@hege/domain";
import { EntityMap, type EntityPin } from "./entity-map";
import { FeedbackBanner } from "./feedback-banner";
import { fetchLocationWeather } from "../lib/api";
import { currentWind } from "../lib/facility-map-overlays";
import { formatDirection } from "../lib/reviereinrichtung";
import { useThemeColors } from "../lib/theme";

export function FacilityOutlookMap({ pin, refreshKey }: { pin: EntityPin; refreshKey: number }) {
  const theme = useThemeColors();
  const [weather, setWeather] = useState<LocationWeather | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    let active = true;
    setWeather(null); setLoading(true); setFailed(false);
    void fetchLocationWeather(pin.location.lat, pin.location.lng)
      .then(result => { if (active) { setWeather(result); setNow(Date.now()); } })
      .catch(() => { if (active) setFailed(true); })
      .finally(() => { if (active) setLoading(false); });
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => { active = false; clearInterval(timer); };
  }, [pin.id, pin.location.lat, pin.location.lng, refreshKey]);
  const wind = currentWind(weather, now);
  const number = (value: number) => value.toLocaleString("de-AT", { maximumFractionDigits: 1 });
  const time = (value: string) => new Date(value).toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" });
  return <View style={{ gap: 10 }} testID="facility-outlook">
    <EntityMap pins={[{ ...pin, windFromDegrees: wind.state === "current" ? wind.fromDegrees : undefined }]} height={320} testID="reviereinrichtung-detail-map" />
    <Text style={{ color: theme.ink, fontWeight: "600", lineHeight: 22 }} testID="facility-view-legend">
      {pin.orientationDegrees === undefined ? "Keine Blickrichtung hinterlegt." : `Goldener Trichter: Blickrichtung ${formatDirection(pin.orientationDegrees)}.`}
    </Text>
    <Text style={{ color: theme.muted, lineHeight: 20 }}>Blickfeld schematisch · 60° Öffnung. Gelände und Hindernisse werden nicht berücksichtigt.</Text>
    {loading ? <Text style={{ color: theme.muted }}>Wind wird geladen …</Text> : wind.state === "current" && weather ? <>
      <Text style={{ color: theme.ink, fontWeight: "600", lineHeight: 22 }} testID="facility-wind-legend">{`Blauer Pfeil: Wind aus ${formatDirection(wind.fromDegrees)} · ${number(weather.windSpeedKmh!)} km/h`}</Text>
      <Text style={{ color: theme.muted, lineHeight: 20 }}>Der Pfeil zeigt, wohin der Wind weht.</Text>
      {weather.windGustKmh !== undefined ? <Text style={{ color: theme.ink }}>Böen: {number(weather.windGustKmh)} km/h</Text> : null}
    </> : <FeedbackBanner tone="warning" title={wind.state === "calm" ? "Nahezu windstill" : wind.state === "stale" ? "Winddaten sind veraltet" : "Wind derzeit nicht verfügbar"} description={wind.state === "calm" ? "Unter 1 km/h – kein verlässlicher Richtungspfeil." : failed ? "Wetterabruf fehlgeschlagen. Zum erneuten Laden nach unten ziehen." : "Es wird kein Windpfeil angezeigt. Zum Aktualisieren nach unten ziehen."} />}
    {weather ? <>
      <Text style={{ color: theme.muted, lineHeight: 20 }}>GeoSphere Austria · Stand {new Date(weather.validAt ?? weather.retrievedAt).toLocaleString("de-AT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</Text>
      <Text style={{ color: theme.ink, lineHeight: 22 }}>Sonnenaufgang {time(weather.sunriseAt)} · Sonnenuntergang {time(weather.sunsetAt)}</Text>
    </> : null}
  </View>;
}
