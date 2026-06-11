# Autonomer Umsetzungsplan ab 2026-05-17

## Ziel

Dieser Plan schneidet die nächsten Produktfunktionen so, dass sie ohne fachliche Rückfragen umgesetzt, lokal getestet, im Browser geprüft, auf dem iPhone abgenommen und anschließend auf Production ausgerollt werden können.

Die Reihenfolge priorisiert zuerst belastbare Abnahme und Karten, danach Rollen/Sichtbarkeit, danach Kommunikation und Veranstaltungen.

## Arbeitsregeln für autonome Umsetzung

- Keine Rückfrage, wenn eine konservative Annahme reicht; Annahmen werden im PR/Commit und in der Dokumentation genannt.
- Fehlende externe Secrets blockieren keine Implementierung: Die Funktion bekommt einen klaren Fallback, eine Env-Dokumentation und Tests gegen Mock-/Fixture-Daten.
- Unrelated lokale Dateien bleiben unangetastet, insbesondere ungetrackte `... 2`-Duplikate.
- Jede Funktion wird mindestens mit Typecheck, Unit-/Service-Tests und Browser-Smoke geprüft.
- Web-UI wird per Browser auf Desktop und Mobile-Viewport geprüft.
- Mobile wird per Typecheck, Unit-Tests, EAS-Update und iPhone-/Simulator-Smoke geprüft.
- Production wird erst als erledigt markiert, wenn `hege.app` oder der EAS-Channel live verifiziert wurde.

## Gesamt-Reihenfolge

1. A0 - Release- und Smoke-Basis stabilisieren
2. A1 - Production-iPhone-Smoke abschließen
3. A2 - Echte Karten im Web
4. A3 - Echte Karten in der iPhone-App
5. A4 - Rollen-aware Navigation und sichtbare Zugriffshinweise
6. A5 - Reviermeldungen und Aufgaben v2
7. A6 - Nachrichten/Mitteilungen v1
8. A7 - Veranstaltungen v1
9. A8 - Passkeys/WebAuthn
10. A9 - Mobile-E2E-Strategie und Android-Smoke
11. A10 - WhatsApp-Anstoß als optionale Erweiterung

## A0 - Release- und Smoke-Basis stabilisieren

> **Status 2026-06-10: erledigt.** Die Baseline ist grün (Typecheck 9/9, Tests web/mobile) und die Release-Strecke ist in aktivem, verifiziertem Betrieb: EAS-Channels development/preview/production stehen, OTA-Pushes laufen regelmäßig (zuletzt `0.1.0 · 2026-06-10.14`), Preview-Smoke + Release-Check sichern Deployments ab, und die Domain-Promotion von `hege.app` ist nach jedem main-Merge verifiziert (Release-Check-Dispatch-Playbook). Die downstream-Items A2/A3 (Karten) sind längst geliefert. Die gitignorierten `… 2`-Duplikatdateien sind dokumentiert und bewusst unangetastet. Offener Mini-Rest (nicht blockierend): Kontakte- und Karten-Checklisten in `docs/mobile-smoke-ios.md` ergänzen.

### Ziel

Die Test- und Deploy-Strecke muss zuverlässig sein, bevor neue größere Features gebaut werden.

### Aufgaben

- Aktuellen `main` holen und Arbeitsbaum auf fremde Änderungen prüfen.
- Bestehende ungetrackte Duplikatdateien dokumentieren, aber nicht verändern.
- Lokale Standard-Checks einmal durchlaufen:
  - `pnpm --filter @hege/domain build`
  - `pnpm --filter @hege/web typecheck`
  - `pnpm --filter @hege/web test`
  - `pnpm --filter @hege/mobile typecheck`
  - `pnpm --filter @hege/mobile test`
- Prüfen, ob `hege.app` auf das aktuelle Vercel-Production-Deployment zeigt.
- Prüfen, ob EAS `production`, `preview` und `development` auf aktuelle Update-Gruppen zeigen.
- Smoke-Runbook für Kontakte, Fallwild und Karten um konkrete Checklisten ergänzen.

### Tests

- Terminal-Checks wie oben.
- `curl -I https://hege.app/app`
- `vercel inspect https://hege.app`
- `eas update:list --branch production --limit 2`

### Done

- Baseline ist grün oder Abweichungen sind dokumentiert.
- Kein neues Feature beginnt auf ungeklärtem Release-Zustand.

