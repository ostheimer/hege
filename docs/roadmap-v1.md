# Roadmap v1

> **Hinweis:** Diese Datei ist ein historisches Planungsdokument und endet bei Sprint 4. Die aktuell gepflegte Roadmap mit dem vollständigen Status aller Sprints und offenen Punkten liegt in [`/ROADMAP.md`](../ROADMAP.md) im Repository-Root.

## Ziel

Diese Roadmap beschreibt die Ausbaustufen vom Repository-Grundgerüst zur ersten produktiven Version für Schriftführer und Jäger.

## Aktueller Status

- `Sprint 0` ist abgeschlossen. Auth, Session, Revier-Scope, Rollenprüfung, Drizzle-Migrationen, Seeds und produktive Route Handler liegen in `apps/web`.
- `Sprint 1` ist technisch abgeschlossen und in Stabilisierung. Dashboard, Reviereinrichtungen, Protokolle, Sitzungen, Freigabe/PDF-Basis, Preview-Smoke und blockierender Release-Check für Production sind umgesetzt.
- `Sprint 1.5` ist produktiv sichtbar. Public Landing, Auth-Redirects, Registrierungsfluss, Setup-Flow, neues `hege`-Logo und Auth-UI sind auf `https://hege.app` deployed und per Playwright auf Desktop und Mobile geprüft.
- `Sprint 2` ist weit fortgeschritten. Mobile Login, Session-Restore, lokales Face-ID-/Touch-ID-Entsperren gespeicherter Sitzungen, Dashboard, Ansitz- und Fallwild-Formulare, Reviereinrichtungen und Protokolle lesen dieselbe API; der iPhone-/iOS-Geräte-Smoke ist als primärer nativer Abnahmepfad dokumentiert. Der Face-ID-Flow wurde am 2026-05-06 auf dem angeschlossenen iPhone bestätigt.
- `Sprint 3` ist technisch gehärtet und nativ teilabgenommen. Fallwild anlegen, exportieren, offline vormerken, mit Fotos versehen, Standort auflösen und über Queue v2 synchronisieren ist umgesetzt; der iPhone-/iOS-Smoke vom 2026-04-26 bestätigt den Queue-v2-Fehlerpfad, R2-Storage ist in Production aktiv und ein direkter Fallwild-Foto-Upload gegen `hege.app` ist verifiziert.
- `Standort v1` ist begonnen. Fallwild nutzt iPhone-GPS, einen produktiv erreichbaren Standort-Endpunkt, gespeicherte Standort-/Straßenkilometer-Metadaten, Google Reverse Geocoding, einen GIP-Index-/Endpoint-Pfad und einen gebündelten regionalen Gänserndorf-Index für Straßenkilometer. Die Bounding Box muss noch mit dem tatsächlichen Revier abgeglichen werden.
- `Sprint 4` ist begonnen und lokal nativ abgenommen. Reviermeldungen und Aufgaben haben einen ersten Backend-/Mobile-Slice mit Tabellen, Seeds, Rollenprüfung, Aufgaben-Sichtbarkeit, Dashboard-Zähler und Mobile-Tab `Meldungen`; der iPhone-Smoke vom 2026-05-05 bestätigt Laden, Aufgabenstatus und Reviermeldung-Erfassung gegen den lokalen API-Stand.

## Sprint 0: Fundament

Status: abgeschlossen

Geliefert:

- PostgreSQL/PostGIS ueber Drizzle an `apps/web` angebunden
- Authentifizierung, Refresh und `GET /api/v1/me`
- aktiver Revier-Kontext und serverseitige Rollenpruefung
- Seed-Daten fuer lokales Entwicklungsrevier
- produktive Route Handler fuer Dashboard, Ansitze, Fallwild, Reviereinrichtungen, Protokolle und Sitzungen
- Dokument- und PDF-Download-Basis

Ergebnis:

- persistente API-Basis mit echten Benutzern, Revieren und Mitgliedschaften

## Sprint 1: Schriftfuehrer-Backend

Status: technisch abgeschlossen, in Stabilisierung

Geliefert:

- Dashboard mit offenen Entwürfen und Revierlage
- Sitzungsliste und Sitzungsdetail
- Protokollversionen, Freigabe-Flow und PDF-Grundlage
- Protokoll-Leseansicht und Dokument-Download
- Web-E2E für Public Web, Auth, Rollen, Sitzungen, Dashboard, Reviereinrichtungen, Protokolle und Dokument-Download
- Preview-Smoke für Public Web, Dashboard, Reviereinrichtungen, Protokolle, Sitzungen und Dokument-Download
- GitHub-Workflow für den Preview-Smoke bei erfolgreichen Preview-Deployments und manuellen `workflow_dispatch`
- Release-Check für produktive Deployments mit separatem Workflow bei erfolgreichen Production-Deployments und manuellem `workflow_dispatch`

Restblock:

- punktuelle manuelle Regression nach größeren Produktänderungen

Ergebnis:

