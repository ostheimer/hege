# Revierkarte und Grenzentwurf – lokale Umsetzung vom 04.10.2026

## Bedienung

Die mobile Revierkarte zeigt gespeicherte Einrichtungen mit den bestehenden Hochstand-/Einrichtungssymbolen zusammen mit der Grenze, inneren Ringen und Ausschlussflächen. Ein Tap öffnet die Einrichtung. Die übernommenen, fachlich ungeprüften Kartenorte werden erst nach „Ungeprüfte Kartenorte einblenden“ sichtbar und orange gekennzeichnet. Sie sind keine bestätigten Einrichtungen. Neue Einrichtungen werden später von Andreas vor Ort mit der App erfasst; ein weiterer Export oder eine Standortliste ist keine Voraussetzung.

Die GPS-Erfassung unterscheidet „Gezielt Punkte setzen“ und „Automatisch aufzeichnen“. Im gezielten Modus startet GPS nur die Standortanzeige; „Punkt hier setzen“ holt eine aktuelle Messung. Ungenaue oder veraltete Messungen werden abgelehnt. Im automatischen Modus gelten zusätzlich Mindestabstand und Sprungfilter. Start/Pause bleibt ausdrücklich steuerbar. Die App muss geöffnet bleiben; im Hintergrund pausiert sie. Der Standort-Freigabedialog bricht den ersten Start nicht mehr ab.

Im pausierten Entwurf lassen sich Punkte auf der Karte ziehen, auswählen und entfernen sowie durch Kartentaps ergänzen. Rückgängig stellt den letzten Bearbeitungsschritt wieder her. Die Punktwahl wird bei großen Entwürfen in Gruppen von 20 angezeigt. Der Entwurf bleibt auf dem Gerät nach Benutzer und Mitgliedschaft getrennt gespeichert. Kartenkorrekturen werden als manuelle Punkte bezeichnet. Die Übernahme per GPS ersetzt weiterhin keine vorhandene Revierkarte.

Im Web ist die Revierkarte über die Navigation erreichbar. Berechtigte Verwalter können Punkte setzen, ziehen und entfernen, Teilflächen, innere Ringe und Ausschlüsse ergänzen und entfernen. Ein lokaler Browserentwurf bleibt nach Benutzer, Mitgliedschaft und Revier getrennt erhalten. Speichern und Neuladen/Verwerfen sind getrennt. Eine frühere Version lässt sich zunächst als Entwurf laden; ihre Übernahme muss ausdrücklich bestätigt werden.

## Speicherung und Prüfung

Mobile und Web verwenden `RevierMapData` mit GeoJSON-Koordinatenreihenfolge. Ringe benötigen mindestens drei unterschiedliche Punkte und Ringschluss. Die mobile GPS-Übernahme prüft die bestehende Abstand-, Flächen- und Überschneidungslogik. Der Web-Speicherpfad verlangt mindestens 1 m² pro Ring und prüft zusätzlich die vollständige Polygongeometrie mit PostGIS, insbesondere Selbstüberschneidungen und innere Ringe.

`PUT /api/v1/revier-map` benötigt den zuletzt gelesenen Kartenstand und eine ausdrückliche Bestätigung beim Ändern vorhandener Grenzen. Transaktion, Sperre und Versionsvergleich verhindern verlorene Änderungen. Die bisherige Karte wird atomar in `revier_map_versions` archiviert; die neue Migration ist `0014`. Zwei gleichzeitige Änderungen derselben Revision dürfen nur einen Erfolg liefern. Vorhandene ungeprüfte Kartenorte werden erhalten, nicht durch Formularwerte ersetzt. Fremde Revier-IDs im Request bestimmen keinen Schreibzugriff; maßgeblich ist ausschließlich das authentifizierte aktive Revier. Die Rechte kommen aus dem zentralen Rollenmodell.

`GET /api/v1/revier-map/versions` liefert maximal 20 frühere Grenzen des aktiven Reviers. Wiederherstellung verwendet denselben bestätigten, konfliktgeschützten Schreibpfad. Migration `0014` stellt auch die erforderliche PostGIS-Erweiterung sicher. Es wurde keine Produktionsmigration angewendet.

## Private Gänserndorf-Quelle

Die private KMZ und Ortsliste bleiben außerhalb des Repositorys. Frisch geprüft wurden:

- Drei Flächenobjekte: zwei Grenzteilflächen, ein innerer Ring und zwei getrennte Ausschlussflächen, alle PostGIS-gültig.
- Die gespeicherten Flächen/Ringe stimmen exakt mit der KMZ-Quelle überein.
- Zweifacher transaktionaler Import: Kartenhash sowie Revier-, Mitgliedschafts- und Einrichtungsanzahlen unverändert. Abweichende, ebenfalls gültige KMZ-Geometrie wurde mit unverändertem Datenstand abgelehnt.
- Acht bestehende Einrichtungen tragen ausdrücklich „Test“ im Namen. Alle liegen innerhalb der Grenze und außerhalb der Ausschlüsse. Die 58 ursprünglichen Kartenorte bleiben getrennt und ungeprüft.
- Eine Grenzteilfläche umfasst etwa 244 m². Eine Ausschlussfläche ragt quellengetreu etwa 1192 m² über die Grenzgeometrie hinaus. Beide Auffälligkeiten bleiben unverändert; keine automatische Korrektur, Beschneidung oder amtliche Bewertung.
- Vor den Prüfungen wurde ein lokaler PostgreSQL-Dump in der ignorierten QA-Ablage gesichert. Kein Reset der bestehenden lokalen Datenbank.

