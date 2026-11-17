# Projektwissen

hege ist eine Reviermanagement-Plattform für Jagdgesellschaften in Österreich (pnpm-Monorepo
mit Turbo): Web-Backoffice (`apps/web`), Expo-Mobile-App für Jäger im Feld (`apps/mobile`) und
gemeinsame Pakete (`packages/domain`, `tokens`, `icons`). Stand, Schnellstart, Umgebungs-
variablen und Befehle stehen in `README.md`, Architektur und Fachdokumente in `docs/`.

## Sprache und Produktentscheidungen

- Die Projektdokumentation ist auf Deutsch. Produktsprache der App ist Deutsch für Österreich
  (`de-AT`).
- Kartenfunktionen in Web und Mobile orientieren sich an Google Maps (`docs/maps-google-v1.md`).

## Tech-Stack

- Web: Next.js App Router; die produktive API liegt unter `apps/web/src/app/api/v1/`.
  `apps/api` ist eine Übergangs-API (Referenz aus der Demo- und Migrationsphase) und nicht die
  Zielarchitektur.
- Mobile: Expo/React Native im Bare Workflow; EAS Build und EAS Update (`apps/mobile/eas.json`).
- Daten: Drizzle ORM auf PostgreSQL/PostGIS (Neon); Storage über S3-kompatible APIs
  (Cloudflare R2, lokal MinIO).
- Tests: Vitest für Domain/Web/Mobile, Playwright für Web-E2E (`pnpm test:e2e`, isolierte
  lokale E2E-Datenbank), Maestro für iOS-Simulator-Flows (`pnpm mobile:e2e:ios:*`).

## Umgebungen und Deploy

- Production: `https://hege.app` (Vercel, API unter `https://hege.app/api/v1`), DNS bei
  Cloudflare. Im Repo gibt es keine `vercel.json`; Deployments entstehen über Vercel. Die
  Workflows `preview-smoke.yml` (Preview) und `release-check.yml` (Production) laufen bei
  erfolgreichen `deployment_status`-Meldungen und lassen sich per `workflow_dispatch`
  starten (Smoke: `pnpm --filter @hege/web smoke:preview <url>` bzw. `smoke:release <url>`).
- Datenbank: genau ein dauerhafter Neon-Branch `main` für Vercel Production (Integration über
  den Vercel Marketplace, verwaltet `DATABASE_URL` und `DATABASE_URL_UNPOOLED` für
  Migrationen). `Vercel Preview` hat keine dauerhafte Cloud-Datenbank und keinen Zugriff auf
  Production; lokal laufen Postgres/PostGIS und MinIO (siehe README, Schnellstart).
- Der Neon-Branch `main` muss als geschützt markiert bleiben. Vor Änderungen oder Löschungen
  an Datenbank-Branches prüfen, welche Endpunkte tatsächlich in den Vercel-Produktions-
  variablen stehen.
- Ohne laufende Datenbank bietet `HEGE_USE_DEMO_STORE=true` einen read-only Fallback.

## Bestehende Code-Muster

- Der Mobile-Bereich `Meldungen` liegt in `apps/mobile/app/(tabs)/revierarbeit.tsx`; keine
  parallele `meldungen.tsx` anlegen.
- Mobile Card-Flächen über `cardSurface(theme)`, Feedback über `FeedbackBanner`, Status über
  `Badge`.
- Rollenrechte aus `packages/domain/src/permissions.ts` ableiten; keine neuen lokalen
  Rollenlisten einführen.
- Rollen- und Zustandslabels über die vorhandenen `formatRoleLabel`-/`formatEinrichtungZustand`-
  Helper anzeigen (`apps/web/src/lib/labels.ts`, `apps/mobile/lib/format.ts`).
- Neue Mobile-Listen unterstützen Pull-to-Refresh; keinen separaten Aktualisieren-Button
  ergänzen.
- Reviermeldung-zu-Aufgabe nutzt `sourceType: "reviermeldung"` und `sourceId`.