- Sitzungen können von der Anlage bis zur Veröffentlichung durchlaufen werden; der Restfokus liegt auf Härtung und Regressionen

## Sprint 1.5: Public Web und Onboarding

Status: produktiv sichtbar, in Regression

Geliefert:

- Public Landing auf `/` mit Pricing und Produktfokus
- Pricing-CTAs auf `/login` und `/registrieren`
- Login-Redirect auf `/app`
- Setup- und Post-Auth-Redirects über die Server-Guards
- neues `hege`-Logo auf Website und iOS-App
- sichtbare deutsche Web-Copy in den berührten Auth-/Setup-/Landing-Flächen mit echten Umlauten
- Playwright für Public Landing, Login-Redirect, Guard-Redirects und den Registrierungsfluss
- Production-UI-Smoke für Landing, Login, ungültigen Login, Registrierung, Setup, Dashboard und Mobile-Viewports
- Preview-Smoke für Public Landing, Login, Registrierung, `POST /api/v1/auth/login`, `GET /api/v1/me`, den authentifizierten Redirect von `/login` sowie die zentralen App-Read-Pfade

Restblock:

- Setup-Abschluss in den reproduzierbaren Preview-/CI-Abnahmerahmen ziehen
- Registrierungs- und App-Redirects weiterhin bei Produktänderungen visuell gegenprüfen

Ergebnis:

- neue Nutzer sehen zuerst die öffentliche Produktseite und steigen danach kontrolliert in den App-Block ein

## Sprint 2: Jaeger-App Kern

Status: weit fortgeschritten

Geliefert:

- Login und Session-Restore
- lokales Face-ID-/Touch-ID-Entsperren einer gespeicherten Sitzung nach erfolgreichem PIN-Login
- Heute-im-Revier-Screen mit Queue-Anzeige
- Ansitz-Formular mit Queue-Fallback
- Fallwild-Formular mit Queue-Fallback und Standortübernahme
- freigegebene Protokolle und Reviereinrichtungen lesend in der App
- iPhone-/iOS-Geräte-Smoke als kanonischer Geräte-Smoke nach [iOS-Smoke-Runbook](./mobile-smoke-ios.md)

Restblock:

- iPhone-/iOS-Geräte-Smoke nach Standort-/Logo-Änderungen erneut auf Production durchlaufen
- Android-Emulator-Smoke nach [Android-Smoke-Runbook](./mobile-smoke-android.md) optional als Zweitpfad für spätere Plattformabdeckung

Ergebnis:

- Jäger sehen die Lage im Revier und können Ansitze sowie Fallwild bereits mobil erfassen

## Sprint 3: Fallwild und Medien

Status: technisch gehärtet, native Abnahme mit aktivem R2-Storage und Standort v1 nachzuziehen

Lieferumfang dieses Blocks:

- `GET /api/v1/fallwild/:id`
- `POST /api/v1/fallwild/:id/fotos`
- S3-kompatible Storage-Schicht für MinIO lokal und R2 in Preview/Production
- best-effort Storage-Rollback nach erfolgreichem Upload, aber fehlschlagendem `media_assets`-Insert
- `media_assets` als generische Medienbasis
- Queue v2 mit separaten Foto-Uploads, Retry-Backoff, `nextAttemptAt`, dynamischer Sync-Schleife, manuellem Retry und Konfliktstatus
- Fotoauswahl aus der Bibliothek in der App
- Fallwild-Standort v1 mit GPS, Genauigkeit, Quelle, optionaler Adresse, optionaler Google-Place-ID, Straßenname und Straßenkilometer-Feldern
- Mock-Provider für Fallwild-Standortauflösung ohne externe Keys, inklusive sichtbarer UI-/API-Warnungen
- Mobile Vitest-Abdeckung für Foto-Normalisierung, maximal drei Fotos, Submission-Fallback, Standortauflösung, recoverable Upload-Fehler und Queue-Retry-Policy

Restblock:

- iPhone-/iOS-Geräte-Smoke nach [iOS-Smoke-Runbook](./mobile-smoke-ios.md) erneut auf erfolgreichen Foto-Upload, automatische Standortauflösung und leere Queue durchlaufen
- echte Adresse/Gemeinde/Straße mit gesetztem Google-Server-Key und gebündeltem GIP-Index im nativen iPhone-Smoke erneut prüfen
- GIP-Bounding-Box mit dem tatsächlichen Revier abgleichen und bei Bedarf größeren Index deployen

Ergebnis:

- Fallwild kann draußen erfasst und mit Fotos vorgemerkt werden; die Queue zeigt Retry-Zeitpunkt, Fehlertext sowie manuelles Retry/Verwerfen, Production-Foto-Upload in R2 ist verifiziert

## Sprint 4: Reviermeldungen, Aufgaben und Haertung

Status: begonnen

Lieferumfang:

