# hege

Reviermanagement-Plattform für Jagdgesellschaften in Österreich. Das Repository enthält ein Monorepo mit:

- `apps/api`: bestehende Übergangs-API für die aktuelle Demo- und Migrationsphase
- `apps/web`: Next.js-Backoffice für Admins und Schriftführung
- `apps/mobile`: Expo-Mobile-App für Jäger im Feld
- `packages/domain`: gemeinsames Domain-Modell, Demo-Daten und Fachregeln
- `packages/tokens`: gemeinsame Design-Tokens (Farben, Spacing, Radius, Typographie) für Web und Mobile
- `packages/icons`: gemeinsame Icon-Assets für Web und Mobile

## Stand

Die erste produktive Ausbaustufe liefert jetzt gemeinsame Typen, persistente Route Handler in `apps/web` und nutzbare UI-Screens für:

- Ansitz bekanntgeben
- Reviereinrichtungen lesen
- Fallwild dokumentieren
- Fallwild-Fotos hochladen
- Sitzungen und Protokolle bearbeiten und lesen

Die bestehende NestJS-API bleibt als Referenzpfad im Repository. Die produktive Linie läuft aber in `apps/web` über Vercel-native Route Handler und Drizzle:

- Drizzle-Konfiguration und Migrationen für Auth, Ansitze, Fallwild, `media_assets`, Reviereinrichtungen, Sitzungen, Protokolle, Dokumente, Notifications und Fallwild-Standortmetadaten
- Route Handler für `auth`, `me`, `dashboard`, `ansitze`, `fallwild`, `reviereinrichtungen`, `protokolle`, `sitzungen`, `documents` und `geo`
- Fallwild-Detail und Foto-Upload über `GET /api/v1/fallwild/:id` und `POST /api/v1/fallwild/:id/fotos`
- Fallwild-Standort v1 über `POST /api/v1/geo/fallwild-location`, iPhone-GPS, serverseitige Google-Adressauflösung, GIP-Index-/Endpoint-Resolver und gespeicherte Standort-/Straßenkilometer-Metadaten
- Reviermeldungen und Aufgaben als API-/Datenmodell-Slice über `GET/POST/PATCH /api/v1/reviermeldungen` und `/api/v1/aufgaben`
- Mitgliedschaftsverwaltung über `GET/POST /api/v1/memberships/invitations` — Einladungen abrufen und anlegen; `POST /api/v1/memberships/invitations/accept` für Annahme, `DELETE /api/v1/memberships/invitations/[id]` für Einladung widerrufen, `GET /api/v1/memberships/invitations/export.csv` für CSV-Export
- Revierdaten-Endpunkt über `POST/PATCH /api/v1/reviere/active/setup` — aktives Revier und Setup-Konfiguration abschließen
- Öffentliche Endpunkte über `POST /api/v1/public/register` — öffentliche Registrierung für neues Revier
- S3-kompatible Storage-Schicht für lokales MinIO und Cloudflare R2 inklusive best-effort Rollback nach fehlgeschlagenem Medien-Insert
- Seed-Skript auf Basis der bestehenden Demo-Daten
- Login in Web und App über E-Mail oder Benutzername plus vierstellige PIN
- Mobile-Entsperren einer gespeicherten Sitzung per Face ID, Touch ID oder Geräteprüfung; der iPhone-Flow wurde am 2026-05-06 auf dem angeschlossenen Gerät bestätigt
- Demo-Fallback fuer lokale Read-Tests, solange keine DB aktiv ist
- Web-Ansitzseite mit Starten, Beenden und manuellem Refresh gegen den neuen API-Pfad
- Web-Fallwildseite mit Erfassung, CSV-Export und mobilem Layout gegen denselben API-Pfad
- Web-Dashboard, Reviereinrichtungen, Protokolle und Sitzungen gegen dieselbe Server-Schicht
- Web-Einladungsflow `/einladung` — Mitglieder per Einladungslink in ein Revier aufnehmen
- Web-Mitgliederverwaltung `/app/mitglieder` — Mitgliederliste, Rollen-Zuweisung und Einladungsstatus im Backoffice
- Public Landing, Login, Registrierung und Setup-Flow mit neuem `hege`-Logo; die Website ist auf `https://hege.app` produktiv geprüft
- Mobile-Screens für Dashboard, Ansitze, Fallwild, Reviereinrichtungen und Protokolle gegen denselben API-Slice
- Mobile-Tab `Meldungen` für Reviermeldungen und Aufgaben: Meldung erfassen, Aufgaben lesen und Aufgabenstatus ändern
- lokaler iPhone-Smoke für `Meldungen` vom 2026-05-05: Login, Aufgabenliste, Statusänderung auf `In Arbeit` und neue Reviermeldung `Smoke Test` wurden gegen `http://10.0.0.242:3000/api/v1` mit `200`/`201` bestätigt
- Mobile Fallwild-Fotoauswahl mit Queue-v2-Weitergabe, Retry-Backoff und sichtbaren Aktionen für problematische Uploads
- dokumentierten iPhone-/iOS-Simulator-Smoke als primären nativen Expo-Abnahmepfad; der Lauf vom 2026-04-26 bestätigt Queue-v2-Fehleranzeigen, R2-Storage ist auf Production aktiviert und ein direkter Fallwild-Foto-Upload gegen `hege.app` ist verifiziert
- Mobile Vitest-Abdeckung für Foto-Normalisierung, Foto-Limit, Submission-Fallback, Standortauflösung und Queue-Retry-Policy
- automatisierten Web-Tests mit Vitest für Route Handler, Services und Server-Queries
- Playwright-E2E- und Visual-Regression-Tests für Public Web, Auth, Ansitze, Fallwild, Sitzungen, Dashboard, Reviereinrichtungen und Protokolle auf Desktop und Mobile
- Preview-Smoke für Public Web, Session-Grundvertrag und die wichtigsten App-Read-Pfade
- Release-Check für produktive Deployments mit demselben Read-Contract gegen Production
- Kontaktlisten v1: `GET/POST /api/v1/contact-lists` und `PATCH/DELETE /api/v1/contact-lists/:listId`, verlinkte registrierte Mitglieder mit Live-Name/-Telefon, freie externe Kontakte, Web-Seite `/app/kontakte` und Mobile-Screen `Kontakte` im Mehr-Menü
- Mobile Dark Mode aktiviert: `UIUserInterfaceStyle` auf `Automatic` umgestellt; Design-System §10 mit semantischen Farb-Token (`onAccent`, `onWarning`, `surfaceMuted`), `<FeedbackBanner>`, `<Badge tone>` und `cardSurface()` eingeführt. **Hinweis iOS vs. Android:** Auf iOS greift `UIUserInterfaceStyle: Automatic` nativ. Auf Android erfordert die automatische System-Dark-Mode-Erkennung zusätzlich `expo-system-ui` (aktuell nicht installiert — ohne dieses Package folgt Android dem System-Theme nicht automatisch). Der In-App-Umschalter (System/Hell/Dunkel) funktioniert auf beiden Plattformen. **Hinweis Web-Dark-Mode:** Im Web ist Dark Mode noch nicht vollständig implementiert — die semantischen Tokens in `globals.css` sind noch nicht migriert. Web-Dark-Mode bleibt eine offene Aufgabe (Token-Migration erforderlich).

