import type { MapCoordinate, RevierMapData } from "./revier-map";
export interface RingAddress {
  area: number;
  polygon: number;
  ring: number;
}
export function ringVertices(
  map: RevierMapData,
  address: RingAddress,
): MapCoordinate[] {
  const ring =
    map.areas[address.area]?.polygons[address.polygon]?.[address.ring] ?? [];
  return ring.length ? ring.slice(0, -1) : [];
}
/** Bearbeitet genau einen Ring, erhält andere Teilflächen, Löcher und Kartenorte. */
export function replaceMapRing(
  map: RevierMapData,
  address: RingAddress,
  vertices: MapCoordinate[],
): RevierMapData {
  const ring = vertices.length
    ? [...vertices, [...vertices[0]!] as MapCoordinate]
    : [];
  return {
    ...map,
    areas: map.areas.map((area, a) =>
      a !== address.area
        ? area
        : {
            ...area,
            polygons: area.polygons.map((polygon, p) =>
              p !== address.polygon
                ? polygon
                : polygon.map((old, r) => (r === address.ring ? ring : old)),
            ),
          },
    ),
  };
}

/** Form und Mindestfläche gemeinsam prüfen; vollständige Topologie prüft zusätzlich PostGIS. */
export function validateRevierMap(
  value: unknown,
): asserts value is RevierMapData {
  const map = value as RevierMapData;
  if (
    !map ||
    typeof map.source !== "string" ||
    map.source.length > 200 ||
    !Array.isArray(map.areas) ||
    !map.areas.length ||
    map.areas.length > 100
  )
    throw new Error(
      "Eine gültige Revierkarte mit mindestens einer Fläche ist erforderlich.",
    );
  let count = 0;
  const ids = new Set<string>();
  for (const area of map.areas) {
    if (
      !area ||
      typeof area.id !== "string" ||
      !area.id ||
      area.id.length > 100 ||
      ids.has(area.id) ||
      typeof area.name !== "string" ||
      !area.name.trim() ||
      area.name.length > 200 ||
      !["boundary", "exclusion"].includes(area.kind) ||
      !Array.isArray(area.polygons) ||
      !area.polygons.length
    )
      throw new Error("Ungültige oder doppelte Fläche.");
    ids.add(area.id);
    for (const polygon of area.polygons) {
      if (!Array.isArray(polygon) || !polygon.length)
        throw new Error("Eine Fläche benötigt einen äußeren Ring.");
      for (const ring of polygon) {
        if (!Array.isArray(ring) || ring.length < 4)
          throw new Error("Jeder Ring benötigt mindestens drei Punkte.");
        count += ring.length;
        if (count > 20000)
          throw new Error("Die Karte enthält zu viele Punkte.");
        if (
          ring.some(
            (p) =>
              !Array.isArray(p) ||
              p.length !== 2 ||
              !Number.isFinite(p[0]) ||
              !Number.isFinite(p[1]) ||
              Math.abs(p[0]) > 180 ||
              Math.abs(p[1]) > 90,
          )
        )
          throw new Error("Ungültige Grenzkoordinaten.");
        if (ring[0]![0] !== ring.at(-1)![0] || ring[0]![1] !== ring.at(-1)![1])
          throw new Error("Ein Grenzring ist nicht geschlossen.");
        const vertices = ring.slice(0, -1);
        if (new Set(vertices.map((p) => p.join(","))).size !== vertices.length)
          throw new Error("Doppelte Grenzpunkte entfernen.");
        const origin = ring[0]!;
        const scale = Math.cos((origin[1] * Math.PI) / 180) * 111195 ** 2;
        const sqm = Math.abs(
          (vertices.reduce((sum, p, i) => {
            const next = ring[i + 1]!;
            return (
              sum +
              (p[0] - origin[0]) * (next[1] - origin[1]) -
              (next[0] - origin[0]) * (p[1] - origin[1])
            );
          }, 0) *
            scale) /
            2,
        );
        if (sqm < 1)
          throw new Error("Ein Ring muss mindestens 1 m² Fläche umfassen.");
      }
    }
  }
  if (!map.areas.some((area) => area.kind === "boundary"))
    throw new Error("Mindestens eine Reviergrenze ist erforderlich.");
}
