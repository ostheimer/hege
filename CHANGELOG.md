# Changelog

Alle relevanten Aenderungen an `hege` werden hier festgehalten.

Das Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) und das Projekt nutzt [Semantic Versioning](https://semver.org/lang/de/).

## [Unreleased]

### Added

- Mobile Design-System §10: `<Badge tone>` Primitiv (PR #135) mit semantischen Color-Roles für Success, Warning, Error und Info; auf Revierarbeit, Protokolle, Ansitze und Fallwild eingesetzt (PR #136).
- Mobile Design-System §10: semantische Farb-Tokens (`semantic color roles`) in `packages/domain`; erstmals in `StateView` für Loading-/Empty-States adoptiert (PR #134).
- Mobile Design-System §10.7: Eyebrow- und Section-Label-Typographie aus gesamter App in gemeinsame Tokens konsolidiert (PR #141).
- Mobile Design-System §10.3: Muted-Surface-Button-Farben auf Tokens umgestellt; alle `ghost`/`outline`-Buttons holen Hintergrundfarbe jetzt aus dem Token-System (PR #142).
- Mobile API-Base-URL-Fix: `EXPO_PUBLIC_API_BASE_URL` fällt standardmäßig auf `/api/v1` zurück, sodass kein externer Basis-Pfad mehr konfiguriert werden muss (PR #140).

- Kontaktlisten v1: Drizzle-Tabellen, Seed-/Demo-Daten, `GET/POST/PATCH/DELETE /api/v1/contact-lists`, verlinkte registrierte Mitglieder mit Live-Name/-Telefon, freie externe Kontakte, Web-Seite `/app/kontakte` und Mobile-Screen `Kontakte` im Mehr-Menü.
- Reviermeldungen und Aufgaben v1: Drizzle-Tabellen, Seed-Daten, `GET/POST/PATCH /api/v1/reviermeldungen`, `GET/POST/PATCH /api/v1/aufgaben`, Rollenprüfung, Aufgaben-Sichtbarkeit (eigene/offene) und Dashboard-Zähler.
- Mobile-Tab `Meldungen`: Reviermeldung erfassen, eigene und offene Aufgaben lesen, Aufgabenstatus ändern.
- Fallwild-Standort v1: Mobile übernimmt iPhone-GPS, `POST /api/v1/geo/fallwild-location` ist produktiv erreichbar, speichert Standort- und Straßenkilometer-Metadaten; Adresse und Straße werden serverseitig per Google Reverse Geocoding ergänzt, wenn `GOOGLE_MAPS_SERVER_API_KEY` gesetzt ist.
- Mock-/Provider-Schicht für Fallwild-Standort (`HEGE_GEO_PROVIDER=live|mock|disabled`): `mock` liefert lokale Gänserndorf-Testdaten ohne externe API-Keys; UI und API zeigen klare Hinweise für manuelle Standortergänzung.
- GIP-OGD-BEPU-Indexpfad: lokaler JSON-Resolver (`GIP_ROAD_KILOMETER_INDEX_PATH`), konfigurierbarer Suchradius (`GIP_ROAD_KILOMETER_MAX_DISTANCE_METERS=150`) und Build-Befehl `pnpm --filter @hege/web geo:gip:index` für den Export aus `gip_reference_ogd.gpkg`.
- Regionaler GIP-OGD-BEPU-Index für Gänserndorf aus dem offiziellen Referenzexport als gebündelter Backend-Fallback für `HEGE_GEO_PROVIDER=live` ohne externen Index.
- GitHub-Workflow `.github/workflows/release-check.yml` für automatischen Release-Check bei erfolgreichen Production-Deployments und manuellen `workflow_dispatch`; als blockierender Production-Check in Vercel aktiviert.
- Cloudflare R2-Bucket `hege-assets` (WEUR) mit Custom Domain `assets.hege.app`; S3-Env-Variablen (`S3_ACCESS_KEY`, `S3_SECRET_KEY` u. a.) für Preview und Production in Vercel konfiguriert.
- Mobile Vitest-Abdeckung für Foto-Normalisierung, Foto-Limit (max. 3), Submission-Fallback, recoverable Upload-Fehler und Queue-Retry-Policy.
- Echte Auth-Session mit Login, Refresh, `GET /api/v1/me` und serverseitigem Revierkontext fuer Web und App.
- Neue API-Vertraege fuer `dashboard`, `reviereinrichtungen`, `protokolle`, `sitzungen` und `documents` auf der Web-Schicht eingefuehrt.
- Public-Web-Block mit Landing auf `/`, Pricing-CTAs, Login-/Registrieren-Einstieg und Onboarding-Redirects fuer `/app` und `/app/setup` vorbereitet.
- Neue Web-Flows fuer die Sitzungen-Liste, Sitzungsdetail, Freigabe und PDF-Download-Grundlage umgesetzt.
- Mobile Session-Restore, tokenbasiertes Login und zentraler API-Client fuer die Read-Slices eingerichtet.
- Mobile Offline-Queue mit Retry-Status fuer `Ansitz`- und `Fallwild`-Schnellmeldungen eingebaut.
- Playwright deckt jetzt Login, Logout, Rollen-Schutz sowie Sitzungs-Mutation und Freigabe im Web ab.
- Fallwild-Detail und Foto-Upload ueber `GET /api/v1/fallwild/:id` und `POST /api/v1/fallwild/:id/fotos` plus `media_assets` eingefuehrt.
- S3-kompatible Storage-Schicht fuer lokales MinIO und Cloudflare R2 eingebaut.
- Preview-Smoke-Skript fuer Public Web, `POST /api/v1/auth/login`, `GET /api/v1/me`, Dashboard, Reviereinrichtungen, Protokolle, Sitzungen und Dokument-Download hinzugefuegt.
- GitHub-Workflow fuer den Preview-Smoke bei erfolgreichen Preview-Deployments und manuellen `workflow_dispatch` hinzugefuegt.
- Mobile Fallwild-Fotoauswahl ueber `expo-image-picker` mit bis zu drei Bibliotheksbildern eingefuehrt.
- Android-Smoke-Helfer fuer Expo, Testbild-Erzeugung und `adb`-basierte Ablaufpruefung ergaenzt.
- Seed-Account fuer Andreas Ostheimer als Admin mit Username-Login eingefuehrt.

### Changed

- Neues `hege`-Logo fuer iOS-App und Website eingebaut; auf `https://hege.app` produktiv verfuegbar.
- Mobile Session-Restore um lokalen `locked`-Status und biometrisches Entsperren (Face ID/Touch ID) fuer gespeicherte Sitzungen erweitert; iPhone-Abnahme 2026-05-06 bestaetigt.
- Mobile Offline-Queue auf Queue v2 umgestellt: `nextAttemptAt`, exponentieller Retry-Backoff, dynamische Sync-Schleife, manueller Retry und Verwerfen fehlgeschlagener Eintraege; Fallwild Create-zu-Upload-Kette bleibt erhalten.
- GIP-Resolver-Vertrag fuer Fallwild gehaertet: ArcGIS-aehnliche `features[].attributes`-Antworten, oesterreichische Strassennamen-Varianten (`Landesstrasse 9`/`L9`) und Kilometerfelder (`KM_VON`) werden verarbeitet.
- Google Maps Server-Key fuer Preview/Production gesetzt; `POST /api/v1/geo/fallwild-location` liefert Adresse, Gemeinde und Strasse aus Google Reverse Geocoding.
- Public Landing, Login, Registrierung und Setup-Flow auf Production visuell geprueft; Playwright-Abdeckung fuer Desktop und Mobile-Viewport ergaenzt.
- Sichtbare deutsche Web-Copy in beruehrten Auth-, Setup-, Landing- und Sitzungsflaechen auf echte Umlaute korrigiert.
- Login-Vertrag auf `identifier` plus vierstellige `pin` erweitert und serverseitig auf E-Mail oder Username aufgeloest.
- Login-Oberflaechen in Web und App ohne sichtbare Demo-Konten-Hinweise umgestellt.
- Dashboard im Web von `demoData` auf die Server-Schicht mit Session-/Revier-Kontext umgestellt.
- Reviereinrichtungen und Protokolle im Web auf read-only Server-Slices umgestellt.
- Public Landing und Onboarding-Redirects fuer Gast-, Login- und Setup-Pfade als neue Sprint-1.5-Teilflaeche eingefuehrt.
- Mobile-Dashboard liest `DashboardResponse` und zeigt Queue, naechste Sitzung und letzte Benachrichtigung aus der API.
- Web-Auth, Session-Kontext und Fehlerformat auf echte Token- und JSON-Responses umgestellt.
- Seeds und DB-Schema um Reviereinrichtungen, Kontrollen, Sitzungen, Protokollversionen, Beschluesse, Dokumente und Notifications erweitert.
- Mobile `Ansitz` und `Fallwild` koennen Schnellmeldungen direkt senden oder bei Verbindungsfehlern in die Queue legen.
- Mobile `Ansitz` und `Fallwild` wurden auf echte Eingabeformulare mit Queue-Fallback umgestellt.
- Der lokale Playwright-Harness setzt die E2E-Datenbank jetzt vollstaendig zurueck und startet die Web-App ohne Wiederverwendung alter Test-Server.
- Seeds und DB-Schema erweitern Fallwild jetzt um `media_assets` als generische Medienbasis.
- Die Mobile-Offline-Queue verarbeitet Fallwild jetzt als Create-zu-Upload-Kette mit `pending`, `syncing`, `uploading`, `failed` und `conflict`.
- Das Mobile-Dashboard zeigt Queue-Typ, Status, Fehlermeldung und Verwerf-Aktion fuer fehlgeschlagene Eintraege.
- Der lokale Schnellstart fuer Web/API umfasst jetzt auch ein wiederholbares Storage-Setup fuer MinIO.
- Protokollversionen verlangen keine Pflicht-Zusammenfassung mehr; eine Version muss nur noch eine Zusammenfassung, einen Agenda-Punkt oder einen Beschluss enthalten, damit die Schriftfuehrung Zwischenstaende speichern kann.

### Fixed

- Web Storage-Rollback fuer Fallwild-Fotos: nach fehlgeschlagenem `media_assets`-Insert wird das bereits in R2 hochgeladene Objekt per best-effort `DeleteObjectCommand` entfernt.
- Web-Sidebar um eine sichtbare `Abmelden`-Aktion ergaenzt und den Logout-Flow ueber Cookie-Clear mit Redirect auf `/login` abgesichert.
- Login-Placeholder in Web und App zeigen keine konkreten Seed-Zugangsdaten mehr an.
- Production-Fallback fuer Legacy-Schema eingebaut, damit Login ohne `users.username` und Fallwild-Reads ohne `media_assets` nicht mehr mit `500` scheitern.
- Fallwild-Reads brechen ohne konfigurierte Storage-Public-URL nicht mehr mit `500`, sondern liefern `photos: []`.
- Protokoll-Erstellung (Schriftfuehrung): Validierungsfehler nennen jetzt verstaendliche deutsche Feldbezeichnungen statt interner Feldnamen (z. B. `„Titel" darf nicht leer sein.`).
- Ein Beschluss mit Titel, aber ohne Beschlusstext, wird beim Speichern nicht mehr stillschweigend verworfen, sondern klar zurueckgemeldet.
- Erfolgs- und Fehlermeldungen im Sitzungsdetail erscheinen nur noch beim ausloesenden Formular (Stammdaten, Protokollversion und Freigabe getrennt) statt doppelt.
- Die Sitzungs-Historie zeigt „Version N" statt der internen Versions-ID.
- Die Detail-Navigation der Sitzungen nutzt kanonische `/app/sitzungen`-Pfade ohne 307-Redirect.
- Beschluesse lassen sich im Protokollformular wieder entfernen; sichtbare Plurale („Beschluesse", „Anhaenge", „Version(en)") wurden durch korrektes Deutsch ersetzt.
