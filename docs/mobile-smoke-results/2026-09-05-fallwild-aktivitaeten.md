# Fallwild-Abschluss und Aktivitäten im iOS-Simulator

## Entscheidung

Nach einer erfolgreichen Erfassung ist „Fallwild → Bestand → Liste“ das passende Ziel: Die Speicherbestätigung und der neue Eintrag sind gemeinsam sichtbar. Zur Startseite gelangt man weiterhin über „Heute“. Filter werden zurückgesetzt und eingeklappt, damit der neue Eintrag nicht durch einen älteren Filter verborgen bleibt. Bei Validierungsfehlern bleiben Formular und Eingaben erhalten. Offline-Vormerkungen und ausstehende Fotos behalten ihre Warnmeldung und die Warteschlange.

## Aktivitäten

- „Heute“ zeigt genau die drei neuesten Aktivitäten.
- „Alle anzeigen“ öffnet eine eigene Ansicht mit der vollständigen Historie der bestehenden Quellen: Ansitzstarts, Fallwild-Erfassungen und Revierbenachrichtigungen. Auch inzwischen beendete Ansitze gehören zum Verlauf.
- Die Ansicht unterstützt Pull-to-Refresh; die Startseite aktualisiert sich beim erneuten Öffnen.
- Die neue API `/api/v1/activities` verwendet den authentifizierten aktiven Revierkontext. Fremde Revier-IDs werden nicht vom Client übernommen. Es werden keine zusätzlichen Rollenrechte vergeben.
- PostgreSQL- und ISO-Zeitstempel werden für Hermes vereinheitlicht; Sortierung und relative Zeitangaben beziehen sich auf den tatsächlichen Zeitpunkt.

## Verifikation am 5. September 2026

- iPhone 17 Pro, iOS 26.5, lokale Development-App, lokale API auf `127.0.0.1:3000`, Docker-PostGIS auf Port 15432.
- Ein lokaler Xcode-Build; keine EAS-Builds, Updates oder Cloud-Deployments.
- Maestro-Flow `.maestro/ios-fallwild-activities.yaml`: drei Einträge auf Heute, vierter Eintrag nur in der Gesamtansicht, zurück zur App, Fallwild ausfüllen und speichern, Liste samt Bestätigung, neuer Eintrag sichtbar, Aktualisierung auf Heute – erfolgreich.
- Zusätzlich manuell im Simulator geprüft: fehlender Längengrad führt zur Fehlermeldung und erhält das Formular.
- 200 Mobile-Tests und 290 Web-Tests erfolgreich. Typprüfungen für beide Anwendungen erfolgreich.
- API mit lokalen Testrollen Jäger und Revier-Admin geprüft; alle zurückgegebenen Aktivitäten gehören zum aktiven Revier. Unit-Test schließt gezielt Aktivitäten aus einem fremden Revier aus und prüft mehr als fünf historische Einträge.
- Die beiden ausschließlich für diesen Lauf angelegten lokalen Fallwild-Testeinträge wurden anschließend anhand ihrer konkreten IDs entfernt.

Belegbilder: [Fallwild nach dem Speichern](2026-09-05-fallwild-aktivitaeten/fallwild-saved.png), [Startseite mit drei Aktivitäten](2026-09-05-fallwild-aktivitaeten/home-three.png), [vollständiger Aktivitätenverlauf](2026-09-05-fallwild-aktivitaeten/all-activities.png).

Die Simulatorinstallation benötigte eine Korrektur der Metro-Auflösung: Der Router verwendete zuvor React 19.2.4, der native Renderer React 19.0.0. Metro verwendet jetzt für alle nativen Module dieselbe React-Instanz aus der Mobile-App.

## Erneut testen

Web-API und Metro mit lokaler API-Basis starten, dann die Development-App im Simulator öffnen. Der Flow benötigt `APP_ID`, `HEGE_SMOKE_IDENTIFIER` und `HEGE_SMOKE_PIN` für ein lokales Testkonto. Er legt einen lokalen Fallwild-Testeintrag mit Gemeinde `Simulator UX 2026-09-05` an. Diesen Flow ausschließlich gegen die lokale Testumgebung ausführen.

```bash
maestro test -e APP_ID=app.hege.revier \
  -e HEGE_SMOKE_IDENTIFIER="$HEGE_SMOKE_IDENTIFIER" \
  -e HEGE_SMOKE_PIN="$HEGE_SMOKE_PIN" \
  .maestro/ios-fallwild-activities.yaml
```

Die Änderungen sind lokal vorbereitet. Für die Veröffentlichung muss die neue API zusammen mit der Mobile-Änderung bereitgestellt werden; der neue Aktivitäten-Endpunkt ist noch nicht auf Production ausgerollt.