Reviermeldungen, Aufgaben und Kontaktlisten sind implementiert. Das Rollenmodell und direkte Nachrichten (mit späterer WhatsApp-/Telegram-Anbindung) sind als nächste fachliche Erweiterung geplant.

## Zielbetrieb

- Production-Domain: `https://hege.app`
- Web-Hosting: Vercel
- API-Zielpfad: Vercel-native Route Handler unter `https://hege.app/api/v1`
- Datenbank: Neon PostgreSQL/PostGIS
- Storage: Cloudflare R2 über S3-kompatible Schnittstelle
- DNS: Cloudflare

Environment-Matrix:

- `Vercel Development` -> `Neon development`
- `Vercel Preview` -> `Neon development`
- `Vercel Production` -> `Neon main`

Preview-Deployments bekommen dabei bewusst keinen eigenen Neon-Branch pro Deployment. `Development` und `Preview` teilen sich denselben Neon-Zweig `development`.

Kartenfunktionen werden im ganzen Produkt auf Google Maps ausgerichtet. Karten-UI, Marker, Standortsuche und spätere Geocoding-Schritte sollen deshalb direkt auf Google-Maps-kompatible Integrationen zielen. Für Fallwild ist der erste Standort-Slice aktiv: Der Endpunkt ist produktiv erreichbar, Google ergänzt Adresse und Straße serverseitig, während GIP die fachliche Zielquelle für österreichische Straßenkilometer bleibt.