## A1 - Production-iPhone-Smoke abschließen

> **Status 2026-06-10: technisch entblockt, Session ausstehend.** Alle Voraussetzungen sind produktiv (Google-Server-Key, gebündelter GIP-Index, R2-Foto-Upload, Kontaktlisten-API, Queue v2); das iPhone hat den aktuellen OTA-Stand. Es fehlt nur die manuelle Geräte-Session nach `docs/mobile-smoke-ios.md` plus Ergebnis-Doku (Datum/Gerät/Build) — sie schließt die ROADMAP-Fokuspunkte 1, 2 und 4 auf einmal.

### Ziel

Der aktuelle Stand wird auf einem echten iPhone gegen Production geprüft: Kontakte, Fallwild-Foto, Standortauflösung und leere Warteschlange.

### Aufgaben

- iPhone-Verbindung prüfen:
  - `xcrun devicectl list devices`
  - `xcrun xctrace list devices`
- Aktuelle App per EAS Update oder direkter Release-Installation bereitstellen.
- Login mit dokumentiertem Testkonto prüfen.
- Kontakte prüfen:
  - Mitgliederliste lädt.
  - Reviernachbarn, Weidkameraden und Notrufnummern werden angezeigt.
  - Anrufen-Aktion öffnet den nativen Dialer.
  - Pflege-Rechte nur für Schriftführung/Admin sichtbar.
- Fallwild prüfen:
  - Standortberechtigung erscheint.
  - GPS wird übernommen.
  - Google-Adresse/Straße wird übernommen, wenn Production-Key aktiv ist.
  - GIP-Straßenkilometer oder klarer manueller Fallback wird angezeigt.
  - Fotoauswahl funktioniert.
  - Upload landet in R2 und erzeugt abrufbare Asset-URL.
- Offline-Queue prüfen:
  - offline erzeugter Vorgang wird vorgemerkt.
  - nach Netzrückkehr synchronisiert er.
  - Queue ist danach leer.

### Tests

- Native iPhone-Smoke nach `docs/mobile-smoke-ios.md`.
- API-Gegencheck per `curl` für erzeugte Testdaten.
- Browser-Gegencheck im Web-Backoffice, ob Fallwild/Einträge sichtbar sind.

### Done

- Smoke-Ergebnis mit Datum, Gerät, Build/Update-Gruppe und Abweichungen dokumentiert.
- Testdaten sind bereinigt oder bewusst als Demo-Daten markiert.

## A2 - Echte Karten im Web

