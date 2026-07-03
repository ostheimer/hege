# Projektregeln

## Dokumentation

- Die Projektdokumentation ist auf Deutsch zu verfassen.
- Produktsprache fuer die App ist Deutsch fuer Oesterreich (`de-AT`).

## Produktentscheidungen

- Kartenfunktionen in Web und Mobile orientieren sich an Google Maps.

## Tech-Stack

- **Web**: Next.js mit App Router; Route Handler unter `apps/web/src/app/api/v1/` als produktiver API-Pfad
- **Mobile**: Expo (React Native, bare workflow); gebaut mit EAS Build; OTA-Updates ueber EAS Update
- **Paketmanager**: pnpm 10.29.2 im Monorepo, koordiniert mit Turborepo
- **Datenbank**: Drizzle ORM auf Neon PostgreSQL/PostGIS; Migrationen und Schema unter `apps/web/drizzle`
- **Storage**: Cloudflare R2 (Production), lokales MinIO (Entwicklung), S3-kompatibler Client
- **Tests**: Vitest fuer Unit- und Integrationstests; Playwright fuer Web-E2E

## Workspace-Struktur

```
apps/api        NestJS-Uebergangspfad (Referenz, nicht produktive Zielarchitektur)
apps/web        Next.js-Backoffice und produktive API-Route-Handler
apps/mobile     Expo-App fuer iOS und Android
packages/domain Gemeinsames Domain-Modell, Demo-Daten und Fachregeln
packages/tokens Geteilte Design-Tokens (Farben, Spacing, Radius, Typographie) fuer Web und Mobile
packages/icons  Geteilte Icon-Assets fuer Web und Mobile
```

## Test-Befehle

```bash
pnpm test                                           # Vitest fuer alle Packages
pnpm test:e2e                                       # Playwright E2E gegen lokale E2E-DB
pnpm typecheck                                      # TypeScript fuer alle Packages
pnpm --filter @hege/web smoke:preview -- <url>      # Smoke-Test gegen Preview-Deploy
pnpm --filter @hege/web smoke:release -- <url>      # Release-Check gegen Production
```