## Abnahme und Grenzen

Der eigene iOS-Simulator bestätigt die Revierkarte mit Einrichtungspins, den Wechsel in die Detailansicht sowie Ein-/Ausblenden der ungeprüften Orte. Vier gezielte GPS-Punkte wurden tatsächlich übernommen, Entfernen/Rückgängig und erneutes Öffnen geprüft. Die gespeicherten vier Koordinaten stimmen exakt mit den angenommenen Simulatorpositionen überein. Die vorhandene Grenze wird bei einer GPS-Übernahme abgelehnt; der lokale Entwurf bleibt erhalten.

Zusätzlich wurde direkt in der App eine Einrichtung „Test - Karte QA20261004“ mit GPS-Standort und Hauptblickrichtung 334° angelegt und über ihren neuen Kartenpin erneut geöffnet. Die gespeicherten Fachdaten und „Hauptblick NW“ wurden bestätigt. Dieser zusätzlich angelegte QA-Datensatz wurde anschließend gezielt entfernt; die acht bestehenden Testeinrichtungen, 58 ungeprüften Orte und der Kartenhash blieben unverändert.

Automatisierung: `.maestro/ios-boundary-editor.yaml` benötigt einen angemeldeten Revierverwalter und einen leeren lokalen Entwurf im eigenen Simulator. Die Testpunkte sind ausdrücklich angenommene Koordinaten. Vorhandene Nutzerentwürfe nicht für diesen Test verwerfen.

Web-E2E: `apps/web/e2e/revier-boundary.spec.ts` verwendet ausschließlich eine eigens angelegte lokale E2E-Datenbank. Die Abnahme prüft Zeichnen, Verschieben, Entfernen, Rückgängig, Wiederöffnen, Speichern, Versionswiederherstellung, Multipart/Innenring/Ausschluss, ungültige Geometrie, parallele Änderungen und Rollenrechte. Beide fachlichen Abläufe bestanden auf Desktop und Mobile, einschließlich Setup insgesamt 5 Playwright-Tests.

Domain: 17 Tests; Mobile: 220 Tests; Web: 327 Tests. Alle bestanden; TypeScript-Prüfungen von Domain, Mobile und Web ebenfalls. Der Produktionsbuild des Webs wurde durch den Playwright-Vorlauf geprüft. Desktop- und Mobile-Screenshots wurden visuell kontrolliert. Die ergänzte Maestro-Datei bestand vollständig im eigenen Simulator; Pinwechsel und Schutz vorhandener Grenzen wurden zusätzlich separat geprüft.

Die mobile Kartenunterlage ist weiterhin die vorhandene native iOS-Karte. Der Web-Editor verwendet bei bereits konfiguriertem Google-Schlüssel die bestehende Google-Maps-Integration mit Satellitenwahl; ohne Schlüssel ist eine ausdrücklich schematische Ansicht nutzbar. Die schematische Ansicht wird lokal geprüft; ein realer Google-Kartenlauf ist separat abzugrenzen. Keine Schlüssel, Abrechnung oder öffentliche My-Maps-Freigabe geändert. Keine automatische My-Maps-Synchronisierung implementiert.

Ein tatsächlicher Geh-/Fahrt-Test mit dem iPhone, eine Entscheidung zum Hintergrundbetrieb und eine mögliche native Google-Umstellung bleiben separate Abnahmeschritte. Keine EAS-Builds oder OTA-Veröffentlichung in diesem Lauf. Das installierte iPhone wird durch lokale Codeänderungen nicht aktualisiert.

## Google-Kombination: technischer Prüfstand

Die vorhandene Web-Bibliothek unterstützt dieselben Polygon-/Punktfunktionen und Satellitenwahl. Die lokale Abnahme nutzt mangels Browser-Schlüssel die schematische Ansicht. Für die reale Google-Unterlage sind ein bereits freigegebenes Projekt, eingeschränkte Schlüssel und ein bewusstes Kontingent erforderlich. Kartenaufrufe im Web fallen unter Dynamic Maps; eine pauschale Kostenfreiheit wäre falsch. Maßgeblich sind die [JavaScript-Nutzungs- und Abrechnungsregeln](https://developers.google.com/maps/documentation/javascript/usage-and-billing) und die [Schlüsseleinschränkungen nach Plattform](https://developers.google.com/maps/api-security-best-practices).

Für Google auf iOS benötigt `react-native-maps` native Konfiguration, Aktivierung des passenden SDK und einen auf die Bundle-ID eingeschränkten Schlüssel. Die [aktuelle Expo-Dokumentation](https://docs.expo.dev/versions/latest/sdk/map-view/) verlangt danach einen neuen App-Binärbuild. Diese aktuelle Anleitung ersetzt keine SDK-53-Migrationsprüfung. Daher wurde der vorhandene iOS-Client mit seiner nativen Kartenunterlage weiterverwendet. Google-Konfiguration, Lizenz-/Abrechnungseignung und Binärwechsel sind vor einem späteren nativen Wechsel getrennt zu prüfen; keine neue Abrechnung oder Schlüsseländerung wurde ausgelöst.
