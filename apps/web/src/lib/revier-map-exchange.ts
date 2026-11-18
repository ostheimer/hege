import { validateRevierMap, type MapCoordinate, type RevierMapData, type RevierMapArea } from "@hege/domain";
import { Unzip, UnzipInflate } from "fflate";

export const MAX_MAP_FILE_BYTES = 5_000_000;
const NS = "http://www.opengis.net/kml/2.2";
export interface MapImport { areas: RevierMapArea[]; warnings: string[] }
const elements = (node: Document | Element, name: string) => Array.from(node.getElementsByTagNameNS(NS, name));
const children = (node: Element, name: string) => Array.from(node.childNodes).filter(
  (child): child is Element => child.nodeType === 1 && (child as Element).namespaceURI === NS && (child as Element).localName === name,
);

/** Liest nur Geometrie. Fremdes HTML, Bilder und Netzwerkverweise werden nie geladen. */
export function parseMapKml(xml: string): MapImport {
  if (new TextEncoder().encode(xml).length > MAX_MAP_FILE_BYTES) throw new Error("KML darf höchstens 5 MB groß sein.");
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("DTD und Entities sind nicht erlaubt.");
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagNameNS("*", "parsererror").length || doc.documentElement?.localName !== "kml" || doc.documentElement.namespaceURI !== NS)
    throw new Error("Ungültige KML-Datei. Bitte KML 2.2 exportieren.");
  if (elements(doc, "NetworkLink").length) throw new Error("Netzwerklinks werden nicht importiert. In My Maps ohne Netzwerklink exportieren.");
  const warnings: string[] = [];
  const unsupported = ["Point", "LineString", "Model", "GroundOverlay", "PhotoOverlay", "ScreenOverlay"]
    .reduce((sum, name) => sum + elements(doc, name).length, 0) + doc.getElementsByTagNameNS("http://www.google.com/kml/ext/2.2", "Track").length;
  if (unsupported) warnings.push(`${unsupported} Punkte, Linien oder andere Objekte werden nicht übernommen. Dieser Austausch umfasst nur Flächen.`);
  let altitude = false;
  let polygonCount = 0;
  const areas = elements(doc, "Placemark").flatMap((placemark, index): RevierMapArea[] => {
    const polygons = elements(placemark, "Polygon").map((polygon) => {
      polygonCount++;
      const outer = children(polygon, "outerBoundaryIs");
      if (outer.length !== 1) throw new Error("Jedes Polygon benötigt genau einen Außenring.");
      return [...outer, ...children(polygon, "innerBoundaryIs")].map((boundary) => {
        const rings = children(boundary, "LinearRing");
        const coordinateNodes = rings.length === 1 ? children(rings[0]!, "coordinates") : [];
        if (coordinateNodes.length !== 1) throw new Error("Ungültiger Polygonring.");
        const text = coordinateNodes[0]!.textContent?.trim() ?? "";
        if (!text) throw new Error("Leerer Polygonring.");
        return text.split(/\s+/).map((tuple): MapCoordinate => {
          const values = tuple.split(",");
          if (values.length < 2 || values.length > 3 || values.some((v) => !v.trim() || !Number.isFinite(Number(v))))
            throw new Error("Ungültige Grenzkoordinaten.");
          if (values[2] && Number(values[2]) !== 0) altitude = true;
          return [Number(values[0]), Number(values[1])];
        });
      });
    });
    if (!polygons.length) return [];
    const displayName = children(placemark, "name")[0]?.textContent?.trim() || `Fläche ${index + 1}`;
    const originalName = elements(placemark, "Data").find((item) => item.getAttribute("name") === "hege_name");
    const savedName = originalName ? children(originalName, "value")[0]?.textContent : null;
    const name = savedName && (displayName === savedName || displayName === `[Ausschluss] ${savedName}`)
      ? savedName : displayName.replace(/^\[Ausschluss\]\s*/i, "");
    const kindData = elements(placemark, "Data").find((item) => item.getAttribute("name") === "hege_kind");
    const kind = kindData ? children(kindData, "value")[0]?.textContent : null;
    return [{ id: `import-${index}`, name, kind: kind === "exclusion" || (!kind && /^(?:\[Ausschluss\]|Ausschluss(?:fläche)?(?:\s|$))/i.test(displayName)) ? "exclusion" : "boundary", polygons }];
  });
  if (polygonCount !== elements(doc, "Polygon").length) throw new Error("Polygone müssen in KML-Ortsmarken (Placemark) liegen.");
  if (!areas.length) throw new Error("Die Datei enthält keine Polygonflächen.");
  // Einzelne Ausschluss-Ebenen sind importierbar; die Gesamtkarte braucht danach eine Grenze.
  validateRevierMap({ source: "KML-Prüfung", areas: areas.map((area) => ({ ...area, kind: "boundary" })) });
  if (altitude) warnings.push("Höhenangaben werden nicht übernommen; die Karte verwendet zweidimensionale Flächen.");
  return { areas, warnings };
}

