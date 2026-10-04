# Hochstand: Fenster, Notizen und Arbeiten speichern

Datum: 04.10.2026. Ausgangsstand: `main` / `2f1504345430eaf1c4a69bea338481921dcefb4d` (PR #224), ergänzt um die hier dokumentierte Tastaturkorrektur und Testanker.

## Umgebung

- Eigener iPhone-17-Pro-Simulator mit iOS 26.5; bestehendes Entwicklungs-Binary, Runtime 1.0.1.
- Aktuelles JavaScript über lokalen Metro auf Port 8087, App-Stand `QA-2026-10-04-facility`.
- Lokale Web-API auf `127.0.0.1:3200` und eigene PostgreSQL-Datenbank `hege_e2e_1791120004001` auf Port 15432.
- Klar bezeichnete Testhochstände mit angenommenen Positionen. Echte Hochstände erfasst Andreas später vor Ort in der App.

## Beobachteter Bedienfehler und Korrektur

Bei offener Tastatur wurde der erste Tap auf „Speichern“ in der Notiz-Erfassung verschluckt: Die Tastatur schloss sich, die Notiz blieb ungespeichert. Das wurde im Simulator vor der Korrektur reproduziert. Die Detailansicht übernimmt die bestehenden `ScreenShell`-Einstellungen `keyboardShouldPersistTaps="handled"` und `keyboardDismissMode="on-drag"`.

Nach der Korrektur wurde eine Notiz mit offener Tastatur beim ersten Tap gespeichert und Erfolgsfeedback angezeigt. Die Testanker für Richtungen, Formulare und ausklappbare Einträge ändern keine sichtbaren Texte.

## Geprüfter Ablauf

1. Hauptblick 334° behalten, Ost- und Südfenster hinzufügen und speichern.
2. Einrichtung verlassen und erneut öffnen; Hauptblick NW und weitere Trichter wiederfinden.
3. Eine Notiz über die App speichern, während die Tastatur offen ist.
4. Eine Arbeit über die App anlegen und nach erneutem Öffnen als offene Arbeit sehen.
5. Die Arbeit erledigen, Einrichtung erneut öffnen und `0 offen` sehen.
6. Die gespeicherte Notiz und die erledigte Arbeit ausklappen und lesen.
7. Nach neuer API-Anmeldung die gespeicherten Werte gegenprüfen: Hauptblick 334°, Zusatzrichtungen `[90, 180]`, unveränderte Zugangsinformation und Kapazität, eine zugeordnete Notiz, eine erledigte Aufgabe mit Abschlusszeitpunkt.

Der Flow liegt in `.maestro/ios-facility-outlook-work.yaml`. Wischgesten am Seitenrand umgehen die interaktive Karte. Die optionalen Systemdialog-Schritte dürfen entfallen, wenn iOS keinen Öffnen-Dialog zeigt.

## Automatisierte Prüfung

- 220 Mobile-Unit-Tests und 327 Web-Unit-Tests erfolgreich.
- Web- und Mobile-Typecheck erfolgreich; Mobile-Typecheck nach den Änderungen erneut erfolgreich.
- Zwei API-Integrationsfälle plus Datenbank-Setup erfolgreich (Playwright: `3 passed`): Speicherablauf mit neuer Sitzung, Erhalt weiterer Einrichtungsdetails, Entfernen weiterer Fenster sowie Rechte von Jägern und Verwaltern.
- Vollständiger kombinierter Maestro-Lauf erfolgreich: Fenster speichern, Notiz bei offener Tastatur speichern, Arbeit anlegen/erledigen und alle Einträge erneut öffnen. Die anschließende API-Gegenprüfung nach neuer Anmeldung bestätigt die gespeicherten Werte.

## Bereinigung

Alle fünf in dieser Abnahme angelegten lokalen App-Testeinrichtungen wurden nach der Gegenprüfung gezielt und transaktional entfernt, einschließlich vier zugeordneter Notizen und drei Aufgaben aus den Testläufen. Die anschließende Datenbankprüfung fand für die bekannten Test-IDs jeweils null Einrichtungen, Notizen und Aufgaben. Andere Datensätze und die separate lokale Entwicklungsdatenbank wurden dabei erhalten. Diese Fixtures enthielten keine Fotos.

## Abnahmegrenzen

Diese Prüfung verwendet lokale Testdaten. Sie veröffentlicht kein OTA-Update und bestätigt keinen neuen App-Stand auf Andreas’ iPhone. Kamera, echter GPS-Sensor, Kompass und Speichern wurden im vorherigen Hardwareablauf am 28.09.2026 geprüft; die überarbeitete grafische Hochstandansicht wurde anschließend sichtbar bestätigt. #208 bleibt bis zur gezielten Bereinigung des dortigen Hardware-Testdatensatzes samt Foto und dem vollständigen Abschlussprotokoll offen.
