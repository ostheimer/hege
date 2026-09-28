# Blickfeld und Wind bei Reviereinrichtungen

Stand: 28.09.2026.

## Darstellung

Die Einrichtungskarte zeigt die gespeicherte Ausrichtung als goldenen, halbtransparenten Trichter. Erfassung, Bestandskarte und Detailansicht verwenden dieselbe geografische Berechnung; die Darstellung folgt der Karte beim Zoomen und Drehen. Ohne hinterlegte Ausrichtung entsteht kein erfundener Nord-Trichter.

Der Trichter ist eine Orientierungshilfe mit 60° Öffnung und 180 m grafischer Ausdehnung. Er bildet weder tatsächliche Sichtweite noch Geländeabschattung, freie Schussbereiche oder Sicherheitsabstände ab. Die Oberfläche kennzeichnet ihn ausdrücklich als schematisch.

In der Detailansicht wird zusätzlich der bestehende GeoSphere-Wetterdienst für den Standort geladen. Ein blauer Pfeil zeigt die Strömungsrichtung: Wind **aus Norden** weht **nach Süden**. Windstärke, Böen und Datenzeitpunkt stehen darunter; Sonnenaufgang und Sonnenuntergang ergänzen die Standortinformation. Auch die Vollbildkarte enthält die Farblegende.

Unter 1 km/h wird kein Richtungspfeil dargestellt. Fehlende Richtung/Stärke, fehlgeschlagener Abruf und Daten älter als 90 Minuten erhalten einen sichtbaren Hinweis. Die Messzeit hat Vorrang vor der Abrufzeit. Unplausible zukünftige Zeitstempel werden ebenfalls nicht als aktuell angezeigt. Nach unten ziehen lädt Einrichtung und Wetter neu; das erneute Öffnen aktualisiert ebenfalls.

## Prüfung

- 218 Mobile-Tests erfolgreich, darunter neun neue Fälle für Trichtergeometrie, 0°/90°/334°, Nord-/Westwind, fehlende Richtung, Windstille und Datenalter.
- Mobile-Typecheck erfolgreich.
- iOS-Hermes-Bundle erfolgreich exportiert; keine neue native Abhängigkeit und kein EAS-Build erforderlich.
- Visuelle Abnahme der neuen Overlays auf dem Gerät steht nach dem Update noch aus. Der Simulator ließ sich auf diesem Mac nicht öffnen; sein erwartetes App-Bundle ist am ausgewählten Xcode-Pfad nicht vorhanden.

## Zusammenhang mit der Hardware-Abnahme

Vor dieser Änderung wurde auf dem physischen iPhone ein Kamerafoto aufgenommen, GPS mit angezeigter Genauigkeit von ca. 4 m übernommen und der Kompass von 91° auf 334° geändert. Der Speichervorgang wechselte sichtbar in den Bestand. In der anschließend geöffneten Detailansicht waren Foto, Zustand und 334° erhalten. Das belegt den bisherigen Hardwarepfad, noch nicht die neuen Overlays. Testdatensatz und Foto sind noch gezielt zu bereinigen; #208 bleibt bis zur vollständigen Abnahme offen. Private Standortkoordinaten und Fotos werden nicht in dieser Dokumentation veröffentlicht.

## Korrektur nach der Geräteprüfung

Das Blickfeld wurde auf dem iPhone sichtbar bestätigt. Bei der Windprüfung lieferte die API für den Teststandort noch einen fünf Minuten gespeicherten Fehlschlag, während GeoSphere direkt bereits wieder gültige Werte zurückgab. Fehlgeschlagene Abrufe werden jetzt einmal wiederholt und weder im Wettercache noch im HTTP-Cache gespeichert. Erfolgreiche Ergebnisse bleiben fünf Minuten gecacht. Ein dauerhafter Ausfall bleibt als solcher sichtbar; es werden keine Werte erfunden. Drei Regressionstests prüfen Wiederholung, erneuten Abruf nach Ausfall und den HTTP-Cache-Header.