> **Status 2026-06-10: erledigt.** Backoffice-Kartenlage auf echte Google Maps umgestellt via `@vis.gl/react-google-maps`; klickbare Marker für Einrichtungen, Ansitze und Fallwild auf dem Dashboard (`TerritoryPanel`) aktiv; Reviermeldungen-Karte separat unter `/app/reviermeldungen` (PR #50).

### Ziel

Backoffice-Karten werden von statischen/platzhalterartigen Darstellungen auf eine echte, Google-Maps-orientierte Karte umgestellt.

### Aufgaben

- Bestehende Map-Komponenten und Datenquellen inventarisieren.
- Web-Map-Abstraktion bauen:
  - `MapShell`
  - `MapMarker`
  - `MapLegend`
  - `MapFallback`
- Google Maps JS API über `@vis.gl/react-google-maps` einbinden.
- Env einführen/dokumentieren:
  - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
  - `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` optional
- Fallback implementieren, falls Browser-Key fehlt:
  - keine kaputte UI
  - klare Meldung
  - Liste/Koordinaten bleiben nutzbar
- Karten für diese Web-Flächen umstellen:
  - Dashboard/Kartenlage
  - Reviereinrichtungen
  - Fallwild
  - Reviermeldungen/Aufgaben, soweit Standort vorhanden
- Marker-Typen konsistent abbilden:
  - Reviereinrichtung
  - Fallwild
  - Reviermeldung
  - aktiver Ansitz
- Marker-Details öffnen als Sheet/Panel oder bestehende Detailkarte.
- Mobile Browser-Viewport prüfen.

### Tests

- Unit-Tests für Marker-Daten-Mapping.
- Service-/Route-Tests für Standortdaten, falls Queries ergänzt werden.
- Browser-Smoke:
  - Desktop `https://localhost/.../app`
  - Mobile-Viewport
  - mit API-Key
  - ohne API-Key/Fallback
- Playwright-E2E:
  - Login
  - Karte sichtbar
  - Marker anklickbar
  - Detail öffnet
  - Fallback-Zustand testbar über Env/Mock

### Done

- Keine alte Platzhalterkarte bleibt auf den Hauptflächen.
- Karte ist nutzbar, auch wenn Google-Key fehlt.
- Production-Route ist nach Deploy per Browser geprüft.

## A3 - Echte Karten in der iPhone-App

> **Status 2026-06-10: im Kern erledigt.** `react-native-maps` 1.20.1 mit tappbaren Pins in allen Locations-Tabs eingeführt (PR #50). Kleiner offener Rest: Mein-Standort-Button + explizite Standortfreigabe-Zustände in `EntityMap`; tote `map-preview.tsx`/`map-stage.tsx` entfernen.

### Ziel

Mobile MapPreview wird durch `react-native-maps` ersetzt, mit Google-Maps-orientierter Bedienung und robustem Fallback.

### Aufgaben

- Bestehende `MapPreview`, `MapStage` und Helper inventarisieren.
- Native Map-Komponente bauen:
  - `MobileMap`
  - `MapMarkerSheet`
  - `CurrentLocationButton`
  - `LayerToggle`
- `react-native-maps` nutzen.
- Wenn Google Provider/Key nativ nicht aktiv ist, iOS-Default-Provider als Fallback erlauben und visuell Google-ähnlich halten.
- Kartenflächen umstellen:
  - Heute/Map-Ausschnitt
  - Reviereinrichtungen
  - Fallwild-Standort
  - Reviermeldungen/Aufgaben mit Standort
- Marker und Farben an Web-Marker angleichen.
- Standortfreigabe sauber behandeln:
  - erlaubt
  - abgelehnt
  - ungenau
  - offline
- Kartenkacheln dürfen keine Kernaktion blockieren.

### Tests

- Unit-Tests für Bounds, Marker-Gruppierung und Layer-Filter.
- Mobile Typecheck und Vitest.
- iOS-Simulator-Smoke:
  - Karte rendert.
  - Marker sind sichtbar.
  - Detail-Sheet öffnet.
  - Standortbutton reagiert.
- Physischer iPhone-Smoke:
  - Standortfreigabe
  - aktueller Standort
  - Fallwild mit GPS speichern
- EAS Update auf `production`, `preview`, `development`.

### Done

- `MapPreview`-Platzhalter ist auf Hauptscreens ersetzt.
- Kein Screen bleibt leer, wenn Standort oder Kartenprovider nicht verfügbar ist.

## A4 - Rollen-aware Navigation und sichtbare Zugriffshinweise

### Ziel

Nutzer sehen nur sinnvolle Navigation. Nicht erlaubte Zugriffe enden nicht still auf `/app`, sondern mit verständlichem Hinweis.

### Aufgaben

- Zentrale Rollen-/Feature-Matrix erstellen:
  - Web Sidebar
  - Mobile Tabs/Mehr
  - API Guards
  - Page Guards
- Web-Shell rollen-aware filtern.
- Mobile-Mehr-Liste rollen-aware filtern.
- Unauthorized-State bauen:
  - Web: eigene Hinweisfläche mit Rückweg
  - Mobile: StateView mit Erklärung
- Redirect-Verhalten prüfen und vereinheitlichen.
- Rollenlabels überall über `formatRoleLabel` schicken.

### Tests

- Unit-Tests für Feature-Matrix.
- Web Route/Page Tests für Rollen.
- Playwright-E2E mit `revieradmin`, `mair`, `huber`, `ostheimer`.
- Mobile Vitest für sichtbare Links je Rolle.
- Browser-UX-Prüfung Desktop/Mobile.

### Done

- Keine rollenfremden Hauptlinks in Web oder Mobile.
- Unerlaubter Direktzugriff zeigt sichtbaren Hinweis.

## A5 - Reviermeldungen und Aufgaben v2

### Ziel

Reviermeldungen und Aufgaben werden von ersten CRUD-Slices zu einem alltagstauglichen Arbeitsmodell erweitert.

### Aufgaben

- Empfängergruppen modellieren:
  - einzelne Mitglieder
  - Rollen
  - alle Reviermitglieder
- Aufgabenbezug modellieren:
  - `source_type`
  - `source_id`
- Statusmodell erweitern:
  - offen
  - angenommen
  - in Arbeit
  - blockiert
  - erledigt
  - abgelehnt
  - archiviert
- Priorität, Fälligkeit und Verantwortliche ergänzen.
- Reviermeldung kann Aufgabe erzeugen.
- Web:
  - Liste mit Filter/Suche
  - Detail
  - Status ändern
  - Aufgabe aus Meldung erstellen
- Mobile:
  - eigene/offene Aufgaben
  - Statusänderung
  - Reviermeldung mit Standort und Foto
  - Offline-Queue für relevante Schreibpfade
- Notifications bei neuer Aufgabe oder Statusänderung auslösen.

### Tests

- DB-Migrationstest über Drizzle.
- Service-Tests für Sichtbarkeit und Statusübergänge.
- API-Route-Tests.
- Web Playwright:
  - Meldung anlegen
  - Aufgabe erzeugen
  - Status ändern
  - Rollen-Sichtbarkeit
- Mobile Vitest + iPhone-Smoke:
  - Aufgabe sichtbar
  - Statusänderung
  - Offline-Fallback

### Done

- Aufgaben sind zielgerichtet sichtbar.
- Reviermeldungen können operativ weiterverarbeitet werden.

## A6 - Nachrichten/Mitteilungen v1

### Ziel

Fachliche Kommunikation wird intern abgebildet, statt nur technische Notifications zu haben.

### Aufgaben

- Datenmodell:
  - Nachrichten
  - Empfänger
  - Lesestatus
  - optionale Ressourcenreferenz
- API:
  - Liste
  - Detail/Thread
  - erstellen
  - gelesen/archiviert
- Web:
  - Nachrichtenbereich
  - Composer
  - Empfängerwahl
- Mobile:
  - Nachrichten im Mehr-Bereich oder eigener Eintrag
  - Lesen/Antworten, falls v1-Antworten im Scope bleiben
- Notifications koppeln:
  - neue Nachricht erzeugt technische Notification
  - Notification ersetzt nicht Nachricht

### Tests

- Service-Tests für Empfängerauflösung.
- API-Tests für Lesestatus.
- Playwright-E2E:
  - Admin schreibt an Rolle
  - Jäger sieht Nachricht
  - anderer Nutzer sieht sie nicht
- Mobile-Smoke für Lesen und Badge.

### Done

- Nachrichten sind strukturiert, rollen-/mitgliedsbezogen und nachvollziehbar.

## A7 - Veranstaltungen v1

### Ziel

Termine wie Gesellschaftsjagd, Arbeitseinsatz oder Sitzung bekommen ein eigenes Modul mit Treffpunkt, Teilnehmern und Erinnerungen.

### Aufgaben

- Datenmodell:
  - Veranstaltung
  - Treffpunkt/Standort
  - Teilnehmer/Empfängergruppen
  - Teilnahmeantwort
  - Erinnerung
- API CRUD mit Rollenprüfung.
- Web:
  - Kalender-/Listenansicht
  - Detail
  - Teilnehmerstatus
- Mobile:
  - Liste nächster Veranstaltungen
  - Detail mit Treffpunkt
  - Teilnahme bestätigen/absagen
  - Karte öffnen
- Notifications:
  - Einladung
  - Erinnerung
  - Änderung

### Tests

- Service-/API-Tests für Sichtbarkeit und RSVP.
- Browser-E2E für Veranstaltung anlegen und Teilnahme sehen.
- Mobile-Smoke für Teilnahmebestätigung.

### Done

- Veranstaltungen können geplant, adressiert und mobil bestätigt werden.

## A8 - Passkeys/WebAuthn

### Ziel

Face ID bleibt lokales Entsperren; zusätzlich entsteht ein echter serverseitiger Passkey-Login.

### Aufgaben

- WebAuthn-Library auswählen und ADR dokumentieren.
- Datenmodell für Credentials.
- Registrierung eines Passkeys aus eingeloggter Session.
- Login per Passkey.
- Recovery/Fallback über PIN erhalten.
- Web UI:
  - Passkey verwalten
  - Passkey Login
- Mobile:
  - prüfen, ob native Passkeys im aktuellen Expo-Setup sinnvoll integrierbar sind
  - sonst nur Web/Browser v1

### Tests

- Unit-Tests für Challenge/Origin-Validierung.
- Playwright-WebAuthn-Test im Browser.
- Security-Review:
  - Origin
  - RP ID
  - Replay-Schutz
  - Credential Ownership

### Done

- Passkey ist echte Authentifizierung, nicht nur lokales Entsperren.

## A9 - Mobile-E2E-Strategie und Android-Smoke

### Ziel

Native Prüfung wird reproduzierbarer und nicht nur manuell.

### Aufgaben

- Entscheidung dokumentieren:
  - Expo/EAS + iPhone-Smoke als primärer Pfad
  - Android Emulator als sekundärer Pfad
  - optional Maestro/Detox bewerten
- Android-Smoke praktisch durchlaufen.
- Testdaten-Setup standardisieren.
- Smoke-Ergebnisse in `docs/mobile-smoke-results/` dokumentieren.

### Tests

- iOS Runbook.
- Android Runbook.
- Mindestens ein automatisierbarer Smoke-Teil pro Plattform.

### Done

- Mobile-Regressionen haben einen klaren, wiederholbaren Pfad.

## A10 - WhatsApp-Anstoß

### Ziel

WhatsApp wird als optionaler Ausleitungskanal geprüft, nicht als Datenquelle.

### Aufgaben

- Fachliche Abgrenzung zu Nachrichten dokumentieren.
- Share-Link/Intent für ausgewählte Nachrichten oder Veranstaltungen prüfen.
- Kein automatischer Versand ohne explizite Nutzeraktion.
- Keine fachliche Wahrheit in WhatsApp speichern.

### Tests

- Mobile Share-Smoke.
- Web-Link-Smoke.
- Datenschutz-/Inhaltsprüfung.

### Done

- WhatsApp ist nur Komfortkanal; interne Nachrichten bleiben führend.

## Browser-/UX-Prüfmatrix

Jeder Web-Block wird auf diesen Viewports geprüft:

- Desktop 1440 x 900
- Tablet 1024 x 768
- Mobile 390 x 844

Prüfpunkte:

- kein horizontaler Overflow
- keine überlappenden Texte
- Buttons/Inputs mit ausreichend Tap-Fläche
- Lade-, Leer- und Fehlerzustände
- Tastaturbedienung für Hauptaktionen
- sinnvolle deutsche Copy mit echten Umlauten

## E2E-Prüfmatrix

| Bereich | Web E2E | Mobile Smoke | Production Check |
|---------|---------|--------------|------------------|
| Kontakte | vorhanden, bei Änderungen erweitern | iPhone Anruf/Listen prüfen | API `contact-lists` |
| Karten | Marker, Detail, Fallback | Marker, Standort, Sheet | Browser + iPhone |
| Rollen | Navigation und Guards | Mehr-Liste je Rolle | Testkonten |
| Aufgaben | CRUD, Status, Sichtbarkeit | Status und Queue | API + UI |
| Nachrichten | Empfänger und Lesestatus | Badge/Lesen | API + UI |
| Veranstaltungen | Anlegen, RSVP | Teilnahme | API + UI |
| Passkeys | WebAuthn Flow | optional | Browser |

## Deploy-Regeln

- Web:
  - Migrationen vor produktiver Nutzung ausführen.
  - `vercel inspect https://hege.app` prüfen.
  - `curl -I` auf betroffene Route.
  - Authentifizierter API-Smoke mit Testkonto.
- Mobile:
  - aus sauberem Git-Worktree veröffentlichen.
  - `production`, `preview`, `development` aktualisieren, wenn der installierte Channel unklar sein kann.
  - EAS Update-Gruppen dokumentieren.
  - Bei nativen Änderungen zusätzlich Release-Build auf iPhone installieren.

## Reihenfolge für die nächste Arbeitsrunde

1. A0 und A1 abschließen, damit der aktuelle Stand belastbar ist.
2. A2 Web-Karten implementieren und deployen.
3. A3 Mobile-Karten implementieren und per EAS/iPhone prüfen.
4. A4 Rollen-aware Navigation nachziehen.
5. A5 Aufgaben/Reviermeldungen v2 schneiden.

Erst danach mit Nachrichten, Veranstaltungen und Passkeys beginnen.
