import type { MapCoordinate, RevierMapData } from "./revier-map";

export interface BoundarySample { latitude: number; longitude: number; accuracy: number; timestamp: number }
export function distanceMeters(a: BoundarySample, b: BoundarySample) {
  const rad = Math.PI / 180;
  const x = (b.longitude - a.longitude) * rad * Math.cos((a.latitude + b.latitude) / 2 * rad);
  const y = (b.latitude - a.latitude) * rad;
  return Math.hypot(x, y) * 6371000;
}
export function validSample(value: BoundarySample) {
  return [value.latitude, value.longitude, value.accuracy, value.timestamp].every(Number.isFinite)
    && Math.abs(value.latitude) <= 90 && Math.abs(value.longitude) <= 180
    && value.accuracy >= 0 && value.accuracy <= 25 && value.timestamp > 0;
}
export function acceptBoundarySample(samples: BoundarySample[], next: BoundarySample) {
  if (!validSample(next) || samples.length >= 2000) return false;
  const previous = samples.at(-1);
  if (!previous) return true;
  const distance = distanceMeters(previous, next);
  const seconds = (next.timestamp - previous.timestamp) / 1000;
  return seconds > 0 && distance >= 3 && distance / seconds <= 55;
}
function orientation(a: MapCoordinate, b: MapCoordinate, c: MapCoordinate) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}
function intersects(a: MapCoordinate, b: MapCoordinate, c: MapCoordinate, d: MapCoordinate) {
  if (Math.max(a[0], b[0]) < Math.min(c[0], d[0]) || Math.max(c[0], d[0]) < Math.min(a[0], b[0])
    || Math.max(a[1], b[1]) < Math.min(c[1], d[1]) || Math.max(c[1], d[1]) < Math.min(a[1], b[1])) return false;
  return orientation(a,b,c) * orientation(a,b,d) <= 0 && orientation(c,d,a) * orientation(c,d,b) <= 0;
}
export function createGpsBoundary(samples: BoundarySample[]): RevierMapData {
  if (!Array.isArray(samples) || samples.length < 3 || samples.length > 2000 || samples.some(point => !point || !validSample(point))) {
    throw new Error("Mindestens drei gültige GPS-Punkte mit höchstens 25 m Ungenauigkeit sind erforderlich.");
  }
  if (distanceMeters(samples[0]!, samples[samples.length - 1]!) > 100) throw new Error("Zum Startpunkt zurückkehren: Die Lücke darf höchstens 100 m betragen.");
  const ring: MapCoordinate[] = samples.map(point => [point.longitude, point.latitude]);
  if (ring[0]![0] === ring.at(-1)![0] && ring[0]![1] === ring.at(-1)![1]) ring.pop();
  if (new Set(ring.map(point => point.join(","))).size !== ring.length || ring.length < 3) throw new Error("Doppelte Grenzpunkte entfernen.");
  ring.push([...ring[0]!]);
  for (let i = 0; i < ring.length - 1; i++) for (let j = i + 2; j < ring.length - 1; j++) {
    if (i === 0 && j === ring.length - 2) continue;
    if (intersects(ring[i]!, ring[i+1]!, ring[j]!, ring[j+1]!)) throw new Error("Die Grenze überschneidet sich. Bitte die letzten Punkte korrigieren.");
  }
  const area = Math.abs(ring.slice(0,-1).reduce((sum, p, i) => sum + p[0]*ring[i+1]![1] - ring[i+1]![0]*p[1], 0));
  if (area < 1e-10) throw new Error("Die Punkte bilden noch keine Fläche.");
  return { source: "GPS-Aufzeichnung · nicht amtlich", areas: [{ id: "gps-boundary", name: "Reviergrenze", kind: "boundary", polygons: [[ring]] }] };
}
