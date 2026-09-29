import { useEffect, useState } from "react";
import { AppState, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { LocationWeather } from "@hege/domain";
import { EntityMap, type EntityPin } from "./entity-map";
import { Disclosure } from "./disclosure";
import { fetchLocationWeather } from "../lib/api";
import { currentWind } from "../lib/facility-map-overlays";
import {
  formatCardinalDirection,
  formatDirection,
} from "../lib/reviereinrichtung";
import { useThemeColors } from "../lib/theme";

export function FacilityOutlookMap({
  pin,
  refreshKey,
}: {
  pin: EntityPin;
  refreshKey: number;
}) {
  const theme = useThemeColors();
  const [weather, setWeather] = useState<LocationWeather | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    let active = true,
      inFlight = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    setWeather(null);
    async function load(attempt = 0) {
      if (!active || inFlight || AppState.currentState === "background") return;
      inFlight = true;
      setLoading(true);
      if (retry) clearTimeout(retry);
      try {
        const result = await fetchLocationWeather(
          pin.location.lat,
          pin.location.lng,
        );
        if (!active) return;
        setWeather(result);
        setNow(Date.now());
        if (!result.weatherAvailable && attempt === 0)
          retry = setTimeout(() => void load(1), 30_000);
      } catch {
        if (active && attempt === 0)
          retry = setTimeout(() => void load(1), 30_000);
      } finally {
        inFlight = false;
        if (active) setLoading(false);
      }
    }
    void load();
    const clock = setInterval(() => setNow(Date.now()), 60_000);
    const refresh = setInterval(() => void load(), 5 * 60_000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        setNow(Date.now());
        void load();
      }
    });
    return () => {
      active = false;
      clearInterval(clock);
      clearInterval(refresh);
      if (retry) clearTimeout(retry);
      subscription.remove();
    };
  }, [pin.id, pin.location.lat, pin.location.lng, refreshKey]);
  const wind = currentWind(weather, now);
  const number = (value: number) =>
    value.toLocaleString("de-AT", { maximumFractionDigits: 1 });
  const time = (value: string) =>
    new Date(value).toLocaleTimeString("de-AT", {
      hour: "2-digit",
      minute: "2-digit",
    });
  const windLabel =
    wind.state === "current" && weather
      ? `aus ${formatCardinalDirection(wind.fromDegrees)} · ${number(weather.windSpeedKmh!)} km/h`
      : loading
        ? "Wird geladen …"
        : wind.state === "calm"
          ? "Nahezu windstill"
          : wind.state === "stale"
            ? "Daten veraltet"
            : "Derzeit nicht verfügbar";
  return (
    <View style={{ gap: 4 }} testID="facility-outlook">
      <EntityMap
        pins={[
          {
            ...pin,
            windFromDegrees:
              wind.state === "current" ? wind.fromDegrees : undefined,
          },
        ]}
        height={350}
        northUp
        testID="reviereinrichtung-detail-map"
        overlay={
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              backgroundColor: theme.card,
              borderRadius: 14,
              padding: 10,
            }}
          >
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: "#0284C7",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name={wind.state === "current" ? "arrow-up" : "cloud-outline"}
                size={25}
                color="#FFFFFF"
                style={
                  wind.state === "current"
                    ? {
                        transform: [
                          { rotate: `${(wind.fromDegrees + 180) % 360}deg` },
                        ],
                      }
                    : undefined
                }
              />
            </View>
            <View style={{ flexShrink: 1 }}>
              <Text style={{ color: theme.muted, fontSize: 11 }}>WIND</Text>
              <Text
                style={{ color: theme.ink, fontSize: 13, fontWeight: "700" }}
                testID="facility-wind-legend"
              >
                {windLabel}
              </Text>
            </View>
          </View>
        }
      />
      <Disclosure
        title="Wind- und Kartendetails"
        testID="facility-weather-details"
      >
        <Text style={{ color: theme.muted, lineHeight: 21 }}>
          Gold: Hauptblickrichtung
          {pin.orientationDegrees !== undefined
            ? ` ${formatDirection(pin.orientationDegrees)}`
            : " nicht hinterlegt"}
          . Helle Flächen: weitere Fenster. Blau: Der Pfeil zeigt, wohin der
          Wind weht. Die Karte ist nach Norden ausgerichtet.
        </Text>
        <Text style={{ color: theme.muted, lineHeight: 21 }}>
          Blickfelder sind schematisch (60°, 180 m). Gelände und Hindernisse
          werden nicht berücksichtigt.
        </Text>
        {wind.state !== "current" && !loading ? (
          <Text style={{ color: theme.muted, lineHeight: 21 }}>
            {wind.state === "calm"
              ? "Unter 1 km/h ist kein verlässlicher Richtungspfeil möglich."
              : "Ohne aktuelle Winddaten bleibt der Pfeil ausgeblendet. Der Abruf wird automatisch wiederholt; nach unten ziehen lädt ebenfalls neu."}
          </Text>
        ) : null}
        {weather ? (
          <>
            {weather.windGustKmh !== undefined ? (
              <Text style={{ color: theme.ink }}>
                Böen {number(weather.windGustKmh)} km/h
              </Text>
            ) : null}
            <Text style={{ color: theme.muted }}>
              GeoSphere Austria ·{" "}
              {new Date(weather.validAt ?? weather.retrievedAt).toLocaleString(
                "de-AT",
                {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                },
              )}
            </Text>
            <Text style={{ color: theme.ink }}>
              Sonnenaufgang {time(weather.sunriseAt)} · Sonnenuntergang{" "}
              {time(weather.sunsetAt)}
            </Text>
          </>
        ) : null}
      </Disclosure>
    </View>
  );
}
