/** Koordinaten in GeoJSON-Reihenfolge: Längengrad, Breitengrad. */
export type MapCoordinate = [number, number];
export interface RevierMapArea {
  id: string;
  name: string;
  kind: "boundary" | "exclusion";
  /** Ein Polygon pro Eintrag, erster Ring außen, folgende Ringe Aussparungen. */
  polygons: MapCoordinate[][][];
}
export interface RevierMapData {
  source: string;
  areas: RevierMapArea[];
  /** Originale Kartenorte, noch keine geprüften/buchbaren Einrichtungen. */
  places?: Array<{
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    locationCheck: "inside" | "outside" | "exclusion";
  }>;
}

export function mapBounds(areas: RevierMapArea[]) {
  const points = areas.flatMap(area => area.polygons.flatMap(polygon => polygon.flat()));
  if (!points.length) return null;
  const lngs = points.map(point => point[0]);
  const lats = points.map(point => point[1]);
  const south = Math.min(...lats), north = Math.max(...lats);
  const west = Math.min(...lngs), east = Math.max(...lngs);
  return {
    latitude: (south + north) / 2, longitude: (west + east) / 2,
    latitudeDelta: Math.max((north - south) * 1.2, 0.005),
    longitudeDelta: Math.max((east - west) * 1.2, 0.005)
  };
}
