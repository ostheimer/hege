# Changelog

Alle relevanten Aenderungen an `hege` werden hier festgehalten.

Das Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) und das Projekt nutzt [Semantic Versioning](https://semver.org/lang/de/).

## [Unreleased]

### Added

- Mobile: **In-App-Theme-Umschalter** (Mehr → „Erscheinungsbild": System / Hell / Dunkel), persistiert über `lib/theme-mode.ts`; erlaubt die Wahl des Erscheinungsbilds unabhängig vom iOS-System. „System" folgt `useColorScheme()` (PR #165).
- Mobile: **eigener Profil-Screen** (`(tabs)/profil`, erreichbar über die tappbare Profil-Zeile im Mehr-Tab und den neuen Initialen-Avatar im Heute-Hero): Identität (Avatar/Name/Rolle/Revier), Erscheinungsbild-Umschalter (Umzug aus Mehr), Face-ID-Entsperren als Schalter, Konto (Benutzername/E-Mail/Abmelden) und BUILD_TAG-Fußzeile; Mehr-Tab dadurch schlanker; OTA `0.1.0 · 2026-06-09.12` (PR #168).

### Changed

- Mobile: **Dark Mode aktiviert** — `ios/hegeRevier/Info.plist` `UIUserInterfaceStyle` von `Light` auf `Automatic` umgestellt; die App folgt jetzt dem System-Erscheinungsbild (bare/prebuild-Projekt, daher gewinnt der native Wert über `app.json`). Zusammen mit den §10-Kontrast-Fixes (`onAccent`/`onWarning`) ist Dark Mode durchgängig lesbar (PR #159).
- Mobile Design-System §10: app-weite Dark-Mode-Adaption — hartkodierte helle Farben auf Theme-Tokens umgestellt (neuer `theme.backdropGradient` für Hero/Backdrop in login/app-loader/screen-shell, Status-Flächen → `*Surface`, Borders → `inputBorder`, Login-Panel/Muted-Flächen → `surfaceMuted/-Strong`, Text/Spinner auf Accent → `onAccent`, `select-field` ActionSheet scheme-aware); Dark Mode app-weit kontraststark; OTA `0.1.0 · 2026-06-08.10` (PR #165).

### Fixed

- Auth: Leere `AUTH_TOKEN_SECRET`-Zeichenkette wird jetzt wie ein fehlender Wert behandelt — `env.ts` wertet `?? fallbackAuthSecret()` aus, das bei leerem String nicht greift; die Sicherung verhindert nun einen ungültigen HMAC-Key in lokaler Entwicklung und auf Preview/Production (PR #161).
- Mobile: der native iOS-ActionSheet im `SelectField` respektiert jetzt den In-App-Theme-Umschalter — neue getestete `resolveEffectiveThemeScheme(mode, scheme)` (genutzt in `useThemeColors` + `SelectField`) statt nur `useColorScheme`; vorher blieb das Sheet bei In-App-„Dunkel" auf hellem System hell; OTA `0.1.0 · 2026-06-08.11` (PR #166).

## [0.1.0] - 2026-06-03

### Added

- Mobile Design-System §10: `<FeedbackBanner>` Primitiv (`components/feedback-banner.tsx`) fuer transientes Aktions-Feedback an Formularen (Ansitze, Fallwild, Revierarbeit); ersetzt die pro Screen duplizierten `infoCard`/`errorCard`/`feedbackCard`-Banner — werterhaltend (gleiche Flaechen und Copy) (PR #144).
- Mobile Design-System §10: `cardSurface(theme)` Hilfsfunktion in `lib/surfaces.ts` konsolidiert die dominante Content-Card-Flaeche (Padding 18, Radius 22, `theme.card`) in 10 Dateien — werterhaltend (PR #145).
- Mobile Design-System §10: `<Badge tone>` Primitiv (PR #135) mit semantischen Color-Roles für Success, Warning, Error und Info; auf Revierarbeit, Protokolle, Ansitze und Fallwild eingesetzt (PR #136).
- Mobile Design-System §10: semantische Farb-Tokens (`onAccent`, `surfaceMuted`, Status-Surfaces) in `@hege/tokens` (`packages/tokens`); erstmals in `StateView` für Loading-/Empty-States adoptiert (PR #134).
- Mobile Design-System §10.7: Eyebrow- und Section-Label-Typographie aus gesamter App in gemeinsame Tokens konsolidiert (PR #141).
- Mobile Design-System §10.3: Muted-Surface-Button-Farben auf Tokens umgestellt; die Sekundär-/Muted-Buttons holen ihre Hintergrundfarbe jetzt aus `surfaceMuted`/`surfaceMutedStrong` (PR #142).
- Mobile API-Base-URL-Fix: Lokaler Entwicklungs-Fallback in `apps/mobile/lib/api.ts` von `http://localhost:3000` auf `http://localhost:3000/api/v1` korrigiert (fehlender `/v1`-Pfadanteil führte zu 404s im lokalen Dev); für Geräte- und Produktions-Builds muss `EXPO_PUBLIC_API_BASE_URL` weiterhin über EAS-Profile gesetzt werden (PR #140).

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

- Mobile Design-System §10: `onAccent`-Token auf Accent-Flaechen adoptiert (20 hartkodierte `#fff9ef`-Vordergruende in 13 Dateien): Filter-Reset-Buttons, Badges, FAB, aktive Filter-Chips, Map-Fallbacks; behebt Dark-Mode-Kontrast-Bug (`#fff9ef` auf `#9db36f` ~2:1 → `theme.onAccent` `#10231d` auf Salbei-Accent); OTA `0.1.0 · 2026-05-31.8` (PR #146).
- Mobile Design-System §10: `onWarning`-Token (Tinte auf `theme.warning`-Flaechen) eingefuehrt und auf `QueueStatusPill` (Fehler-/Offline-State) + `QueueBadge` (Fehler-State) adoptiert; schliesst die Status-Familie ab und behebt den Dark-Mode-Kontrast (Creme `#fff9ef` auf Gold `#cdb069` → `theme.onWarning` `#10231d`); OTA `0.1.0 · 2026-06-03.9` (PR #152).
- Mobile Design-System §10: Spacing-/Radius-Literale, die exakt zur `@hege/tokens`-Skala passen, durch Token-Referenzen ersetzt (139 Stellen in 30 Dateien: `spacing.xs`–`spacing.xl`, `radius.md/lg/xl/full`); werterhaltend, off-scale-Werte (6/10/12/14, 16/18/22) bewusst belassen (PR #154).
- Mobile Design-System §10: `rnShadow.card`-Token auf den Card-Schatten von Login + App-Loader adoptiert (`{ ...rnShadow.card, elevation: 4 }`), werterhaltend; die übrigen 6 bespoke Schatten (FAB, Map-Stage, Queue-Badge, View-Toggle) bleiben hartkodiert, da `rnShadow` (web-abgeleitet) dort nicht passt (PR #156).
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

- Mobile Map-Fallback-Texte (`EntityMap`, `MapPreview`, `MapStage`) nutzen jetzt `theme.onAccent` statt hartkodierter Creme-Farben (`#f7f2e5`/`#e5efd9`); behebt ~2:1-Kontrastproblem im Dark-Mode auf dem Accent-Token `#9db36f` (PR #148).
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