- Reviermeldungen und Aufgaben als API-/Datenmodell-Slice
- Mobile-UI zum Erfassen von Reviermeldungen, Lesen eigener Aufgaben und Ändern des Aufgabenstatus
- Reviereinrichtungen lesend und spaeter mit Kontrollhinweisen in der App
- Audit-Log, Monitoring und Logging
- Fehlerbehandlung, Rechtepruefung und Abnahmeverfahren komplett

Ergebnis:

- stabile v1 mit klaren Kernablaeufen fuer Schriftfuehrer und Jaeger

## Ausbaustufe nach v1: Kommunikation, Aufgaben und Veranstaltungen

Ziel: interne Zusammenarbeit und Feldrueckmeldungen strukturiert in `hege` abbilden

Stabiles Konzeptziel: [Rollen, Aufgaben und Nachrichten v1](./rollen-aufgaben-nachrichten-v1.md)

Lieferumfang:

- flexible Rollen- und Empfängergruppen für Sichtbarkeit und Kommunikation
- Reviermeldungen aus dem Feld zu Fütterungen, Wasserungen und Hochständen mit Fotos und Kurztext
- Aufgaben aus Protokollen, Beschlüssen oder manueller Planung
- Aufgabenlisten und Kalenderansicht pro Benutzer in der mobilen App
- Veranstaltungen mit Ankündigung, Treffpunkt, Erinnerungen und optionaler Teilnahmebestätigung
- WhatsApp- und später Telegram-Anstoß aus der App heraus mit vorbereitetem Nachrichtentext
- auditierbare Zuordnung zwischen interner Nachricht, Aufgabe, Veranstaltung und externem Messenger-Anstoß

Ergebnis:

- Kommunikation, Organisation und Feldrückmeldungen laufen nachvollziehbar über `hege`

## Querschnittsthemen

### Qualitaet

- API-Contract-Tests starteten in Sprint 0 und werden in Sprint 1/3 weitergezogen
- Web-E2E und visuelle Regressionstests sichern Desktop und Mobile-Viewport ab
- Mobile-Smokes sind zuerst auf iPhone/iOS-Simulator reproduzierbar gemacht; Android-Emulator bleibt ein optionaler Zweitpfad ohne physisches Android-Gerät
- Preview-Smoke dient als Standard-Check zwischen Local und Production

### Karten

- Kartenfunktionen in Web und Mobile orientieren sich an Google Maps
- Fallwild-Standort v1 nutzt serverseitige Standortauflösung; Google ergänzt Adresse/Straße, GIP bleibt Zielquelle für Straßenkilometer
- Karten-UI, Marker, Standortsuche und spätere Geocoding-Schritte werden gegen [Google-Maps-Ausrichtung](./maps-google-v1.md) geschärft

### Sprache und Lokalisierung

- v1 ist fachlich und redaktionell auf Deutsch für Österreich (`de-AT`) ausgelegt
- Web und Mobile sollen Texte so strukturieren, dass spätere weitere Sprachen möglich bleiben
- eine verpflichtende zweisprachige Auslieferung ist nicht Teil von v1

## Abnahmekriterien für v1

- Schriftführer kann eine Sitzung anlegen, bearbeiten und zur Freigabe bringen
- Revier Admin kann ein Protokoll freigeben und veröffentlichen
- Jäger kann einen Ansitz starten und beenden
- Jäger kann Fallwild auch mit Fotos offline erfassen und später synchronisieren
- Jäger kann bei Fallwild Position, Adresse, Straße und Straßenkilometer nachvollziehbar erfassen oder manuell ergänzen
- freigegebene Protokolle sind mobil lesbar
- alle Daten sind pro Revier getrennt
- kritische Aktionen sind nachvollziehbar protokolliert

## Empfohlene nächste Umsetzung

Wenn unmittelbar weiterentwickelt wird, ist die sinnvollste Reihenfolge:

1. iPhone-/iOS-Geräte-Smoke auf dem gehärteten Medien-/Queue-v2- und Standort-v1-Pfad mit erfolgreichem Foto-Upload, Standortauflösung und leerer Queue erneut ausführen
2. echte Adresse/Gemeinde/Straße mit gesetztem Google-Server-Key und gebündeltem GIP-Index im nativen iPhone-Smoke erneut prüfen
3. GIP-Bounding-Box mit dem tatsächlichen Revier abgleichen und bei Bedarf größeren Index in Preview/Production aktivieren
4. Mobile-spezifische E2E-Strategie über den dokumentierten Geräte-Smoke hinaus festziehen
5. optionalen Android-Emulator-Smoke für spätere Plattformabdeckung praktisch durchlaufen, falls Android-Abdeckung priorisiert wird
6. danach Rollen, Nachrichten, Veranstaltungen und externe Messenger-Anstöße auf die bestehende Rechtebasis setzen

## Detaillierte Sprint-Backlogs

- [Umsetzungsbacklog](./umsetzungsbacklog.md)
- [Sprint 0 Backlog](./sprint-0-backlog.md)
- [Sprint 1 Backlog](./sprint-1-backlog.md)