export function readMapFile(bytes: Uint8Array, filename: string): MapImport {
  if (!bytes.length || bytes.length > MAX_MAP_FILE_BYTES) throw new Error("Die Datei muss zwischen 1 Byte und 5 MB groß sein.");
  if (!/\.(kml|kmz)$/i.test(filename)) throw new Error("Bitte eine KML- oder KMZ-Datei auswählen.");
  let raw = bytes;
  if (/\.kmz$/i.test(filename)) {
    const chunks: Uint8Array[] = [];
    let files = 0, kmlFiles = 0, size = 0, complete = false;
    const unzip = new Unzip((file) => {
      if (++files > 100) throw new Error("KMZ enthält zu viele Dateien.");
      if (!/\.kml$/i.test(file.name)) return;
      if (++kmlFiles > 1) throw new Error("KMZ muss genau eine KML-Datei enthalten. Ebenen getrennt exportieren.");
      if ((file.originalSize ?? 0) > MAX_MAP_FILE_BYTES) throw new Error("Entpackte KML darf höchstens 5 MB groß sein.");
      file.ondata = (error, chunk, final) => {
        if (error) throw new Error("KMZ konnte nicht entpackt werden.");
        size += chunk.length;
        if (size > MAX_MAP_FILE_BYTES) throw new Error("Entpackte KML darf höchstens 5 MB groß sein.");
        chunks.push(chunk);
        complete = final;
      };
      file.start();
    });
    unzip.register(UnzipInflate);
    // Kleine Eingaben begrenzen auch bei stark komprimierten Dateien den Ausgabeschritt.
    for (let offset = 0; offset < bytes.length; offset += 1024)
      unzip.push(bytes.subarray(offset, offset + 1024), offset + 1024 >= bytes.length);
    if (kmlFiles !== 1 || !complete) throw new Error("KMZ enthält keine vollständige KML-Datei.");
    raw = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { raw.set(chunk, offset); offset += chunk.length; }
  }
  try { return parseMapKml(new TextDecoder("utf-8", { fatal: true }).decode(raw)); }
  catch (error) {
    if (error instanceof TypeError) throw new Error("Bitte KML in UTF-8 exportieren.");
    throw error;
  }
}

export function applyMapImport(current: RevierMapData, imported: RevierMapArea[], mode: "append" | "replace"): RevierMapData {
  const existing = mode === "append" ? structuredClone(current.areas) : [];
  const ids = new Set(existing.map((area) => area.id));
  const areas = imported.map((area, index) => {
    let id = `import-${index}`;
    while (ids.has(id)) id += "-neu";
    ids.add(id);
    return { ...structuredClone(area), id };
  });
  const next = { ...current, source: "KML/KMZ-Import · nicht amtlich", areas: [...existing, ...areas] };
  validateRevierMap(next);
  if (JSON.stringify({ map: next, revision: "2000-01-01T00:00:00.000Z", confirmReplace: true }).length > 1_000_000)
    throw new Error("Die Karte ist für das Speichern zu groß.");
  return next;
}

const escapeXml = (value: string) => value.replace(/[<>&"']/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[char]!);
export function exportMapKml(map: RevierMapData): string {
  validateRevierMap(map);
  const placemarks = map.areas.map((area) => {
    // Der sichtbare Präfix bleibt auch erhalten, wenn My Maps ExtendedData verändert.
    const name = area.kind === "exclusion" && !/^\[Ausschluss\]/i.test(area.name) ? `[Ausschluss] ${area.name}` : area.name;
    const polygons = area.polygons.map((polygon) => `<Polygon>${polygon.map((ring, index) => {
      const tag = index ? "innerBoundaryIs" : "outerBoundaryIs";
      return `<${tag}><LinearRing><coordinates>${ring.map(([lng, lat]) => `${lng},${lat},0`).join(" ")}</coordinates></LinearRing></${tag}>`;
    }).join("")}</Polygon>`).join("");
    return `<Placemark><name>${escapeXml(name)}</name><styleUrl>#${area.kind}</styleUrl><ExtendedData><Data name="hege_kind"><value>${area.kind}</value></Data><Data name="hege_name"><value>${escapeXml(area.name)}</value></Data></ExtendedData><MultiGeometry>${polygons}</MultiGeometry></Placemark>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="${NS}"><Document><name>hege Revierkarte</name><description>Grenzen und Ausschlussflächen · nicht amtlich</description><Style id="boundary"><LineStyle><color>ff228b22</color><width>3</width></LineStyle><PolyStyle><color>44228b22</color></PolyStyle></Style><Style id="exclusion"><LineStyle><color>ff2222cc</color><width>3</width></LineStyle><PolyStyle><color>442222cc</color></PolyStyle></Style>${placemarks}</Document></kml>`;
}