`apps/api` bleibt vorerst als Referenz und Übergangspfad im Repository, ist aber nicht die langfristige Zielarchitektur.

## Schnellstart

Kopiere zuerst die Umgebungsvariablen: `.env.example` nach `.env` (unter Windows PowerShell: `Copy-Item .env.example .env`).

Für den neuen lokalen Web/API-Slice:

```bash
pnpm install
docker compose up -d postgres minio
pnpm --filter @hege/web storage:init
pnpm --filter @hege/web db:migrate
pnpm --filter @hege/web db:seed
pnpm --filter @hege/web dev
pnpm --filter @hege/mobile dev
```

Für den bisherigen NestJS-Übergangspfad:

```bash
pnpm --filter @hege/api dev
```

Wichtige URLs:

- Web-Backoffice: `http://localhost:3000`
- Vercel-native API-Slice: `http://localhost:3000/api/v1`
- Demo-API: `http://localhost:4000/api`
- Swagger/OpenAPI: `http://localhost:4000/api/docs`
- MinIO-Konsole: `http://localhost:9001`

Wichtige Env-Variablen:

- `NEXT_PUBLIC_APP_URL` für kanonische Web-URLs
- `NEXT_PUBLIC_API_BASE_URL` für Web-Aufrufe gegen die aktuelle API-Basis
- `EXPO_PUBLIC_API_BASE_URL` für die Mobile-App gegen den Vercel-native Slice
- `DATABASE_URL` und `DATABASE_URL_UNPOOLED` für Neon oder lokales Postgres
- `DEV_*` für den lokalen Dev-Kontext in `apps/web`
- `HEGE_USE_DEMO_STORE=true` als read-only Fallback ohne laufende DB
- `S3_*` für lokales MinIO und R2
- `HEGE_GEO_PROVIDER=live|mock|disabled` für echte Standortprovider, lokale Gänserndorf-Testdaten oder rein manuelle Standortergänzung
- `GOOGLE_MAPS_SERVER_API_KEY`, `GOOGLE_MAPS_REGION=AT`, `GOOGLE_MAPS_LANGUAGE=de` für serverseitige Fallwild-Adressauflösung
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` für die Backoffice-Karte (Next.js inlined `NEXT_PUBLIC_*` zur Build-Zeit). Bestehende Deployments können weiterhin `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY` nutzen. Optional: `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` für ein eigenes Karten-Styling. Ohne Key rendert das Backoffice einen Fallback-Hinweis statt einer leeren Karte.
- `EXPO_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY` für `react-native-maps` mit Provider Google auf Android. iOS nutzt aktuell Apple Maps ohne Key; ohne Android-Key fällt die mobile Karte auf einen Hinweistext zurück.
- `GIP_ROAD_KILOMETER_ENDPOINT` für einen internen Straßenkilometer-Resolver gegen GIP-OGD-Daten; der Resolver bekommt `lat`, `lng`, optional `roadName` und `accuracyMeters`
- `GIP_ROAD_KILOMETER_INDEX_PATH` für einen kompakten JSON-Index aus GIP-OGD-BEPU-Punkten
- `GIP_ROAD_KILOMETER_MAX_DISTANCE_METERS=150` als Standard-Suchradius für den lokalen GIP-Index
- ohne expliziten GIP-Index nutzt das Backend einen gebündelten regionalen Gänserndorf-Index aus dem offiziellen GIP-OGD-Referenzexport

## Projektstruktur (Auszug)

```
apps/
  web/
    src/
      app/api/v1/       # Vercel-native Route Handler (produktive API-Linie)
      server/           # Drizzle ORM, Queries, Services
    e2e/                # Playwright E2E-Tests
  mobile/
    app/
      (tabs)/
        profil.tsx      # Profil-Tab (neu in PR #168)
    lib/
      offline-queue.ts  # Offline-Queue mit vollständigen Vitest-Tests
      device-unlock.ts  # Face ID / Touch ID Entsperrung
  api/                  # NestJS (Referenz/Übergangspfad)
packages/
  domain/               # Gemeinsame Typen, Demo-Daten, Fachregeln
  tokens/               # Design-Tokens für Web und Mobile
  icons/                # Icon-Assets für Web und Mobile
