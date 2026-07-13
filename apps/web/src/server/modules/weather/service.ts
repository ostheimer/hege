import type { GeoPoint, LocationWeather } from "@hege/domain";
import * as SunCalc from "suncalc";

const GEOSPHERE_ENDPOINT =
  "https://dataset.api.hub.geosphere.at/v1/timeseries/forecast/nowcast-v1-15min-1km";
const WEATHER_PARAMETERS = "t2m,ff,dd,fx,rr";
const REQUEST_TIMEOUT_MS = 5_000;
const CACHE_TTL_MS = 5 * 60 * 1_000;

interface WeatherServiceOptions {
  fetcher?: typeof fetch;
  now?: () => Date;
}

interface CachedWeather {
  expiresAt: number;
  value: LocationWeather;
}

const cache = new Map<string, CachedWeather>();

export async function getLocationWeather(
  location: GeoPoint,
  { fetcher = fetch, now = () => new Date() }: WeatherServiceOptions = {}
): Promise<LocationWeather> {
  assertCoordinates(location);
  const currentTime = now();
  const cacheKey = `${location.lat.toFixed(3)},${location.lng.toFixed(3)}`;
  const cached = cache.get(cacheKey);

  if (cached && cached.expiresAt > currentTime.valueOf()) {
    return cached.value;
  }

  const sunTimes = getSunTimes(currentTime, location);
  let conditions: GeoSphereConditions | undefined;

  try {
    conditions = await fetchGeoSphereConditions(location, currentTime, fetcher);
  } catch {
    conditions = undefined;
  }

  const value: LocationWeather = {
    source: "geosphere-austria",
    retrievedAt: currentTime.toISOString(),
    validAt: conditions?.validAt,
    location,
    weatherAvailable: conditions !== undefined,
    temperatureC: conditions?.temperatureC,
    windSpeedKmh: conditions?.windSpeedKmh,
    windDirectionDegrees: conditions?.windDirectionDegrees,
    windGustKmh: conditions?.windGustKmh,
    precipitationMm: conditions?.precipitationMm,
    ...sunTimes
  };

  cache.set(cacheKey, {
    expiresAt: currentTime.valueOf() + CACHE_TTL_MS,
    value
  });

  return value;
}

interface GeoSphereConditions {
  validAt: string;
  temperatureC: number;
  windSpeedKmh: number;
  windDirectionDegrees: number;
  windGustKmh: number;
  precipitationMm?: number;
}

async function fetchGeoSphereConditions(
  location: GeoPoint,
  now: Date,
  fetcher: typeof fetch
): Promise<GeoSphereConditions> {
  const url = new URL(GEOSPHERE_ENDPOINT);
  const end = new Date(now.valueOf() + 60 * 60 * 1_000);
  url.searchParams.set("lat_lon", `${location.lat},${location.lng}`);
  url.searchParams.set("parameters", WEATHER_PARAMETERS);
  url.searchParams.set("start", formatGeoSphereDate(now));
  url.searchParams.set("end", formatGeoSphereDate(end));
  url.searchParams.set("output_format", "geojson");

  const response = await fetcher(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });

  if (!response.ok) {
    throw new Error(`GeoSphere antwortete mit ${response.status}.`);
  }

  return parseGeoSphereResponse(await response.json());
}

function parseGeoSphereResponse(value: unknown): GeoSphereConditions {
  const root = asRecord(value);
  const timestamps = Array.isArray(root.timestamps) ? root.timestamps : [];
  const features = Array.isArray(root.features) ? root.features : [];
  const firstFeature = asRecord(features[0]);
  const properties = asRecord(firstFeature.properties);
  const parameters = asRecord(properties.parameters);

  if (timestamps.length === 0) {
    throw new Error("GeoSphere lieferte keinen Prognosezeitpunkt.");
  }

  return {
    validAt: parseTimestamp(timestamps[0]),
    temperatureC: firstParameterValue(parameters, "t2m"),
    windSpeedKmh: metersPerSecondToKmh(firstParameterValue(parameters, "ff")),
    windDirectionDegrees: normalizeDegrees(firstParameterValue(parameters, "dd")),
    windGustKmh: metersPerSecondToKmh(firstParameterValue(parameters, "fx")),
    precipitationMm: optionalFirstParameterValue(parameters, "rr")
  };
}

function getSunTimes(now: Date, location: GeoPoint) {
  const localDate = localCalendarDate(now);
  const times = SunCalc.getTimes(localDate, location.lat, location.lng);

  return {
    sunriseAt: times.sunrise.toISOString(),
    sunsetAt: times.sunset.toISOString(),
    dawnAt: times.dawn.toISOString(),
    duskAt: times.dusk.toISOString()
  };
}

function localCalendarDate(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Vienna",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(value);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return new Date(Date.UTC(read("year"), read("month") - 1, read("day"), 12));
}

function formatGeoSphereDate(value: Date) {
  return value.toISOString().slice(0, 16);
}

function firstParameterValue(parameters: Record<string, unknown>, key: string) {
  const value = optionalFirstParameterValue(parameters, key);

  if (value === undefined) {
    throw new Error(`GeoSphere-Parameter ${key} fehlt.`);
  }

  return value;
}

function optionalFirstParameterValue(parameters: Record<string, unknown>, key: string) {
  const parameter = asRecord(parameters[key]);
  const data = Array.isArray(parameter.data) ? parameter.data : [];
  const value = data[0];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function parseTimestamp(value: unknown) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new Error("GeoSphere-Zeitpunkt ist ungültig.");
  }

  return new Date(value).toISOString();
}

function metersPerSecondToKmh(value: number) {
  return round(value * 3.6, 1);
}

function normalizeDegrees(value: number) {
  return round(((value % 360) + 360) % 360, 0);
}

function round(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function assertCoordinates(location: GeoPoint) {
  if (
    !Number.isFinite(location.lat) ||
    !Number.isFinite(location.lng) ||
    location.lat < -90 ||
    location.lat > 90 ||
    location.lng < -180 ||
    location.lng > 180
  ) {
    throw Object.assign(new Error("Ungültige Koordinaten."), {
      status: 400,
      code: "validation-error"
    });
  }
}

export function clearWeatherCacheForTests() {
  cache.clear();
}
