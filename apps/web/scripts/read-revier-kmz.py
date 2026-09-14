"""Privaten My-Maps-Export ohne Netzwerkzugriff nach JSON konvertieren."""
import json
import sys
import zipfile
import xml.etree.ElementTree as ET

with zipfile.ZipFile(sys.argv[1]) as archive:
    entry = archive.getinfo("doc.kml")
    if entry.file_size > 5_000_000:
        raise ValueError("KML ist zu groß")
    raw = archive.read(entry)
if b"<!DOCTYPE" in raw.upper() or b"<!ENTITY" in raw.upper():
    raise ValueError("DTD/Entities sind nicht erlaubt")
root = ET.fromstring(raw)
ns = {"k": "http://www.opengis.net/kml/2.2"}
areas = []
points = 0
for index, placemark in enumerate(root.findall(".//k:Placemark", ns)):
    name = placemark.findtext("k:name", "", ns).strip()
    points += len(placemark.findall(".//k:Point", ns))
    polygons = []
    for polygon in placemark.findall(".//k:Polygon", ns):
        rings = []
        for boundary in ["outerBoundaryIs", "innerBoundaryIs"]:
            for ring in polygon.findall(f"k:{boundary}/k:LinearRing/k:coordinates", ns):
                coordinates = [[float(part) for part in item.split(",")[:2]] for item in (ring.text or "").split()]
                if len(coordinates) < 4 or coordinates[0] != coordinates[-1]:
                    raise ValueError(f"Offener oder zu kurzer Ring: {name}")
                if any(len(p) != 2 or not (-180 <= p[0] <= 180 and -90 <= p[1] <= 90) for p in coordinates):
                    raise ValueError(f"Ungültige Koordinaten: {name}")
                rings.append(coordinates)
        if not rings:
            raise ValueError("Polygon ohne Ringe")
        polygons.append(rings)
    if polygons:
        if name not in ["Ausschluss", "Jagd Gänserndorf"]:
            raise ValueError(f"Flächentyp muss zugeordnet werden: {name}")
        areas.append({"id": f"kmz-{index}", "name": name, "kind": "exclusion" if name == "Ausschluss" else "boundary", "polygons": polygons})
if not any(area["kind"] == "boundary" for area in areas):
    raise ValueError("Keine Reviergrenze enthalten")
print(json.dumps({"map": {"source": "Google My Maps · Import von Andreas Ostheimer", "areas": areas}, "pointCount": points}))
