# Blickfeld und Wind bei Reviereinrichtungen

Stand: 04.10.2026.

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

Bei der anschließenden direkten Messung benötigte GeoSphere für eine erfolgreiche Antwort knapp 23 Sekunden. Das bisherige Zeitlimit von fünf Sekunden war dafür zu kurz. Jeder der höchstens zwei Versuche erhält nun 30 Sekunden; die API-Route erlaubt insgesamt 70 Sekunden. Die Abfrage wird auf das aktuelle 15-Minuten-Raster begrenzt, statt jede Minute ein neues einstündiges Prognosefenster anzufordern. Dadurch bleiben identische Rasterabfragen wiederverwendbar und die Messzeit liegt am Beginn des aktuellen Intervalls. Während des Abrufs bleibt die Ladeanzeige sichtbar.

## Überarbeitung vom 29.09.2026

Die Detailansicht beginnt mit Name, eigenem Hochstand-Symbol und Himmelsrichtung der Hauptblickrichtung. Die Karte folgt unmittelbar. Ein gefüllter blauer Windpfeil mit weißer Kontur zeigt die Strömung direkt über der Karte; eine kompakte Windanzeige enthält Herkunft und Stärke. Die Detailkarte bleibt nordorientiert, sodass Pfeil und Richtungsanzeige zusammenpassen. Erklärungen, Gradzahl, Böen, Datenquelle und Sonnenzeiten sind standardmäßig eingeklappt. Fotos und weitere Einrichtungsdetails ebenfalls. Warnzustände wie „Gesperrt“ bleiben sofort sichtbar.

Die Hauptblickrichtung behält den präzisen gespeicherten Wert (z. B. 334°), solange sie nicht bewusst geändert wird. Unter „Fenster einstellen“ können berechtigte Verwalter eine Hauptblickrichtung und bis zu sieben weitere Fenster auswählen. Weitere Blickfelder sind heller gezeichnet. Es werden keine Fenster automatisch angenommen. Die neue PATCH-Route `/api/v1/reviereinrichtungen/[id]/outlook` prüft das Verwaltungsrecht aus den gemeinsamen Rollenregeln und begrenzt das Update auf das aktive Revier. Weitere Einrichtungsdetails bleiben durch einen atomaren JSON-Merge erhalten; eine Datenbankmigration ist nicht nötig.

„Notizen & Arbeiten“ verwendet bestehende Reviermeldungen (`relatedType: reviereinrichtung`, `relatedId`) und Aufgaben (`sourceType: reviereinrichtung`, `sourceId`). Damit sind Einträge dauerhaft zugeordnet und auch im Bereich Meldungen verfügbar. Bestehende offene Wartungen werden ebenfalls angezeigt. Aufgaben lassen sich im Rahmen der bisherigen Autoren-, Zuständigen- und Verwaltungsrechte erledigen. „Gut“ wird als hinterlegte Zustandseinschätzung bezeichnet, nicht als automatische Aussage über offene Arbeiten.

Wetter wird beim Zurückkehren in die App und alle fünf Minuten im Vordergrund aktualisiert. Ein erfolgloser Abruf wird nach 30 Sekunden einmal erneut versucht. Ohne aktuelle Daten wird kein Windpfeil erfunden; die kompakte Anzeige zeigt den fehlenden oder veralteten Stand. Ein manueller Pull-to-Refresh bleibt möglich.

Prüfung: 220 Mobile-Tests und 327 Web-Tests erfolgreich, einschließlich Windpfeil-Geometrie, Richtungsvalidierung, Rollenprüfung und Revierbegrenzung. Native Sichtprüfung der überarbeiteten Ansicht erfolgt separat auf dem iPhone. Die vorherige Sichtbestätigung galt nur dem goldenen Blickfeld.

Aktive Ansitze mit `standortId` übernehmen die gespeicherten Blickfelder und das Einrichtungssymbol. „Details öffnen“ führt zur verknüpften Einrichtung mit aktueller Windkarte. Für freie Ansitzstandorte ohne Verknüpfung wird keine Ausrichtung angenommen.

## Speicherabnahme vom 04.10.2026

Die überarbeitete grafische Ansicht wurde nach dem Update im Gespräch auf dem iPhone sichtbar bestätigt. Die ergänzende lokale Abnahme prüft Fenster, Notizen und Arbeiten mit angenommenen Testeinrichtungen; die echten Einrichtungen legt Andreas später selbst vor Ort mit der App an.

Die API-Integration bestätigt zusätzliche Ost-/Südfenster bei unverändertem Hauptblick von 334°, den Erhalt anderer Einrichtungsdetails, Notizen und Aufgaben nach einer neuen Anmeldung sowie den dauerhaft gespeicherten Erledigt-Status. Ein zusätzlicher Fall prüft die bestehenden Jäger-/Verwalterrechte.

Die native Prüfung führte zu einer Korrektur der Tastaturbedienung: Der erste Tap auf „Speichern“ wurde bisher bei offener Tastatur zum Schließen der Tastatur verwendet. Die Detailansicht übernimmt nun wie `ScreenShell` `keyboardShouldPersistTaps="handled"` und `keyboardDismissMode="on-drag"`. Der Speichern-Button reagiert damit bereits beim ersten Tap. Der neue Maestro-Flow prüft dies mit einer Notiz bei offener Tastatur und öffnet alle Einträge erneut. Details stehen im [Abnahmeprotokoll](./mobile-smoke-results/2026-10-04-hochstand-speichern.md).
