import { describe, expect, it, vi } from "vitest";
import { DOMParser } from "@xmldom/xmldom";
import { strToU8, zipSync } from "fflate";
import type { MapCoordinate, RevierMapData } from "@hege/domain";
import { applyMapImport, exportMapKml, parseMapKml, readMapFile } from "./revier-map-exchange";
vi.stubGlobal("DOMParser", DOMParser);
const ring = (x: number, y: number, size = 0.01): MapCoordinate[] => [[x,y],[x+size,y],[x+size,y+size],[x,y+size],[x,y]];
const original: RevierMapData = { source: "Synthetische Testkarte", areas: [
  { id: "b", name: "Test & Grenze <Nord>", kind: "boundary", polygons: [[ring(14,47),ring(14.002,47.002,0.002)], [ring(14.02,47)]] },
  { id: "e", name: "Ausschluss", kind: "exclusion", polygons: [[ring(14.023,47.003,0.002)]] },
], places: [{ id: "p", name: "Erhaltener Kartenort", latitude: 47, longitude: 14, locationCheck: "outside" }] };
const xml = () => exportMapKml(original);
const geometry = (map: { areas: RevierMapData["areas"] }) => map.areas.map(({ kind, polygons }) => ({ kind, polygons }));

describe("KML/KMZ-Austausch", () => {
  it("erhält Multipart, Aussparung und Ausschluss ohne Koordinatenrundung", () => {
    expect(geometry(parseMapKml(xml()))).toEqual(geometry(original));
    expect(parseMapKml(xml()).areas[0]!.name).toBe(original.areas[0]!.name);
    expect(xml()).not.toContain("Erhaltener Kartenort");
  });
  it("erhält Namen auch bei maximal langen Ausschlussnamen", () => {
    const map = structuredClone(original);
    map.areas[1]!.name = "x".repeat(200);
    expect(parseMapKml(exportMapKml(map)).areas.map(a => a.name)).toEqual(map.areas.map(a => a.name));
  });
  it("übernimmt einen in My Maps geänderten Namen trotz alter Metadaten", () => {
    const changed = xml().replace("<name>[Ausschluss] Ausschluss</name>", "<name>[Ausschluss] Neuer Name</name>");
    expect(parseMapKml(changed).areas[1]!.name).toBe("Neuer Name");
  });
  it("liest komprimierten My-Maps-Export mit Dateien im Unterordner", () => {
    const bytes = zipSync({ "files/map.kml": strToU8(xml()), "ignored.png": new Uint8Array([1,2]) });
    expect(geometry(readMapFile(bytes, "Karte.KMZ"))).toEqual(geometry(original));
  });
  it("erkennt Ausschlüsse auch nach Verlust von ExtendedData in My Maps", () => {
    const stripped = xml().replace(/<ExtendedData>.*?<\/ExtendedData>/g, "");
    expect(geometry(parseMapKml(stripped))).toEqual(geometry(original));
  });
  it("erkennt den originalen Ausschlussnamen mit geschütztem Leerzeichen", () => {
    const renamed = xml().replace("[Ausschluss] Ausschluss", "Ausschluss\u00a0").replace(/<ExtendedData>.*?<\/ExtendedData>/g, "");
    expect(parseMapKml(renamed).areas[1]!.kind).toBe("exclusion");
  });
  it("unterstützt Namespace-Präfixe und verschachtelte Ordner", () => {
    const prefixed = xml().replace('xmlns=', 'xmlns:k=').replace(/<(\/?)([A-Za-z][\w]*)/g, '<$1k:$2');
    expect(geometry(parseMapKml(prefixed))).toEqual(geometry(original));
  });
  it("ergänzt ohne Überschreiben, erzeugt eindeutige IDs und erhält Kartenorte", () => {
    const parsed = parseMapKml(xml());
    const first = applyMapImport(original, parsed.areas, "append");
    const second = applyMapImport(first, parsed.areas, "append");
    expect(second.areas).toHaveLength(6);
    expect(second.areas.slice(0,2)).toEqual(original.areas);
    expect(second.places).toEqual(original.places);
    expect(new Set(second.areas.map(a => a.id)).size).toBe(6);
    expect(original.areas).toHaveLength(2);
  });
  it("ersetzt nur bei explizitem Modus, erhält dabei vorhandene Kartenorte", () => {
    const result = applyMapImport(original, parseMapKml(xml()).areas, "replace");
    expect(result.areas).toHaveLength(2);
    expect(result.places).toEqual(original.places);
  });
  it("weist auf nicht importierte Punkte, Linien und Höhen hin", () => {
    const extra = xml().replace("<Document>", '<Document><Placemark><Point><coordinates>14,47,2</coordinates></Point></Placemark><Placemark><LineString><coordinates>14,47 15,48</coordinates></LineString></Placemark>').replace("14,47,0", "14,47,20");
    const parsed = parseMapKml(extra);
    expect(parsed.warnings.join(" ")).toContain("2 Punkte, Linien");
    expect(parsed.warnings.join(" ")).toContain("Höhenangaben");
  });
  it.each([
    ['DTD', () => parseMapKml('<!DOCTYPE kml []>' + xml())],
    ['Netzwerklink', () => parseMapKml(xml().replace('<Document>', '<Document><NetworkLink/>'))],
    ['leere Koordinate', () => parseMapKml(xml().replace('14,47,0', ',47,0'))],
    ['offener Ring', () => parseMapKml(xml().replace('14,47,0</coordinates>', '14.5,47,0</coordinates>'))],
    ['keine Fläche', () => parseMapKml('<kml xmlns="http://www.opengis.net/kml/2.2"/>')],
    ['falscher Dateityp', () => readMapFile(strToU8(xml()), 'map.txt')],
    ['mehrdeutiges Archiv', () => readMapFile(zipSync({'a.kml':strToU8(xml()),'b.kml':strToU8(xml())}), 'map.kmz')],
    ['zu große Datei', () => readMapFile(new Uint8Array(5_000_001), 'map.kml')],
    ['zu große entpackte Datei', () => readMapFile(zipSync({'doc.kml':new Uint8Array(5_000_001)}), 'map.kmz')],
  ])("lehnt %s ohne Teilimport ab", (_, action) => { expect(action).toThrow(); });
  it("erlaubt die Vorschau einer Ausschlussebene, aber keinen Ersatz ohne Reviergrenze", () => {
    const areas = parseMapKml(xml()).areas.filter(a => a.kind === "exclusion");
    expect(() => applyMapImport(original, areas, "replace")).toThrow("Reviergrenze");
    expect(applyMapImport(original, areas, "append").areas).toHaveLength(3);
  });
});
