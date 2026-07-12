# GIP-Straßenkilometer v1

## Ziel

Fallwild braucht in Österreich nicht nur Adresse und Koordinate, sondern auch einen nachvollziehbaren Straßenkilometer. Google Maps bleibt für Adresse, Gemeinde und Kartenverhalten zuständig; der fachliche Kilometerwert kommt aus GIP-OGD oder wird vor Ort manuell ergänzt.

Quelle für den produktiven Datenstand ist der GIP-OGD-Export: [gip.gv.at OGD Daten](https://www.gip.gv.at/#ogd). Der aktuelle Referenzexport liegt als GeoPackage unter `https://open.gip.gv.at/ogd/C_gip_reference_ogd.zip`.

## Technischer Schnitt

Der produktive API-Endpunkt `POST /api/v1/geo/fallwild-location` unterstützt nun drei Betriebsarten:

- `HEGE_GEO_PROVIDER=mock`: lokale Gänserndorf-Testdaten für Entwicklung und Smoke.
- `GIP_ROAD_KILOMETER_ENDPOINT`: externer oder interner HTTP-Resolver, der `lat`, `lng`, optional `roadName` und optional `accuracyMeters` bekommt.
- `GIP_ROAD_KILOMETER_INDEX_PATH`: lokaler JSON-Index aus GIP-OGD-BEPU-Punkten, der serverseitig im Deployment gelesen wird.
- gebündelter Gänserndorf-Index aus dem offiziellen GIP-OGD-Referenzexport als sofort nutzbarer Fallback für `HEGE_GEO_PROVIDER=live`.

Wenn `GIP_ROAD_KILOMETER_ENDPOINT` und `GIP_ROAD_KILOMETER_INDEX_PATH` beide gesetzt sind, gewinnt der explizite Endpoint. Wenn beide fehlen, nutzt Production den gebündelten regionalen Gänserndorf-Index. Außerhalb dieses Ausschnitts bleibt der Flow nutzbar und fordert zur manuellen Ergänzung auf.

## Index-Format

Der JSON-Index ist bewusst klein und deploybar:

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-05-06T00:00:00.000Z",
  "source": {
    "kind": "gip-ogd-bepu",
    "input": "https://open.gip.gv.at/ogd/C_gip_reference_ogd.zip",
    "version": "GIPOGD2509 30.09.2025"
  },
  "entries": [
    {
      "lat": 48.3414,
      "lng": 16.7556,
      "roadName": "B8 - Angerner Straße",
      "roadKilometer": "33,0",
      "placeId": "32888451",
      "roadCode": "B8"
    }
  ]
}
```

Für die Fallwild-Erfassung reicht zunächst ein regionaler Ausschnitt um das Revier. Der vollständige Rohdatenexport ist mehrere hundert Megabyte groß und wird nicht ins Repository übernommen.

## Index Erzeugen

Voraussetzungen lokal:

- `sqlite3`
- heruntergeladener und entpackter GIP-OGD-Export `gip_reference_ogd.gpkg`

Beispiel für einen Gänserndorf-Ausschnitt:

```bash
pnpm --filter @hege/web geo:gip:index -- \
  --input /tmp/gip_reference_ogd/gip_reference_ogd.gpkg \
  --output apps/web/data/gip-road-kilometer-index.json \
  --bbox "16.65,48.28,16.80,48.40" \
  --sourceUrl https://open.gip.gv.at/ogd/C_gip_reference_ogd.zip
```

Die Bounding Box ist `minLng,minLat,maxLng,maxLat`. Der aktuell gebündelte Gänserndorf-Ausschnitt nutzt `16.65,48.28,16.80,48.40`. Falls das tatsächliche Revier weiter reicht, sollte ein größerer Ausschnitt erzeugt und per `GIP_ROAD_KILOMETER_INDEX_PATH` aktiviert werden.

## Betrieb

Env-Variablen:

- `HEGE_GEO_PROVIDER=live`
- `GOOGLE_MAPS_SERVER_API_KEY`
- `GOOGLE_MAPS_REGION=AT`
- `GOOGLE_MAPS_LANGUAGE=de`
- `GIP_ROAD_KILOMETER_INDEX_PATH=/var/task/apps/web/data/gip-road-kilometer-index.json`
- `GIP_ROAD_KILOMETER_MAX_DISTANCE_METERS=150`

`GIP_ROAD_KILOMETER_MAX_DISTANCE_METERS` ist der Standard-Suchradius. Wenn das Gerät eine schlechtere GPS-Genauigkeit meldet, wird der Suchradius dynamisch mindestens auf `accuracyMeters + 50` erweitert.

## Offene Härtung

- Die Bounding Box wurde am 2026-07-12 gegen die echte Production-Smoke-Koordinate `48.336003,16.732323` in der Schillergasse geprüft: Der Punkt liegt innerhalb des gebündelten Ausschnitts. Der nächste kilometrierte GIP-Punkt liegt rund 379 m entfernt auf `L3035/B8`. Der manuelle Fallback ist deshalb fachlich korrekt; eine Radiusvergrößerung würde einen falschen Straßenkilometer zuordnen.
- Aktualisierungsrhythmus für den GIP-OGD-Export festlegen.
- Nach dem ersten echten Fallwild-Feldtest prüfen, ob `150 m` Suchradius fachlich passt.