```

## Workspace-Befehle

```bash
pnpm build
pnpm test
pnpm test:e2e
pnpm test:e2e:update
pnpm typecheck
```

Wichtige Testwege:

- `pnpm test` führt die bestehenden Unit- und Integrationstests für `@hege/domain` und `@hege/web` aus.
- `pnpm test:e2e` startet Playwright gegen eine isolierte lokale E2E-Datenbank und prüft Kernflüsse in der Web-App browserbasiert.
- `pnpm test:e2e:update` aktualisiert die Screenshot-Baselines für die visuellen Regressionstests in `apps/web/e2e/*-snapshots`.
- `pnpm --filter @hege/web smoke:preview -- <preview-url>` prüft Public Web, Auth-Login, Session-Grundvertrag, Dashboard, Reviereinrichtungen, Protokolle, Sitzungen und den PDF-Download gegen einen Preview-Deploy.
- `pnpm --filter @hege/web smoke:release -- <production-url>` prüft denselben Read-Contract gegen einen produktiven Deploy.
- `.github/workflows/preview-smoke.yml` startet denselben Smoke automatisch bei erfolgreichen Preview-Deployment-Statusmeldungen und erlaubt einen manuellen Start per `workflow_dispatch`.
- `.github/workflows/release-check.yml` startet den produktionsfaehigen Release-Check automatisch bei erfolgreichen Production-Deployment-Statusmeldungen und erlaubt ebenfalls einen manuellen Start per `workflow_dispatch`.
- Die E2E-Suite deckt aktuell Public Web, Auth, Sitzungen, Dashboard, Reviereinrichtungen, Protokolle, `/ansitze` und `/fallwild` inkl. Desktop- und Mobile-Layout ab.

## Nächste Ausbauschritte

- iPhone-/iOS-Geräte-Smoke für erfolgreichen Foto-Upload, automatische Standortauflösung und leere Queue nachziehen
- Production-Fallwild-Standortauflösung mit gesetztem Google-Server-Key und gebündeltem GIP-Index im nativen iPhone-Smoke prüfen
- GIP-Bounding-Box mit dem tatsächlichen Revier abgleichen und bei Bedarf größeren Index in Preview/Production aktivieren
- Mobile-E2E-Strategie über den dokumentierten Geräte-Smoke hinaus festziehen
- produktive Abnahme mit blockierendem Release-Check weiter beobachten
- PDF-Erzeugung weiter härten
- Android-Emulator-Smoke optional als Zweitpfad vorbereiten
- Rollen-, Aufgaben- und Nachrichtenmodell fachlich weiter ausarbeiten
- Web-Dark-Mode: semantische Token-Migration in `globals.css` abschließen

## Dokumentation

- [Dokumentationsübersicht](./docs/README.md)
- [Gesamtplan](./docs/reviermanagement-plan.md)
- [Architektur](./docs/architektur.md)
- [Backend v1 für Schriftführer](./docs/backend-schriftfuehrer-v1.md)
- [Mobile App v1 für Jäger](./docs/mobile-jaeger-v1.md)
- [API v1](./docs/api-v1.md)
- [Roadmap und Sprints](./docs/roadmap-v1.md)
- [iOS-Smoke-Runbook](./docs/mobile-smoke-ios.md)
- [Android-Smoke-Runbook](./docs/mobile-smoke-android.md)
- [Google-Maps-Ausrichtung](./docs/maps-google-v1.md)
- [GIP-Straßenkilometer v1](./docs/gip-strassenkilometer-v1.md)
- [Passkeys und Face ID v1](./docs/passkeys-faceid-v1.md)
- [Rollen, Aufgaben und Nachrichten v1](./docs/rollen-aufgaben-nachrichten-v1.md)
- [Reviermeldungen und Aufgaben v1](./docs/reviermeldungen-aufgaben-v1-plan.md)
- [UI-Audit 2026-05-07](./docs/ui-audit-2026-05-07.md)
- [Mobile UI-Audit](./docs/mobile-ui-audit.md)
- [Design-System v1](./docs/design-system-v1.md)
- [UX-Roadmap v2](./docs/ux-roadmap-v2.md)
- [Test-Accounts und Rollen-Übersicht](./docs/test-accounts.md)
- [Lighthouse-Baseline 2026-05-08](./docs/lighthouse-baseline-2026-05-08.md)
- [Pfad 2 – Autonome Features](./docs/path-2-autonomous-features.md)
- [Post-Pfad-2-Polish](./docs/post-pfad-2-polish.md)
- [Autonomer Umsetzungsplan 2026-05](./docs/autonomer-umsetzungsplan-2026-05.md)
