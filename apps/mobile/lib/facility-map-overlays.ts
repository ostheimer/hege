import type { GeoPoint, LocationWeather } from "@hege/domain";

type Coordinate = { latitude: number; longitude: number };
const radians = Math.PI / 180;
export const VIEW_RADIUS_METERS = 180;
export const VIEW_ANGLE_DEGREES = 60;

/** Geografische Peilung: 0° Nord, 90° Ost; unabhängig von Kartenrotation. */
export function destination(origin: GeoPoint, bearing: number, meters: number): Coordinate {
  const distance = meters / 6371000;
  const latitude = origin.lat * radians;
  const longitude = origin.lng * radians;
  const angle = bearing * radians;
  const nextLat = Math.asin(Math.sin(latitude) * Math.cos(distance) + Math.cos(latitude) * Math.sin(distance) * Math.cos(angle));
  const nextLng = longitude + Math.atan2(Math.sin(angle) * Math.sin(distance) * Math.cos(latitude), Math.cos(distance) - Math.sin(latitude) * Math.sin(nextLat));
  return { latitude: nextLat / radians, longitude: ((nextLng / radians + 540) % 360) - 180 };
}

export function viewCone(location: GeoPoint, bearing: number | undefined): Coordinate[] {
  if (bearing === undefined || !Number.isFinite(bearing)) return [];
  const origin = { latitude: location.lat, longitude: location.lng };
  return [origin, ...Array.from({ length: 17 }, (_, i) => destination(location, bearing - VIEW_ANGLE_DEGREES / 2 + i * VIEW_ANGLE_DEGREES / 16, VIEW_RADIUS_METERS)), origin];
}

/** Meteorologische Richtung bezeichnet die Herkunft, der Pfeil die Strömung. */
export function windArrow(location: GeoPoint, fromDegrees: number) {
  const to = (fromDegrees + 180) % 360;
  const tip = destination(location, to, 145);
  const tipOrigin = { lat: tip.latitude, lng: tip.longitude };
  return {
    shaft: [destination(location, fromDegrees, 145), tip],
    head: [destination(tipOrigin, to + 150, 42), tip, destination(tipOrigin, to - 150, 42)]
  };
}

export function currentWind(weather: LocationWeather | null, now = Date.now()) {
  if (!weather?.weatherAvailable) return { state: "unavailable" as const };
  const at = Date.parse(weather.validAt ?? weather.retrievedAt);
  if (!Number.isFinite(at) || now - at > 90 * 60_000 || at - now > 15 * 60_000) return { state: "stale" as const };
  if (weather.windSpeedKmh === undefined || !Number.isFinite(weather.windSpeedKmh) || weather.windSpeedKmh < 0) return { state: "unavailable" as const };
  if (weather.windSpeedKmh < 1) return { state: "calm" as const };
  if (weather.windDirectionDegrees === undefined || !Number.isFinite(weather.windDirectionDegrees)) return { state: "unavailable" as const };
  return { state: "current" as const, fromDegrees: ((weather.windDirectionDegrees % 360) + 360) % 360 };
}

/** Breiter, gefüllter Windpfeil mit weißer Kontur auf der Karte. */
export function windArrowPolygon(location: GeoPoint, fromDegrees: number): Coordinate[] {
  const toward = (fromDegrees + 180) % 360;
  const origin = destination(location, fromDegrees, 150);
  const neck = destination(location, toward, 80);
  const offset = (point: Coordinate, bearing: number, meters: number) => destination({ lat: point.latitude, lng: point.longitude }, bearing, meters);
  return [offset(origin, toward - 90, 9), offset(neck, toward - 90, 9), offset(neck, toward - 90, 32), destination(location, toward, 145), offset(neck, toward + 90, 32), offset(neck, toward + 90, 9), offset(origin, toward + 90, 9), offset(origin, toward - 90, 9)];
}
